import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("agent-deadline");

const DEFAULT_WINDOW_DAYS = 5;
const AGENT_VERSION = "deadline.monitor.v1";

type DeadlineRequest = {
  key?: string;
  window_days?: number;
};

type OpportunityRow = {
  id: string;
  title: string;
  deadline_at: string | null;
  status: string | null;
  is_deleted: boolean | null;
};

type DecisionRow = {
  id: string;
  opportunity_id: string;
  user_id: string;
  decision: "GO" | "HOLD" | "NO_GO";
};

type PrepRow = {
  opportunity_id: string;
  user_id: string;
  created_at: string;
  checklist: unknown;
  missing_docs: string[] | null;
  effort_days: number | null;
  blockers: string[] | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function daysToDeadline(deadlineAt: string | null): number | null {
  if (!deadlineAt) return null;
  const ts = new Date(deadlineAt).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

async function insertRun(
  sb: ReturnType<typeof sbAdmin>,
  args: { opportunityId: string; userId: string; meta: Record<string, unknown> },
) {
  const { data, error } = await sb
    .from("agent_runs")
    .insert({
      agent_type: "deadline",
      status: "running",
      trigger_type: "schedule",
      opportunity_id: args.opportunityId,
      user_id: args.userId,
      agent_version: AGENT_VERSION,
      started_at: nowIso(),
      input_ref: { opportunity_id: args.opportunityId, user_id: args.userId },
      meta: args.meta,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "failed to insert deadline agent run");
  }
  return String(data.id);
}

async function updateRun(
  sb: ReturnType<typeof sbAdmin>,
  runId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await sb.from("agent_runs").update(patch).eq("id", runId);
  if (error) throw new Error(`failed to update deadline agent run: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const DEV_CALL_KEY = Deno.env.get("DEV_CALL_KEY") ?? "";
  if (!DEV_CALL_KEY) return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });

  let body: DeadlineRequest;
  try {
    body = (await req.json()) as DeadlineRequest;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }

  if (String(body?.key ?? "") !== DEV_CALL_KEY) {
    return json(401, { ok: false, error: "UNAUTHORIZED" });
  }

  const windowDays = Math.max(3, Math.min(7, Number(body?.window_days ?? DEFAULT_WINDOW_DAYS)));
  const cutoff = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString();
  const sb = sbAdmin();

  const { data: opportunities, error: oppsErr } = await sb
    .from("opportunities")
    .select("id, title, deadline_at, status, is_deleted")
    .not("deadline_at", "is", null)
    .lte("deadline_at", cutoff)
    .gte("deadline_at", nowIso())
    .eq("is_deleted", false)
    .returns<OpportunityRow[]>();

  if (oppsErr) {
    log.error("opportunities_fetch_failed", { error: oppsErr.message });
    return json(500, { ok: false, error: "QUERY_FAILED" });
  }

  if (!opportunities?.length) {
    return json(200, { ok: true, inspected: 0, logged: 0, reason: "no_upcoming_deadlines" });
  }

  const opportunityIds = opportunities.map((opp) => opp.id);

  const [{ data: decisions, error: decisionsErr }, { data: prefs, error: prefsErr }] = await Promise.all([
    sb
      .from("opportunity_decisions")
      .select("id, opportunity_id, user_id, decision")
      .in("opportunity_id", opportunityIds)
      .eq("decision", "GO")
      .returns<DecisionRow[]>(),
    sb
      .from("notification_preferences")
      .select("user_id, email_digest_enabled, email_digest_frequency"),
  ]);

  if (decisionsErr || prefsErr) {
    log.error("deadline_dependencies_failed", {
      decisions_error: decisionsErr?.message,
      prefs_error: prefsErr?.message,
    });
    return json(500, { ok: false, error: "QUERY_FAILED" });
  }

  if (!decisions?.length) {
    return json(200, { ok: true, inspected: opportunities.length, logged: 0, reason: "no_go_decisions" });
  }

  const userIds = Array.from(new Set(decisions.map((row) => row.user_id)));
  const { data: preps, error: prepsErr } = await sb
    .from("opportunity_preps")
    .select("opportunity_id, user_id, created_at, checklist, missing_docs, effort_days, blockers")
    .in("opportunity_id", opportunityIds)
    .in("user_id", userIds)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .returns<PrepRow[]>();

  if (prepsErr) {
    log.error("preps_fetch_failed", { error: prepsErr.message });
    return json(500, { ok: false, error: "QUERY_FAILED" });
  }

  const prepMap = new Map<string, PrepRow>();
  for (const prep of preps ?? []) {
    const key = `${prep.opportunity_id}:${prep.user_id}`;
    if (!prepMap.has(key)) {
      prepMap.set(key, prep);
    }
  }

  const prefMap = new Map<string, Record<string, unknown>>();
  for (const pref of prefs ?? []) {
    prefMap.set(String(pref.user_id), pref as Record<string, unknown>);
  }

  let logged = 0;

  for (const decision of decisions) {
    const opp = opportunities.find((item) => item.id === decision.opportunity_id);
    if (!opp) continue;

    const prep = prepMap.get(`${decision.opportunity_id}:${decision.user_id}`) ?? null;
    const checklistCount = Array.isArray(prep?.checklist) ? prep!.checklist.length : 0;
    const missingDocsCount = Array.isArray(prep?.missing_docs) ? prep!.missing_docs.length : 0;
    const deadlineDays = daysToDeadline(opp.deadline_at);
    if (deadlineDays === null) continue;

    const recommendedAction =
      !prep ? "generate_prep"
      : missingDocsCount > 0 ? "close_missing_docs"
      : checklistCount === 0 ? "review_prep"
      : prep.effort_days !== null && deadlineDays <= Math.max(1, Math.ceil(prep.effort_days))
        ? "expedite_submission"
        : "monitor";

    const shouldLog = !prep || missingDocsCount > 0 || checklistCount === 0 || recommendedAction === "expedite_submission";
    if (!shouldLog) continue;

    const pref = prefMap.get(decision.user_id);
    const meta = {
      days_to_deadline: deadlineDays,
      missing_docs_count: missingDocsCount,
      checklist_count: checklistCount,
      recommended_action: recommendedAction,
      decision_id: decision.id,
      email_digest_enabled: Boolean(pref?.email_digest_enabled),
      email_digest_frequency: pref?.email_digest_frequency ?? null,
    };

    const started = Date.now();
    try {
      const runId = await insertRun(sb, {
        opportunityId: decision.opportunity_id,
        userId: decision.user_id,
        meta,
      });

      await updateRun(sb, runId, {
        status: "success",
        finished_at: nowIso(),
        duration_ms: Date.now() - started,
        meta,
        output_ref: {
          opportunity_title: opp.title,
          recommended_action: recommendedAction,
        },
      });
      logged++;
    } catch (error) {
      log.error("deadline_run_failed", {
        opportunity_id: decision.opportunity_id,
        user_id: decision.user_id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log.info("deadline_agent_completed", {
    inspected: decisions.length,
    logged,
    window_days: windowDays,
  });

  return json(200, {
    ok: true,
    inspected: decisions.length,
    logged,
    window_days: windowDays,
  });
});
