import { create } from "zustand";
import type { Decision, DecisionRecord, WorkspaceRecord, Uuid } from "@/lib/types";

type State = {
  decisions: Record<Uuid, DecisionRecord>;
  workspaces: Record<string, WorkspaceRecord>;
  setDecision: (opportunityId: Uuid, decision: Decision, reason?: string | null) => void;
  ensureWorkspaceFor: (opportunityId: Uuid) => string; // returns workspaceId
  removeDecision: (opportunityId: Uuid) => void;
};

const LS_KEY = "rp.v1.state";

function nowIso() {
  return new Date().toISOString();
}

function load(): Pick<State, "decisions" | "workspaces"> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { decisions: {}, workspaces: {} };
    const v = JSON.parse(raw);
    return {
      decisions: v?.decisions && typeof v.decisions === "object" ? v.decisions : {},
      workspaces: v?.workspaces && typeof v.workspaces === "object" ? v.workspaces : {},
    };
  } catch {
    return { decisions: {}, workspaces: {} };
  }
}

function save(decisions: State["decisions"], workspaces: State["workspaces"]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ decisions, workspaces }));
  } catch {
    // ignore
  }
}

function uid() {
  return `ws_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export const useRpStore = create<State>((set, get) => {
  const initial = typeof window !== "undefined" ? load() : { decisions: {}, workspaces: {} };

  return {
    decisions: initial.decisions,
    workspaces: initial.workspaces,

    setDecision: (opportunityId, decision, reason) => {
      const next = { ...get().decisions };
      next[opportunityId] = {
        opportunityId,
        decision,
        reason: reason ?? null,
        decidedAt: nowIso(),
      };
      set({ decisions: next });
      save(next, get().workspaces);
    },

    removeDecision: (opportunityId) => {
      const next = { ...get().decisions };
      delete next[opportunityId];
      set({ decisions: next });
      save(next, get().workspaces);
    },

    ensureWorkspaceFor: (opportunityId) => {
      const ws = Object.values(get().workspaces).find((w) => w.opportunityId === opportunityId);
      if (ws) return ws.id;

      const id = uid();
      const record: WorkspaceRecord = { id, opportunityId, createdAt: nowIso() };
      const next = { ...get().workspaces, [id]: record };
      set({ workspaces: next });
      save(get().decisions, next);
      return id;
    },
  };
});
