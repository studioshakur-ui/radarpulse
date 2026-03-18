import { useCallback, useEffect, useState } from "react";
import type { Decision, DecisionRecord } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/lib/i18n";

const STORAGE_KEY = "radarpulse:decisions";

function loadLocal(): Record<string, DecisionRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, DecisionRecord>;
  } catch {
    return {};
  }
}

function saveLocal(store: Record<string, DecisionRecord>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function useDecisions() {
  const { locale } = useLocale();
  const [store, setStore] = useState<Record<string, DecisionRecord>>(loadLocal);

  // On mount: load server state and merge (server wins over stale localStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId || cancelled) return;

        const { data, error } = await supabase
          .from("opportunity_decisions")
          .select("opportunity_id, decision, note, decided_at")
          .eq("user_id", userId);

        if (error || !data || cancelled) return;

        const serverStore: Record<string, DecisionRecord> = {};
        for (const row of data) {
          serverStore[row.opportunity_id] = {
            opportunityId: row.opportunity_id,
            decision: row.decision as Decision,
            reason: row.note ?? null,
            decidedAt: row.decided_at,
          };
        }

        setStore((local) => {
          // Merge: keep whichever decision has the most recent decidedAt.
          // This prevents the server response from overwriting a decision
          // the user made while the fetch was in flight.
          const merged = { ...local };
          for (const [id, serverRecord] of Object.entries(serverStore)) {
            const localRecord = local[id];
            if (!localRecord || localRecord.decidedAt <= serverRecord.decidedAt) {
              merged[id] = serverRecord;
            }
          }
          saveLocal(merged);
          return merged;
        });
      } catch {
        // silent — localStorage remains the source of truth if server unreachable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const decide = useCallback((opportunityId: string, decision: Decision) => {
    setStore((prev) => {
      const previousStore = prev;
      const isToggle = prev[opportunityId]?.decision === decision;
      const next = { ...prev };
      const decidedAt = new Date().toISOString();

      if (isToggle) {
        delete next[opportunityId];
      } else {
        next[opportunityId] = {
          opportunityId,
          decision,
          decidedAt,
        };
      }

      saveLocal(next);

      // Fire-and-forget server sync
      supabase.functions
        .invoke("opportunity-decision", {
          body: isToggle
            ? {
              opportunity_id: opportunityId,
              action: "clear",
              locale,
            }
            : {
              opportunity_id: opportunityId,
              action: "set",
              decision_value: decision,
              locale,
            },
        })
        .then(({ error }) => {
          if (!error) return;
          setStore(previousStore);
          saveLocal(previousStore);
        })
        .catch(() => {
          setStore(previousStore);
          saveLocal(previousStore);
        })
        .then(() => {});

      return next;
    });
  }, [locale]);

  const getDecision = useCallback(
    (opportunityId: string): Decision | null => store[opportunityId]?.decision ?? null,
    [store],
  );

  return { decide, getDecision, store };
}
