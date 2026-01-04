import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { extractLightForRawId } from "../_shared/rp_ai_extract_light.ts";
import type { IngestionJobRow, OpportunityUpsertInput, SourceRow } from "../_shared/types.ts";
import { normalizeText } from "../_shared/text.ts";
import { canonicalizeUrl, sha256Hex } from "../_shared/rp_ai_utils.ts";
import { runConnector } from "./connectors/index.ts";

type DbOpportunityRow = {
  id: string;
  fingerprint: string;
  title: string;
  summary: string | null;
  deadline_at: string | null;
  source_url: string;
  country_code: string | null;
  type: string;
};

type DbRawRow = {
  id: string;
  content_hash: string;
};

function buildRawRichText(input: { title: string; snippet: string | null; content: string | null }): string {
  return [input.title || "", input.snippet || "", input.content || ""].join("\n\n").trim();
}

async function upsertOpportunityRaw(args: {
  sb: ReturnType<typeof sbAdmin>;
  source: SourceRow;
  inOpp: OpportunityUpsertInput;
  fetchedAt: string;
}): Promise<
  | { ok: true; raw_id: string; changed: boolean; action: "insert" | "update" | "noop" }
  | { ok: false; error: unknown }
> {
  try {
    const { sb, source, inOpp, fetchedAt } = args;

    const url = String(inOpp.source_url || "").trim();
    if (!url) return { ok: false, error: new Error("missing source_url") };

    const urlCanonical = canonicalizeUrl(url);
    const externalId = inOpp.external_id ? String(inOpp.external_id).trim() : null;

    const titleRaw = String(inOpp.title || "").trim();
    const snippetRaw = inOpp.summary ? String(inOpp.summary).trim().slice(0, 2400) : null;
    // RSS MVP: pas de contenu long. On recycle le snippet en content pour réduire les 'skipped'.
    const contentRaw = inOpp.summary ? String(inOpp.summary).trim().slice(0, 24_000) : null;

    const richness = buildRawRichText({ title: titleRaw, snippet: snippetRaw, content: contentRaw });
    const contentHash = await sha256Hex(richness);

    // Resolve an existing raw row (external_id preferred, else url_canonical)
    let existing: DbRawRow | null = null;
    if (externalId) {
      const { data, error } = await sb
        .from("opportunities_raw")
        .select("id,content_hash")
        .eq("source_key", source.key)
        .eq("external_id", externalId)
        .maybeSingle();
      if (error) throw error;
      existing = (data as any) || null;
    } else {
      const { data, error } = await sb
        .from("opportunities_raw")
        .select("id,content_hash")
        .eq("source_key", source.key)
        .eq("url_canonical", urlCanonical)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      existing = (data as any) || null;
    }

    const patch = {
      source_id: source.id,
      source_key: source.key,
      external_id: externalId,
      url,
      url_canonical: urlCanonical,
      title_raw: titleRaw,
      snippet_raw: snippetRaw,
      content_raw: contentRaw,
      content_hash: contentHash,
      published_at: inOpp.published_at ?? null,
      fetched_at: fetchedAt,
      language_hint: inOpp.language ?? null,
      raw_kind_hint: source.kind,
      attachments: [],
      ingest_errors: null,
      ingest_run_id: null,
    };

    if (!existing?.id) {
      const { data: created, error: insErr } = await sb
        .from("opportunities_raw")
        .insert(patch)
        .select("id")
        .single();
      if (insErr) throw insErr;
      return { ok: true, raw_id: (created as any).id as string, changed: true, action: "insert" };
    }

    const changed = String(existing.content_hash || "") !== contentHash;

    const { error: upErr } = await sb.from("opportunities_raw").update(patch).eq("id", existing.id);
    if (upErr) throw upErr;

    return { ok: true, raw_id: existing.id, changed, action: changed ? "update" : "noop" };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function ensureBuyer(sb: ReturnType<typeof sbAdmin>, country: string | null, buyerName: string | null) {
  const name = (buyerName || "").trim();
  if (!name) return null;

  const normalized = normalizeText(name);

  let q = sb.from("buyers").select("id").eq("normalized_name", normalized).limit(1);
  if (country === null) q = q.is("country_code", null);
  else q = q.eq("country_code", country);

  const { data: existing, error: selErr } = await q;
  if (selErr) throw selErr;
  if (existing && existing[0]?.id) return existing[0].id as string;

  const { data: ins, error: insErr } = await sb
    .from("buyers")
    .insert({ country_code: country, name, normalized_name: normalized })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return ins.id as string;
}

function computeDiff(prev: DbOpportunityRow, next: OpportunityUpsertInput) {
  const changes: Record<string, any> = {};

  const prevDeadline = prev.deadline_at ?? null;
  const nextDeadline = next.deadline_at ?? null;
  if (prevDeadline !== nextDeadline) changes.deadline_at = { from: prevDeadline, to: nextDeadline };

  const prevTitle = prev.title ?? "";
  const nextTitle = next.title ?? "";
  if (prevTitle !== nextTitle) changes.title = { from: prevTitle, to: nextTitle };

  const prevSummary = prev.summary ?? "";
  const nextSummary = next.summary ?? "";
  if (prevSummary !== nextSummary) {
    changes.summary = { from: prevSummary.slice(0, 200), to: nextSummary.slice(0, 200) };
  }

  const prevUrl = prev.source_url ?? "";
  const nextUrl = next.source_url ?? "";
  if (prevUrl !== nextUrl) changes.source_url = { from: prevUrl, to: nextUrl };

  return changes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let claimedJobId: string | null = null;

  try {
    const sb = sbAdmin();

    // 1) Claim one job
    const { data: job, error: jobErr } = await sb
      .rpc("claim_next_ingestion_job", { max_attempts: 5 })
      .maybeSingle();

    if (jobErr) throw jobErr;

    // GUARD ANTI-22P02: considérer no_jobs si job OU id OU source_id manquent
    if (!job || !(job as any).id || !(job as any).source_id) {
      return json({ ok: true, message: "no_jobs" }, 200);
    }

    const j = job as IngestionJobRow;
    claimedJobId = j.id;

    // 2) Load source
    const { data: source, error: srcErr } = await sb
      .from("sources")
      .select("id, key, name, kind, url, country_code, is_active, schedule_minutes, last_run_at, meta")
      .eq("id", j.source_id)
      .single();

    if (srcErr) throw srcErr;
    const s = source as SourceRow;

    // 3) Run connector (RSS MVP)
    const res = await runConnector(s);

    let inserted = 0;
    let updated = 0;
    let events = 0;

    // AI extraction (V1.light) — internal call (no HTTP)
    let rawInserted = 0;
    let rawUpdated = 0;
    let rawNoop = 0;
    let rawErrors = 0;
    let aiSuccess = 0;
    let aiSkipped = 0;
    let aiErrors = 0;

    const aiEnabled = String(Deno.env.get("AI_EXTRACT_ENABLED") ?? "true").toLowerCase() !== "false";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
    const openaiModel = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const openaiStore = String(Deno.env.get("OPENAI_STORE") ?? "false").toLowerCase() === "true";
    const canUseAi = aiEnabled && Boolean(openaiApiKey);

    if (aiEnabled && !openaiApiKey) {
      console.warn("AI_EXTRACT_DISABLED", "Missing OPENAI_API_KEY");
    }

    for (const inOpp of res.opportunities) {
      // 3.A) Upsert raw row (best-effort)
      const rawRes = await upsertOpportunityRaw({ sb, source: s, inOpp, fetchedAt: res.fetched_at });
      let rawIdForAi: string | null = null;
      let rawChanged = false;

      if (rawRes.ok) {
        rawIdForAi = rawRes.raw_id;
        rawChanged = rawRes.changed;
        if (rawRes.action === "insert") rawInserted++;
        else if (rawRes.action === "update") rawUpdated++;
        else rawNoop++;
      } else {
        rawErrors++;
        console.warn("RAW_UPSERT_ERROR", rawRes.error);
      }

      // 3.B) Run AI extraction only when raw content changed or is new
      if (canUseAi && rawIdForAi && rawChanged) {
        try {
          const r = await extractLightForRawId(sb as any, rawIdForAi, {
            openaiApiKey,
            openaiModel,
            openaiStore,
            extractVersion: "v1.light",
            minContentChars: 280,
            maxContentChars: 24_000,
          });

          if (r.status === "success") aiSuccess++;
          else aiSkipped++;
        } catch (e) {
          aiErrors++;
          console.error("AI_EXTRACT_ERROR", { raw_id: rawIdForAi, error: (e as any)?.message ?? String(e) });
        }
      }

      const buyerId = await ensureBuyer(sb, inOpp.country_code ?? null, inOpp.buyer_name ?? null);

      const { data: prev, error: prevErr } = await sb
        .from("opportunities")
        .select("id, fingerprint, title, summary, deadline_at, source_url, country_code, type")
        .eq("fingerprint", inOpp.fingerprint)
        .maybeSingle();

      if (prevErr) throw prevErr;

      if (!prev) {
        const { data: created, error: insErr } = await sb
          .from("opportunities")
          .insert({
            ...inOpp,
            buyer_id: buyerId,
            buyer_name: inOpp.buyer_name || null,
            raw: inOpp.raw || {},
          })
          .select("id, fingerprint, title, summary, deadline_at, source_url, country_code, type")
          .single();

        if (insErr) throw insErr;
        inserted++;

        const { error: evErr } = await sb.from("opportunity_events").insert({
          opportunity_id: created.id,
          type: "NEW",
          data: { source_id: s.id, fetched_at: res.fetched_at },
        });
        if (evErr) throw evErr;
        events++;

        continue;
      }

      const changes = computeDiff(prev as any, inOpp);
      if (Object.keys(changes).length === 0) continue;

      const nextPatch: any = {
        title: inOpp.title,
        summary: inOpp.summary ?? null,
        deadline_at: inOpp.deadline_at ?? null,
        source_url: inOpp.source_url,
        buyer_id: buyerId,
        buyer_name: inOpp.buyer_name || null,
        raw: inOpp.raw || {},
      };

      const { data: patched, error: upErr } = await sb
        .from("opportunities")
        .update(nextPatch)
        .eq("id", (prev as any).id)
        .select("id, fingerprint, title, summary, deadline_at, source_url, country_code, type")
        .single();

      if (upErr) throw upErr;
      updated++;

      const eventType = changes.deadline_at ? "DEADLINE_CHANGED" : "UPDATED";

      const { error: ev2Err } = await sb.from("opportunity_events").insert({
        opportunity_id: patched.id,
        type: eventType,
        data: { changes, fetched_at: res.fetched_at },
      });
      if (ev2Err) throw ev2Err;
      events++;
    }

    // 4) Mark job success
    const now = new Date().toISOString();

    const { error: jobDoneErr } = await sb
      .from("ingestion_jobs")
      .update({ status: "success", finished_at: now })
      .eq("id", j.id);
    if (jobDoneErr) throw jobDoneErr;

    const { error: srcUpErr } = await sb
      .from("sources")
      .update({ last_success_at: now, last_error: null })
      .eq("id", s.id);
    if (srcUpErr) throw srcUpErr;

    return json(
      {
        ok: true,
        job_id: j.id,
        source: s.key,
        fetched_at: res.fetched_at,
        inserted,
        updated,
        events,
        ai: {
          enabled: canUseAi,
          raw: {
            inserted: rawInserted,
            updated: rawUpdated,
            noop: rawNoop,
            errors: rawErrors,
          },
          extraction: {
            success: aiSuccess,
            skipped: aiSkipped,
            errors: aiErrors,
            model: openaiModel,
          },
        },
      },
      200
    );
  } catch (e) {
    console.error("WORKER_ERROR", e);

    // Optionnel mais très utile: marquer le job en erreur si déjà claim
    try {
      if (claimedJobId) {
        const sb = sbAdmin();
        const now = new Date().toISOString();
        await sb
          .from("ingestion_jobs")
          .update({
            status: "error",
            finished_at: now,
            error: typeof e === "object" && e !== null ? (e as any).message ?? String(e) : String(e),
          })
          .eq("id", claimedJobId);
      }
    } catch (markErr) {
      console.error("JOB_MARK_ERROR_FAILED", markErr);
    }

    const errObj =
      typeof e === "object" && e !== null
        ? {
            name: (e as any).name,
            message: (e as any).message,
            stack: (e as any).stack,
            details: (e as any).details,
            hint: (e as any).hint,
            code: (e as any).code,
          }
        : { message: String(e) };

    return json({ ok: false, error: errObj }, 500);
  }
});
