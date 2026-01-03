// supabase/functions/_shared/rp_ai_extract_light.ts
// RadarPulse — Extractor V1.light (backend-only)
// - Fetches opportunities_raw
// - Calls OpenAI Responses API with Structured Outputs (JSON schema strict)
// - Upserts opportunity_ai by fingerprint
// - Replaces evidence rows for that ai_id
// - Logs minimal observability in rp_ai_runs
//
// References:
// - Structured Outputs (Responses API text.format json_schema strict) :contentReference[oaicite:1]{index=1}
// - Responses API "store" parameter :contentReference[oaicite:2]{index=2}
//
// NOTE: This file is safe to import from multiple functions (worker + endpoint).

import { RP_AI_SCHEMA_NAME_V1_LIGHT, RP_AI_SCHEMA_V1_LIGHT } from "./rp_ai_schema_v1_light.ts";
import { canonicalizeUrl, extractResponseText, normalizeText, sha256Hex } from "./rp_ai_utils.ts";

type SupabaseClientLike = {
  from: (table: string) => any;
};

export type ExtractLightOptions = {
  openaiApiKey: string;
  openaiModel?: string;
  openaiStore?: boolean; // default false recommended
  extractVersion?: string; // default "v1.light"
  minContentChars?: number; // gating
  maxContentChars?: number; // truncation
};

export type ExtractLightResult = {
  status: "success" | "skipped";
  reason?: string;
  ai_id?: string;
  fingerprint?: string;
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

export async function extractLightForRawId(
  supabase: SupabaseClientLike,
  rawId: string,
  opts: ExtractLightOptions,
): Promise<ExtractLightResult> {
  const started = Date.now();
  const model = opts.openaiModel || "gpt-4o-mini";
  const store = Boolean(opts.openaiStore ?? false);
  const extractVersion = opts.extractVersion || "v1.light";
  const minChars = opts.minContentChars ?? 280;
  const maxChars = opts.maxContentChars ?? 24_000;

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

  try {
    const { data: raw, error: rawErr } = await supabase
      .from("opportunities_raw")
      .select("id,source_key,external_id,url,url_canonical,title_raw,snippet_raw,content_raw,published_at,content_hash")
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
      openaiApiKey: opts.openaiApiKey,
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
    const buyer_name = parsed?.buyer_name ?? null;
    const sector = parsed?.sector ?? null;
    const country_code = parsed?.geo?.country_code ?? null;
    const region = parsed?.geo?.region ?? null;
    const language = parsed?.language ?? null;

    const deadline_at = parsed?.deadline?.deadline_at ?? null;
    const deadline_tz = parsed?.deadline?.timezone ?? null;
    const deadline_confidence = parsed?.deadline?.confidence ?? "unknown";

    const summary_10s = String(parsed?.summary_10s || "").trim();
    if (!summary_10s) throw new Error("Missing summary_10s in structured output");

    const risks = Array.isArray(parsed?.risks) ? parsed.risks : null;
    const evidence = Array.isArray(parsed?.evidence) ? parsed.evidence : [];

    const q = mapQualityToDb(parsed?.quality);

    const fingerprintComputed = await computeFingerprintDeterministic({
      source_key: raw.source_key,
      external_id: raw.external_id,
      title_raw: title,
      buyer_name,
      deadline_at,
      url_canonical: urlCanonical,
    });

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

          fingerprint: fingerprintComputed,

          extraction_quality: q.extraction_quality,
          needs_review: q.needs_review,
          missing_fields: q.missing_fields,
          signals: q.signals,

          raw_snapshot: parsed,
        },
        { onConflict: "fingerprint" },
      )
      .select("id,fingerprint")
      .single();

    if (aiErr || !aiRow) throw new Error(aiErr?.message || "upsert opportunity_ai failed");

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

    return { status: "success", ai_id: aiRow.id, fingerprint: aiRow.fingerprint };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase
        .from("rp_ai_runs")
        .update({
          status: "error",
          finished_at: nowIso(),
          duration_ms: Date.now() - started,
          error_message: msg,
        })
        .eq("id", runId);
    }
    throw err;
  }
}
