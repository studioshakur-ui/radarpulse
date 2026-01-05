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
  _sb = sbAdmin(); // IMPORTANT: sbAdmin() retourne le client
  return _sb;
}

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

function safeString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function ensureTitle(input: OpportunityUpsertInput): string {
  const t = safeString(input.title)?.trim();
  return t && t.length > 0 ? t : "Untitled opportunity";
}

function normalizeSourceUrlOrThrow(sourceUrl: string): { url: string; url_canonical: string } {
  const u = String(sourceUrl ?? "").trim();
  if (!u) throw new Error("Missing source_url");
  const canonical = canonicalizeUrl(u);
  if (!canonical) throw new Error(`Invalid url: ${u}`);
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

async function getRawByCanonicalUrl(sourceId: string, urlCanonical: string): Promise<DbRawRow | null> {
  const { data, error } = await sb()
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

async function insertRaw(source: SourceRow, opp: OpportunityUpsertInput): Promise<DbRawRow> {
  const title = ensureTitle(opp);
  const { url, url_canonical } = normalizeSourceUrlOrThrow(opp.source_url);

  const published_at = opp.published_at ? new Date(opp.published_at).toISOString() : null;
  const fetched_at = nowIso();

  // contenu minimal: summary sinon dump raw (très tronqué)
  const rawText =
    (opp.summary && opp.summary.trim()) ||
    (opp.raw ? JSON.stringify(opp.raw).slice(0, 4000) : "");

  const content_raw = rawText ? normalizeText(rawText) : null;
  const content_hash = content_raw ? await sha256Hex(content_raw) : null;

  const existing = await getRawByCanonicalUrl(source.id, url_canonical);
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
    hints: (opp.raw ?? null) as Record<string, unknown> | null,
    confidence: null,
  };

  const { data, error } = await sb()
    .from("opportunities_raw")
    .insert(payloadRow)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to insert raw: ${error.message}`);
  return data as DbRawRow;
}

async function upsertAi(rawId: string) {
  // l’extract gère ses propres upserts internes
  await extractLightForRawId(rawId);
}

async function processJob(job: IngestionJobRow) {
  await setJobRunning(job.id);

  const source = await getSource(job.source_id);

  try {
    const result = await runConnector(source);

    let insertedRaw = 0;

    for (const opp of result.opportunities) {
      const raw = await insertRaw(source, opp);
      insertedRaw += 1;
      await upsertAi(raw.id);
    }

    await markSourceSuccess(source.id);
    await setJobSuccess(job.id);

    return {
      ok: true,
      source: source.key,
      kind: source.kind,
      inserted_raw: insertedRaw,
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
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, { status: 405 });

  const { data: job, error } = await sb().rpc("claim_next_ingestion_job").maybeSingle();

  if (error) return json({ ok: false, error: `claim_next_ingestion_job failed: ${error.message}` }, { status: 500 });
  if (!job) return json({ ok: true, message: "no_jobs" });

  return json(await processJob(job as IngestionJobRow));
});
