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
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : status === "POSSIBLE_DUP"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
      : status === "UPDATE"
      ? "border-white/15 bg-white/5 text-white/70"
      : status === "MERGED"
      ? "border-accent/25 bg-accent/10 text-accent"
      : "border-rose-400/25 bg-rose-400/10 text-rose-200";

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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
      {children}
    </span>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
      {children}
    </span>
  );
}

export function DecisionConsoleMock({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-[28px] bg-[#07070b] p-4 shadow-[0_30px_120px_-40px_rgba(96,35,255,0.45)] sm:p-5">
        {/* Top controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_0.85fr]">
          {/* Left: table */}
          <div className="rounded-[22px] border border-white/10 bg-white/5">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm font-semibold text-white/85">Inbox</div>
              <div className="text-xs text-white/45">All sources normalized</div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1040px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs font-semibold text-white/45">
                    <th className="px-4 py-3">Opportunity</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3">Deadline</th>
                  </tr>
                </thead>

                <tbody>
                  {ROWS.map((r, idx) => (
                    <tr key={r.id} className="text-sm text-white/80">
                      <td
                        className={cn(
                          "px-4 py-4 align-top",
                          idx !== 0 && "border-t border-white/10"
                        )}
                      >
                        <div className="font-semibold text-white/90">{r.title}</div>
                        <div className="mt-1 text-xs text-white/40">ID: {r.id}</div>
                      </td>

                      <td
                        className={cn(
                          "px-4 py-4 align-top text-white/70",
                          idx !== 0 && "border-t border-white/10"
                        )}
                      >
                        {r.source}
                      </td>

                      <td
                        className={cn(
                          "px-4 py-4 align-top",
                          idx !== 0 && "border-t border-white/10"
                        )}
                      >
                        <StatusPill status={r.status} />
                      </td>

                      <td
                        className={cn(
                          "px-4 py-4 align-top font-semibold text-white/85",
                          idx !== 0 && "border-t border-white/10"
                        )}
                      >
                        {r.budget}
                      </td>

                      <td
                        className={cn(
                          "px-4 py-4 align-top text-white/70",
                          idx !== 0 && "border-t border-white/10"
                        )}
                      >
                        {r.deadline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2 px-4 py-3 text-xs text-white/45">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Low-noise triage
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Canonical record
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Evidence-linked
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Decision log
              </span>
            </div>
          </div>

          {/* Right: decision panel */}
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white/85">Decision</div>
                <div className="mt-1 text-xs text-white/45">Evidence-linked decisioning</div>
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <span className="inline-flex w-fit items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                HOLD
              </span>

              <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                Confidence 0.86
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-white/60">Why HOLD</div>
              <ul className="mt-2 space-y-2 text-sm text-white/75">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/40" />
                  Eligibility matches (EU/EEA + SME/Consortium)
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/40" />
                  Budget fits target range (€8M–€15M)
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/40" />
                  Comparable project evidence not yet verified
                </li>
              </ul>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Request missing proof
              </button>
              <button
                type="button"
                className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Open decision log
              </button>
              <button
                type="button"
                className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Assign owner
              </button>
            </div>

            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 p-3">
              <div className="text-xs text-white/55">
                Reproducible decision log · 3 cited excerpts · 3 merged sources
              </div>
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_14px_60px_-20px_rgba(255,255,255,0.55)] hover:opacity-95"
            >
              Convert to GO →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
