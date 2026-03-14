import { useCallback, useState } from "react";
import type { Decision, DecisionRecord } from "@/lib/types";

const STORAGE_KEY = "radarpulse:decisions";

function load(): Record<string, DecisionRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, DecisionRecord>;
  } catch {
    return {};
  }
}

export function useDecisions() {
  const [store, setStore] = useState<Record<string, DecisionRecord>>(load);

  const decide = useCallback((opportunityId: string, decision: Decision) => {
    setStore((prev) => {
      const next = { ...prev };
      if (prev[opportunityId]?.decision === decision) {
        delete next[opportunityId];
      } else {
        next[opportunityId] = { opportunityId, decision, decidedAt: new Date().toISOString() };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getDecision = useCallback(
    (opportunityId: string): Decision | null => store[opportunityId]?.decision ?? null,
    [store],
  );

  return { decide, getDecision, store };
}
