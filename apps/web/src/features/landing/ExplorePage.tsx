import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cx } from "@/lib/utils";

type DemoItem = {
  id: string;
  type: "tender" | "grant";
  title: string;
  buyer: string;
  country: string;
  sector: string;
  deadline: string; // ISO
  confidence: "high" | "med" | "low";
  link: string;
};

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "—";
  }
}

function deadlineTag(iso: string): { label: string; tone: "neutral" | "warn" | "bad" } {
  try {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const days = Math.floor((d - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "Overdue", tone: "bad" };
    if (days <= 7) return { label: "Soon", tone: "warn" };
    return { label: "On track", tone: "neutral" };
  } catch {
    return { label: "—", tone: "neutral" };
  }
}

function ToneBadge({ tone, children }: { tone: "neutral" | "warn" | "bad"; children: React.ReactNode }) {
  const cls =
    tone === "bad"
      ? "border-bad/25 bg-bad/10 text-bad"
      : tone === "warn"
        ? "border-warn/25 bg-warn/10 text-warn"
        : "border-border/30 bg-surface/50 text-muted";

  return <span className={cx("rounded-full border px-2 py-0.5 text-[11px] font-medium", cls)}>{children}</span>;
}

function ConfidencePill({ v }: { v: DemoItem["confidence"] }) {
  const map: Record<DemoItem["confidence"], string> = { high: "High", med: "Med", low: "Low" };
  const cls =
    v === "high"
      ? "bg-good/10 text-good border-good/20"
      : v === "low"
        ? "bg-bad/10 text-bad border-bad/20"
        : "bg-warn/10 text-warn border-warn/20";

  return (
    <span className={cx("rounded-full border px-2 py-0.5 text-[11px] font-medium", cls)}>
      {map[v]} confidence
    </span>
  );
}

function LuxeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 [background:radial-gradient(1100px_700px_at_25%_10%,rgba(168,85,247,0.16),transparent_60%),radial-gradient(900px_600px_at_85%_35%,rgba(216,180,254,0.10),transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/></filter><rect width=%22400%22 height=%22400%22 filter=%22url(%23n)%22 opacity=%220.55%22/></svg>')]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:64px_64px]" />
    </div>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-bg shadow-glow transition",
        "bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(139,92,246,0.85),rgba(236,72,153,0.22))]"
      )}
    >
      {children}
    </span>
  );
}

export default function ExplorePage() {
  const items = useMemo<DemoItem[]>(
    () => [
      {
        id: "d1",
        type: "grant",
        title: "Youth Employment Innovation Fund – Capacity Building",
        buyer: "Foundation Consortium",
        country: "Senegal",
        sector: "Employment",
        deadline: new Date(Date.now() + 6 * 86400000).toISOString(),
        confidence: "high",
        link: "https://example.com/grant/1",
      },
      {
        id: "d2",
        type: "tender",
        title: "IT Services Framework – Web Platform Maintenance",
        buyer: "Public Agency",
        country: "Italy",
        sector: "IT",
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        confidence: "med",
        link: "https://example.com/tender/2",
      },
      {
        id: "d3",
        type: "grant",
        title: "Emergency Response Program – Logistics & Procurement",
        buyer: "International NGO",
        country: "Jordan",
        sector: "Humanitarian",
        deadline: new Date(Date.now() - 2 * 86400000).toISOString(),
        confidence: "low",
        link: "https://example.com/grant/3",
      },
      {
        id: "d4",
        type: "tender",
        title: "Training Services – Technical Upskilling",
        buyer: "Ministry of Education",
        country: "France",
        sector: "Training",
        deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
        confidence: "high",
        link: "https://example.com/tender/4",
      },
      {
        id: "d5",
        type: "tender",
        title: "Solar Deployment – Feasibility Study & Design",
        buyer: "Development Bank",
        country: "Morocco",
        sector: "Energy",
        deadline: new Date(Date.now() + 25 * 86400000).toISOString(),
        confidence: "med",
        link: "https://example.com/tender/5",
      },
    ],
    []
  );

  const [q, setQ] = useState("");
  const [type, setType] = useState<"any" | DemoItem["type"]>("any");
  const [deadline, setDeadline] = useState<"any" | "7d" | "30d" | "overdue">("any");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const now = Date.now();
    return items.filter((it) => {
      if (type !== "any" && it.type !== type) return false;

      const d = new Date(it.deadline).getTime();
      const days = Math.floor((d - now) / 86400000);
      if (deadline === "overdue" && days >= 0) return false;
      if (deadline === "7d" && !(days >= 0 && days <= 7)) return false;
      if (deadline === "30d" && !(days >= 0 && days <= 30)) return false;

      if (!qq) return true;
      const hay = `${it.title} ${it.buyer} ${it.country} ${it.sector}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q, type, deadline]);

  const reduced = useReducedMotion();
  const rowInitial = reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 10, filter: "blur(6px)" };

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <LuxeBackdrop />

      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/25 bg-bg/65 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-elevated shadow-glow" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">RadarPulse</div>
              <div className="text-[11px] text-muted">Explore (no signup)</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/request-access"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-bg shadow-glow transition hover:opacity-[0.96] active:scale-[0.99]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(139,92,246,0.85), rgba(236,72,153,0.22))",
              }}
            >
              Request access <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className={cx(
                "inline-flex items-center gap-2 rounded-xl border border-border/30 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
                "hover:bg-elevated/70 hover:border-border/45 active:scale-[0.99]"
              )}
            >
              Landing
            </Link>
          </div>
        </div>
      </div>

      <main className="relative mx-auto max-w-6xl px-4 pt-20">
        <div className="mb-6 rounded-2xl border border-border/30 bg-surface/70 p-5 shadow-soft">
          <div className="text-sm text-muted">
            This is a read-only demo dataset. To run RadarPulse on your own sources, request access.
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-2xl border border-border/30 bg-bg/55 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40 sm:max-w-xs"
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="rounded-2xl border border-border/30 bg-bg/55 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
            >
              <option value="any">Any type</option>
              <option value="tender">Tender</option>
              <option value="grant">Grant</option>
            </select>

            <select
              value={deadline}
              onChange={(e) => setDeadline(e.target.value as any)}
              className="rounded-2xl border border-border/30 bg-bg/55 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
            >
              <option value="any">Any deadline</option>
              <option value="7d">Next 7 days</option>
              <option value="30d">Next 30 days</option>
              <option value="overdue">Overdue</option>
            </select>

            <div className="text-xs text-muted sm:ml-auto">{filtered.length} items</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/30 bg-surface/70 shadow-soft">
          <div className="divide-y divide-border/20">
            {filtered.map((it, idx) => {
              const dl = deadlineTag(it.deadline);
              return (
                <motion.div
                  key={it.id}
                  className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
                  initial={rowInitial as any}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" } as any}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.55, delay: Math.min(0.02 * idx, 0.18), ease: [0.21, 0.61, 0.35, 1] }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold">{it.title}</div>
                      <ToneBadge tone="neutral">{it.type === "tender" ? "Tender" : "Grant"}</ToneBadge>
                      <ConfidencePill v={it.confidence} />
                    </div>
                    <div className="mt-1 truncate text-xs text-muted">
                      {it.buyer} · {it.country} · {it.sector}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <div className="text-xs text-muted">Deadline</div>
                      <div className="text-sm font-semibold">{formatShortDate(it.deadline)}</div>
                    </div>
                    <ToneBadge tone={dl.tone}>{dl.label}</ToneBadge>

                    <a
                      href={it.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-border/30 bg-bg/45 px-3 py-2 text-xs font-semibold text-text shadow-soft transition hover:bg-elevated/45 hover:border-border/45 active:scale-[0.99]"
                    >
                      Open <ExternalLink className="h-4 w-4" />
                    </a>

                    <div className="hidden items-center gap-2 sm:flex">
                      <button className="rounded-xl px-3 py-2 text-xs font-semibold text-bg shadow-glow transition hover:opacity-[0.96] active:scale-[0.99]"
                        style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(139,92,246,0.85), rgba(236,72,153,0.22))" }}>
                        GO
                      </button>
                      <button className="rounded-xl border border-border/30 bg-bg/45 px-3 py-2 text-xs font-semibold text-text shadow-soft transition hover:bg-elevated/45 hover:border-border/45 active:scale-[0.99]">
                        HOLD
                      </button>
                      <button className="rounded-xl border border-border/30 bg-bg/45 px-3 py-2 text-xs font-semibold text-text shadow-soft transition hover:bg-elevated/45 hover:border-border/45 active:scale-[0.99]">
                        NO-GO
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {!filtered.length ? (
              <div className="px-4 py-10 text-center text-sm text-muted">No items match your filters.</div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/30 bg-surface/70 p-5 shadow-soft">
          <div className="text-sm font-semibold">Explore is read-only</div>
          <div className="mt-1 text-sm text-muted">
            In the full product, GO creates a workspace with checklist, milestones, and document requirements.
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              to="/request-access"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-bg shadow-glow transition hover:opacity-[0.96] active:scale-[0.99]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(139,92,246,0.85), rgba(236,72,153,0.22))",
              }}
            >
              Request access <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/inbox"
              className="inline-flex items-center gap-2 rounded-xl border border-border/30 bg-bg/45 px-4 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/45 hover:border-border/45 active:scale-[0.99]"
            >
              Open app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="py-10 text-center text-xs text-muted">Demo content is illustrative and not real procurement data.</div>
      </main>
    </div>
  );
}
