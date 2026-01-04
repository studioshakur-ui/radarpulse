import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

function readCssRgbVar(name: string, alpha = 1): string {
  if (typeof window === "undefined") return `rgba(124,58,237,${alpha})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/\s+/).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const [r, g, b] = parts.length >= 3 ? parts : [124, 58, 237];
  return `rgba(${r},${g},${b},${alpha})`;
}

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function DecisionPipelineChart({ progress = 1 }: { progress?: number }) {
  const t = clamp01(progress);

  const opt = useMemo(() => {
    const accent = readCssRgbVar("--rp-accent", 0.85);
    const accent2 = readCssRgbVar("--rp-accent2", 0.75);
    const text = readCssRgbVar("--rp-text", 0.9);
    const muted = readCssRgbVar("--rp-muted", 0.85);
    const border = readCssRgbVar("--rp-border", 0.28);

    // Cinematic scroll-coupled shrink: thick flow at the start, sharp funnel at the end.
    // The values are intentionally non-linear for a stronger “wow” moment.
    const ease = t * t * (3 - 2 * t); // smoothstep
    const v1 = 100;
    const v2 = Math.round(lerp(96, 85, ease));
    const v3 = Math.round(lerp(90, 62, ease));
    const v4 = Math.round(lerp(78, 40, ease));
    const v5 = Math.round(lerp(55, 18, ease));

    return {
      backgroundColor: "transparent",
      grid: { left: 10, right: 10, top: 10, bottom: 10, containLabel: true },
      tooltip: { trigger: "item" },
      animation: true,
      animationDuration: 700,
      animationEasing: "cubicOut",
      animationDurationUpdate: 650,
      animationEasingUpdate: "cubicOut",
      series: [
        {
          type: "sankey",
          emphasis: { focus: "adjacency" },
          data: [
            { name: "Ingest", itemStyle: { color: accent } },
            { name: "Classify", itemStyle: { color: accent2 } },
            { name: "Deduplicate", itemStyle: { color: accent } },
            { name: "Extract", itemStyle: { color: accent2 } },
            { name: "Decide", itemStyle: { color: accent } },
            { name: "Workspace", itemStyle: { color: accent2 } },
          ],
          links: [
            { source: "Ingest", target: "Classify", value: v1 },
            { source: "Classify", target: "Deduplicate", value: v2 },
            { source: "Deduplicate", target: "Extract", value: v3 },
            { source: "Extract", target: "Decide", value: v4 },
            { source: "Decide", target: "Workspace", value: v5 },
          ],
          nodeWidth: 18,
          nodeGap: 18,
          draggable: false,
          lineStyle: {
            color: "gradient",
            curveness: 0.5,
            opacity: lerp(0.72, 0.55, ease),
          },
          label: {
            color: text,
            fontWeight: 700,
            fontSize: 12,
          },
          itemStyle: {
            borderWidth: 1,
            borderColor: border,
          },
        },
      ],
      title: [
        {
          text: `From ${v1} raw items → ${v5} execution-ready`,
          left: "center",
          top: 0,
          textStyle: { color: muted, fontSize: 12, fontWeight: 700 },
        },
      ],
    };
  }, [t]);

  return (
    <div className="h-[320px] w-full sm:h-[380px]">
      <ReactECharts option={opt} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
