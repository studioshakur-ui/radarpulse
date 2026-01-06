// apps/web/src/features/landing/cinematic/DecisionConsoleMock.tsx
import React from "react";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  title: string;
  source: string;
  status: "NEW" | "POSSIBLE_DUP" | "UPDATE" | "MERGED" | "FLAG";
  budget: string;
  deadline: string;
};

const ROWS: Row[] = [
  {
    id: "ao-001",
    title: "EU Renewable Infrastructure — Call",
    source: "EU Portal",
    status: "NEW",
    budget: "€12,000,000",
    deadline: "2026-02-18",
  },
  {
    id: "ao-002",
    title: "EU Mobility Fund — Gazette",
    source: "Gazette",
    status: "POSSIBLE_DUP",
    budget: "€9,500,000",
    deadline: "2026-02-22",
  },
  {
    id: "ao-003",
    title: "Regional Grant — Update",
    source: "Email",
    status: "UPDATE",
    budget: "€2,000,000",
    deadline: "2026-02-05",
  },
  {
    id: "ao-004",
    title: "Energy Tender — Digest",
    source: "Portal",
    status: "MERGED",
    budget: "€8,200,000",
    deadline: "2026-03-01",
  },
  {
    id: "ao-005",
    title: "Transport RFP — Amendment",
    source: "Portal",
    status: "NEW",
    budget: "€6,800,000",
    deadline: "2026-02-28",
  },
  {
    id: "ao-006",
    title: "Research Grant — Addendum",
    source: "Inbox",
    status: "FLAG",
    budget: "€1,200,000",
    deadline: "2026-01-30",
  },
];

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        "border-line/25 bg-veil/35 text-subtext backdrop-blur"
      )}
    >
      {children}
    </span>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        "border-line/25 bg-veil/35 text-subtext backdrop-blur"
      )}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: Row["status"] }) {
  const label =
    status === "POSSIBLE_DUP"
      ? "POSSIBLE DUP"
      : status === "NEW"
      ? "NEW"
      : status === "UPDATE"
      ? "UPDATE"
      : status === "MERGED"
      ? "MERGED"
      : "FLAG";

  const cls =
    status === "NEW"
      ? "border-good/30 bg-good/12 text-good"
      : status === "POSSIBLE_DUP"
      ? "border-warn/30 bg-warn/12 text-warn"
      : status === "UPDATE"
      ? "border-line/25 bg-veil/30 text-subtext"
      : status === "MERGED"
      ? "border-brand/30 bg-brand/12 text-brand"
      : "border-bad/30 bg-bad/12 text-bad";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        cls
      )}
    >
      {label}
    </span>
  );
}

export function DecisionConsoleMock({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      {/* Outer glass frame (landing palette) */}
      <div
        className={cn(
          "rounded-[28px] border border-line/20 bg-surface/45 p-4 shadow-glow backdrop-blur sm:p-5"
        )}
      >
        {/* Inner console (instrument) — driven by ink token */}
        <div
          className={cn(
            "rounded-[22px] border border-line/20 bg-ink/85",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          )}
        >
          {/* Header row */}
          <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Chip>Evidence-linked</Chip>
              <Chip>Audit trail</Chip>
              <Chip>Dedup preserved</Chip>
            </div>

            <div className="flex items-center gap-2">
              <StatPill>12 ingested</StatPill>
              <StatPill>3 merged</StatPill>
              <StatPill>3 cited</StatPill>
            </div>
          </div>

          <div className="mt-4 grid gap-4 px-4 pb-4 lg:grid-cols-[1.55fr_0.85fr]">
            {/* LEFT — Inbox table */}
            <div className="rounded-[20px] border border-line/20 bg-veil/10">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="text-sm font-semibold text-text/90">Inbox</div>
                <div className="text-xs text-subtext">All sources normalized</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1040px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-subtext">
                      <th className="px-4 py-3">Opportunity</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Budget</th>
                      <th className="px-4 py-3">Deadline</th>
                    </tr>
                  </thead>

                  <tbody>
                    {ROWS.map((r, idx) => (
                      <tr key={r.id} className="text-sm">
                        <td
                          className={cn(
                            "px-4 py-4 align-top",
                            idx !== 0 && "border-t border-line/20"
                          )}
                        >
                          <div className="font-semibold text-text/90">{r.title}</div>
                          <div className="mt-1 text-xs text-subtext">ID: {r.id}</div>
                        </td>

                        <td
                          className={cn(
                            "px-4 py-4 align-top text-text/70",
                            idx !== 0 && "border-t border-line/20"
                          )}
                        >
                          {r.source}
                        </td>

                        <td
                          className={cn(
                            "px-4 py-4 align-top",
                            idx !== 0 && "border-t border-line/20"
                          )}
                        >
                          <StatusPill status={r.status} />
                        </td>

                        <td
                          className={cn(
                            "px-4 py-4 align-top font-semibold text-text/85",
                            idx !== 0 && "border-t border-line/20"
                          )}
                        >
                          {r.budget}
                        </td>

                        <td
                          className={cn(
                            "px-4 py-4 align-top text-text/70",
                            idx !== 0 && "border-t border-line/20"
                          )}
                        >
                          {r.deadline}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 px-4 py-3 text-xs text-subtext">
                {["Low-noise triage", "Canonical record", "Evidence-linked", "Decision log"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-line/20 bg-veil/10 px-3 py-1"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT — Decision panel */}
            <div className="rounded-[20px] border border-line/20 bg-veil/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text/90">Decision</div>
                  <div className="mt-1 text-xs text-subtext">Evidence-linked decisioning</div>
                </div>

                <span className="inline-flex items-center rounded-full border border-good/30 bg-good/12 px-2.5 py-1 text-[11px] font-semibold text-good">
                  ACTIVE
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <span className="inline-flex w-fit items-center rounded-full border border-warn/30 bg-warn/12 px-3 py-1 text-xs font-semibold text-warn">
                  HOLD
                </span>

                <div className="inline-flex w-fit items-center rounded-full border border-line/20 bg-veil/10 px-3 py-1 text-xs font-semibold text-subtext">
                  Confidence 0.86
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-subtext">Why HOLD</div>
                <ul className="mt-2 space-y-2 text-sm text-text/80">
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-line/60" />
                    Eligibility matches (EU/EEA + SME/Consortium)
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-line/60" />
                    Budget fits target range (€8M–€15M)
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-line/60" />
                    Comparable project evidence not yet verified
                  </li>
                </ul>
              </div>

              <div className="mt-5 space-y-2">
                {["Request missing proof", "Open decision log", "Assign owner"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      "w-full rounded-full border px-4 py-2 text-sm font-semibold",
                      "border-line/20 bg-veil/10 text-text/85 hover:bg-veil/15"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-[18px] border border-line/20 bg-veil/10 p-3">
                <div className="text-xs text-subtext">
                  Reproducible decision log · 3 cited excerpts · 3 merged sources
                </div>
              </div>

              <button
                type="button"
                className={cn(
                  "mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold",
                  "bg-brand text-white shadow-glow hover:opacity-95"
                )}
              >
                Convert to GO →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
