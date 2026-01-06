import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { extractLightForRawId } from "../_shared/rp_ai_extract_light.ts";
import type { IngestionJobRow, OpportunityUpsertInput, SourceRow } from "../_shared/types.ts";
import { safeStr } from "../_shared/text.ts";
import { canonicalizeUrl, sha256Hex, normalizeText } from "../_shared/rp_ai_utils.ts";
import { runConnector } from "./connectors/index.ts";

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

/* -----------------------------
   Raw upsert (schema-aligned)
   Table: opportunities_raw
   Columns (known):
     id, source_id, source_key, external_id, url, url_canonical,
     title_raw, snippet_raw, content_raw, content_hash, published_at, fetched_at,
     language_hint, raw_kind_hint, attachments, ingest_run_id, ingest_errors, created_at, updated_at
----------------------------- */

async function getRawBySourceExternal(sourceKey: string, externalId: string) {
  const { data, error } = await sb()
    .from("opportunities_raw")
    .select("id, content_hash")
    .eq("source_key", sourceKey)
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load raw by external_id: ${error.message}`);
  return data as { id: string; content_hash: string } | null;
}

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

async function upsertRaw(source: SourceRow, opp: OpportunityUpsertInput) {
  const title_raw = ensureTitle(opp);
  const snippet_raw = pickSnippet(opp);

  // Construire un content_raw minimal (utile à l’AI et au hash)
  const rawJson = (opp as any)?.raw ? JSON.stringify((opp as any).raw) : "";
  const content_raw = snippet_raw ? snippet_raw : (rawJson ? rawJson.slice(0, 8000) : null);

  // URL: prefer opp.source_url; fallback to source.url
  const preferredUrl = safeStr((opp as any)?.source_url).trim() || safeStr((source as any)?.url).trim();
  const { url, url_canonical } = normalizeUrlOrThrow(preferredUrl, "opportunity/source");

  // external_id: prefer opp.external_id, else opp.fingerprint, else url_canonical
  const external_id =
    safeStr((opp as any)?.external_id).trim() ||
    safeStr((opp as any)?.fingerprint).trim() ||
    url_canonical;

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
    ingest_errors: null,
    updated_at: nowIso(),
  };

  // Dedupe path 1: (source_key, external_id)
  const existingByExt = await getRawBySourceExternal(source.key, external_id);
  if (existingByExt?.id) {
    // micro-opt: si hash identique, on peut éviter l’update (mais on garde update_at)
    if (existingByExt.content_hash === content_hash) {
      const { data, error } = await sb().from("opportunities_raw").select("id").eq("id", existingByExt.id).single();
      if (error) throw new Error(`Failed to reload raw: ${error.message}`);
      return { id: data.id as string };
    }

    const { data, error } = await sb()
      .from("opportunities_raw")
      .update(payload)
      .eq("id", existingByExt.id)
      .select("id")
      .single();

    if (error) throw new Error(`Failed to update raw: ${error.message}`);
    return { id: data.id as string };
  }

  // Fallback dedupe path 2: (source_id, url_canonical)
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

  try {
    const result = await runConnector(source);

    let upsertedRaw = 0;

    for (const opp of result.opportunities as OpportunityUpsertInput[]) {
      const raw = await upsertRaw(source, opp);
      upsertedRaw += 1;

      // AI best-effort
      try {
        await upsertAi(raw.id);
      } catch (e) {
        console.error("AI extract failed:", e instanceof Error ? e.message : String(e));
      }
    }

    await markSourceSuccess(source.id);
    await setJobSuccess(jobId);

    return {
      ok: true,
      source: source.key,
      kind: source.kind,
      upserted_raw: upsertedRaw,
      fetched_at: (result as any)?.fetched_at ?? null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markSourceError(source.id, msg);
    await setJobError(jobId, msg);
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
