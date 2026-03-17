import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("opportunity-prep");

const PREP_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PREP_VERSION = "v1";
const PREP_AGENT_VERSION = "prep.user.v1";
const PROMPT_VERSION = "v1";

type PrepInput = {
  id: string; // opportunity_id
};

type ChecklistItem = {
  task: string;
  priority: "high" | "med" | "low";
};

type PrepResult = {
  checklist: ChecklistItem[];
  missing_docs: string[];
  effort_days: number | null;
  blockers: string[];
  response_plan: string;
};

class PrepHttpError extends Error {
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

async function insertAgentRun(
  sb: ReturnType<typeof sbAdmin>,
  args: { opportunityId: string; userId: string; model: string },
): Promise<string> {
  const { data, error } = await sb
    .from("agent_runs")
    .insert({
      agent_type: "prep",
      status: "running",
      trigger_type: "user",
      model: args.model,
      prompt_version: PROMPT_VERSION,
      agent_version: PREP_AGENT_VERSION,
      started_at: nowIso(),
      input_ref: { opportunity_id: args.opportunityId, user_id: args.userId },
      meta: { prep_version: PREP_VERSION },
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

async function getCurrentPrepIds(
  sb: ReturnType<typeof sbAdmin>,
  opportunityId: string,
  userId: string,
): Promise<string[]> {
  const { data, error } = await sb
    .from("opportunity_preps")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .eq("is_current", true);

  if (error) throw new Error(`failed to load current preps: ${error.message}`);
  return Array.isArray(data)
    ? data.map((r: { id?: unknown }) => String(r.id ?? "")).filter(Boolean)
    : [];
}

async function setPrepsCurrentState(
  sb: ReturnType<typeof sbAdmin>,
  ids: string[],
  isCurrent: boolean,
) {
  if (!ids.length) return;
  const { error } = await sb
    .from("opportunity_preps")
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
  let body: PrepInput;
  try {
    body = (await req.json()) as PrepInput;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }
  if (!body?.id) return json(400, { ok: false, error: "MISSING_FIELDS" });

  // ─── 1. DB cache check (TTL 7 days, per user) ─────────────────────────────
  const staleThreshold = new Date(Date.now() - PREP_TTL_MS).toISOString();
  const { data: cached } = await sb
    .from("opportunity_preps")
    .select("checklist, missing_docs, effort_days, blockers, response_plan")
    .eq("opportunity_id", body.id)
    .eq("user_id", userId)
    .eq("is_current", true)
    .gt("created_at", staleThreshold)
    .maybeSingle();

  if (cached) {
    return json(200, { ok: true, prep: cached, cached: true });
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

  // Current extraction
  const { data: extraction } = await sb
    .from("opportunity_extractions")
    .select("sector, budget_value, budget_currency, eligibility, required_docs, submission, risks")
    .eq("opportunity_id", body.id)
    .eq("is_current", true)
    .maybeSingle();

  // Current brief
  const { data: brief } = await sb
    .from("opportunity_briefs")
    .select("executive_summary, fit_assessment, risk_flags, required_documents, next_action")
    .eq("opportunity_id", body.id)
    .maybeSingle();

  // Current score
  const { data: score } = await sb
    .from("opportunity_scores")
    .select("score_band, rationale_summary")
    .eq("opportunity_id", body.id)
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();

  // Current decision
  const { data: decision } = await sb
    .from("opportunity_decisions")
    .select("decision")
    .eq("opportunity_id", body.id)
    .eq("user_id", userId)
    .maybeSingle();

  // Existing documents (to detect missing ones)
  const { data: existingDocs } = await sb
    .from("opportunity_documents")
    .select("doc_title, doc_type")
    .eq("opportunity_id", body.id);

  // User profile
  const { data: profile } = await sb
    .from("user_profiles")
    .select("country_focus, organization")
    .eq("user_id", userId)
    .maybeSingle();

  // ─── 3. Build prompt ───────────────────────────────────────────────────────
  const opp_ = opp as Record<string, unknown>;
  const ext_ = extraction as Record<string, unknown> | null;
  const brief_ = brief as Record<string, unknown> | null;
  const score_ = score as Record<string, unknown> | null;
  const decision_ = decision as Record<string, unknown> | null;
  const profile_ = profile as Record<string, unknown> | null;

  const contextLines: string[] = [
    `Title: ${opp_.title}`,
    `Buyer: ${opp_.buyer_name ?? "Unknown"}`,
    `Country: ${opp_.country_code ?? "Unknown"}`,
    `Type: ${opp_.type ?? "Unknown"}`,
    `Status: ${opp_.status ?? "Unknown"}`,
  ];

  if (opp_.deadline_at) contextLines.push(`Deadline: ${opp_.deadline_at}`);
  if (ext_?.sector) contextLines.push(`Sector: ${ext_.sector}`);
  if (ext_?.budget_value != null)
    contextLines.push(`Budget: ${ext_.budget_value} ${ext_.budget_currency ?? "EUR"}`);
  if (ext_?.eligibility) contextLines.push(`Eligibility: ${JSON.stringify(ext_.eligibility)}`);
  if (ext_?.required_docs) contextLines.push(`Required docs (extraction): ${JSON.stringify(ext_.required_docs)}`);
  if (ext_?.submission) contextLines.push(`Submission info: ${JSON.stringify(ext_.submission)}`);
  if (ext_?.risks) contextLines.push(`Risks: ${JSON.stringify(ext_.risks)}`);
  if (brief_?.executive_summary) contextLines.push(`Summary: ${brief_.executive_summary}`);
  if (brief_?.fit_assessment) contextLines.push(`Fit: ${brief_.fit_assessment}`);
  if (brief_?.risk_flags && Array.isArray(brief_.risk_flags) && brief_.risk_flags.length > 0)
    contextLines.push(`Risk flags: ${(brief_.risk_flags as string[]).join(", ")}`);
  if (brief_?.required_documents && Array.isArray(brief_.required_documents))
    contextLines.push(`Required documents (brief): ${(brief_.required_documents as string[]).join(", ")}`);
  if (score_?.score_band) contextLines.push(`AI score: ${score_.score_band}`);
  if (score_?.rationale_summary) contextLines.push(`Score rationale: ${score_.rationale_summary}`);
  if (decision_?.decision) contextLines.push(`Current decision: ${decision_.decision}`);
  if (profile_?.organization) contextLines.push(`Our organization: ${profile_.organization}`);
  if (profile_?.country_focus) contextLines.push(`Country focus: ${profile_.country_focus}`);

  const existingDocNames = Array.isArray(existingDocs)
    ? (existingDocs as Record<string, unknown>[])
        .map((d) => String(d.doc_title ?? d.doc_type ?? ""))
        .filter(Boolean)
    : [];
  if (existingDocNames.length > 0)
    contextLines.push(`Already collected documents: ${existingDocNames.join(", ")}`);

  const systemPrompt = [
    "You are an expert public procurement bid manager preparing a response plan for an opportunity.",
    "Analyze the context and return a JSON object with exactly this structure:",
    "{",
    '  "checklist": [{"task": "...", "priority": "high"|"med"|"low"}, ...],',
    '  "missing_docs": ["doc name", ...],',
    '  "effort_days": <integer 1-30>,',
    '  "blockers": ["blocker description", ...],',
    '  "response_plan": "2-3 sentence strategic approach"',
    "}",
    "Rules:",
    "- checklist: 5-8 concrete, actionable tasks ordered by urgency. Priority high = must do first.",
    "- missing_docs: documents required but NOT in the already collected list. Max 5.",
    "- effort_days: realistic working days to prepare a complete response. Be conservative.",
    "- blockers: up to 3 main risks or blockers. Empty array if none.",
    "- response_plan: brief strategic approach (positioning, differentiators, key argument).",
    "Respond in English.",
  ].join("\n");

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
          { role: "user", content: `Opportunity context:\n${contextLines.join("\n")}` },
        ],
        max_tokens: 700,
        temperature: 0.2,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      log.error("openai_error", { status: openaiRes.status, response: errText });
      throw new PrepHttpError(502, "AI_ERROR");
    }

    const generation_ms = Date.now() - t0;
    const openaiData = (await openaiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = openaiData.choices?.[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as Record<string, unknown>;

    const checklist: ChecklistItem[] = Array.isArray(raw.checklist)
      ? (raw.checklist as Record<string, unknown>[])
          .slice(0, 8)
          .filter((item) => typeof item === "object" && item !== null)
          .map((item) => ({
            task: String(item.task ?? ""),
            priority: (["high", "med", "low"].includes(String(item.priority))
              ? item.priority
              : "med") as "high" | "med" | "low",
          }))
          .filter((item) => item.task)
      : [];

    const missing_docs: string[] = Array.isArray(raw.missing_docs)
      ? (raw.missing_docs as unknown[]).map(String).slice(0, 5)
      : [];

    const effort_days_raw = Number(raw.effort_days);
    const effort_days: number | null = Number.isFinite(effort_days_raw) && effort_days_raw > 0
      ? Math.min(30, Math.round(effort_days_raw))
      : null;

    const blockers: string[] = Array.isArray(raw.blockers)
      ? (raw.blockers as unknown[]).map(String).slice(0, 3)
      : [];

    const response_plan = String(raw.response_plan ?? "");

    const prep: PrepResult = { checklist, missing_docs, effort_days, blockers, response_plan };

    // ─── 5. Persist to DB ─────────────────────────────────────────────────
    const previousCurrentIds = await getCurrentPrepIds(sb, body.id, userId);
    await setPrepsCurrentState(sb, previousCurrentIds, false);

    let prepRowId = "";
    try {
      const { data: inserted, error: insertErr } = await sb
        .from("opportunity_preps")
        .insert({
          opportunity_id: body.id,
          agent_run_id: agentRunId,
          user_id: userId,
          is_backfilled: false,
          is_current: true,
          prep_version: PREP_VERSION,
          model,
          generation_ms,
          checklist: prep.checklist,
          missing_docs: prep.missing_docs,
          effort_days: prep.effort_days,
          blockers: prep.blockers,
          response_plan: prep.response_plan,
          input_snapshot: {
            context_lines: contextLines,
            existing_docs: existingDocNames,
          },
        })
        .select("id")
        .single();

      if (insertErr || !inserted?.id) {
        await setPrepsCurrentState(sb, previousCurrentIds, true);
        throw new Error(insertErr?.message ?? "failed to insert prep row");
      }
      prepRowId = String(inserted.id);
    } catch (insertErr) {
      try {
        await setPrepsCurrentState(sb, previousCurrentIds, true);
      } catch (restoreErr) {
        log.error("restore_preps_failed", { error: serializeError(restoreErr) });
      }
      throw insertErr;
    }

    await updateAgentRun(sb, agentRunId, {
      status: "success",
      finished_at: nowIso(),
      duration_ms: generation_ms,
      opportunity_id: body.id,
      output_ref: { prep_id: prepRowId },
      meta: { prep_version: PREP_VERSION },
    });

    log.info("prep_generated", {
      opportunity_id: body.id,
      user_id: userId,
      model,
      checklist_count: checklist.length,
      effort_days,
      generation_ms,
    });

    return json(200, { ok: true, prep, cached: false });
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
          meta: { prep_version: PREP_VERSION },
        });
      } catch (updateErr) {
        log.error("agent_runs_update_failed", { error: serializeError(updateErr) });
      }
    }
    log.error("handler_error", { error: serializeError(originalError) });
    if (originalError instanceof PrepHttpError) {
      return json(originalError.status, { ok: false, error: originalError.code });
    }
    return json(500, { ok: false, error: "INTERNAL_ERROR" });
  }
});
