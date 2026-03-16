// supabase/functions/_shared/rp_ai_extract_light.ts
// RadarPulse — Extractor V1.light (backend-only)
// - Fetches opportunities_raw
// - Calls OpenAI Responses API with Structured Outputs (JSON schema strict)
// - Inserts agent_runs + append-only opportunity_extractions lineage rows
// - Upserts opportunity_ai by fingerprint for compatibility
// - Replaces evidence rows for that ai_id
// - Logs minimal observability in rp_ai_runs
// NOTE: This file is safe to import from multiple functions (worker + endpoint).

import { RP_AI_SCHEMA_NAME_V1_LIGHT, RP_AI_SCHEMA_V1_LIGHT } from "./rp_ai_schema_v1_light.ts";
import { canonicalizeUrl, extractResponseText, normalizeText, sha256Hex } from "./rp_ai_utils.ts";

type SupabaseClientLike = {
  from: (table: string) => any;
};

const EXTRACT_AGENT_VERSION = "extract.dualwrite.v1";
const EXTRACT_PROMPT_VERSION = "v1.light";

export type ExtractLightOptions = {
  openaiApiKey: string;
  openaiModel?: string;
  openaiStore?: boolean; // default false recommended
  extractVersion?: string; // default "v1.light"
  minContentChars?: number; // gating
  maxContentChars?: number; // truncation
  triggerType?: string;
  sourceId?: string | null;
  ingestionRunId?: string | null;
};

export type ExtractLightResult = {
  status: "success" | "skipped";
  reason?: string;
  ai_id?: string;
  fingerprint?: string;
  opportunity_id?: string;
  agent_run_id?: string;
  extraction_id?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function clampText(s: string, maxChars: number): string {
  const x = String(s || "");
  if (x.length <= maxChars) return x;
  return x.slice(0, maxChars) + "\n\n[TRUNCATED]";
}

function buildPrompt(payload: {
  source_key: string;
  url: string;
  url_canonical: string;
  title_raw: string;
  snippet_raw: string | null;
  content_raw: string | null;
  published_at: string | null;
}): { instructions: string; user: string } {
  const instructions = [
    "You are a strict information extraction engine for RadarPulse.",
    "Your ONLY valid output is JSON that matches the provided JSON Schema (strict mode).",
    "You must reduce noise: classify tender/grant/news/other.",
    "If information is missing, set the field to null (or 'unknown' enum) and add it to quality.missing_fields.",
    "For deadline: only set deadline.deadline_at if you can justify it with a short quote in evidence.",
    "Always produce summary_10s in the canonical format: 'Quoi: ... | Qui: ... | Deadline: ... | Docs: ... | Risque: ...'.",
    "Fingerprint rule:",
    "- If external_id exists, fingerprint is 'source_key::external_id'.",
    "- Otherwise fingerprint must be stable based on title+buyer+deadline(date-only if unsure)+canonical_url.",
    "Evidence rules:",
    "- Include evidence for deadline, buyer_name (if present), and submission clues if any.",
    "- Each evidence item must include a short quote (<=320 chars).",
    "Do not hallucinate budget, eligibility or docs in V1.light; only mention risks if clearly implied.",
  ].join("\n");

  const user = [
    `SOURCE_KEY: ${payload.source_key}`,
    `URL: ${payload.url}`,
    `URL_CANONICAL: ${payload.url_canonical}`,
    payload.published_at ? `PUBLISHED_AT: ${payload.published_at}` : "",
    "",
    `TITLE: ${payload.title_raw}`,
    payload.snippet_raw ? `SNIPPET: ${payload.snippet_raw}` : "",
    "",
    "CONTENT:",
    payload.content_raw ? payload.content_raw : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { instructions, user };
}

async function callOpenAIExtractLight(args: {
  openaiApiKey: string;
  model: string;
  store: boolean;
  instructions: string;
  user: string;
}): Promise<any> {
  const body = {
    model: args.model,
    store: args.store,
    input: [
      { role: "system", content: args.instructions },
      { role: "user", content: args.user },
    ],
    text: {
      format: {
        type: "json_schema",
        name: RP_AI_SCHEMA_NAME_V1_LIGHT,
        strict: true,
        schema: RP_AI_SCHEMA_V1_LIGHT,
      },
    },
  };

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await r.json();
  if (!r.ok) {
    const msg = json?.error?.message || `OpenAI error (${r.status})`;
    throw new Error(msg);
  }
  return json;
}

function computeFingerprintDeterministic(input: {
  source_key: string;
  external_id: string | null;
  title_raw: string;
  buyer_name: string | null;
  deadline_at: string | null; // ISO
  url_canonical: string;
}): Promise<string> | string {
  if (input.external_id && input.external_id.trim()) {
    return `${input.source_key}::${input.external_id.trim()}`;
  }

  const deadlineDateOnly = (() => {
    if (!input.deadline_at) return "";
    try {
      const d = new Date(input.deadline_at);
      if (Number.isNaN(d.getTime())) return "";
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const da = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${da}`;
    } catch {
      return "";
    }
  })();

  const base = [
    input.source_key,
    normalizeText(input.title_raw || ""),
    normalizeText(input.buyer_name || ""),
    deadlineDateOnly,
    normalizeText(input.url_canonical || ""),
  ].join("::");

  return sha256Hex(base).then((h) => `${input.source_key}::${h}`);
}

function mapQualityToDb(q: any): { extraction_quality: "high" | "med" | "low"; needs_review: boolean; missing_fields: any; signals: any } {
  const extraction_quality = (q?.extraction_quality === "high" || q?.extraction_quality === "med" || q?.extraction_quality === "low")
    ? q.extraction_quality
    : "low";

  const needs_review = Boolean(q?.needs_review ?? true);

  const missing_fields = Array.isArray(q?.missing_fields) ? q.missing_fields : [];
  const signals = {
    richness_score: typeof q?.richness_score === "number" ? q.richness_score : null,
    is_opportunity: typeof q?.is_opportunity === "boolean" ? q.is_opportunity : null,
  };

  return { extraction_quality, needs_review, missing_fields, signals };
}

function computeCompatibilityScores(args: {
  region: string | null;
  budgetValue: number | null;
  deadlineAt: string | null;
  buyerName: string | null;
  extractionQuality: "high" | "med" | "low";
}): { quality_score: number; completeness_score: number } {
  const completeness_score =
    (
      (args.region !== null ? 1 : 0) +
      (args.budgetValue !== null ? 1 : 0) +
      (args.deadlineAt !== null ? 1 : 0) +
      (args.buyerName !== null ? 1 : 0)
    ) / 4.0;

  const qualityMultiplier = args.extractionQuality === "high"
    ? 1.0
    : args.extractionQuality === "med"
      ? 0.7
      : 0.4;

  return {
    quality_score: completeness_score * qualityMultiplier,
    completeness_score,
  };
}

function normalizeNullableString(v: unknown): string | null {
  const s = (v ?? null) === null ? "" : String(v);
  const t = s.trim();
  return t ? t : null;
}

function normalizeCountryCode(v: unknown): string | null {
  const s = normalizeNullableString(v);
  if (!s) return null;
  const cc = s.toUpperCase();
  if (cc.length !== 2) return cc;
  return cc;
}

async function findCanonicalOpportunityForRaw(
  supabase: SupabaseClientLike,
  raw: {
    source_id?: string | null;
    external_id?: string | null;
    url?: string | null;
    url_canonical?: string | null;
  },
): Promise<{ id: string; fingerprint: string; country_code: string | null } | null> {
  const sourceId = normalizeNullableString(raw.source_id);
  if (!sourceId) return null;

  const externalId = normalizeNullableString(raw.external_id);
  if (externalId) {
    const { data } = await supabase
      .from("opportunities")
      .select("id,fingerprint,country_code")
      .eq("source_id", sourceId)
      .eq("external_id", externalId)
      .limit(2);
    if (Array.isArray(data) && data.length === 1 && data[0]?.id && data[0]?.fingerprint) {
      return {
        id: String(data[0].id),
        fingerprint: String(data[0].fingerprint),
        country_code: normalizeCountryCode(data[0].country_code),
      };
    }
  }

  const candidates = [normalizeNullableString(raw.url_canonical), normalizeNullableString(raw.url)].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const { data } = await supabase
      .from("opportunities")
      .select("id,fingerprint,country_code")
      .eq("source_id", sourceId)
      .eq("source_url", candidate)
      .limit(2);
    if (Array.isArray(data) && data.length === 1 && data[0]?.id && data[0]?.fingerprint) {
      return {
        id: String(data[0].id),
        fingerprint: String(data[0].fingerprint),
        country_code: normalizeCountryCode(data[0].country_code),
      };
    }
  }

  return null;
}

async function insertAgentRun(
  supabase: SupabaseClientLike,
  args: {
    rawId: string;
    sourceId?: string | null;
    ingestionRunId?: string | null;
    model: string;
    promptVersion: string;
    extractVersion: string;
    triggerType: string;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      agent_type: "extract",
      status: "running",
      trigger_type: args.triggerType,
      source_id: normalizeNullableString(args.sourceId),
      ingestion_run_id: normalizeNullableString(args.ingestionRunId),
      raw_id: args.rawId,
      model: args.model,
      prompt_version: args.promptVersion,
      agent_version: EXTRACT_AGENT_VERSION,
      started_at: nowIso(),
      input_ref: { raw_id: args.rawId },
      meta: {
        extract_version: args.extractVersion,
        compatibility_table: "opportunity_ai",
      },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || "failed to insert agent_runs row");
  }

  return String(data.id);
}

async function updateAgentRun(
  supabase: SupabaseClientLike,
  agentRunId: string | null,
  patch: Record<string, unknown>,
) {
  if (!agentRunId) return;
  const { error } = await supabase.from("agent_runs").update(patch).eq("id", agentRunId);
  if (error) throw new Error(`failed to update agent_runs row: ${error.message}`);
}

async function getCurrentExtractionIds(
  supabase: SupabaseClientLike,
  opportunityId: string,
) {
  const { data, error } = await supabase
    .from("opportunity_extractions")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("is_current", true);

  if (error) throw new Error(`failed to load current extraction rows: ${error.message}`);

  return Array.isArray(data)
    ? data.map((row: { id?: unknown }) => String(row?.id ?? "")).filter(Boolean)
    : [];
}

async function setExtractionsCurrentState(
  supabase: SupabaseClientLike,
  extractionIds: string[],
  isCurrent: boolean,
) {
  if (!extractionIds.length) return;
  const { error } = await supabase
    .from("opportunity_extractions")
    .update({ is_current: isCurrent })
    .in("id", extractionIds);

  if (error) {
    throw new Error(`failed to set current extraction rows to ${isCurrent}: ${error.message}`);
  }
}

async function insertOpportunityExtraction(
  supabase: SupabaseClientLike,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from("opportunity_extractions")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || "failed to insert opportunity_extractions row");
  }

  return String(data.id);
}

export async function extractLightForRawId(
  supabase: SupabaseClientLike,
  rawId: string,
  opts?: ExtractLightOptions,
): Promise<ExtractLightResult> {
  const cfg = opts ?? { openaiApiKey: "" };
  const started = Date.now();
  const model = cfg.openaiModel || "gpt-4o-mini";
  const store = Boolean(cfg.openaiStore ?? false);
  const extractVersion = cfg.extractVersion || "v1.light";
  const triggerType = normalizeNullableString(cfg.triggerType) || "system";
  const minChars = cfg.minContentChars ?? 280;
  const maxChars = cfg.maxContentChars ?? 24_000;

  if (!cfg.openaiApiKey) {
    return { status: "skipped", reason: "ai_skipped_no_api_key" };
  }

  // Start run log early
  const runInsert = await supabase
    .from("rp_ai_runs")
    .insert({
      raw_id: rawId,
      extract_version: extractVersion,
      model,
      status: "success",
      started_at: nowIso(),
    })
    .select("id")
    .single();

  const runId = runInsert?.data?.id as string | undefined;
  const agentRunId = await insertAgentRun(supabase, {
    rawId,
    sourceId: cfg.sourceId ?? null,
    ingestionRunId: cfg.ingestionRunId ?? null,
    model,
    promptVersion: EXTRACT_PROMPT_VERSION,
    extractVersion,
    triggerType,
  });

  try {
    const { data: raw, error: rawErr } = await supabase
      .from("opportunities_raw")
      .select("id,source_id,source_key,external_id,url,url_canonical,title_raw,snippet_raw,content_raw,published_at,content_hash")
      .eq("id", rawId)
      .single();

    if (rawErr || !raw) throw new Error(rawErr?.message || "raw not found");

    const title = String(raw.title_raw || "").trim();
    const snippet = raw.snippet_raw ? String(raw.snippet_raw) : "";
    const content = raw.content_raw ? String(raw.content_raw) : "";
    const richness = (title + "\n" + snippet + "\n" + content).trim();

    if (richness.length < minChars) {
      // Mark skipped
      if (runId) {
        await supabase
          .from("rp_ai_runs")
          .update({
            status: "skipped",
            finished_at: nowIso(),
            duration_ms: Date.now() - started,
            error_message: `gating: content too short (${richness.length} chars)`,
          })
          .eq("id", runId);
      }
      await updateAgentRun(supabase, agentRunId, {
        status: "skipped",
        source_id: normalizeNullableString(raw.source_id) || normalizeNullableString(cfg.sourceId),
        raw_id: raw.id,
        finished_at: nowIso(),
        duration_ms: Date.now() - started,
        error_message: `gating: content too short (${richness.length} chars)`,
        output_ref: null,
        meta: {
          extract_version: extractVersion,
          compatibility_table: "opportunity_ai",
          skipped_reason: "content_too_short",
        },
      });
      return { status: "skipped", reason: "gating: content too short" };
    }

    const urlCanonical = canonicalizeUrl(String(raw.url_canonical || raw.url || ""));
    const contentRawClamped = clampText(richness, maxChars);

    const { instructions, user } = buildPrompt({
      source_key: raw.source_key,
      url: String(raw.url || ""),
      url_canonical: urlCanonical,
      title_raw: title,
      snippet_raw: raw.snippet_raw,
      content_raw: contentRawClamped,
      published_at: raw.published_at ? String(raw.published_at) : null,
    });

    const respJson = await callOpenAIExtractLight({
      openaiApiKey: cfg.openaiApiKey,
      model,
      store,
      instructions,
      user,
    });

    const text = extractResponseText(respJson);
    const parsed = JSON.parse(text);

    // Normalize + deterministic fingerprint enforcement (we trust but verify)
    const content_type = parsed?.content_type;
    const buyer_type = parsed?.buyer_type;
    const buyer_name = normalizeNullableString(parsed?.buyer_name);
    const sector = parsed?.sector ?? null;
    const country_code_from_ai = normalizeCountryCode(parsed?.geo?.country_code);
    const region = normalizeNullableString(parsed?.geo?.region);
    const language = normalizeNullableString(parsed?.language) ?? parsed?.language ?? null;

    const deadline_at = parsed?.deadline?.deadline_at ?? null;
    const deadline_tz = parsed?.deadline?.timezone ?? null;
    const deadline_confidence = parsed?.deadline?.confidence ?? "unknown";

    const summary_10s = String(parsed?.summary_10s || "").trim();
    if (!summary_10s) throw new Error("Missing summary_10s in structured output");

    const risks = Array.isArray(parsed?.risks) ? parsed.risks : [];
    const evidence = Array.isArray(parsed?.evidence) ? parsed.evidence : [];

    const q = mapQualityToDb(parsed?.quality);
    const compatibilityScores = computeCompatibilityScores({
      region,
      budgetValue: null,
      deadlineAt: deadline_at,
      buyerName: buyer_name,
      extractionQuality: q.extraction_quality,
    });

    const fingerprintComputed = await computeFingerprintDeterministic({
      source_key: raw.source_key,
      external_id: raw.external_id,
      title_raw: title,
      buyer_name,
      deadline_at,
      url_canonical: urlCanonical,
    });
    const canonical = await findCanonicalOpportunityForRaw(supabase, {
      source_id: raw.source_id,
      external_id: raw.external_id,
      url: raw.url,
      url_canonical: raw.url_canonical,
    });
    if (!canonical?.id || !canonical?.fingerprint) {
      throw new Error(`Canonical opportunity not found for raw_id=${raw.id}`);
    }
    const fingerprintFinal = canonical?.fingerprint || fingerprintComputed;
    const country_code = canonical?.country_code ?? country_code_from_ai;
    const opportunityId = canonical.id;
    const sourceId = normalizeNullableString(raw.source_id) || normalizeNullableString(cfg.sourceId);
    if (!sourceId) {
      throw new Error(`Missing source_id for raw_id=${raw.id}`);
    }

    // Normalize snapshot to match canonical DB columns (audit-proof)
    const snapshotNormalized = (() => {
      const base = (parsed && typeof parsed === "object") ? parsed : {};

      return {
        ...base,
        content_type,
        buyer_type,
        buyer_name,
        sector,
        geo: {
          country_code,
          region,
        },
        language,
        deadline: {
          deadline_at,
          timezone: deadline_tz,
          confidence: deadline_confidence,
        },
        summary_10s,
        fingerprint: fingerprintFinal,
        risks,
        evidence,
        quality: {
          extraction_quality: q.extraction_quality,
          needs_review: q.needs_review,
          missing_fields: q.missing_fields,
          richness_score: q.signals?.richness_score ?? null,
          is_opportunity: q.signals?.is_opportunity ?? null,
        },
      };
    })();

    // Upsert opportunity_ai by fingerprint
    const { data: aiRow, error: aiErr } = await supabase
      .from("opportunity_ai")
      .upsert(
        {
          raw_id: raw.id,
          model,
          extract_version: extractVersion,
          extracted_at: nowIso(),

          content_type,
          buyer_type,
          buyer_name,

          sector,
          country_code,
          region,
          language,

          deadline_at,
          deadline_tz,
          deadline_confidence,

          eligibility: null,
          required_docs: null,
          submission: null,

          budget_value: null,
          budget_currency: null,
          budget_confidence: null,

          risks,

          summary_10s,

          fingerprint: fingerprintFinal,

          extraction_quality: q.extraction_quality,
          needs_review: q.needs_review,
          missing_fields: q.missing_fields,
          signals: q.signals,

          raw_snapshot: snapshotNormalized,
        },
        { onConflict: "fingerprint" },
      )
      .select("id,fingerprint")
      .single();

    if (aiErr || !aiRow) throw new Error(aiErr?.message || "upsert opportunity_ai failed");

    const previousCurrentExtractionIds = await getCurrentExtractionIds(supabase, opportunityId);
    let extractionId = "";
    await setExtractionsCurrentState(supabase, previousCurrentExtractionIds, false);
    try {
      extractionId = await insertOpportunityExtraction(supabase, {
        opportunity_id: opportunityId,
        raw_id: raw.id,
        agent_run_id: agentRunId,
        source_id: sourceId,
        fingerprint: fingerprintFinal,
        is_backfilled: false,
        is_current: true,
        extract_version: extractVersion,
        model,
        content_type,
        buyer_type,
        buyer_name,
        sector,
        country_code,
        region,
        language,
        deadline_at,
        deadline_tz,
        deadline_confidence,
        eligibility: null,
        required_docs: null,
        submission: null,
        budget_value: null,
        budget_currency: null,
        budget_confidence: null,
        risks,
        summary_10s,
        extraction_quality: q.extraction_quality,
        needs_review: q.needs_review,
        missing_fields: q.missing_fields,
        signals: q.signals,
        raw_snapshot: snapshotNormalized,
        quality_score: compatibilityScores.quality_score,
        completeness_score: compatibilityScores.completeness_score,
      });
    } catch (insertErr) {
      try {
        await setExtractionsCurrentState(supabase, previousCurrentExtractionIds, true);
      } catch (restoreErr) {
        console.error(
          "[rp_ai_extract_light] failed to restore previous current extraction rows:",
          restoreErr instanceof Error ? restoreErr.message : String(restoreErr),
        );
      }
      throw insertErr;
    }

    // Replace evidence rows (delete + insert)
    await supabase.from("opportunity_ai_evidence").delete().eq("ai_id", aiRow.id);

    if (evidence.length) {
      const rows = evidence.map((e: any) => ({
        ai_id: aiRow.id,
        field: String(e?.field || "").slice(0, 120),
        evidence_text: String(e?.quote || "").slice(0, 1000),
        source: String(e?.source || "content_raw").slice(0, 40),
        locator: e?.locator ?? {},
        confidence: e?.confidence === "high" ? "high" : e?.confidence === "low" ? "low" : "med",
      }));

      await supabase.from("opportunity_ai_evidence").insert(rows);
    }

    // Finish run log
    if (runId) {
      await supabase
        .from("rp_ai_runs")
        .update({
          ai_id: aiRow.id,
          status: "success",
          finished_at: nowIso(),
          duration_ms: Date.now() - started,
          error_message: null,
        })
        .eq("id", runId);
    }

    await updateAgentRun(supabase, agentRunId, {
      status: "success",
      source_id: sourceId,
      raw_id: raw.id,
      opportunity_id: opportunityId,
      model,
      prompt_version: EXTRACT_PROMPT_VERSION,
      finished_at: nowIso(),
      duration_ms: Date.now() - started,
      error_message: null,
      output_ref: {
        opportunity_extraction_id: extractionId,
        opportunity_ai_id: aiRow.id,
      },
      meta: {
        extract_version: extractVersion,
        compatibility_table: "opportunity_ai",
        evidence_count: evidence.length,
      },
    });

    return {
      status: "success",
      ai_id: aiRow.id,
      fingerprint: aiRow.fingerprint,
      opportunity_id: opportunityId,
      agent_run_id: agentRunId ?? undefined,
      extraction_id: extractionId,
    };
  } catch (err) {
    const originalError = err instanceof Error ? err : new Error(String(err));
    const msg = originalError.message;
    if (runId) {
      try {
        await supabase
          .from("rp_ai_runs")
          .update({
            status: "error",
            finished_at: nowIso(),
            duration_ms: Date.now() - started,
            error_message: msg,
          })
          .eq("id", runId);
      } catch (runUpdateErr) {
        console.error(
          "[rp_ai_extract_light] failed to update rp_ai_runs error status:",
          runUpdateErr instanceof Error ? runUpdateErr.message : String(runUpdateErr),
        );
      }
    }
    try {
      await updateAgentRun(supabase, agentRunId, {
        status: "error",
        finished_at: nowIso(),
        duration_ms: Date.now() - started,
        error_message: msg,
        output_ref: null,
        meta: {
          extract_version: extractVersion,
          compatibility_table: "opportunity_ai",
        },
      });
    } catch (agentRunUpdateErr) {
      console.error(
        "[rp_ai_extract_light] failed to update agent_runs error status:",
        agentRunUpdateErr instanceof Error ? agentRunUpdateErr.message : String(agentRunUpdateErr),
      );
    }
    throw originalError;
  }
}
