import React from "react";
import { cn } from "@/lib/utils";

/**
 * Option A (SVG) : continents en paths (style "Natural Earth-like" simplifié).
 * - Tu peux remplacer WORLD_PATHS par un SVG plus précis sans toucher au reste.
 * - ViewBox 0 0 1000 500 (projection equirectangulaire).
 */
const WORLD_PATHS: string[] = [
  // North America (simplified but recognizable)
  "M92,149 L112,127 L146,111 L190,98 L241,93 L292,104 L326,120 L350,146 L354,176 L330,198 L298,220 L261,243 L235,265 L210,282 L180,289 L153,279 L134,258 L116,235 L99,206 Z",
  // Greenland
  "M344,67 L374,52 L408,54 L434,72 L432,94 L402,109 L370,102 L350,86 Z",
  // Central America + Caribbean hint
  "M262,244 L286,256 L303,275 L299,292 L279,300 L258,289 L246,268 Z",
  // South America
  "M300,302 L328,300 L360,315 L386,346 L398,382 L393,416 L374,445 L346,462 L320,456 L308,430 L316,402 L330,372 L320,344 Z",
  // Europe
  "M474,160 L495,145 L522,140 L552,145 L574,159 L576,176 L560,187 L532,190 L504,184 L484,174 Z",
  // Africa
  "M520,204 L550,198 L585,210 L610,236 L620,268 L610,304 L590,336 L560,358 L534,350 L520,320 L510,284 L506,248 Z",
  // Middle East / West Asia
  "M590,190 L622,190 L652,206 L656,226 L630,236 L604,226 L588,212 Z",
  // Asia (large mass)
  "M574,146 L612,128 L660,120 L712,124 L760,138 L806,164 L844,198 L864,230 L852,260 L822,266 L790,252 L760,234 L732,230 L706,246 L684,268 L660,274 L632,266 L618,244 L632,222 L654,208 L638,190 L606,182 L582,170 Z",
  // India
  "M706,246 L726,254 L736,276 L728,296 L710,302 L698,286 L696,266 Z",
  // SE Asia
  "M736,276 L760,286 L780,306 L774,324 L752,330 L736,314 Z",
  // Japan
  "M840,214 L852,220 L856,236 L846,246 L838,236 Z",
  // Australia
  "M792,352 L826,344 L862,356 L888,380 L876,410 L842,426 L812,416 L790,392 Z",
  // Madagascar
  "M612,332 L626,342 L628,360 L616,374 L602,360 L604,342 Z",
  // UK / Ireland hint
  "M456,150 L466,148 L472,158 L466,168 L456,164 Z",
  // Scandinavia hint
  "M520,122 L542,112 L560,118 L560,132 L544,142 L526,140 Z",
  // Antarctica band (very light)
  "M80,468 L210,480 L360,486 L520,490 L700,486 L860,478 L960,466 L960,500 L80,500 Z",
];

export function WorldMapSvg({
  className,
  landClassName,
  strokeClassName,
}: {
  className?: string;
  landClassName?: string;
  strokeClassName?: string;
}) {
  return (
    <svg
      viewBox="0 0 1000 500"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="World map"
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        className={cn(
          "opacity-100",
          // defaults (safe)
          landClassName ?? "fill-white/5",
          strokeClassName ?? "stroke-white/12"
        )}
        strokeWidth={1.2}
      >
        {WORLD_PATHS.map((d, i) => (
          <path key={i} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}
