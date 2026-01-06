// apps/web/src/features/landing/cinematic/WorldMapPulse.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { CoreCard } from "@/components/ds/CoreCard";
import { CorePill } from "@/components/ds/CorePill";
import { WorldMapSvg } from "@/features/landing/cinematic/WorldMapSvg";

type MapPoint = {
  id: string;
  label: string;
  x: number; // map pixels
  y: number; // map pixels
  note: string;
  tag: string;
};

// NED_worldmap_110m.svg has width/height ~ 1009.6727 × 665.96301
const MAP_W = 1009.6727;
const MAP_H = 665.96301;

const POINTS: MapPoint[] = [
  { id: "eu", label: "EU", x: 540.17, y: 219.77, note: "TED (EU) · calls, notices, amendments", tag: "Portal" },
  { id: "uk", label: "UK", x: 469.5, y: 206.45, note: "Find a Tender · notices & updates", tag: "Portal" },
  { id: "us", label: "US", x: 212.03, y: 266.39, note: "SAM.gov · federal opportunities", tag: "Portal" },
  { id: "mena", label: "MENA", x: 590.66, y: 293.02, note: "Gazettes + portals · procurement signals", tag: "Gazette" },
  { id: "in", label: "India", x: 721.92, y: 366.28, note: "Portals + email alerts · structured intake", tag: "Alerts" },
  { id: "apac", label: "APAC", x: 812.79, y: 412.9, note: "Portals + digests · dedup preserved", tag: "Digest" },
];

type Arc = { from: string; to: string; strength: number };
const ARCS: Arc[] = [
  { from: "us", to: "eu", strength: 0.65 },
  { from: "uk", to: "eu", strength: 0.9 },
  { from: "mena", to: "eu", strength: 0.7 },
  { from: "in", to: "eu", strength: 0.55 },
  { from: "apac", to: "eu", strength: 0.5 },
];

function pctX(x: number) {
  return `${(x / MAP_W) * 100}%`;
}
function pctY(y: number) {
  return `${(y / MAP_H) * 100}%`;
}

function arcPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const lift = Math.min(140, Math.max(55, dist * 0.18));
  const cx = mx;
  const cy = my - lift;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export function WorldMapPulse({ className }: { className?: string }) {
  const [hovered, setHovered] = React.useState<MapPoint | null>(null);

  const byId = React.useMemo(() => {
    const m = new Map<string, MapPoint>();
    for (const p of POINTS) m.set(p.id, p);
    return m;
  }, []);

  const EU = byId.get("eu")!;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[42px] border border-line/20",
        "bg-surface/45 shadow-glow backdrop-blur",
        className
      )}
    >
      {/* Header */}
      <div className="px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-subtext">Global intake</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-text">
              Normalize every source into one evidence-ready inbox.
            </div>
            <div className="mt-2 max-w-3xl text-sm leading-relaxed text-subtext">
              Real world map (Natural Earth base) with RadarPulse signal overlays: arcs, pulses, and tooltips.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CorePill variant="dark">Real map geometry</CorePill>
            <CorePill variant="dark">SVG · pulses · arcs</CorePill>
            <CorePill variant="dark">Stable layout</CorePill>
          </div>
        </div>
      </div>

      {/* Map block (full width) */}
      <div className="mt-6 px-4 pb-8 sm:px-8">
        <CoreCard variant="panel" className="rounded-[28px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div className="text-xs text-subtext">Signals converge into one canonical opportunity.</div>
            <div className="text-xs text-subtext">Hover points for source examples.</div>
          </div>

          {/* Instrument panel */}
          <div className="relative overflow-hidden rounded-[22px] border border-line/20 bg-ink/80">
            {/* IMPORTANT: aspect matches the real map ratio (~1.516) to avoid “big empty” */}
            <div className="relative aspect-[1516/1000] w-full">
              {/* Background: grid + noise + vignette + halo (token-driven) */}
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <pattern id="rpGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M48 0H0V48" fill="none" stroke="rgb(var(--rp-text) / 0.06)" strokeWidth="1" />
                    <path d="M24 0V48M0 24H48" fill="none" stroke="rgb(var(--rp-text) / 0.035)" strokeWidth="1" />
                  </pattern>

                  <radialGradient id="rpVignette" cx="50%" cy="45%" r="75%">
                    <stop offset="0%" stopColor="rgb(var(--rp-ink) / 0)" />
                    <stop offset="60%" stopColor="rgb(var(--rp-ink) / 0.22)" />
                    <stop offset="100%" stopColor="rgb(var(--rp-ink) / 0.60)" />
                  </radialGradient>

                  <filter id="rpNoise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
                    <feColorMatrix
                      type="matrix"
                      values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 0.10 0"
                    />
                  </filter>
                </defs>

                {/* Halo centered on EU */}
                <circle cx={EU.x} cy={EU.y} r="260" fill="rgb(var(--rp-accent) / 0.11)" />
                <circle cx={EU.x} cy={EU.y} r="170" fill="rgb(var(--rp-accent2) / 0.10)" />

                <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#rpGrid)" opacity="0.65" />
                <rect x="0" y="0" width={MAP_W} height={MAP_H} filter="url(#rpNoise)" opacity="0.06" />
                <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#rpVignette)" />
              </svg>

              {/* ✅ Real world map (PUBLIC) */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.92]">
                <WorldMapSvg
                  className="h-full w-full"
                  tone="light"
                  variant="filled"
                  // file should be: apps/web/public/maps/ned_worldmap_110m.svg
                  src="/maps/ned_worldmap_110m.svg"
                />
              </div>

              {/* Overlay: arcs + points (keep defs inside the same SVG to avoid id scoping issues) */}
              <svg
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label="RadarPulse global signal map"
              >
                <defs>
                  <linearGradient id="rpArc" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgb(var(--rp-accent) / 0.15)" />
                    <stop offset="50%" stopColor="rgb(var(--rp-accent) / 0.88)" />
                    <stop offset="100%" stopColor="rgb(var(--rp-accent2) / 0.22)" />
                  </linearGradient>
                </defs>

                <g fill="none">
                  {ARCS.map((a, i) => {
                    const A = byId.get(a.from)!;
                    const B = byId.get(a.to)!;
                    return (
                      <path
                        key={i}
                        d={arcPath(A, B)}
                        stroke="url(#rpArc)"
                        strokeWidth={1.8 + a.strength * 2.2}
                        opacity={0.66}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>

                <g>
                  {POINTS.map((p) => {
                    const isHot = hovered?.id === p.id || p.id === "eu";
                    return (
                      <g
                        key={p.id}
                        onMouseEnter={() => setHovered(p)}
                        onMouseLeave={() => setHovered((cur) => (cur?.id === p.id ? null : cur))}
                        style={{ cursor: "default" }}
                      >
                        <circle cx={p.x} cy={p.y} r={isHot ? 18 : 16} fill="rgb(var(--rp-accent) / 0.10)" />
                        <circle cx={p.x} cy={p.y} r={isHot ? 10 : 9} fill="rgb(var(--rp-accent2) / 0.18)" />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={4.0}
                          fill={p.id === "eu" ? "rgb(var(--rp-accent) / 0.95)" : "rgb(255 255 255 / 0.72)"}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* EU scan rings (signature) */}
                <g>
                  <circle cx={EU.x} cy={EU.y} r="28" fill="none" stroke="rgb(var(--rp-accent) / 0.36)" strokeWidth="1.2" />
                  <circle cx={EU.x} cy={EU.y} r="48" fill="none" stroke="rgb(var(--rp-accent2) / 0.22)" strokeWidth="1.2" />
                  <circle cx={EU.x} cy={EU.y} r="76" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1.2" />
                </g>
              </svg>

              {/* Tooltip */}
              {hovered && (
                <div
                  className="pointer-events-none absolute z-10"
                  style={{
                    left: pctX(hovered.x),
                    top: pctY(hovered.y),
                    transform: "translate(12px, -110%)",
                  }}
                >
                  <div className="w-[260px] rounded-[16px] border border-line/25 bg-ink/85 p-3 shadow-glow backdrop-blur">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-text/90">{hovered.label}</div>
                      <span className="rounded-full border border-line/25 bg-veil/20 px-2 py-0.5 text-[11px] font-semibold text-subtext">
                        {hovered.tag}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-subtext">{hovered.note}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Below map: stacked panels to keep map wide */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[22px] border border-line/20 bg-surface/25 p-5 shadow-soft backdrop-blur">
              <div className="text-sm font-semibold text-text">What clients care about</div>
              <ul className="mt-3 space-y-2 text-sm text-subtext">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-line/70" />
                  Coverage: which portals you ingest, and how often.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-line/70" />
                  Provenance: every claim cites the source location.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-line/70" />
                  Dedup: one truth, merged sources preserved.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-line/70" />
                  Governance: exportable, reproducible decision log.
                </li>
              </ul>
            </div>

            <div className="rounded-[22px] border border-line/20 bg-surface/25 p-5 shadow-soft backdrop-blur">
              <div className="text-sm font-semibold text-text">Example sources</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["SAM.gov", "Find a Tender", "TED (EU)", "Portals", "Email alerts", "Gazettes"].map((s) => (
                  <CorePill key={s} variant="dark" className="border-line/20 bg-veil/20">
                    {s}
                  </CorePill>
                ))}
              </div>

              <div className="mt-4 text-xs leading-relaxed text-subtext">
                Real map base, lightweight overlay: SVG-only, stable layout, no runtime surprises.
              </div>
            </div>
          </div>
        </CoreCard>
      </div>
    </div>
  );
}
