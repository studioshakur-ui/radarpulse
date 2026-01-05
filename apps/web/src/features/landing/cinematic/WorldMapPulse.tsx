// apps/web/src/features/landing/cinematic/WorldMapPulse.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { WorldMapSvg } from "@/features/landing/cinematic/WorldMapSvg";

type MapPoint = {
  id: string;
  label: string;
  x: number; // in viewBox coords (0..1000)
  y: number; // in viewBox coords (0..500)
  note: string;
  tag: string;
};

const POINTS: MapPoint[] = [
  { id: "eu", label: "EU", x: 535, y: 165, note: "TED (EU) · calls, notices, amendments", tag: "Portal" },
  { id: "uk", label: "UK", x: 465, y: 155, note: "Find a Tender · notices & updates", tag: "Portal" },
  { id: "us", label: "US", x: 210, y: 200, note: "SAM.gov · federal opportunities", tag: "Portal" },
  { id: "na", label: "MENA", x: 585, y: 220, note: "Gazettes + portals · procurement signals", tag: "Gazette" },
  { id: "in", label: "India", x: 715, y: 275, note: "Portals + email alerts · structured intake", tag: "Alerts" },
  { id: "apac", label: "APAC", x: 805, y: 310, note: "Portals + digests · dedup preserved", tag: "Digest" },
];

type Arc = { from: string; to: string; strength: number };
const ARCS: Arc[] = [
  { from: "us", to: "eu", strength: 0.65 },
  { from: "uk", to: "eu", strength: 0.9 },
  { from: "na", to: "eu", strength: 0.7 },
  { from: "in", to: "eu", strength: 0.55 },
  { from: "apac", to: "eu", strength: 0.5 },
];

function pctX(x: number) {
  return `${(x / 1000) * 100}%`;
}
function pctY(y: number) {
  return `${(y / 500) * 100}%`;
}

function arcPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  // Quadratic curve with lift for a “signal arc”
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const lift = Math.min(120, Math.max(45, dist * 0.18));
  const cx = mx;
  const cy = my - lift;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
      {children}
    </span>
  );
}

export function WorldMapPulse({ className }: { className?: string }) {
  const [hovered, setHovered] = React.useState<MapPoint | null>(null);

  const byId = React.useMemo(() => {
    const m = new Map<string, MapPoint>();
    for (const p of POINTS) m.set(p.id, p);
    return m;
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[42px] border border-border/20",
        "bg-gradient-to-b from-[#07070b] via-[#07070b] to-[#0b0720]",
        "shadow-[0_40px_140px_-70px_rgba(96,35,255,0.55)]",
        className
      )}
    >
      {/* Header */}
      <div className="px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-white/55">Global intake</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-white/90">
              Normalize every source into one evidence-ready inbox.
            </div>
            <div className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
              A lightweight world view: portals and feeds converge, duplicates collapse, and citations remain traceable.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge>No heavy geo libs</Badge>
            <Badge>SVG · pulses · arcs</Badge>
            <Badge>Stable layout</Badge>
          </div>
        </div>
      </div>

      {/* Map block (full width) */}
      <div className="mt-6 px-4 pb-8 sm:px-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div className="text-xs text-white/45">Signals converge into one canonical opportunity.</div>
            <div className="text-xs text-white/45">Hover points for source examples.</div>
          </div>

          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
            {/* Aspect ratio for a premium “wide” feel */}
            <div className="relative aspect-[2/1] w-full">
              {/* Background layer: grid + noise + vignette + brand halo */}
              <svg
                viewBox="0 0 1000 500"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <pattern id="rpGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M48 0H0V48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <path d="M24 0V48M0 24H48" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
                  </pattern>

                  <radialGradient id="rpVignette" cx="50%" cy="45%" r="75%">
                    <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="60%" stopColor="rgba(0,0,0,0.25)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.70)" />
                  </radialGradient>

                  <filter id="rpNoise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
                    <feColorMatrix
                      type="matrix"
                      values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 0.12 0"
                    />
                  </filter>

                  <linearGradient id="rpArc" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(163,124,255,0.15)" />
                    <stop offset="50%" stopColor="rgba(163,124,255,0.75)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
                  </linearGradient>
                </defs>

                {/* Brand halo around EU */}
                <circle cx="535" cy="165" r="220" fill="rgba(163,124,255,0.10)" />
                <circle cx="535" cy="165" r="140" fill="rgba(163,124,255,0.14)" />

                {/* Grid */}
                <rect x="0" y="0" width="1000" height="500" fill="url(#rpGrid)" opacity="0.55" />

                {/* Noise */}
                <rect x="0" y="0" width="1000" height="500" filter="url(#rpNoise)" opacity="0.08" />

                {/* Vignette */}
                <rect x="0" y="0" width="1000" height="500" fill="url(#rpVignette)" />
              </svg>

              {/* Continents watermark */}
              <div className="absolute inset-0 pointer-events-none">
                <WorldMapSvg
                  className="h-full w-full"
                  landClassName="fill-white/3"
                  strokeClassName="stroke-white/10"
                />
              </div>

              {/* Overlay: arcs + points + pulses */}
              <svg
                viewBox="0 0 1000 500"
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label="RadarPulse global signal map"
              >
                {/* Arcs */}
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
                        opacity={0.55}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>

                {/* Points */}
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
                        {/* Outer pulse ring */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHot ? 16 : 14}
                          fill="rgba(163,124,255,0.10)"
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHot ? 9 : 8}
                          fill="rgba(163,124,255,0.22)"
                        />
                        {/* Core */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={3.8}
                          fill={p.id === "eu" ? "rgba(163,124,255,0.95)" : "rgba(255,255,255,0.75)"}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* EU scan rings (signature) */}
                <g>
                  <circle cx="535" cy="165" r="26" fill="none" stroke="rgba(163,124,255,0.35)" strokeWidth="1.2" />
                  <circle cx="535" cy="165" r="44" fill="none" stroke="rgba(163,124,255,0.18)" strokeWidth="1.2" />
                  <circle cx="535" cy="165" r="70" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />
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
                  <div className="w-[260px] rounded-[16px] border border-white/10 bg-black/70 p-3 shadow-[0_24px_90px_-40px_rgba(163,124,255,0.45)] backdrop-blur">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white/85">{hovered.label}</div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                        {hovered.tag}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-white/55">{hovered.note}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Below map: high-standing “clients care about” — STACKED (keeps map wide) */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white/85">What clients care about</div>
              <ul className="mt-3 space-y-2 text-sm text-white/65">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/35" />
                  Coverage: which portals you ingest, and how often.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/35" />
                  Provenance: every claim cites the source location.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/35" />
                  Dedup: one truth, merged sources preserved.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/35" />
                  Governance: exportable, reproducible decision log.
                </li>
              </ul>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white/85">Example sources</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["SAM.gov", "Find a Tender", "TED (EU)", "Portals", "Email alerts", "Gazettes"].map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-4 text-xs leading-relaxed text-white/45">
                Lightweight visualization for landing: SVG-only, stable layout, no runtime surprises.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
