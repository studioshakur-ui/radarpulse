// apps/web/src/features/inbox/InboxPage.tsx
import React, { useMemo, useState } from "react";

import * as InboxDataMod from "./useInboxData";
import * as ReviewDrawerMod from "../review/ReviewDrawer";

const useInboxData: any =
  (InboxDataMod as any).useInboxData ??
  (InboxDataMod as any).default ??
  undefined;

// IMPORTANT: on ne fait AUCUN import default ici.
// On récupère le composant depuis les exports disponibles.
const ReviewDrawer: any =
  (ReviewDrawerMod as any).ReviewDrawer ??
  (ReviewDrawerMod as any).Drawer ??
  (ReviewDrawerMod as any).default ??
  undefined;

type Decision = "go" | "hold" | "no-go" | null;

type InboxItem = {
  id?: string;
  title?: string;
  source_label?: string;
  source?: string;
  updated_at?: string | null;
  deadline_at?: string | null;
  is_public?: boolean;
  status?: string;
  kind?: string;
  is_new?: boolean;
  decision?: Decision;
  [k: string]: any;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function safeStr(v: any, fallback = ""): string {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function formatItDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function daysUntil(v?: string | null) {
  if (!v) return null;
  try {
    const d = new Date(v);
    const now = new Date();
    const ms = d.getTime() - now.getTime();
    if (Number.isNaN(ms)) return null;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function decisionTone(decision: Decision) {
  if (decision === "go") return "ring-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (decision === "hold") return "ring-amber-500/30 bg-amber-500/10 text-amber-100";
  if (decision === "no-go") return "ring-rose-500/30 bg-rose-500/10 text-rose-100";
  return "ring-white/10 bg-white/5 text-white/70";
}

function DecisionBadge({ decision }: { decision: Decision }) {
  const label = decision === "go" ? "GO" : decision === "hold" ? "HOLD" : decision === "no-go" ? "NO-GO" : "—";
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        "ring-1",
        decisionTone(decision)
      )}
      title={decision ? `Decision: ${label}` : "No decision"}
    >
      {label}
    </span>
  );
}

function MetaPill({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] text-white/70",
        "ring-1 ring-white/10 bg-white/5"
      )}
      title={title}
    >
      {children}
    </span>
  );
}

function SegmentedDecision({
  value,
  onChange,
}: {
  value: Decision;
  onChange: (v: Decision) => void;
}) {
  const base = "h-8 px-2.5 rounded-full text-[11px] font-semibold tracking-wide ring-1 transition";
  const btn = (active: boolean) =>
    cx(
      base,
      active ? "ring-white/20 bg-white/10 text-white" : "ring-white/10 bg-transparent text-white/60 hover:text-white"
    );

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/5 ring-1 ring-white/10 p-1">
      <button type="button" className={btn(value === "go")} onClick={() => onChange("go")} aria-label="Set GO">
        GO
      </button>
      <button type="button" className={btn(value === "hold")} onClick={() => onChange("hold")} aria-label="Set HOLD">
        HOLD
      </button>
      <button type="button" className={btn(value === "no-go")} onClick={() => onChange("no-go")} aria-label="Set NO-GO">
        NO-GO
      </button>
    </div>
  );
}

function HeaderCard({
  total,
  compact,
  onToggleCompact,
  onRunNow,
  running,
  query,
  setQuery,
  scope,
  setScope,
  hideNoGo,
  setHideNoGo,
  deadlineFilter,
  setDeadlineFilter,
}: {
  total: number;
  compact: boolean;
  onToggleCompact: () => void;
  onRunNow: () => void;
  running?: boolean;
  query: string;
  setQuery: (v: string) => void;
  scope: "public" | "all";
  setScope: (v: "public" | "all") => void;
  hideNoGo: boolean;
  setHideNoGo: (v: boolean) => void;
  deadlineFilter: "any" | "has" | "soon";
  setDeadlineFilter: (v: "any" | "has" | "soon") => void;
}) {
  return (
    <div className={cx("rounded-2xl ring-1 ring-white/10 bg-white/5", "p-5 md:p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">Inbox</div>
          <div className="mt-1 text-xs text-white/60">Go/No-Go en 60s, puis workspace.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cx(
              "h-9 rounded-full px-3 text-sm",
              "ring-1 ring-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition"
            )}
            onClick={onToggleCompact}
            title="Toggle compact density"
          >
            {compact ? "Comfort" : "Compact"}
          </button>

          <button
            type="button"
            className={cx(
              "h-9 rounded-full px-3 text-sm font-semibold",
              "ring-1 ring-white/10 bg-white/10 text-white hover:bg-white/15 transition",
              running ? "opacity-70 cursor-not-allowed" : ""
            )}
            onClick={onRunNow}
            disabled={!!running}
            title="Run ingestion now"
          >
            {running ? "Running…" : "Run now"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
        <div className="md:col-span-6">
          <div className={cx("flex items-center gap-2 rounded-full ring-1 ring-white/10 bg-black/20 px-3 h-10")}>
            <span className="text-white/50 text-sm" aria-hidden>
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title…"
              className={cx("w-full bg-transparent outline-none text-sm text-white placeholder:text-white/35", "py-2")}
            />
          </div>
          <div className="mt-2 text-[12px] text-white/50">{total} items</div>
        </div>

        <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-2">
          <button
            type="button"
            className={cx(
              "h-10 rounded-full px-3 text-sm",
              "ring-1 transition",
              scope === "public"
                ? "ring-white/20 bg-white/10 text-white"
                : "ring-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
            )}
            onClick={() => setScope(scope === "public" ? "all" : "public")}
            title="Scope"
          >
            {scope === "public" ? "Public" : "All"}
          </button>

          <button
            type="button"
            className={cx(
              "h-10 rounded-full px-3 text-sm",
              "ring-1 transition",
              hideNoGo
                ? "ring-white/20 bg-white/10 text-white"
                : "ring-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
            )}
            onClick={() => setHideNoGo(!hideNoGo)}
            title="Hide NO-GO"
          >
            {hideNoGo ? "Hide NO-GO" : "Show NO-GO"}
          </button>

          <div className={cx("h-10 rounded-full px-3 text-sm ring-1 ring-white/10 bg-white/5", "flex items-center")}>
            <span className="text-white/60 mr-2">Deadline:</span>
            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value as any)}
              className={cx("bg-transparent text-white outline-none text-sm", "pr-1")}
            >
              <option value="any">any</option>
              <option value="has">has deadline</option>
              <option value="soon">soon (≤ 7d)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  item,
  compact,
  onOpen,
  onSetDecision,
}: {
  item: InboxItem;
  compact: boolean;
  onOpen: () => void;
  onSetDecision: (d: Decision) => void;
}) {
  const title = safeStr(item.title, "Untitled");
  const src = safeStr(item.source_label || item.source, "—");
  const updated = formatItDateTime(item.updated_at);
  const deadline = item.deadline_at ? formatItDateTime(item.deadline_at) : null;

  const dLeft = daysUntil(item.deadline_at);
  const showDeadline = !!item.deadline_at;

  const urgencyPill = (() => {
    if (dLeft === null) return showDeadline ? <MetaPill title={deadline ?? undefined}>Deadline: set</MetaPill> : <MetaPill>No deadline</MetaPill>;
    if (dLeft <= 0) return <MetaPill title="Deadline passed">Deadline: expired</MetaPill>;
    if (dLeft <= 3) return <MetaPill title="Deadline in ≤ 3 days">Deadline: {dLeft}d</MetaPill>;
    if (dLeft <= 7) return <MetaPill title="Deadline in ≤ 7 days">Deadline: {dLeft}d</MetaPill>;
    return <MetaPill title={deadline ?? undefined}>Deadline: set</MetaPill>;
  })();

  const kind = safeStr(item.kind, "tender");
  const status = safeStr(item.status, item.is_new ? "NEW" : "active");

  return (
    <div
      className={cx(
        "group rounded-2xl ring-1 ring-white/10 bg-black/20",
        "hover:bg-black/30 transition",
        compact ? "px-4 py-3" : "px-5 py-4"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="pt-0.5">
          <DecisionBadge decision={(item.decision ?? null) as Decision} />
        </div>

        <button type="button" onClick={onOpen} className="flex-1 text-left outline-none" title="Open details">
          <div className={cx("text-white font-semibold", compact ? "text-[13px]" : "text-[14px]")}>{title}</div>

          <div className={cx("mt-2 flex flex-wrap items-center gap-2", compact ? "mt-1.5" : "mt-2")}>
            {urgencyPill}
            <MetaPill>{src}</MetaPill>
            {!compact ? <MetaPill>{kind}</MetaPill> : null}
            {!compact ? <MetaPill>{status}</MetaPill> : null}
          </div>

          <div className={cx("mt-2 text-[12px] text-white/45", compact ? "mt-1.5" : "mt-2")}>
            Updated {updated}
            {showDeadline ? <span className="ml-2">· Deadline {deadline}</span> : null}
          </div>
        </button>

        <div className={cx("shrink-0", "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition")}>
          <SegmentedDecision value={(item.decision ?? null) as Decision} onChange={onSetDecision} />
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const inbox: any = typeof useInboxData === "function" ? useInboxData() : {};

  const rawItems: InboxItem[] =
    inbox.items ?? inbox.rows ?? inbox.opportunities ?? inbox.data ?? [];

  const loading: boolean = !!(inbox.loading ?? inbox.isLoading ?? false);
  const error: string | null =
    inbox.error ?? inbox.err ? String(inbox.error ?? inbox.err) : null;

  const runNow: (() => any) =
    inbox.runNow ?? inbox.refresh ?? inbox.onRefresh ?? inbox.refetch ?? (() => undefined);

  const setDecisionHook: ((id: string, decision: Decision) => any) | null =
    inbox.setDecision ?? inbox.updateDecision ?? inbox.onDecision ?? null;

  const [compact, setCompact] = useState<boolean>(true);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"public" | "all">("public");
  const [hideNoGo, setHideNoGo] = useState<boolean>(true);
  const [deadlineFilter, setDeadlineFilter] = useState<"any" | "has" | "soon">("any");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<InboxItem | null>(null);

  const [runningLocal, setRunningLocal] = useState(false);
  const running: boolean = !!(inbox.running ?? inbox.isRunning ?? runningLocal);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (rawItems || []).filter((it) => {
      if (scope === "public") {
        if (it.is_public === false) return false;
      }
      if (hideNoGo) {
        const d = (it.decision ?? null) as Decision;
        if (d === "no-go") return false;
      }
      if (deadlineFilter === "has") {
        if (!it.deadline_at) return false;
      }
      if (deadlineFilter === "soon") {
        const d = daysUntil(it.deadline_at);
        if (d === null) return false;
        if (d > 7) return false;
      }
      if (q) {
        const hay = `${safeStr(it.title)} ${safeStr(it.source_label || it.source)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rawItems, query, scope, hideNoGo, deadlineFilter]);

  function openItem(it: InboxItem) {
    setActiveItem(it);
    setDrawerOpen(true);
  }

  function setDecision(it: InboxItem, decision: Decision) {
    const id = safeStr(it.id);
    if (setDecisionHook && id) {
      try {
        setDecisionHook(id, decision);
      } catch {
        // ignore
      }
      return;
    }
    it.decision = decision;
    setQuery((x) => x);
  }

  function onRunNow() {
    try {
      setRunningLocal(true);

      // IMPORTANT: ne jamais tester "void" => on force unknown
      const maybe: unknown = (runNow as unknown as (...args: any[]) => unknown)();

      if (typeof (maybe as any)?.then === "function") {
        (maybe as Promise<any>).finally(() => setRunningLocal(false));
        return;
      }

      setTimeout(() => setRunningLocal(false), 700);
    } catch {
      setRunningLocal(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-6 md:py-8">
      <HeaderCard
        total={filtered.length}
        compact={compact}
        onToggleCompact={() => setCompact((v) => !v)}
        onRunNow={onRunNow}
        running={running}
        query={query}
        setQuery={setQuery}
        scope={scope}
        setScope={setScope}
        hideNoGo={hideNoGo}
        setHideNoGo={setHideNoGo}
        deadlineFilter={deadlineFilter}
        setDeadlineFilter={setDeadlineFilter}
      />

      <div className="mt-6">
        {error ? (
          <div className="rounded-2xl ring-1 ring-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 text-sm text-white/70">
            Loading…
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((it, idx) => (
              <Row
                key={safeStr(it.id, String(idx))}
                item={it}
                compact={compact}
                onOpen={() => openItem(it)}
                onSetDecision={(d) => setDecision(it, d)}
              />
            ))}

            {!filtered.length ? (
              <div className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-6 text-sm text-white/60">
                No items match your filters.
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Drawer: uniquement si composant résolu */}
      {drawerOpen && ReviewDrawer ? (
        <ReviewDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          item={activeItem}
          opportunity={activeItem}
        />
      ) : null}
    </div>
  );
}
