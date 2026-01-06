// apps/web/src/features/landing/cinematic/WorldMapSvg.tsx
import React from "react";
import { cn } from "@/lib/utils";

type Variant = "contours" | "filled";
type Tone = "light" | "dark";

function buildInjectedStyle(variant: Variant) {
  const preset =
    variant === "contours"
      ? {
          fillA: 0.02,
          strokeA: 0.20,
          strokeWidth: 0.95,
        }
      : {
          fillA: 0.07,
          strokeA: 0.16,
          strokeWidth: 0.85,
        };

  return `
  <style data-rp-map-style="1">
    /* Use a dedicated RGB var so the map remains visible even inside dark instrument panels */
    :root { --rp-map-rgb: var(--rp-map-rgb, 255 255 255); }

    svg path, svg polygon, svg rect, svg circle, svg ellipse, svg polyline, svg line {
      fill: rgb(var(--rp-map-rgb, 255 255 255) / ${preset.fillA}) !important;
      stroke: rgb(var(--rp-map-rgb, 255 255 255) / ${preset.strokeA}) !important;
      stroke-width: ${preset.strokeWidth} !important;
      vector-effect: non-scaling-stroke;
    }

    /* Keep intrinsic sizing stable */
    svg { width: 100% !important; height: 100% !important; }
  </style>
  `.trim();
}

function ensureViewBox(svgText: string) {
  const hasViewBox = /viewBox\s*=\s*"/i.test(svgText);
  if (hasViewBox) return svgText;

  const w = /width\s*=\s*"([^"]+)"/i.exec(svgText)?.[1];
  const h = /height\s*=\s*"([^"]+)"/i.exec(svgText)?.[1];

  const width = w ? parseFloat(w) : 1000;
  const height = h ? parseFloat(h) : 500;

  // Inject viewBox + preserveAspectRatio on <svg ...>
  return svgText.replace(/<svg\b([^>]*)>/i, (m, attrs) => {
    const pa = /preserveAspectRatio\s*=\s*"/i.test(attrs)
      ? ""
      : ` preserveAspectRatio="xMidYMid meet"`;
    return `<svg${attrs} viewBox="0 0 ${width} ${height}"${pa}>`;
  });
}

function injectStyle(svgText: string, variant: Variant) {
  const cleaned = svgText.replace(
    /<style[^>]*data-rp-map-style="1"[^>]*>[\s\S]*?<\/style>/g,
    ""
  );
  const withViewBox = ensureViewBox(cleaned);
  const style = buildInjectedStyle(variant);
  return withViewBox.replace(/<svg\b([^>]*)>/i, (m) => `${m}\n${style}\n`);
}

export function WorldMapSvg({
  className,
  src = "/maps/ned_worldmap_110m.svg",
  variant = "contours",
  tone = "light",
}: {
  className?: string;
  src?: string;
  variant?: Variant;
  tone?: Tone;
}) {
  const [svg, setSvg] = React.useState<string>("");
  const [failed, setFailed] = React.useState(false);

  const mapRgb = tone === "light" ? "255 255 255" : "22 20 30";

  React.useEffect(() => {
    let alive = true;
    setFailed(false);

    (async () => {
      const res = await fetch(src, { cache: "no-store" });
      if (!res.ok) {
        if (!alive) return;
        setFailed(true);
        // eslint-disable-next-line no-console
        console.error(`WorldMapSvg: failed to load ${src} (${res.status})`);
        return;
      }
      const text = await res.text();
      if (!alive) return;
      setSvg(injectStyle(text, variant));
    })().catch((e) => {
      if (!alive) return;
      setFailed(true);
      // eslint-disable-next-line no-console
      console.error("WorldMapSvg: fetch error", e);
    });

    return () => {
      alive = false;
    };
  }, [src, variant]);

  if (failed) {
    return (
      <div
        className={cn(
          "h-full w-full rounded-[18px] border border-line/20 bg-veil/10",
          "flex items-center justify-center text-xs text-subtext",
          className
        )}
      >
        Map asset not found: {src}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-full w-full",
        "[&_svg]:h-full [&_svg]:w-full [&_svg]:max-w-none",
        className
      )}
      style={{ ["--rp-map-rgb" as any]: mapRgb }}
      role="img"
      aria-label="World map"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
