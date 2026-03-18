import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("opportunity-score");

const SCORE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SCORE_VERSION = "v1";
const SCORE_AGENT_VERSION = "score.user.v1";
const PROMPT_VERSION = "v1";

type ScoreInput = {
  id: string; // opportunity_id
  locale?: "en" | "fr" | "it";
};

function normalizeLocale(value: unknown): "en" | "fr" | "it" {
  return value === "fr" || value === "it" ? value : "en";
}

function localeName(locale: "en" | "fr" | "it"): string {
  if (locale === "fr") return "French";
  if (locale === "it") return "Italian";
  return "English";
}

type ScoreDimension = {
  key: string;
  label: string;
  score: number; // 0-1
  comment: string;
};

type ScoreResult = {
  score_value: number; // 0-1 weighted average
  score_band: "high" | "med" | "low";
  recommendation: "GO" | "HOLD" | "NO_GO";
  rationale_summary: string;
  rationale_json: { dimensions: ScoreDimension[] };
};

class ScoreHttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function serializeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function nowIso(): string {
  return new Date().toISOString();
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toScoreBand(v: number): "high" | "med" | "low" {
  if (v >= 0.65) return "high";
  if (v >= 0.4) return "med";
  return "low";
}

function getDimensionScore(dimensions: ScoreDimension[], key: string): number | null {
  const dim = dimensions.find((item) => item.key === key);
  return typeof dim?.score === "number" ? dim.score : null;
}

function daysUntilDeadline(deadlineAt: string | null | undefined): number | null {
  if (!deadlineAt) return null;
  const ts = new Date(deadlineAt).getTime();
  if (!Number.isFinite(ts)) return null;
  return (ts - Date.now()) / (1000 * 60 * 60 * 24);
}

function roundScore(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
}

function deadlineScoreMultiplier(daysLeft: number | null): number {
  if (daysLeft === null) return 1;
  if (daysLeft < 0) return 0;
  if (daysLeft <= 1) return 0.15;
  if (daysLeft <= 3) return 0.35;
  if (daysLeft <= 7) return 0.55;
  if (daysLeft <= 14) return 0.75;
  if (daysLeft <= 30) return 0.9;
  return 1;
}

function applyDeadlineAdjustment(scoreValue: number, deadlineAt: string | null | undefined): number {
  const daysLeft = daysUntilDeadline(deadlineAt);
  return roundScore(scoreValue * deadlineScoreMultiplier(daysLeft));
}

function deadlineStatusSummary(
  locale: "en" | "fr" | "it",
  daysLeft: number | null,
  fallback: string,
): string {
  if (daysLeft === null) return fallback;
  if (daysLeft < 0) {
    if (locale === "fr") return "La date limite est dépassée. Cette opportunité devient automatiquement NO-GO.";
    if (locale === "it") return "La scadenza è superata. Questa opportunità diventa automaticamente NO-GO.";
    return "The deadline has passed. This opportunity is automatically NO-GO.";
  }
  if (daysLeft <= 3) {
    if (locale === "fr") return `Échéance imminente (${Math.max(0, Math.ceil(daysLeft))} j). Le score est abaissé pour refléter la pression temporelle.`;
    if (locale === "it") return `Scadenza imminente (${Math.max(0, Math.ceil(daysLeft))} g). Lo score è ridotto per riflettere la pressione temporale.`;
    return `Deadline is imminent (${Math.max(0, Math.ceil(daysLeft))}d). The score is reduced to reflect time pressure.`;
  }
  return fallback;
}

function withDeadlineAdjustedScore<T extends {
  score_value: number;
  score_band: "high" | "med" | "low";
  recommendation: "GO" | "HOLD" | "NO_GO";
}>(
  score: T,
  deadlineAt: string | null | undefined,
): T {
  const adjustedScoreValue = applyDeadlineAdjustment(score.score_value, deadlineAt);
  const adjustedScoreBand = toScoreBand(adjustedScoreValue);
  return {
    ...score,
    score_value: adjustedScoreValue,
    score_band: adjustedScoreBand,
    recommendation: deadlineAt && daysUntilDeadline(deadlineAt) !== null
      ? deriveRecommendation({
          scoreValue: adjustedScoreValue,
          scoreBand: adjustedScoreBand,
          dimensions: "rationale_json" in score && score.rationale_json && typeof score.rationale_json === "object" && Array.isArray((score.rationale_json as { dimensions?: unknown }).dimensions)
            ? ((score.rationale_json as { dimensions: ScoreDimension[] }).dimensions ?? [])
            : [],
          deadlineAt,
          needsReview: false,
        })
      : score.recommendation,
  };
}

function deriveRecommendation(args: {
  scoreValue: number;
  scoreBand: "high" | "med" | "low";
  dimensions: ScoreDimension[];
  deadlineAt: string | null | undefined;
  needsReview: boolean;
}): "GO" | "HOLD" | "NO_GO" {
  const fit = getDimensionScore(args.dimensions, "fit");
  const effort = getDimensionScore(args.dimensions, "effort");
  const urgency = getDimensionScore(args.dimensions, "urgency");
  const strategic = getDimensionScore(args.dimensions, "strategic");
  const daysLeft = daysUntilDeadline(args.deadlineAt);

  if (daysLeft !== null && daysLeft < 0) return "NO_GO";
  if (args.scoreValue < 0.35) return "NO_GO";
  if (args.scoreBand === "low" && args.scoreValue < 0.45) return "NO_GO";
  if (fit !== null && strategic !== null && fit < 0.3 && strategic < 0.35) return "NO_GO";

  if (args.needsReview && args.scoreValue < 0.6) return "HOLD";
  if (daysLeft !== null && daysLeft <= 3 && ((urgency !== null && urgency < 0.45) || args.scoreValue < 0.6)) {
    return "HOLD";
  }

  if (
    args.scoreValue >= 0.68 &&
    (fit === null || fit >= 0.6) &&
    (effort === null || effort >= 0.5) &&
    (urgency === null || urgency >= 0.4) &&
    (strategic === null || strategic >= 0.5) &&
    !args.needsReview
  ) {
    return "GO";
  }

  if (args.scoreBand === "high" && args.scoreValue >= 0.62 && !args.needsReview) return "GO";
  return "HOLD";
}

async function insertAgentRun(
  sb: ReturnType<typeof sbAdmin>,
  args: { opportunityId: string; userId: string; model: string },
): Promise<string> {
  const { data, error } = await sb
    .from("agent_runs")
    .insert({
      agent_type: "score",
      status: "running",
      trigger_type: "user",
      model: args.model,
      prompt_version: PROMPT_VERSION,
      agent_version: SCORE_AGENT_VERSION,
      started_at: nowIso(),
      input_ref: { opportunity_id: args.opportunityId, user_id: args.userId },
      meta: { score_version: SCORE_VERSION },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "failed to insert agent_runs row");
  }
  return String(data.id);
}

async function updateAgentRun(
  sb: ReturnType<typeof sbAdmin>,
  agentRunId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await sb.from("agent_runs").update(patch).eq("id", agentRunId);
  if (error) throw new Error(`failed to update agent_runs: ${error.message}`);
}

async function getCurrentScoreIds(
  sb: ReturnType<typeof sbAdmin>,
  opportunityId: string,
  userId: string,
): Promise<string[]> {
  const { data, error } = await sb
    .from("opportunity_scores")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .eq("is_current", true);

  if (error) throw new Error(`failed to load current scores: ${error.message}`);
  return Array.isArray(data)
    ? data.map((r: { id?: unknown }) => String(r.id ?? "")).filter(Boolean)
    : [];
}

async function setScoresCurrentState(
  sb: ReturnType<typeof sbAdmin>,
  ids: string[],
  isCurrent: boolean,
) {
  if (!ids.length) return;
  const { error } = await sb
    .from("opportunity_scores")
    .update({ is_current: isCurrent })
    .in("id", ids);
  if (error) throw new Error(`failed to set is_current=${isCurrent}: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "UNAUTHORIZED" });
  }
  const token = authHeader.slice(7).trim();

  let sb: ReturnType<typeof sbAdmin>;
  let userId: string;
  try {
    sb = sbAdmin();
    const { data, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !data?.user?.id) return json(401, { ok: false, error: "UNAUTHORIZED" });
    userId = data.user.id;
  } catch {
    return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });
  }

  // ─── Parse body ────────────────────────────────────────────────────────────
  let body: ScoreInput;
  try {
    body = (await req.json()) as ScoreInput;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }
  if (!body?.id) return json(400, { ok: false, error: "MISSING_FIELDS" });
  const outputLocale = normalizeLocale(body.locale);

  // ─── 1. Load context ───────────────────────────────────────────────────────
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });

  // Opportunity
  const { data: opp, error: oppErr } = await sb
    .from("opportunities")
    .select("title, buyer_name, country_code, status, deadline_at, type, summary")
    .eq("id", body.id)
    .single();

  if (oppErr || !opp) return json(404, { ok: false, error: "OPPORTUNITY_NOT_FOUND" });

  // ─── 2. DB cache check (TTL 7 days, per user) ─────────────────────────────
  const staleThreshold = new Date(Date.now() - SCORE_TTL_MS).toISOString();
  const { data: cached } = await sb
    .from("opportunity_scores")
    .select("score_value, score_band, recommendation, rationale_summary, rationale_json")
    .eq("opportunity_id", body.id)
    .eq("user_id", userId)
    .eq("is_current", true)
    .eq("output_locale", outputLocale)
    .gt("created_at", staleThreshold)
    .maybeSingle();

  if (cached) {
    const cachedScore = withDeadlineAdjustedScore(
      cached as ScoreResult,
      typeof (opp as Record<string, unknown>).deadline_at === "string"
        ? (opp as Record<string, unknown>).deadline_at as string
        : null,
    );
    return json(200, { ok: true, score: cachedScore, cached: true });
  }

  // Latest extraction (optional enrichment)
  const { data: extraction } = await sb
    .from("opportunity_extractions")
    .select(
      "id, sector, budget_value, budget_currency, summary_10s, eligibility, risks, extraction_quality, needs_review",
    )
    .eq("opportunity_id", body.id)
    .eq("is_current", true)
    .maybeSingle();

  // User profile (optional personalization)
  const { data: profile } = await sb
    .from("user_profiles")
    .select("country_focus, organization")
    .eq("user_id", userId)
    .maybeSingle();

  // ─── 3. Build prompt ───────────────────────────────────────────────────────
  const oppLines: string[] = [`Title: ${(opp as Record<string, unknown>).title}`];
  if ((opp as Record<string, unknown>).buyer_name)
    oppLines.push(`Buyer: ${(opp as Record<string, unknown>).buyer_name}`);
  if ((opp as Record<string, unknown>).country_code)
    oppLines.push(`Country: ${(opp as Record<string, unknown>).country_code}`);
  if ((opp as Record<string, unknown>).type)
    oppLines.push(`Type: ${(opp as Record<string, unknown>).type}`);
  if ((opp as Record<string, unknown>).status)
    oppLines.push(`Status: ${(opp as Record<string, unknown>).status}`);
  if ((opp as Record<string, unknown>).deadline_at)
    oppLines.push(`Deadline: ${(opp as Record<string, unknown>).deadline_at}`);
  if ((opp as Record<string, unknown>).summary)
    oppLines.push(`Summary: ${(opp as Record<string, unknown>).summary}`);

  const ext = extraction as Record<string, unknown> | null;
  if (ext) {
    if (ext.sector) oppLines.push(`Sector: ${ext.sector}`);
    if (ext.budget_value != null)
      oppLines.push(`Budget: ${ext.budget_value} ${ext.budget_currency ?? "EUR"}`);
    if (ext.summary_10s) oppLines.push(`Quick summary: ${ext.summary_10s}`);
    if (ext.extraction_quality) oppLines.push(`Data quality: ${ext.extraction_quality}`);
    if (ext.eligibility)
      oppLines.push(`Eligibility: ${JSON.stringify(ext.eligibility)}`);
    if (ext.risks) oppLines.push(`Known risks: ${JSON.stringify(ext.risks)}`);
  }

  const prof = profile as Record<string, unknown> | null;
  const profileLines: string[] = [];
  if (prof?.country_focus) profileLines.push(`Buyer's country focus: ${prof.country_focus}`);
  if (prof?.organization) profileLines.push(`Organization: ${prof.organization}`);

  const profileContext =
    profileLines.length > 0
      ? `\n\nUser profile context:\n${profileLines.join("\n")}`
      : "";

  const systemPrompt = [
    "You are an expert public procurement analyst scoring an opportunity for a specific user.",
    "Evaluate the opportunity on exactly 4 dimensions and return a JSON object with this structure:",
    "{",
    '  "dimensions": [',
    '    { "key": "fit", "label": "Profile Fit", "score": 0.0-1.0, "comment": "1-2 sentences" },',
    '    { "key": "effort", "label": "Effort Required", "score": 0.0-1.0, "comment": "1-2 sentences" },',
    '    { "key": "urgency", "label": "Deadline Urgency", "score": 0.0-1.0, "comment": "1-2 sentences" },',
    '    { "key": "strategic", "label": "Strategic Value", "score": 0.0-1.0, "comment": "1-2 sentences" }',
    "  ],",
    '  "rationale_summary": "1-2 sentence overall assessment",',
    '  "score_value": 0.0-1.0 (weighted average: fit×0.35 + effort×0.25 + urgency×0.2 + strategic×0.2)',
    "}",
    "For fit: 1.0 = perfect match. For effort: 1.0 = low effort (easy to respond). For urgency: 1.0 = plenty of time.",
    "For strategic: 1.0 = highly strategic. If profile context is missing, score based on the opportunity alone.",
    `Respond in ${localeName(outputLocale)} regardless of opportunity language.`,
    `All user-visible strings, including dimension labels, comments, and rationale_summary, must be in ${localeName(outputLocale)}.`,
  ].join("\n");

  const userMessage = `Opportunity data:\n${oppLines.join("\n")}${profileContext}`;

  // ─── 4. Call OpenAI ───────────────────────────────────────────────────────
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
  const t0 = Date.now();
  let agentRunId = "";

  try {
    agentRunId = await insertAgentRun(sb, { opportunityId: body.id, userId, model });

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Current timestamp: ${nowIso()}\n${userMessage}` },
        ],
        max_tokens: 600,
        temperature: 0.2,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      log.error("openai_error", { status: openaiRes.status, response: errText });
      throw new ScoreHttpError(502, "AI_ERROR");
    }

    const generation_ms = Date.now() - t0;
    const openaiData = (await openaiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = openaiData.choices?.[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as Record<string, unknown>;

    // Validate and normalise dimensions
    const rawDims = Array.isArray(raw.dimensions) ? raw.dimensions : [];
    const dimensions: ScoreDimension[] = rawDims
      .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
      .map((d) => ({
        key: String(d.key ?? ""),
        label: String(d.label ?? ""),
        score: Math.min(1, Math.max(0, Number(d.score ?? 0))),
        comment: String(d.comment ?? ""),
      }))
      .filter((d) => d.key);

    // Use OpenAI-computed score_value, fallback to weighted average
    const rawScoreValue = Number(raw.score_value);
    const baseScoreValue = Number.isFinite(rawScoreValue)
      ? Math.min(1, Math.max(0, rawScoreValue))
      : (() => {
          const get = (key: string) => dimensions.find((d) => d.key === key)?.score ?? 0.5;
          return get("fit") * 0.35 + get("effort") * 0.25 + get("urgency") * 0.2 + get("strategic") * 0.2;
        })();

    const deadlineAt = typeof (opp as Record<string, unknown>).deadline_at === "string"
      ? (opp as Record<string, unknown>).deadline_at as string
      : null;
    const adjustedScoreValue = applyDeadlineAdjustment(baseScoreValue, deadlineAt);
    const adjustedScoreBand = toScoreBand(adjustedScoreValue);

    const deadlineDaysLeft = daysUntilDeadline(deadlineAt);
    const score: ScoreResult = {
      score_value: adjustedScoreValue,
      score_band: adjustedScoreBand,
      recommendation: deriveRecommendation({
        scoreValue: adjustedScoreValue,
        scoreBand: adjustedScoreBand,
        dimensions,
        deadlineAt,
        needsReview: Boolean(ext?.needs_review),
      }),
      rationale_summary: deadlineStatusSummary(
        outputLocale,
        deadlineDaysLeft,
        String(raw.rationale_summary ?? ""),
      ),
      rationale_json: { dimensions },
    };

    // ─── 5. Persist to DB ─────────────────────────────────────────────────
    const previousCurrentIds = await getCurrentScoreIds(sb, body.id, userId);
    await setScoresCurrentState(sb, previousCurrentIds, false);

    let scoreRowId = "";
    try {
      const { data: inserted, error: insertErr } = await sb
        .from("opportunity_scores")
        .insert({
          opportunity_id: body.id,
          agent_run_id: agentRunId,
          user_id: userId,
          subject_type: "user",
          is_backfilled: false,
          is_current: true,
          score_version: SCORE_VERSION,
          model,
          score_value: score.score_value,
          score_band: score.score_band,
          recommendation: score.recommendation,
          rationale_summary: score.rationale_summary,
          rationale_json: score.rationale_json,
          output_locale: outputLocale,
          input_profile_snapshot: prof ?? null,
          input_extraction_id: ext?.id ?? null,
        })
        .select("id")
        .single();

      if (insertErr || !inserted?.id) {
        await setScoresCurrentState(sb, previousCurrentIds, true);
        throw new Error(insertErr?.message ?? "failed to insert score row");
      }
      scoreRowId = String(inserted.id);
    } catch (insertErr) {
      try {
        await setScoresCurrentState(sb, previousCurrentIds, true);
      } catch (restoreErr) {
        log.error("restore_scores_failed", { error: serializeError(restoreErr) });
      }
      throw insertErr;
    }

    await updateAgentRun(sb, agentRunId, {
      status: "success",
      finished_at: nowIso(),
      duration_ms: generation_ms,
      opportunity_id: body.id,
      output_ref: { score_id: scoreRowId },
      meta: { score_version: SCORE_VERSION },
    });

    log.info("score_generated", {
      opportunity_id: body.id,
      user_id: userId,
      model,
      score_value: score.score_value,
      score_band: score.score_band,
      recommendation: score.recommendation,
      generation_ms,
    });

    return json(200, { ok: true, score, cached: false });
  } catch (e) {
    const originalError = e instanceof Error ? e : new Error(String(e));
    if (agentRunId) {
      try {
        await updateAgentRun(sb, agentRunId, {
          status: "error",
          finished_at: nowIso(),
          duration_ms: Date.now() - t0,
          opportunity_id: body.id,
          error_message: originalError.message,
          output_ref: null,
          meta: { score_version: SCORE_VERSION },
        });
      } catch (updateErr) {
        log.error("agent_runs_update_failed", { error: serializeError(updateErr) });
      }
    }
    log.error("handler_error", { error: serializeError(originalError) });
    if (originalError instanceof ScoreHttpError) {
      return json(originalError.status, { ok: false, error: originalError.code });
    }
    return json(500, { ok: false, error: "INTERNAL_ERROR" });
  }
});
