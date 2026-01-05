import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type Point = {
  id: string;
  x: number; // 0..100
  y: number; // 0..100
  size: number;
  cluster: "Energy" | "Mobility" | "Infra";
  title: string;
  buyer: string;
  budget: string;
  deadline: string;
  evidence: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function AORadarMapSection({ id = "radar-map", className }: { id?: string; className?: string }) {
  const reduce = useReducedMotion();

  const points = useMemo<Point[]>(
    () => [
      {
        id: "ao-001",
        x: 26,
        y: 44,
        size: 2.2,
        cluster: "Infra",
        title: "EU Renewable Infra — Call",
        buyer: "EU Infrastructure Agency",
        budget: "€12,000,000",
        deadline: "2026-02-18 · 17:00 CET",
        evidence: "3 excerpts cited",
      },
      {
        id: "ao-002",
        x: 34,
        y: 58,
        size: 2.0,
        cluster: "Mobility",
        title: "EU Mobility Fund — Notice",
        buyer: "EU Mobility Directorate",
        budget: "€9,500,000",
        deadline: "2026-02-22 · 12:00 CET",
        evidence: "Merged from 3 sources",
      },
      {
        id: "ao-003",
        x: 58,
        y: 38,
        size: 1.8,
        cluster: "Energy",
        title: "Energy Tender — Digest",
        buyer: "Energy Procurement Office",
        budget: "€8,200,000",
        deadline: "2026-03-01 · 18:00 CET",
        evidence: "Source-linked",
      },
      {
        id: "ao-004",
        x: 67,
        y: 56,
        size: 2.4,
        cluster: "Infra",
        title: "Transport RFP — Amendment",
        buyer: "Regional Transport Authority",
        budget: "€6,800,000",
        deadline: "2026-02-28 · 10:00 CET",
        evidence: "Audit-ready log",
      },
      {
        id: "ao-005",
        x: 48,
        y: 66,
        size: 1.6,
        cluster: "Mobility",
        title: "Regional Grant — Update",
        buyer: "Regional Program Office",
        budget: "€2,000,000",
        deadline: "2026-02-05 · 23:59 CET",
        evidence: "Update tracked",
      },
      {
        id: "ao-006",
        x: 74,
        y: 32,
        size: 1.9,
        cluster: "Energy",
        title: "Research Grant — Addendum",
        buyer: "Research Funding Board",
        budget: "€1,200,000",
        deadline: "2026-01-30 · 17:00 CET",
        evidence: "Missing proof flagged",
      },
    ],
    []
  );

  const arcs = useMemo(() => {
    // Simple arcs as quadratic curves between “cluster centers”
    const infra = { x: 28, y: 50 };
    const mobility = { x: 50, y: 68 };
    const energy = { x: 70, y: 35 };
    return [
      { a: infra, b: mobility, c: { x: 40, y: 38 } },
      { a: mobility, b: energy, c: { x: 62, y: 78 } },
      { a: infra, b: energy, c: { x: 56, y: 22 } },
    ];
  }, []);

  const [activeCluster, setActiveCluster] = useState<"All" | Point["cluster"]>("All");
  const [hoverId, setHoverId] = useState<string>("ao-001");

  const filtered = useMemo(() => {
    if (activeCluster === "All") return points;
    return points.filter((p) => p.cluster === activeCluster);
  }, [points, activeCluster]);

  const hovered = useMemo(() => points.find((p) => p.id === hoverId) ?? points[0], [points, hoverId]);

  return (
    <section id={id} className={cn("relative py-20", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Dark premium stage */}
        <div className="relative overflow-hidden rounded-[36px] border border-line/20 bg-[#07060d] shadow-soft">
          {/* subtle lavender haze */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.9]">
            <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.22),transparent_60%)]" />
            <div className="absolute -right-48 -bottom-48 h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.18),transparent_60%)]" />
            <div className="absolute inset-0 opacity-[0.28] bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.08),transparent_55%)]" />
          </div>

          <div className="relative grid grid-cols-1 gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-12">
            {/* Copy */}
            <div className="lg:col-span-5">
              <div className="text-xs font-semibold tracking-wide text-white/65">Global intake</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                See opportunities across the world—before your competitors do.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65">
                RadarPulse detects tenders and grants across portals, gazettes, and inboxes, then compresses them into one signal with
                traceable provenance.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {(["All", "Infra", "Mobility", "Energy"] as const).map((t) => {
                  const active = activeCluster === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveCluster(t)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur transition",
                        active ? "border-white/30 bg-white/10 text-white" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/8"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 rounded-2xl border border-white/12 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{hovered.title}</div>
                    <div className="mt-1 text-xs text-white/60">{hovered.buyer}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/18 bg-white/8 px-3 py-1 text-[11px] font-semibold text-white/70">
                    {hovered.cluster}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] font-semibold text-white/55">Budget</div>
                    <div className="mt-0.5 text-xs font-semibold text-white">{hovered.budget}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] font-semibold text-white/55">Deadline</div>
                    <div className="mt-0.5 text-xs font-semibold text-white">
                      {hovered.deadline.split("·")[0].trim()}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] font-semibold text-white/55">Evidence</div>
                    <div className="mt-0.5 text-xs font-semibold text-white">{hovered.evidence}</div>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white/80">
                  Open record <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-6 text-xs text-white/55">
                “Radar field” is a data-art visualization: pulses represent new opportunities; arcs represent multi-source provenance.
              </div>
            </div>

            {/* Visual */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/5 p-6 backdrop-blur">
                {/* Ring + grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.09),transparent_60%)]" />
                  <div className="absolute inset-0 bg-[conic-gradient(from_180deg,rgba(124,58,237,0.22),rgba(255,255,255,0.02),rgba(124,58,237,0.18))]" />
                </div>

                <svg viewBox="0 0 100 100" className="relative h-[420px] w-full">
                  {/* arcs */}
                  <g opacity="0.55">
                    {arcs.map((arc, idx) => (
                      <path
                        key={idx}
                        d={`M ${arc.a.x} ${arc.a.y} Q ${arc.c.x} ${arc.c.y} ${arc.b.x} ${arc.b.y}`}
                        fill="none"
                        stroke="rgba(124,58,237,0.55)"
                        strokeWidth="0.35"
                      />
                    ))}
                  </g>

                  {/* outer ring */}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />
                  <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

                  {/* points */}
                  {filtered.map((p) => {
                    const isActive = p.id === hoverId;
                    const baseFill =
                      p.cluster === "Infra"
                        ? "rgba(255,255,255,0.78)"
                        : p.cluster === "Mobility"
                        ? "rgba(124,58,237,0.88)"
                        : "rgba(255,255,255,0.65)";

                    const pulse = !reduce ? (
                      <motion.circle
                        cx={p.x}
                        cy={p.y}
                        r={isActive ? p.size * 2.6 : p.size * 2.2}
                        fill="rgba(124,58,237,0.18)"
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: [0.25, 0.55, 0.25] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: (p.x + p.y) * 0.01 }}
                      />
                    ) : null;

                    return (
                      <g
                        key={p.id}
                        onMouseEnter={() => setHoverId(p.id)}
                        onFocus={() => setHoverId(p.id)}
                        tabIndex={0}
                      >
                        {pulse}
                        <circle cx={p.x} cy={p.y} r={isActive ? p.size * 1.55 : p.size} fill={baseFill} />
                        {isActive ? (
                          <circle cx={p.x} cy={p.y} r={p.size * 3.2} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.4" />
                        ) : null}
                      </g>
                    );
                  })}

                  {/* subtle scan line */}
                  {reduce ? null : (
                    <motion.rect
                      x="0"
                      y={clamp(18 + (hovered.y - 18), 10, 90)}
                      width="100"
                      height="0.9"
                      fill="rgba(255,255,255,0.08)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  )}
                </svg>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-white/60">
                    Pulses = new AO detected · Arcs = provenance links · Clusters = sector signal
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Noise ↓", "Dedup ↑", "Evidence ↑"].map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/65"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom separator */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>
      </div>
    </section>
  );
}
