import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type TimelineEventType =
  | "added"
  | "extracted"
  | "brief"
  | "score"
  | "prep"
  | "decision_set"
  | "decision_change"
  | "decision_clear";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  ts: string;
  decisionValue?: string | null;
  previousDecisionValue?: string | null;
  model?: string | null;
  durationMs?: number | null;
};

export function useOpportunityTimeline(
  opportunityId: string | null,
  addedAt: string | null,
) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opportunityId) return;

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId || cancelled) return;

        // Agent runs for this opportunity (system + user's own)
        const { data: runs } = await supabase
          .from("agent_runs")
          .select("id, agent_type, status, model, duration_ms, started_at, user_id")
          .eq("opportunity_id", opportunityId)
          .eq("status", "success")
          .in("agent_type", ["extract", "brief", "score", "prep"])
          .order("started_at", { ascending: false })
          .limit(20);

        // Decision history for this user
        const { data: decisions } = await supabase
          .from("decision_history")
          .select("id, event_type, decision_value, previous_decision_value, created_at")
          .eq("opportunity_id", opportunityId)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (cancelled) return;

        const items: TimelineEvent[] = [];

        for (const run of (runs ?? []) as Record<string, unknown>[]) {
          // Filter score/brief runs to current user only; extract runs are global (no user_id)
          if (run.agent_type !== "extract" && run.user_id !== userId) continue;

          const type: TimelineEventType =
            run.agent_type === "brief"
              ? "brief"
              : run.agent_type === "score"
                ? "score"
                : run.agent_type === "prep"
                  ? "prep"
                  : "extracted";

          items.push({
            id: String(run.id),
            type,
            ts: String(run.started_at),
            model: run.model ? String(run.model) : null,
            durationMs: run.duration_ms != null ? Number(run.duration_ms) : null,
          });
        }

        for (const d of (decisions ?? []) as Record<string, unknown>[]) {
          const type: TimelineEventType =
            d.event_type === "set"
              ? "decision_set"
              : d.event_type === "change"
                ? "decision_change"
                : "decision_clear";

          items.push({
            id: String(d.id),
            type,
            ts: String(d.created_at),
            decisionValue: d.decision_value ? String(d.decision_value) : null,
            previousDecisionValue: d.previous_decision_value
              ? String(d.previous_decision_value)
              : null,
          });
        }

        // "Added" synthetic event from opportunity.created_at
        if (addedAt) {
          items.push({ id: "added", type: "added", ts: addedAt });
        }

        // Sort descending
        items.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

        setEvents(items);
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [opportunityId, addedAt]);

  return { events, loading };
}
