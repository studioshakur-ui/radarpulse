import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";
import { generateOpportunityPrep } from "../_shared/opportunity_prep_runner.ts";

const log = createLogger("opportunity-decision");

type DecisionValue = "GO" | "HOLD" | "NO_GO";
type DecisionAction = "set" | "clear";

type DecisionRequest = {
  opportunity_id?: string;
  action?: DecisionAction;
  decision_value?: DecisionValue;
  note?: string | null;
  locale?: "en" | "fr" | "it";
};

function normalizeLocale(value: unknown): "en" | "fr" | "it" {
  return value === "fr" || value === "it" ? value : "en";
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeString(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s : null;
}

function isDecisionValue(value: unknown): value is DecisionValue {
  return value === "GO" || value === "HOLD" || value === "NO_GO";
}

async function triggerServerPrep(
  sb: ReturnType<typeof sbAdmin>,
  args: { opportunityId: string; userId: string; decisionId: string; outputLocale: "en" | "fr" | "it" },
) {
  try {
    const { data: currentPrep } = await sb
      .from("opportunity_preps")
      .select("id, created_at")
      .eq("opportunity_id", args.opportunityId)
      .eq("user_id", args.userId)
      .eq("is_current", true)
      .maybeSingle();

    const freshThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (currentPrep?.created_at) {
      const createdAt = new Date(currentPrep.created_at).getTime();
      if (Number.isFinite(createdAt) && createdAt >= freshThreshold) {
        return;
      }
    }

    await generateOpportunityPrep(sb, {
      opportunityId: args.opportunityId,
      userId: args.userId,
      triggerType: "system",
      decisionId: args.decisionId,
      outputLocale: args.outputLocale,
    });
  } catch (error) {
    log.error("server_prep_failed", {
      opportunity_id: args.opportunityId,
      user_id: args.userId,
      decision_id: args.decisionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "UNAUTHORIZED" });
  }
  const token = authHeader.slice(7).trim();

  let sb: ReturnType<typeof sbAdmin>;
  let userId = "";
  try {
    sb = sbAdmin();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user?.id) return json(401, { ok: false, error: "UNAUTHORIZED" });
    userId = data.user.id;
  } catch {
    return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });
  }

  let body: DecisionRequest;
  try {
    body = (await req.json()) as DecisionRequest;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }

  const opportunityId = normalizeString(body?.opportunity_id);
  const action = body?.action;
  const note = normalizeString(body?.note);
  const outputLocale = normalizeLocale(body?.locale);

  if (!opportunityId || (action !== "set" && action !== "clear")) {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }

  if (action === "set" && !isDecisionValue(body?.decision_value)) {
    return json(400, { ok: false, error: "INVALID_DECISION_VALUE" });
  }

  try {
    const { data: existingRow, error: existingError } = await sb
      .from("opportunity_decisions")
      .select("id, decision, note, decided_at")
      .eq("opportunity_id", opportunityId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      log.error("load_decision_failed", { error: existingError.message });
      return json(500, { ok: false, error: "INTERNAL_ERROR" });
    }

    if (action === "clear") {
      if (!existingRow?.id) {
        return json(200, { ok: true, action: "clear", changed: false });
      }

      const previousDecisionValue = existingRow.decision as DecisionValue | null;
      const previousNote = existingRow.note ?? null;
      const previousDecidedAt = existingRow.decided_at ?? nowIso();

      const { error: deleteError } = await sb
        .from("opportunity_decisions")
        .delete()
        .eq("id", existingRow.id);

      if (deleteError) {
        log.error("delete_decision_failed", {
          opportunity_id: opportunityId,
          user_id: userId,
          decision_id: existingRow.id,
          error: deleteError.message,
        });
        return json(500, { ok: false, error: "INTERNAL_ERROR" });
      }

      const { error: historyError } = await sb.from("decision_history").insert({
        opportunity_id: opportunityId,
        user_id: userId,
        // The decision row has already been deleted above, so a clear event
        // cannot keep a live FK reference to the removed current-state row.
        opportunity_decision_id: null,
        event_type: "clear",
        decision_value: null,
        previous_decision_value: previousDecisionValue,
        note,
        source: "web",
        is_backfilled: false,
      });

      if (historyError) {
        const { error: restoreError } = await sb
          .from("opportunity_decisions")
          .insert({
            id: existingRow.id,
            opportunity_id: opportunityId,
            user_id: userId,
            decision: previousDecisionValue,
            note: previousNote,
            decided_at: previousDecidedAt,
            updated_at: nowIso(),
          });

        if (restoreError) {
          log.error("restore_decision_failed", {
            opportunity_id: opportunityId,
            user_id: userId,
            decision_id: existingRow.id,
            error: restoreError.message,
          });
        }
        log.error("history_clear_insert_failed", {
          opportunity_id: opportunityId,
          user_id: userId,
          decision_id: existingRow.id,
          error: historyError.message,
        });
        return json(500, { ok: false, error: "INTERNAL_ERROR" });
      }

      return json(200, {
        ok: true,
        action: "clear",
        changed: true,
      });
    }

    const decisionValue = body.decision_value as DecisionValue;

    if (!existingRow?.id) {
      const decidedAt = nowIso();
      const { data: insertedRow, error: insertError } = await sb
        .from("opportunity_decisions")
        .insert({
          opportunity_id: opportunityId,
          user_id: userId,
          decision: decisionValue,
          note,
          decided_at: decidedAt,
          updated_at: decidedAt,
        })
        .select("id, decision, decided_at")
        .single();

      if (insertError || !insertedRow?.id) {
        log.error("insert_decision_failed", {
          opportunity_id: opportunityId,
          user_id: userId,
          decision_value: decisionValue,
          error: insertError?.message,
        });
        return json(500, { ok: false, error: "INTERNAL_ERROR" });
      }

      const { error: historyError } = await sb.from("decision_history").insert({
        opportunity_id: opportunityId,
        user_id: userId,
        opportunity_decision_id: insertedRow.id,
        event_type: "set",
        decision_value: decisionValue,
        previous_decision_value: null,
        note,
        source: "web",
        is_backfilled: false,
      });

      if (historyError) {
        const { error: rollbackError } = await sb
          .from("opportunity_decisions")
          .delete()
          .eq("id", insertedRow.id);

        if (rollbackError) {
          log.error("rollback_decision_failed", {
            opportunity_id: opportunityId,
            user_id: userId,
            decision_id: insertedRow.id,
            error: rollbackError.message,
          });
        }
        log.error("history_set_insert_failed", {
          opportunity_id: opportunityId,
          user_id: userId,
          decision_id: insertedRow.id,
          error: historyError.message,
        });
        return json(500, { ok: false, error: "INTERNAL_ERROR" });
      }

      if (decisionValue === "GO") {
        await triggerServerPrep(sb, {
          opportunityId,
          userId,
          decisionId: String(insertedRow.id),
          outputLocale,
        });
      }

      return json(200, {
        ok: true,
        action: "set",
        changed: true,
        decision: decisionValue,
      });
    }

    const previousDecisionValue = isDecisionValue(existingRow.decision) ? existingRow.decision : null;
    const previousNote = existingRow.note ?? null;
    const previousDecidedAt = existingRow.decided_at ?? null;
    if (previousDecisionValue === decisionValue && (existingRow.note ?? null) === note) {
      return json(200, {
        ok: true,
        action: "set",
        changed: false,
        decision: decisionValue,
      });
    }

    const decidedAt = nowIso();
    const { data: updatedRow, error: updateError } = await sb
      .from("opportunity_decisions")
      .update({
        decision: decisionValue,
        note,
        decided_at: decidedAt,
        updated_at: decidedAt,
      })
      .eq("id", existingRow.id)
      .select("id, decision, decided_at")
      .single();

    if (updateError || !updatedRow?.id) {
      log.error("update_decision_failed", {
        opportunity_id: opportunityId,
        user_id: userId,
        decision_id: existingRow.id,
        decision_value: decisionValue,
        error: updateError?.message,
      });
      return json(500, { ok: false, error: "INTERNAL_ERROR" });
    }

    const eventType = previousDecisionValue === null ? "set" : "change";
    const { error: historyError } = await sb.from("decision_history").insert({
      opportunity_id: opportunityId,
      user_id: userId,
      opportunity_decision_id: updatedRow.id,
      event_type: eventType,
      decision_value: decisionValue,
      previous_decision_value: previousDecisionValue,
      note,
      source: "web",
      is_backfilled: false,
    });

    if (historyError) {
      const { error: restoreError } = await sb
        .from("opportunity_decisions")
        .update({
          decision: previousDecisionValue,
          note: previousNote,
          decided_at: previousDecidedAt,
          updated_at: nowIso(),
        })
        .eq("id", existingRow.id);

      if (restoreError) {
        log.error("restore_changed_decision_failed", {
          opportunity_id: opportunityId,
          user_id: userId,
          decision_id: existingRow.id,
          error: restoreError.message,
        });
      }
      log.error("history_change_insert_failed", {
        opportunity_id: opportunityId,
        user_id: userId,
        decision_id: updatedRow.id,
        error: historyError.message,
      });
      return json(500, { ok: false, error: "INTERNAL_ERROR" });
    }

    if (decisionValue === "GO" && previousDecisionValue !== "GO") {
      await triggerServerPrep(sb, {
        opportunityId,
        userId,
        decisionId: String(updatedRow.id),
        outputLocale,
      });
    }

    return json(200, {
      ok: true,
      action: "set",
      changed: true,
      decision: decisionValue,
    });
  } catch (error) {
    log.error("handler_error", {
      user_id: userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return json(500, { ok: false, error: "INTERNAL_ERROR" });
  }
});
