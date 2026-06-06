import { useCallback, useEffect, useState } from "react";
import type { Decision, DecisionRecord } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/lib/i18n";
import { createWorkspace } from "@/features/workspaces/workspaceApi";
import { ENV } from "@/lib/env";
import { AuthTokenError, getValidAccessToken, recoverInvalidSession } from "@/lib/authToken";

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

export function useOpportunityDecision() {
  const { locale } = useLocale();
  const [store, setStore] = useState<Record<string, DecisionRecord>>(loadLocal);

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
        // local cache remains usable if server is unreachable
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

      (async () => {
        try {
          const jwt = await getValidAccessToken();
          const response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/opportunity-decision`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
              apikey: ENV.SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(
              isToggle
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
            ),
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new AuthTokenError();
            }
            throw new Error("DECISION_REQUEST_FAILED");
          }

          if (!isToggle && decision === "GO") {
            void createWorkspace(opportunityId, "GO").catch(() => {});
          }
        } catch (error) {
          if (error instanceof AuthTokenError) {
            void recoverInvalidSession();
          }
          setStore(previousStore);
          saveLocal(previousStore);
        }
      })();

      return next;
    });
  }, [locale]);

  const getDecision = useCallback(
    (opportunityId: string): Decision | null => store[opportunityId]?.decision ?? null,
    [store],
  );

  return { decide, getDecision, store };
}
