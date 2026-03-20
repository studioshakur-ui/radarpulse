import { sbAdmin } from "./db.ts";

const PREP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREP_VERSION = "v1";
const PREP_AGENT_VERSION = "prep.user.v1";
const PROMPT_VERSION = "v1";

type ChecklistItem = {
  task: string;
  priority: "high" | "med" | "low";
};

export type PrepResult = {
  checklist: ChecklistItem[];
  missing_docs: string[];
  effort_days: number | null;
  blockers: string[];
  response_plan: string;
};

export class PrepRunnerError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function serializeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function insertAgentRun(
  sb: ReturnType<typeof sbAdmin>,
  args: {
    opportunityId: string;
    userId: string;
    model: string;
    triggerType: string;
    decisionId?: string | null;
  },
): Promise<string> {
  const meta: Record<string, unknown> = { prep_version: PREP_VERSION };
  if (args.decisionId) meta.decision_id = args.decisionId;

  const { data, error } = await sb
    .from("agent_runs")
    .insert({
      agent_type: "prep",
      status: "running",
      trigger_type: args.triggerType,
      opportunity_id: args.opportunityId,
      user_id: args.userId,
      model: args.model,
      prompt_version: PROMPT_VERSION,
      agent_version: PREP_AGENT_VERSION,
      started_at: nowIso(),
      input_ref: { opportunity_id: args.opportunityId, user_id: args.userId },
      meta,
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
  outputLocale: "en" | "fr" | "it",
): Promise<string[]> {
  const { data, error } = await sb
    .from("opportunity_preps")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .eq("output_locale", outputLocale)
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

export async function generateOpportunityPrep(
  sb: ReturnType<typeof sbAdmin>,
  args: {
    opportunityId: string;
    userId: string;
    triggerType: "user" | "system";
    decisionId?: string | null;
    outputLocale?: "en" | "fr" | "it";
  },
): Promise<{ prep: PrepResult; cached: boolean }> {
  const outputLocale = args.outputLocale === "fr" || args.outputLocale === "it" ? args.outputLocale : "en";
  const staleThreshold = new Date(Date.now() - PREP_TTL_MS).toISOString();
  const { data: cached } = await sb
    .from("opportunity_preps")
    .select("checklist, missing_docs, effort_days, blockers, response_plan")
    .eq("opportunity_id", args.opportunityId)
    .eq("user_id", args.userId)
    .eq("is_current", true)
    .eq("output_locale", outputLocale)
    .gt("created_at", staleThreshold)
    .maybeSingle();

  if (cached) {
    const effortValue = Number(cached.effort_days ?? null);
    return {
      cached: true,
      prep: {
        checklist: Array.isArray(cached.checklist)
          ? cached.checklist as ChecklistItem[]
          : [],
        missing_docs: Array.isArray(cached.missing_docs) ? cached.missing_docs.map(String) : [],
        effort_days: Number.isFinite(effortValue) ? effortValue : null,
        blockers: Array.isArray(cached.blockers) ? cached.blockers.map(String) : [],
        response_plan: String(cached.response_plan ?? ""),
      },
    };
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new PrepRunnerError(500, "SERVER_CONFIG_ERROR");

  const { data: opp, error: oppErr } = await sb
    .from("opportunities")
    .select("title, buyer_name, country_code, status, deadline_at, type, summary")
    .eq("id", args.opportunityId)
    .single();

  if (oppErr || !opp) throw new PrepRunnerError(404, "OPPORTUNITY_NOT_FOUND");

  const { data: extraction } = await sb
    .from("opportunity_extractions")
    .select("sector, budget_value, budget_currency, eligibility, required_docs, submission, risks")
    .eq("opportunity_id", args.opportunityId)
    .eq("is_current", true)
    .maybeSingle();

  const { data: brief } = await sb
    .from("opportunity_briefs")
    .select("executive_summary, fit_assessment, risk_flags, required_documents, next_action")
    .eq("opportunity_id", args.opportunityId)
    .eq("output_locale", outputLocale)
    .maybeSingle();

  const { data: score } = await sb
    .from("opportunity_scores")
    .select("score_band, rationale_summary")
    .eq("opportunity_id", args.opportunityId)
    .eq("user_id", args.userId)
    .eq("output_locale", outputLocale)
    .eq("is_current", true)
    .maybeSingle();

  const { data: decision } = await sb
    .from("opportunity_decisions")
    .select("decision")
    .eq("opportunity_id", args.opportunityId)
    .eq("user_id", args.userId)
    .maybeSingle();

  const { data: existingDocs } = await sb
    .from("opportunity_documents")
    .select("doc_title, doc_type")
    .eq("opportunity_id", args.opportunityId);

  const { data: profile } = await sb
    .from("user_profiles")
    .select("country_focus, organization")
    .eq("user_id", args.userId)
    .maybeSingle();

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
  if (ext_?.budget_value != null) {
    contextLines.push(`Budget: ${ext_.budget_value} ${ext_.budget_currency ?? "EUR"}`);
  }
  if (ext_?.eligibility) contextLines.push(`Eligibility: ${JSON.stringify(ext_.eligibility)}`);
  if (ext_?.required_docs) contextLines.push(`Required docs (extraction): ${JSON.stringify(ext_.required_docs)}`);
  if (ext_?.submission) contextLines.push(`Submission info: ${JSON.stringify(ext_.submission)}`);
  if (ext_?.risks) contextLines.push(`Risks: ${JSON.stringify(ext_.risks)}`);
  if (brief_?.executive_summary) contextLines.push(`Summary: ${brief_.executive_summary}`);
  if (brief_?.fit_assessment) contextLines.push(`Fit: ${brief_.fit_assessment}`);
  if (brief_?.risk_flags && Array.isArray(brief_.risk_flags) && brief_.risk_flags.length > 0) {
    contextLines.push(`Risk flags: ${(brief_.risk_flags as string[]).join(", ")}`);
  }
  if (brief_?.required_documents && Array.isArray(brief_.required_documents)) {
    contextLines.push(`Required documents (brief): ${(brief_.required_documents as string[]).join(", ")}`);
  }
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
  if (existingDocNames.length > 0) {
    contextLines.push(`Already collected documents: ${existingDocNames.join(", ")}`);
  }

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
    outputLocale === "fr" ? "Respond in French." : outputLocale === "it" ? "Respond in Italian." : "Respond in English.",
    outputLocale === "fr"
      ? "All user-visible strings, including checklist tasks, blockers, missing_docs, and response_plan, must be in French."
      : outputLocale === "it"
        ? "All user-visible strings, including checklist tasks, blockers, missing_docs, and response_plan, must be in Italian."
        : "All user-visible strings, including checklist tasks, blockers, missing_docs, and response_plan, must be in English.",
  ].join("\n");

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
  const t0 = Date.now();
  const agentRunId = await insertAgentRun(sb, {
    opportunityId: args.opportunityId,
    userId: args.userId,
    model,
    triggerType: args.triggerType,
    decisionId: args.decisionId ?? null,
  });

  try {
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

    if (!openaiRes.ok) throw new PrepRunnerError(502, "AI_ERROR");

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

    const previousCurrentIds = await getCurrentPrepIds(sb, args.opportunityId, args.userId, outputLocale);
    await setPrepsCurrentState(sb, previousCurrentIds, false);

    let prepRowId = "";
    try {
      const { data: inserted, error: insertErr } = await sb
        .from("opportunity_preps")
        .insert({
          opportunity_id: args.opportunityId,
          agent_run_id: agentRunId,
          user_id: args.userId,
          is_backfilled: false,
          is_current: true,
          prep_version: PREP_VERSION,
          model,
          generation_ms,
          output_locale: outputLocale,
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
        console.error("[opportunity_prep_runner] restore_preps_failed:", serializeError(restoreErr));
      }
      throw insertErr;
    }

    const meta: Record<string, unknown> = { prep_version: PREP_VERSION };
    if (args.decisionId) meta.decision_id = args.decisionId;

    await updateAgentRun(sb, agentRunId, {
      status: "success",
      finished_at: nowIso(),
      duration_ms: generation_ms,
      opportunity_id: args.opportunityId,
      user_id: args.userId,
      output_ref: { prep_id: prepRowId },
      meta,
    });

    return { prep, cached: false };
  } catch (e) {
    const originalError = e instanceof Error ? e : new Error(String(e));
    const meta: Record<string, unknown> = { prep_version: PREP_VERSION };
    if (args.decisionId) meta.decision_id = args.decisionId;

    try {
      await updateAgentRun(sb, agentRunId, {
        status: "error",
        finished_at: nowIso(),
        duration_ms: Date.now() - t0,
        opportunity_id: args.opportunityId,
        user_id: args.userId,
        error_message: originalError.message,
        output_ref: null,
        meta,
      });
    } catch (updateErr) {
      console.error("[opportunity_prep_runner] agent_runs_update_failed:", serializeError(updateErr));
    }
    throw originalError;
  }
}
