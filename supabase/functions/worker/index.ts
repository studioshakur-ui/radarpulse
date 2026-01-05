import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { extractLightForRawId } from "../_shared/rp_ai_extract_light.ts";
import type { IngestionJobRow, OpportunityUpsertInput, SourceRow } from "../_shared/types.ts";
import { normalizeText } from "../_shared/text.ts";
import { canonicalizeUrl, sha256Hex } from "../_shared/rp_ai_utils.ts";
import { runConnector } from "./connectors/index.ts";

let _sb: any | null = null;
function sb() {
  if (_sb) return _sb;
  _sb = sbAdmin();
  return _sb;
}

type DbRawRow = {
  id: string;
  source_id: string | null;
  source_key: string;
  external_id: string | null;
  url: string;
  url_canonical: string;
  title_raw: string;
  snippet_raw: string | null;
  content_raw: string | null;
  content_hash: string;
  published_at: string | null;
  fetched_at: string;
  language_hint: string | null;
  raw_kind_hint: string | null;
  attachments: unknown;
  ingest_run_id: string | null;
  ingest_errors: unknown;
  created_at: string;
  updated_at: string;
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

function safeString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function getBoolEnv(name: string, defaultValue: boolean): boolean {
  const v = Deno.env.get(name);
  if (!v) return defaultValue;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function ensureTitle(input: OpportunityUpsertInput): string {
  const t = safeString(input.title)?.trim();
  return t && t.length > 0 ? t : "Untitled opportunity";
}

function normalizeUrlOrThrow(url: string, label: string): { url: string; url_canonical: string } {
  const u = String(url ?? "").trim();
  if (!u) throw new Error(`Missing url (${label})`);
  const canonical = canonicalizeUrl(u);
  if (!canonical) throw new Error(`Invalid url (${label}): ${u}`);
  return { url: u, url_canonical: canonical };
}

async function setJobRunning(jobId: number) {
  const { error } = await sb()
    .from("ingestion_jobs")
    .update({ status: "running", started_at: nowIso(), updated_at: nowIso() })
    .eq("id", jobId);

  if (error) throw new Error(`Failed to set job running: ${error.message}`);
}

async function setJobSuccess(jobId: number) {
  const { error } = await sb()
    .from("ingestion_jobs")
    .update({ status: "success", finished_at: nowIso(), updated_at: nowIso(), error: null })
    .eq("id", jobId);

  if (error) throw new Error(`Failed to set job success: ${error.message}`);
}

async function setJobError(jobId: number, message: string) {
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

async function getRawBySourceExternal(sourceKey: string, externalId: string): Promise<Pick<DbRawRow, "id" | "content_hash"> | null> {
  const { data, error } = await sb()
    .from("opportunities_raw")
    .select("id, content_hash")
    .eq("source_key", sourceKey)
    .eq("external_id", externalId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to lookup raw by external_id: ${error.message}`);
  return (data ?? null) as Pick<DbRawRow, "id" | "content_hash"> | null;
}

async function insertOrUpdateRaw(source: SourceRow, opp: OpportunityUpsertInput): Promise<DbRawRow> {
  const title_raw = ensureTitle(opp);

  const preferredUrl = (safeString(opp.source_url)?.trim() || "") || (safeString(source.url)?.trim() || "");
  const { url, url_canonical } = normalizeUrlOrThrow(preferredUrl, "opportunity/source");

  const published_at = opp.published_at ? new Date(opp.published_at).toISOString() : null;
  const fetched_at = nowIso();

  const snippet_raw = opp.summary ? safeString(opp.summary)?.trim() || null : null;

  // contenu minimal : summary sinon raw JSON tronqué
  const rawText =
    (snippet_raw && snippet_raw.length > 0 ? snippet_raw : "") ||
    (opp.raw ? JSON.stringify(opp.raw).slice(0, 6000) : "");

  const content_raw = rawText ? normalizeText(rawText) : null;

  // content_hash est NOT NULL dans le schéma : on le calcule toujours
  const hashBasis = normalizeText(`${title_raw}\n${snippet_raw ?? ""}\n${content_raw ?? ""}\n${url_canonical}`);
  const content_hash = await sha256Hex(hashBasis);

  // external_id: idéalement fourni par provider, sinon fingerprint (obligatoire), sinon fallback url_canonical
  const external_id =
    (opp.external_id && String(opp.external_id).trim()) ? String(opp.external_id).trim() :
    (opp.fingerprint && String(opp.fingerprint).trim()) ? String(opp.fingerprint).trim() :
    url_canonical;

  const existing = await getRawBySourceExternal(source.key, external_id);
  if (existing?.id && existing.content_hash === content_hash) {
    // identique → rien à faire
    const { data, error } = await sb().from("opportunities_raw").select("*").eq("id", existing.id).single();
    if (error) throw new Error(`Failed to reload raw: ${error.message}`);
    return data as DbRawRow;
  }

  const payloadRow = {
    source_id: source.id,
    source_key: source.key,
    external_id,
    url,
    url_canonical,
    title_raw,
    snippet_raw,
    content_raw,
    content_hash,
    published_at,
    fetched_at,
    language_hint: opp.language ?? null,
    raw_kind_hint: source.kind ?? null,
    // attachments jsonb default [], ingest_run_id null, ingest_errors null
    updated_at: nowIso(),
  };

  if (existing?.id) {
    const { data, error } = await sb()
      .from("opportunities_raw")
      .update(payloadRow)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(`Failed to update raw: ${error.message}`);
    return data as DbRawRow;
  }

  const { data, error } = await sb()
    .from("opportunities_raw")
    .insert(payloadRow)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to insert raw: ${error.message}`);
  return data as DbRawRow;
}

async function upsertAi(rawId: string) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
  if (!OPENAI_API_KEY) return; // AI désactivée si secret manquant (ne casse pas l’ingestion)

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

async function processJob(job: IngestionJobRow) {
  await setJobRunning(job.id);

  const source = await getSource(job.source_id);

  try {
    const result = await runConnector(source);

    let inserted = 0;
    let skipped = 0;

    for (const opp of result.opportunities as OpportunityUpsertInput[]) {
      try {
        const raw = await insertOrUpdateRaw(source, opp);
        inserted += 1;

        try {
          await upsertAi(raw.id);
        } catch (e) {
          // AI best-effort: ne doit pas casser le job
          console.error("AI extract failed:", e instanceof Error ? e.message : String(e));
        }
      } catch (e) {
        skipped += 1;
        console.error("Skip opportunity (raw insert failed):", e instanceof Error ? e.message : String(e));
      }
    }

    await markSourceSuccess(source.id);
    await setJobSuccess(job.id);

    return { ok: true, source: source.key, kind: source.kind, inserted, skipped };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markSourceError(source.id, msg);
    await setJobError(job.id, msg);
    return { ok: false, source: source.key, kind: source.kind, error: msg };
  }
}

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

  try {
    const results: any[] = [];

    for (let i = 0; i < maxJobs; i++) {
      const { data: job, error } = await sb().rpc("claim_next_ingestion_job").maybeSingle();

      if (error) return json({ ok: false, error: `claim_next_ingestion_job failed: ${error.message}` }, { status: 500 });
      if (!job) break;

      results.push(await processJob(job as IngestionJobRow));
    }

    if (!results.length) return json({ ok: true, message: "no_jobs" });
    return json({ ok: true, results });
  } catch (e) {
    // éviter un 502 : on renvoie un 500 JSON propre
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, { status: 500 });
  }
});
