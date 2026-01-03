import React, { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Separator from "@radix-ui/react-separator";
import { ExternalLink, X, FileText, History, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cx, fmtDateTime, fmtRelative, daysLeft } from "@/lib/utils";
import type { OpportunityDocumentRow, OpportunityEventRow, Uuid } from "@/lib/types";
import type { OpportunityWithMeta } from "@/features/inbox/useInboxData";

import { useRpStore } from "@/state/store";
import { toast } from "sonner";

const NO_GO_REASONS = [
  { key: "not_eligible", label: "Non éligible" },
  { key: "capacity", label: "Capacité insuffisante" },
  { key: "deadline", label: "Deadline trop proche" },
  { key: "budget", label: "Budget faible / non rentable" },
  { key: "geo", label: "Zone non couverte" },
  { key: "compliance", label: "Compliance trop lourd" },
  { key: "strategy", label: "Hors stratégie" },
];

async function fetchDocs(opportunityId: Uuid) {
  const { data, error } = await supabase
    .from("opportunity_documents")
    .select("id,opportunity_id,doc_title,doc_url,doc_hash,doc_type,storage_path,created_at")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as OpportunityDocumentRow[];
}

async function fetchEvents(opportunityId: Uuid) {
  const { data, error } = await supabase
    .from("opportunity_events")
    .select("id,opportunity_id,type,occurred_at,data")
    .eq("opportunity_id", opportunityId)
    .order("occurred_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as OpportunityEventRow[];
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "muted" | "good" | "warn" | "bad" }) {
  const c =
    tone === "good"
      ? "border-good/30 bg-good/10 text-text"
      : tone === "warn"
      ? "border-warn/30 bg-warn/10 text-text"
      : tone === "bad"
      ? "border-bad/30 bg-bad/10 text-text"
      : "border-border/60 bg-elevated/40 text-muted";
  return <span className={cx("inline-flex items-center rounded-xl border px-2 py-1 text-xs", c)}>{children}</span>;
}

export function ReviewDrawer({
  open,
  opportunity,
  onClose,
  onDecisionSaved,
}: {
  open: boolean;
  opportunity: OpportunityWithMeta | null;
  onClose: () => void;
  onDecisionSaved?: () => void;
}) {
  const { decisions, setDecision, ensureWorkspaceFor } = useRpStore();
  const [docs, setDocs] = useState<OpportunityDocumentRow[] | null>(null);
  const [events, setEvents] = useState<OpportunityEventRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const dec = opportunity ? decisions[opportunity.id] : undefined;
  const dleft = daysLeft(opportunity?.deadline_at ?? null);

  const latestChange = useMemo(() => {
    const ev = events?.[0];
    if (!ev) return null;
    const t = String(ev.type || "").toUpperCase();
    if (t.includes("DEADLINE")) return "Deadline changed";
    if (t.includes("ADDENDUM")) return "Addendum";
    if (t.includes("UPDATED")) return "Updated";
    if (t.includes("CREATED") || t.includes("NEW")) return "New";
    return ev.type;
  }, [events]);

  useEffect(() => {
    if (!open || !opportunity) return;
    setLoading(true);
    setDocs(null);
    setEvents(null);

    Promise.all([fetchDocs(opportunity.id as Uuid), fetchEvents(opportunity.id as Uuid)])
      .then(([d, e]) => {
        setDocs(d);
        setEvents(e);
      })
      .catch((err) => {
        toast("Drawer load failed", { description: err?.message ?? String(err) });
      })
      .finally(() => setLoading(false));
  }, [open, opportunity?.id]);

  function onGo() {
    if (!opportunity) return;
    setDecision(opportunity.id as Uuid, "GO");
    const wsId = ensureWorkspaceFor(opportunity.id as Uuid);
    toast("GO saved", { description: `Workspace: ${wsId}` });
    onDecisionSaved?.();
  }

  function onHold() {
    if (!opportunity) return;
    setDecision(opportunity.id as Uuid, "HOLD");
    toast("HOLD saved", { description: opportunity.title });
    onDecisionSaved?.();
  }

  function onNoGo(reasonKey: string) {
    if (!opportunity) return;
    setDecision(opportunity.id as Uuid, "NO_GO", reasonKey);
    toast("NO-GO saved", { description: NO_GO_REASONS.find((r) => r.key === reasonKey)?.label ?? reasonKey });
    onDecisionSaved?.();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-full max-w-[720px] border-l border-border/60 bg-bg shadow-[0_0_80px_rgba(0,0,0,0.7)]">
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 bg-bg/80 backdrop-blur">
              <div className="flex items-start justify-between gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">Review</div>
                  <Dialog.Title className="truncate text-sm font-semibold">
                    {opportunity?.title ?? "—"}
                  </Dialog.Title>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Pill tone={dleft !== null && dleft < 0 ? "bad" : dleft !== null && dleft <= 7 ? "warn" : "muted"}>
                      {opportunity?.deadline_at ? `J-${dleft}` : "No deadline"}
                    </Pill>
                    <Pill>{opportunity?.country_code ?? "—"}</Pill>
                    <Pill>{opportunity?.type ?? "—"}</Pill>
                    <Pill>{opportunity?.status ?? "—"}</Pill>
                    {latestChange ? <Pill tone="warn">{latestChange}</Pill> : null}
                    {dec?.decision ? (
                      <Pill tone={dec.decision === "GO" ? "good" : dec.decision === "NO_GO" ? "bad" : "warn"}>
                        {dec.decision === "NO_GO" ? "NO-GO" : dec.decision}
                      </Pill>
                    ) : null}
                  </div>
                </div>

                <button
                  className="rounded-xl border border-border/60 bg-elevated/40 p-2 text-muted hover:bg-elevated/60"
                  onClick={onClose}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Separator.Root className="h-px w-full bg-border/40" />

              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <button
                  className="rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-sm text-text hover:bg-good/15"
                  onClick={onGo}
                >
                  GO
                </button>
                <button
                  className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-text hover:bg-warn/15"
                  onClick={onHold}
                >
                  HOLD
                </button>

                <div className="ml-auto flex items-center gap-2">
                  {opportunity?.source_url ? (
                    <a
                      href={opportunity.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-elevated/40 px-3 py-2 text-sm text-muted hover:bg-elevated/60"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Source
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <ScrollArea.Root className="flex-1">
              <ScrollArea.Viewport className="h-full px-4 py-4">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <div className="text-sm font-semibold">60-second summary</div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted">Buyer</div>
                        <div className="text-sm">
                          {opportunity?.buyer?.name ?? opportunity?.buyer_name ?? "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted">Published</div>
                        <div className="text-sm">
                          {opportunity?.published_at ? `${fmtDateTime(opportunity.published_at)} (${fmtRelative(opportunity.published_at)})` : "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted">Deadline</div>
                        <div className="text-sm">
                          {opportunity?.deadline_at ? `${fmtDateTime(opportunity.deadline_at)} ${opportunity.deadline_tz ? `(${opportunity.deadline_tz})` : ""}` : "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted">Source</div>
                        <div className="text-sm">{opportunity?.source?.name ?? "—"}</div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-muted">Summary</div>
                    <div className="mt-1 text-sm text-muted">{opportunity?.summary ?? "—"}</div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">NO-GO (reason obligatoire)</div>
                      <div className="inline-flex items-center gap-2 text-xs text-muted">
                        <AlertTriangle className="h-4 w-4" />
                        Sauvé en localStorage V1
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {NO_GO_REASONS.map((r) => (
                        <button
                          key={r.key}
                          className="flex items-center justify-between rounded-xl border border-border/60 bg-elevated/35 px-3 py-2 text-left text-sm text-text hover:bg-elevated/55"
                          onClick={() => onNoGo(r.key)}
                        >
                          <span>{r.label}</span>
                          <span className="text-xs text-muted">{r.key}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4" />
                      Documents
                      <span className="text-xs text-muted">({docs?.length ?? 0})</span>
                    </div>

                    {loading && !docs ? <div className="mt-3 text-sm text-muted">Loading…</div> : null}

                    <div className="mt-3 space-y-2">
                      {(docs ?? []).map((d) => (
                        <a
                          key={d.id}
                          href={d.doc_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-xl border border-border/60 bg-elevated/25 px-3 py-2 hover:bg-elevated/45"
                        >
                          <div className="text-sm font-semibold">{d.doc_title ?? "Document"}</div>
                          <div className="mt-1 text-xs text-muted">
                            {d.doc_type ?? "—"} • {fmtDateTime(d.created_at)}
                          </div>
                        </a>
                      ))}
                      {!loading && (docs?.length ?? 0) === 0 ? <div className="text-sm text-muted">No documents.</div> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface p-4 shadow-soft">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <History className="h-4 w-4" />
                      Events
                      <span className="text-xs text-muted">({events?.length ?? 0})</span>
                    </div>

                    {loading && !events ? <div className="mt-3 text-sm text-muted">Loading…</div> : null}

                    <div className="mt-3 space-y-2">
                      {(events ?? []).map((e) => (
                        <div key={e.id} className="rounded-xl border border-border/60 bg-elevated/25 px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold">{String(e.type)}</div>
                            <div className="text-xs text-muted">{fmtDateTime(e.occurred_at)}</div>
                          </div>
                          <div className="mt-1 text-xs text-muted">occurred {fmtRelative(e.occurred_at)}</div>
                        </div>
                      ))}
                      {!loading && (events?.length ?? 0) === 0 ? <div className="text-sm text-muted">No events.</div> : null}
                    </div>
                  </div>
                </div>
              </ScrollArea.Viewport>

              <ScrollArea.Scrollbar className="flex w-2.5 touch-none select-none bg-transparent p-0.5" orientation="vertical">
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border/20" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
