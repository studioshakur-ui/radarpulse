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
  opportunity_id: string | null;
  source_id: string;
  url: string;
  url_canonical: string;
  title: string;
  published_at: string | null;
  content_raw: string | null;
  content_hash: string | null;
  fetched_at: string;
  hints: Record<string, unknown> | null;
  confidence: number | null;
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
    status: init.status ?? 200,
  });
}

function nowIso() {
  return new Date().toISOString();
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeString(v: unknown): string | null {
  if (typeof v === "string") return v;
  return null;
}

function ensureTitle(input: OpportunityUpsertInput): string {
  const t = safeString(input.title)?.trim();
  return t && t.length > 0 ? t : "Untitled opportunity";
}

function normalizeUrlOrThrow(url: string): { url: string; url_canonical: string } {
  const u = url?.trim();
  if (!u) throw new Error("Missing url");
  const canonical = canonicalizeUrl(u);
  if (!canonical) throw new Error(`Invalid url: ${u}`);
  return { url: u, url_canonical: canonical };
}

async function setJobRunning(jobId: string) {
  const { error } = await sbAdmin
    .from("ingestion_jobs")
    .update({
      status: "running",
      started_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", jobId);

  if (error) throw new Error(`Failed to set job running: ${error.message}`);
}

async function setJobSuccess(jobId: string) {
  const { error } = await sbAdmin
    .from("ingestion_jobs")
    .update({
      status: "success",
      finished_at: nowIso(),
      updated_at: nowIso(),
      error: null,
    })
    .eq("id", jobId);

  if (error) throw new Error(`Failed to set job success: ${error.message}`);
}

async function setJobError(jobId: string, message: string) {
  const { error } = await sbAdmin
    .from("ingestion_jobs")
    .update({
      status: "error",
      finished_at: nowIso(),
      updated_at: nowIso(),
      error: message,
    })
    .eq("id", jobId);

  if (error) throw new Error(`Failed to set job error: ${error.message}`);
}

async function markSourceSuccess(sourceId: string) {
  const { error } = await sbAdmin
    .from("sources")
    .update({
      last_success_at: nowIso(),
      last_error: null,
      updated_at: nowIso(),
    })
    .eq("id", sourceId);

  if (error) throw new Error(`Failed to mark source success: ${error.message}`);
}

async function markSourceError(sourceId: string, message: string) {
  const { error } = await sbAdmin
    .from("sources")
    .update({
      last_error: message,
      updated_at: nowIso(),
    })
    .eq("id", sourceId);

  if (error) throw new Error(`Failed to mark source error: ${error.message}`);
}

async function getSource(sourceId: string): Promise<SourceRow> {
  const { data, error } = await sbAdmin.from("sources").select("*").eq("id", sourceId).maybeSingle();
  if (error) throw new Error(`Failed to load source: ${error.message}`);
  if (!data) throw new Error(`Source not found: ${sourceId}`);
  return data as SourceRow;
}

async function getRawByCanonicalUrl(sourceId: string, urlCanonical: string): Promise<DbRawRow | null> {
  const { data, error } = await sbAdmin
    .from("opportunities_raw")
    .select("*")
    .eq("source_id", sourceId)
    .eq("url_canonical", urlCanonical)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to lookup raw: ${error.message}`);
  return (data ?? null) as DbRawRow | null;
}

async function insertOrUpdateRaw(source: SourceRow, opp: OpportunityUpsertInput): Promise<DbRawRow> {
  const title = ensureTitle(opp);
  const { url, url_canonical } = normalizeUrlOrThrow(opp.url);

  const content_raw = safeString(opp.content_raw);
  const content_hash = content_raw ? await sha256Hex(content_raw) : null;

  const published_at = opp.published_at ? new Date(opp.published_at).toISOString() : null;
  const fetched_at = opp.fetched_at ? new Date(opp.fetched_at).toISOString() : nowIso();

  const existing = await getRawByCanonicalUrl(source.id, url_canonical);

  // Idempotence based on canonical URL + content hash
  if (existing && existing.content_hash && content_hash && existing.content_hash === content_hash) {
    return existing;
  }

  const payloadRow = {
    source_id: source.id,
    opportunity_id: null,
    url,
    url_canonical,
    title,
    published_at,
    content_raw,
    content_hash,
    fetched_at,
    hints: (opp.hints ?? null) as Record<string, unknown> | null,
    confidence: typeof opp.confidence === "number" ? clamp01(opp.confidence) : null,
  };

  const { data, error } = await sbAdmin
    .from("opportunities_raw")
    .insert(payloadRow)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to insert raw: ${error.message}`);
  return data as DbRawRow;
}

async function upsertOpportunityFromAi(rawId: string): Promise<DbOpportunityRow | null> {
  // The AI extraction function handles its own upserts into:
  // - opportunity_ai (+ evidence)
  // - opportunities (final product row)
  //
  // It returns something (or not) depending on extraction / filtering.
  const result = await extractLightForRawId(rawId);

  // If extraction decides it's not an opportunity (e.g., news), it may return null-ish.
  // We normalize to DbOpportunityRow | null.
  if (!result) return null;

  // Many versions return an opportunity id; but we keep it permissive:
  // if the extraction wrote an opportunity row, fetch it by raw.opportunity_id later,
  // or try to read from returned payload if present.
  return null;
}

async function attachRawToOpportunity(rawId: string, opportunityId: string) {
  const { error } = await sbAdmin
    .from("opportunities_raw")
    .update({
      opportunity_id: opportunityId,
      updated_at: nowIso(),
    })
    .eq("id", rawId);

  if (error) throw new Error(`Failed to attach raw to opportunity: ${error.message}`);
}

async function readOpportunityById(id: string): Promise<DbOpportunityRow | null> {
  const { data, error } = await sbAdmin.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to read opportunity: ${error.message}`);
  return (data ?? null) as DbOpportunityRow | null;
}

async function readOpportunityForRaw(rawId: string): Promise<DbOpportunityRow | null> {
  const { data, error } = await sbAdmin
    .from("opportunities_raw")
    .select("opportunity_id")
    .eq("id", rawId)
    .maybeSingle();

  if (error) throw new Error(`Failed to read raw.opportunity_id: ${error.message}`);
  const oppId = (data as { opportunity_id: string | null } | null)?.opportunity_id ?? null;
  if (!oppId) return null;
  return await readOpportunityById(oppId);
}

async function processJob(job: IngestionJobRow) {
  await setJobRunning(job.id);

  const source = await getSource(job.source_id);

  try {
    const result = await runConnector(source);

    let insertedRaw = 0;
    let extractedAi = 0;
    let createdOpp = 0;

    for (const opp of result.opportunities) {
      // Normalize / clean content
      if (opp.content_raw && typeof opp.content_raw === "string") {
        opp.content_raw = normalizeText(opp.content_raw);
      } else if (opp.content_raw == null && opp.summary && typeof opp.summary === "string") {
        // Some connectors provide summary; keep it as content_raw if raw missing
        opp.content_raw = normalizeText(opp.summary);
      }

      const raw = await insertOrUpdateRaw(source, opp);
      insertedRaw += 1;

      // Trigger AI extraction on each raw
      await upsertOpportunityFromAi(raw.id);
      extractedAi += 1;

      const finalOpp = await readOpportunityForRaw(raw.id);
      if (finalOpp) {
        createdOpp += 1;
        // Ensure raw links to final opp (some flows might already attach; we keep safe)
        await attachRawToOpportunity(raw.id, finalOpp.id);
      }
    }

    await markSourceSuccess(source.id);
    await setJobSuccess(job.id);

    return {
      ok: true,
      source: source.key,
      kind: source.kind,
      inserted_raw: insertedRaw,
      extracted_ai: extractedAi,
      created_opportunities: createdOpp,
      fetched_at: result.fetched_at,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markSourceError(source.id, msg);
    await setJobError(job.id, msg);
    return { ok: false, source: source.key, kind: source.kind, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  // Claim next job via RPC
  const { data: job, error } = await sbAdmin.rpc("claim_next_ingestion_job").maybeSingle();

  if (error) {
    return json({ ok: false, error: `claim_next_ingestion_job failed: ${error.message}` }, { status: 500 });
  }

  if (!job) {
    return json({ ok: true, message: "no_jobs" });
  }

  const res = await processJob(job as IngestionJobRow);
  return json(res);
});
