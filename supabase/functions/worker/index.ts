import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { extractLightForRawId } from "../_shared/rp_ai_extract_light.ts";
import type { IngestionJobRow, OpportunityUpsertInput, SourceRow } from "../_shared/types.ts";
import { safeStr } from "../_shared/text.ts";
import { canonicalizeUrl, sha256Hex, normalizeText } from "../_shared/rp_ai_utils.ts";
import { runConnector, type ConnectorResult } from "./connectors/index.ts";

/* -----------------------------
   Supabase client (service role)
----------------------------- */
let _sb: any | null = null;
function sb() {
  if (_sb) return _sb;
  _sb = sbAdmin();
  return _sb;
}

/* -----------------------------
   Small helpers
----------------------------- */
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

function sanitizeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.slice(0, 2000);
}

function getBoolEnv(name: string, def: boolean): boolean {
  const v = Deno.env.get(name);
  if (!v) return def;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function ensureTitle(input: OpportunityUpsertInput): string {
  const t = safeStr((input as any)?.title).trim();
  return t ? t : "Untitled opportunity";
}

function pickSnippet(input: OpportunityUpsertInput): string | null {
  const s = safeStr((input as any)?.summary).trim();
  return s ? s : null;
}

function normalizeUrlOrThrow(url: string, label: string): { url: string; url_canonical: string } {
  const u = String(url ?? "").trim();
  if (!u) throw new Error(`Missing url (${label})`);
  const canon = canonicalizeUrl(u);
  if (!canon) throw new Error(`Invalid url (${label}): ${u}`);
  return { url: u, url_canonical: canon };
}

function coerceJobId(jobAny: any): string | number | null {
  const v = jobAny?.id;
  if (v === null || v === undefined) return null;
  // PostgREST peut renvoyer bigint en string
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    // si c’est numérique, on peut le laisser en string (safe pour eq)
    return s;
  }
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return null;
    return v;
  }
  return null;
}

/* -----------------------------
   DB helpers: jobs + sources
----------------------------- */
async function setJobRunning(jobId: string | number) {
  const { error } = await sb()
    .from("ingestion_jobs")
    .update({ status: "running", started_at: nowIso(), updated_at: nowIso() })
    .eq("id", jobId);

  if (error) throw new Error(`Failed to set job running: ${error.message}`);
}

async function setJobSuccess(jobId: string | number) {
  const { error } = await sb()
    .from("ingestion_jobs")
    .update({ status: "success", finished_at: nowIso(), updated_at: nowIso(), error: null })
    .eq("id", jobId);

  if (error) throw new Error(`Failed to set job success: ${error.message}`);
}

async function setJobError(jobId: string | number, message: string) {
  const { error } = await sb()
    .from("ingestion_jobs")
    .update({ status: "error", finished_at: nowIso(), updated_at: nowIso(), error: message })
    .eq("id", jobId);

  if (error) throw new Error(`Failed to set job error: ${error.message}`);
}

async function markSourceSuccess(sourceId: string) {
  const { error } = await sb()
    .from("sources")
    .update({ last_success_at: nowIso(), last_error: null, updated_at: nowIso() })
    .eq("id", sourceId);

  if (error) throw new Error(`Failed to mark source success: ${error.message}`);
}

async function markSourceError(sourceId: string, message: string) {
  const { error } = await sb()
    .from("sources")
    .update({ last_error: message, updated_at: nowIso() })
    .eq("id", sourceId);

  if (error) throw new Error(`Failed to mark source error: ${error.message}`);
}

async function getSource(sourceId: string): Promise<SourceRow> {
  const { data, error } = await sb().from("sources").select("*").eq("id", sourceId).maybeSingle();
  if (error) throw new Error(`Failed to load source: ${error.message}`);
  if (!data) throw new Error(`Source not found: ${sourceId}`);
  return data as SourceRow;
}

function currentPagingCursorFromMeta(meta: unknown): string | null {
  const m = (meta ?? {}) as Record<string, unknown>;
  if (typeof m.cursor === "string" && m.cursor.trim()) return m.cursor.trim();
  if (typeof m.page === "number" && Number.isFinite(m.page)) return String(m.page);
  if (typeof m.page === "string" && m.page.trim()) return m.page.trim();
  return null;
}

async function startIngestionRun(source: SourceRow): Promise<{ runId: string; cursor: string | null }> {
  const runCursor = currentPagingCursorFromMeta((source as any)?.meta);
  const payload = {
    source_id: source.id,
    source_key: source.key,
    status: "RUNNING",
    started_at: nowIso(),
    cursor: runCursor,
    meta: {
      source_kind: source.kind,
      source_country_code: source.country_code,
    },
  };

  const { data, error } = await sb()
    .from("ingestion_runs")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`Failed to start ingestion run: ${error.message}`);
  return { runId: String(data.id), cursor: runCursor };
}

async function finishIngestionRun(
  runId: string,
  patch: {
    status: "SUCCESS" | "FAILED";
    fetched_count: number;
    raw_upserted_count: number;
    opp_upserted_count: number;
    cursor?: string | null;
    error?: string | null;
  },
) {
  const { error } = await sb()
    .from("ingestion_runs")
    .update({
      status: patch.status,
      fetched_count: patch.fetched_count,
      raw_upserted_count: patch.raw_upserted_count,
      opp_upserted_count: patch.opp_upserted_count,
      cursor: patch.cursor ?? null,
      error: patch.error ?? null,
      finished_at: nowIso(),
    })
    .eq("id", runId);
  if (error) throw new Error(`Failed to finish ingestion run: ${error.message}`);
}

/* -----------------------------
   Raw upsert (schema-aligned)
   Table: opportunities_raw
   Columns (known):
     id, source_id, source_key, external_id, url, url_canonical,
     title_raw, snippet_raw, content_raw, content_hash, published_at, fetched_at,
     language_hint, raw_kind_hint, attachments, ingest_run_id, ingest_errors, created_at, updated_at
----------------------------- */

async function getRawByCanonicalUrl(sourceId: string, urlCanonical: string) {
  const { data, error } = await sb()
    .from("opportunities_raw")
    .select("id, content_hash")
    .eq("source_id", sourceId)
    .eq("url_canonical", urlCanonical)
    .maybeSingle();

  if (error) throw new Error(`Failed to load raw by canonical_url: ${error.message}`);
  return data as { id: string; content_hash: string } | null;
}

async function upsertRaw(source: SourceRow, opp: OpportunityUpsertInput, runId: string) {
  const title_raw = ensureTitle(opp);
  const snippet_raw = pickSnippet(opp);

  // Construire un content_raw minimal (utile à l’AI et au hash)
  const rawJson = (opp as any)?.raw ? JSON.stringify((opp as any).raw) : "";
  const content_raw = rawJson || snippet_raw;

  // URL: prefer opp.source_url; fallback to source.url
  const preferredUrl = safeStr((opp as any)?.source_url).trim() || safeStr((source as any)?.url).trim();
  const { url, url_canonical } = normalizeUrlOrThrow(preferredUrl, "opportunity/source");

  // external_id: prefer opp.external_id, else opp.fingerprint, else url_canonical
  const external_id_raw = safeStr((opp as any)?.external_id).trim();
  const external_id = external_id_raw || null;

  // content_hash MUST be NOT NULL
  const hashBasis = normalizeText(`${title_raw}\n${snippet_raw ?? ""}\n${content_raw ?? ""}\n${url_canonical}`);
  const content_hash = await sha256Hex(hashBasis);

  const payload: Record<string, unknown> = {
    source_id: source.id,
    source_key: source.key,
    external_id,
    url,
    url_canonical,
    title_raw,
    snippet_raw,
    content_raw,
    content_hash,
    published_at: (opp as any)?.published_at ?? null,
    fetched_at: nowIso(),
    language_hint: (opp as any)?.language ?? null,
    raw_kind_hint: source.kind ?? null,
    attachments: null,
    ingest_run_id: runId,
    ingest_errors: null,
    updated_at: nowIso(),
  };

  // Primary path: upsert by (source_key, external_id) when external_id exists.
  if (external_id) {
    const { data, error } = await sb()
      .from("opportunities_raw")
      .upsert(payload, { onConflict: "source_key,external_id" })
      .select("id")
      .single();
    if (error) throw new Error(`Failed to upsert raw (by external_id): ${error.message}`);
    return { id: data.id as string };
  }

  // Fallback dedupe path: (source_id, url_canonical) when external_id missing.
  const existingByUrl = await getRawByCanonicalUrl(source.id, url_canonical);
  if (existingByUrl?.id) {
    if (existingByUrl.content_hash === content_hash) {
      const { data, error } = await sb().from("opportunities_raw").select("id").eq("id", existingByUrl.id).single();
      if (error) throw new Error(`Failed to reload raw: ${error.message}`);
      return { id: data.id as string };
    }

    const { data, error } = await sb()
      .from("opportunities_raw")
      .update(payload)
      .eq("id", existingByUrl.id)
      .select("id")
      .single();

    if (error) throw new Error(`Failed to update raw (by url): ${error.message}`);
    return { id: data.id as string };
  }

  // Insert new
  const { data, error } = await sb()
    .from("opportunities_raw")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(`Failed to insert raw: ${error.message}`);
  return { id: data.id as string };
}

async function upsertOpportunity(source: SourceRow, opp: OpportunityUpsertInput) {
  const fingerprint = safeStr((opp as any)?.fingerprint).trim();
  if (!fingerprint) throw new Error("Missing opportunity fingerprint");

  const sourceUrl = safeStr((opp as any)?.source_url).trim() || safeStr((source as any)?.url).trim();
  if (!sourceUrl) throw new Error("Missing opportunity source_url");

  const payload = {
    source_id: source.id,
    external_id: safeStr((opp as any)?.external_id).trim() || null,
    fingerprint,
    type: (opp.type ?? "tender") as any,
    status: ((opp as any)?.status ?? "active") as any,
    is_public: true,
    country_code: opp.country_code ?? null,
    buyer_name: safeStr((opp as any)?.buyer_name).trim() || null,
    title: ensureTitle(opp),
    summary: pickSnippet(opp),
    published_at: (opp as any)?.published_at ?? null,
    deadline_at: (opp as any)?.deadline_at ?? null,
    deadline_tz: (opp as any)?.deadline_tz ?? null,
    source_url: sourceUrl,
    language: (opp as any)?.language ?? null,
    raw: ((opp as any)?.raw && typeof (opp as any).raw === "object") ? (opp as any).raw : {},
    updated_at: nowIso(),
  };

  const { error } = await sb().from("opportunities").upsert(payload, { onConflict: "fingerprint" });
  if (error) throw new Error(`Failed to upsert opportunities row: ${error.message}`);
}

async function persistSourcePagingState(source: SourceRow, result: ConnectorResult) {
  const next = result.next ?? null;
  if (!next) return;

  const meta = { ...(((source as any)?.meta ?? {}) as Record<string, unknown>) };
  let changed = false;

  if (next.cursor !== undefined) {
    meta.cursor = next.cursor;
    changed = true;
  }
  if (typeof next.page === "number" && Number.isFinite(next.page)) {
    meta.page = next.page;
    changed = true;
  }

  if (!changed) return;

  const { error } = await sb()
    .from("sources")
    .update({ meta, updated_at: nowIso() })
    .eq("id", source.id);

  if (error) throw new Error(`Failed to persist source paging state: ${error.message}`);
}

/* -----------------------------
   AI extract (fixed signature)
----------------------------- */
async function upsertAi(rawId: string) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
  if (!OPENAI_API_KEY) return; // AI désactivée si secret manquant

  const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const OPENAI_STORE = getBoolEnv("OPENAI_STORE", false);

  await extractLightForRawId(sb(), rawId, {
    openaiApiKey: OPENAI_API_KEY,
    openaiModel: OPENAI_MODEL,
    openaiStore: OPENAI_STORE,
    extractVersion: "v1.light",
    minContentChars: 280,
    maxContentChars: 24_000,
  });
}

/* -----------------------------
   Job processor
----------------------------- */
async function processJob(job: IngestionJobRow) {
  // sécurité absolue
  const jobId = coerceJobId(job as any);
  if (jobId === null) {
    return { ok: true, message: "no_jobs" };
  }

  await setJobRunning(jobId);

  const source = await getSource((job as any).source_id);
  const { runId, cursor: runCursor } = await startIngestionRun(source);

  try {
    const result = await runConnector(source);
    const fetchedCount = Array.isArray(result.opportunities) ? result.opportunities.length : 0;

    let upsertedRaw = 0;
    let upsertedOpportunities = 0;

    for (const opp of result.opportunities as OpportunityUpsertInput[]) {
      const normalizedOpp: OpportunityUpsertInput = {
        ...opp,
        country_code: (opp.country_code ?? source.country_code ?? null) as string | null,
      };

      const raw = await upsertRaw(source, normalizedOpp, runId);
      upsertedRaw += 1;

      await upsertOpportunity(source, normalizedOpp);
      upsertedOpportunities += 1;

      // AI best-effort
      try {
        await upsertAi(raw.id);
      } catch (e) {
        console.error("AI extract failed:", e instanceof Error ? e.message : String(e));
      }
    }

    await persistSourcePagingState(source, result);
    await markSourceSuccess(source.id);
    await setJobSuccess(jobId);
    await finishIngestionRun(runId, {
      status: "SUCCESS",
      fetched_count: fetchedCount,
      raw_upserted_count: upsertedRaw,
      opp_upserted_count: upsertedOpportunities,
      cursor: runCursor,
      error: null,
    });

    return {
      ok: true,
      source: source.key,
      kind: source.kind,
      upserted_raw: upsertedRaw,
      upserted_opportunities: upsertedOpportunities,
      fetched_at: (result as any)?.fetched_at ?? null,
    };
  } catch (err) {
    const msg = sanitizeErrorMessage(err);
    await markSourceError(source.id, msg);
    await setJobError(jobId, msg);
    await finishIngestionRun(runId, {
      status: "FAILED",
      fetched_count: 0,
      raw_upserted_count: 0,
      opp_upserted_count: 0,
      cursor: runCursor,
      error: msg,
    });
    return { ok: false, source: source.key, kind: source.kind, error: msg };
  }
}

/* -----------------------------
   HTTP handler
----------------------------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, { status: 405 });

  let body: any = {};
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth) {
      if (!auth.toLowerCase().startsWith("bearer ")) {
        return json({ ok: false, error: "Invalid Authorization header format" }, { status: 401 });
      }
      const token = auth.slice(7).trim();
      const { data, error } = await sb().auth.getUser(token);
      if (error || !data?.user?.id) {
        return json({ ok: false, error: "Invalid JWT token" }, { status: 401 });
      }
    }

    body = await req.json();
  } catch {
    body = {};
  }

  const maxJobs = Math.max(1, Math.min(10, Number(body?.max_jobs ?? 1)));
  const results: any[] = [];

  try {
    for (let i = 0; i < maxJobs; i++) {
      // IMPORTANT: rpc peut renvoyer:
      // - null
      // - un objet
      // - un tableau
      // Et quand le SQL retourne NULL (composite), PostgREST peut renvoyer un objet truthy avec id:null
      const { data, error } = await sb().rpc("claim_next_ingestion_job");

      if (error) {
        return json({ ok: false, error: `claim_next_ingestion_job failed: ${error.message}` }, { status: 500 });
      }

      const jobAny: any = Array.isArray(data) ? data[0] : data;
      const jobId = coerceJobId(jobAny);

      // Cas normal: aucun job claimable => sortie propre en 200
      if (!jobAny || jobId === null) {
        break;
      }

      results.push(await processJob(jobAny as IngestionJobRow));
    }

    if (!results.length) {
      return json({ ok: true, message: "no_jobs" }, { status: 200 });
    }

    return json({ ok: true, results }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, { status: 500 });
  }
});
