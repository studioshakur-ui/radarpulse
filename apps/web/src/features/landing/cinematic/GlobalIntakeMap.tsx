import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorldMapSvg } from "@/features/landing/cinematic/WorldMapSvg";

type IntakeItem = {
  id: string;
  title: string;
  buyer: string;
  sector: "Infra" | "Mobility" | "Energy" | "Research";
  budget: string;
  deadline: string;
  evidence: string;
  lat: number;
  lon: number;
  status: "NEW" | "POSSIBLE DUP" | "UPDATE" | "FLAG" | "MERGED";
};

const ITEMS: IntakeItem[] = [
  {
    id: "ao-001",
    title: "EU Renewable Infra — Call",
    buyer: "EU Portal",
    sector: "Infra",
    budget: "€12,000,000",
    deadline: "2026-02-18",
    evidence: "3 sources merged · 3 cited",
    lat: 50.85,
    lon: 4.35,
    status: "NEW",
  },
  {
    id: "ao-002",
    title: "EU Mobility Fund — Notice",
    buyer: "Gazette",
    sector: "Mobility",
    budget: "€9,500,000",
    deadline: "2026-02-22",
    evidence: "Possible duplicate detected",
    lat: 48.86,
    lon: 2.35,
    status: "POSSIBLE DUP",
  },
  {
    id: "ao-003",
    title: "Regional Grant — Update",
    buyer: "Email inbox",
    sector: "Energy",
    budget: "€2,000,000",
    deadline: "2026-02-05",
    evidence: "Change log updated",
    lat: 41.90,
    lon: 12.49,
    status: "UPDATE",
  },
  {
    id: "ao-004",
    title: "Energy Tender — Digest",
    buyer: "Portal",
    sector: "Energy",
    budget: "€8,200,000",
    deadline: "2026-03-01",
    evidence: "Dedup preserved provenance",
    lat: 51.51,
    lon: -0.13,
    status: "MERGED",
  },
  {
    id: "ao-005",
    title: "Transport RFP — Amendment",
    buyer: "Portal",
    sector: "Mobility",
    budget: "€6,800,000",
    deadline: "2026-02-28",
    evidence: "Evidence linked",
    lat: 40.42,
    lon: -3.70,
    status: "NEW",
  },
  {
    id: "ao-006",
    title: "Research Grant — Addendum",
    buyer: "Funding Board",
    sector: "Research",
    budget: "€1,200,000",
    deadline: "2026-01-30",
    evidence: "Missing proof flagged",
    lat: 52.52,
    lon: 13.40,
    status: "FLAG",
  },
];

function projectEquirect(lon: number, lat: number) {
  // viewBox 1000x500
  const x = ((lon + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

function statusPill(status: IntakeItem["status"]) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-tight";
  switch (status) {
    case "NEW":
      return <span className={cn(base, "border-emerald-400/30 bg-emerald-400/10 text-emerald-200")}>NEW</span>;
    case "POSSIBLE DUP":
      return <span className={cn(base, "border-orange-400/30 bg-orange-400/10 text-orange-200")}>POSSIBLE DUP</span>;
    case "UPDATE":
      return <span className={cn(base, "border-sky-400/30 bg-sky-400/10 text-sky-200")}>UPDATE</span>;
    case "MERGED":
      return <span className={cn(base, "border-violet-400/30 bg-violet-400/10 text-violet-200")}>MERGED</span>;
    case "FLAG":
      return <span className={cn(base, "border-rose-400/30 bg-rose-400/10 text-rose-200")}>FLAG</span>;
    default:
      return <span className={cn(base, "border-white/15 bg-white/5 text-white/75")}>{status}</span>;
  }
}

function sectorTabs(active: string, setActive: (v: string) => void) {
  const tabs = ["All", "Infra", "Mobility", "Energy", "Research"];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setActive(t)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition",
            active === t
              ? "border-white/20 bg-white/10 text-white"
              : "border-white/12 bg-white/5 text-white/70 hover:bg-white/8"
          )}
          type="button"
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function arcPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  // Quadratic bezier with soft lift
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const mx = a.x + dx * 0.5;
  const my = a.y + dy * 0.5;
  const lift = Math.max(20, Math.min(110, Math.hypot(dx, dy) * 0.18));
  const cx = mx;
  const cy = my - lift;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

export function GlobalIntakeMap({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  const [tab, setTab] = useState("All");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (tab === "All") return ITEMS;
    return ITEMS.filter((x) => x.sector === tab);
  }, [tab]);

  const activeId = pinnedId ?? hoverId ?? filtered[0]?.id ?? null;
  const active = filtered.find((x) => x.id === activeId) ?? filtered[0];

  const pts = useMemo(() => {
    return filtered.map((it) => {
      const p = projectEquirect(it.lon, it.lat);
      return { it, p };
    });
  }, [filtered]);

  const activePt = pts.find((x) => x.it.id === active?.id) ?? null;

  // Build arcs from active item to 3 nearest (for “provenance links” feel)
  const arcs = useMemo(() => {
    if (!activePt) return [];
    const others = pts
      .filter((x) => x.it.id !== activePt.it.id)
      .map((x) => {
        const d = Math.hypot(x.p.x - activePt.p.x, x.p.y - activePt.p.y);
        return { ...x, d };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    return others.map((o) => ({
      id: `${activePt.it.id}__${o.it.id}`,
      d: arcPath(activePt.p, o.p),
    }));
  }, [activePt, pts]);

  const onNodeEnter = (id: string) => setHoverId(id);
  const onNodeLeave = () => setHoverId(null);

  const onNodeClick = (id: string) => {
    setPinnedId((cur) => (cur === id ? null : id));
  };

  return (
    <section className={cn("relative py-16 sm:py-20", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[44px] border border-border/20 bg-white/35 shadow-soft backdrop-blur">
          <div className="grid gap-10 p-6 sm:p-8 lg:grid-cols-12 lg:gap-12 lg:p-10">
            {/* Left — copy + list */}
            <div className="lg:col-span-5">
              <div className="text-xs font-semibold text-muted">Global intake</div>

              <h3 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                See opportunities across the world—before your competitors do.
              </h3>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                RadarPulse detects tenders and grants across portals, gazettes, and inboxes, then compresses them into one
                signal with traceable provenance.
              </p>

              <div className="mt-5">{sectorTabs(tab, setTab)}</div>

              {/* Active card */}
              <div className="mt-6 rounded-3xl border border-white/10 bg-black/85 p-5 text-white shadow-glow">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{active?.title ?? "—"}</div>
                    <div className="mt-1 text-xs text-white/70">{active?.buyer ?? "—"}</div>
                  </div>
                  {active ? statusPill(active.status) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] font-semibold text-white/65">Budget</div>
                    <div className="mt-0.5 text-xs font-semibold">{active?.budget ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] font-semibold text-white/65">Deadline</div>
                    <div className="mt-0.5 text-xs font-semibold">{active?.deadline ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:col-span-2">
                    <div className="text-[11px] font-semibold text-white/65">Evidence</div>
                    <div className="mt-0.5 text-xs font-semibold">{active?.evidence ?? "—"}</div>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
                >
                  Open record <ArrowRight className="h-4 w-4" />
                </button>

                <div className="mt-4 text-[11px] text-white/55">
                  “Radar field” is a data-art visualization: pulses represent new opportunities; arcs represent multi-source
                  provenance.
                </div>
              </div>
            </div>

            {/* Right — map */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-black/90 shadow-glow">
                {/* soft gradient wash */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -inset-[35%] rotate-6 bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.35),transparent_55%)]" />
                  <div className="absolute -inset-[35%] -rotate-6 bg-[radial-gradient(circle_at_80%_70%,rgba(168,85,247,0.25),transparent_55%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.0),rgba(0,0,0,0.35))]" />
                </div>

                <div className="relative p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-white/70">
                      Pulses = new AO detected · Arcs = provenance links · Clusters = sector signal
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {["Noise ↓", "Dedup ↑", "Evidence ↑"].map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                    <svg viewBox="0 0 1000 500" className="h-full w-full">
                      {/* map */}
                      <g opacity={1}>
                        <WorldMapSvg landClassName="fill-white/6" strokeClassName="stroke-white/12" />
                      </g>

                      {/* arcs */}
                      <g className="pointer-events-none">
                        {arcs.map((a) => (
                          <path
                            key={a.id}
                            d={a.d}
                            fill="none"
                            stroke="rgba(168,85,247,0.55)"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeDasharray="4 6"
                          />
                        ))}
                        {/* glow copy */}
                        {arcs.map((a) => (
                          <path
                            key={`${a.id}-glow`}
                            d={a.d}
                            fill="none"
                            stroke="rgba(168,85,247,0.20)"
                            strokeWidth={10}
                            strokeLinecap="round"
                          />
                        ))}
                      </g>

                      {/* nodes */}
                      <g>
                        {pts.map(({ it, p }) => {
                          const isActive = it.id === activeId;
                          const isPinned = it.id === pinnedId;
                          const baseR = isActive ? 7 : 5;

                          return (
                            <g
                              key={it.id}
                              onMouseEnter={() => onNodeEnter(it.id)}
                              onMouseLeave={onNodeLeave}
                              onClick={() => onNodeClick(it.id)}
                              style={{ cursor: "pointer" }}
                            >
                              {/* halo */}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={isActive ? 20 : 14}
                                fill={isActive ? "rgba(168,85,247,0.16)" : "rgba(255,255,255,0.06)"}
                              />

                              {/* pulse ring */}
                              {!reduce ? (
                                <motion.circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={isActive ? 18 : 14}
                                  fill="none"
                                  stroke={isActive ? "rgba(168,85,247,0.55)" : "rgba(255,255,255,0.18)"}
                                  strokeWidth={2}
                                  initial={{ opacity: 0.0, scale: 0.7 }}
                                  animate={{ opacity: [0.0, 0.65, 0.0], scale: [0.8, 1.15, 1.35] }}
                                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                                />
                              ) : null}

                              {/* core dot */}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={baseR}
                                fill={isActive ? "rgba(168,85,247,0.95)" : "rgba(255,255,255,0.78)"}
                                stroke={isPinned ? "rgba(168,85,247,0.95)" : "rgba(255,255,255,0.15)"}
                                strokeWidth={isPinned ? 3 : 1.5}
                              />
                            </g>
                          );
                        })}
                      </g>

                      {/* tooltip */}
                      {activePt ? (
                        <g className="pointer-events-none">
                          {(() => {
                            // clamp tooltip inside viewBox
                            const w = 260;
                            const h = 78;
                            const pad = 12;
                            let x = activePt.p.x + 16;
                            let y = activePt.p.y - (h + 16);
                            x = Math.max(pad, Math.min(1000 - w - pad, x));
                            y = Math.max(pad, Math.min(500 - h - pad, y));

                            return (
                              <g transform={`translate(${x}, ${y})`}>
                                <rect
                                  width={w}
                                  height={h}
                                  rx={18}
                                  fill="rgba(0,0,0,0.75)"
                                  stroke="rgba(255,255,255,0.12)"
                                />
                                <text x={16} y={28} fill="rgba(255,255,255,0.92)" fontSize="12" fontWeight={700}>
                                  {activePt.it.title.length > 34 ? `${activePt.it.title.slice(0, 34)}…` : activePt.it.title}
                                </text>
                                <text x={16} y={48} fill="rgba(255,255,255,0.65)" fontSize="11" fontWeight={600}>
                                  {activePt.it.buyer} · {activePt.it.sector}
                                </text>
                                <text x={16} y={66} fill="rgba(255,255,255,0.85)" fontSize="11" fontWeight={700}>
                                  {activePt.it.budget} · {activePt.it.deadline}
                                </text>
                              </g>
                            );
                          })()}
                        </g>
                      ) : null}
                    </svg>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-white/60">
                      Tip: hover to preview, click to pin. Click again to unpin.
                    </div>
                    {pinnedId ? (
                      <div className="text-[11px] font-semibold text-violet-200/90">
                        Pinned: {pinnedId}
                      </div>
                    ) : (
                      <div className="text-[11px] text-white/55">No pin</div>
                    )}
                  </div>
                </div>

                {/* inner border shine */}
                <div className="pointer-events-none absolute inset-0 rounded-[36px] ring-1 ring-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
