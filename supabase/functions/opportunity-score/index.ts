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
};

type ScoreDimension = {
  key: string;
  label: string;
  score: number; // 0-1
  comment: string;
};

type ScoreResult = {
  score_value: number; // 0-1 weighted average
  score_band: "high" | "med" | "low";
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

  // ─── 1. DB cache check (TTL 7 days, per user) ─────────────────────────────
  const staleThreshold = new Date(Date.now() - SCORE_TTL_MS).toISOString();
  const { data: cached } = await sb
    .from("opportunity_scores")
    .select("score_value, score_band, rationale_summary, rationale_json")
    .eq("opportunity_id", body.id)
    .eq("user_id", userId)
    .eq("is_current", true)
    .gt("created_at", staleThreshold)
    .maybeSingle();

  if (cached) {
    return json(200, { ok: true, score: cached, cached: true });
  }

  // ─── 2. Load context ───────────────────────────────────────────────────────
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });

  // Opportunity
  const { data: opp, error: oppErr } = await sb
    .from("opportunities")
    .select("title, buyer_name, country_code, status, deadline_at, type, summary")
    .eq("id", body.id)
    .single();

  if (oppErr || !opp) return json(404, { ok: false, error: "OPPORTUNITY_NOT_FOUND" });

  // Latest extraction (optional enrichment)
  const { data: extraction } = await sb
    .from("opportunity_extractions")
    .select(
      "id, sector, budget_value, budget_currency, summary_10s, eligibility, risks, extraction_quality",
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
    "Respond in English regardless of opportunity language.",
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
          { role: "user", content: userMessage },
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
    const score_value = Number.isFinite(rawScoreValue)
      ? Math.min(1, Math.max(0, rawScoreValue))
      : (() => {
          const get = (key: string) => dimensions.find((d) => d.key === key)?.score ?? 0.5;
          return get("fit") * 0.35 + get("effort") * 0.25 + get("urgency") * 0.2 + get("strategic") * 0.2;
        })();

    const score: ScoreResult = {
      score_value: Math.round(score_value * 1000) / 1000,
      score_band: toScoreBand(score_value),
      rationale_summary: String(raw.rationale_summary ?? ""),
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
          rationale_summary: score.rationale_summary,
          rationale_json: score.rationale_json,
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
