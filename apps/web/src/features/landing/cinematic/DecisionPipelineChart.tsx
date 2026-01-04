import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

function readCssRgbVar(name: string, alpha = 1): string {
  if (typeof window === "undefined") return `rgba(124,58,237,${alpha})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/\s+/).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const [r, g, b] = parts.length >= 3 ? parts : [124, 58, 237];
  return `rgba(${r},${g},${b},${alpha})`;
}

export function DecisionPipelineChart() {
  const opt = useMemo(() => {
    const accent = readCssRgbVar("--rp-accent", 0.85);
    const accent2 = readCssRgbVar("--rp-accent2", 0.75);
    const text = readCssRgbVar("--rp-text", 0.9);
    const muted = readCssRgbVar("--rp-muted", 0.85);
    const border = readCssRgbVar("--rp-border", 0.28);

    return {
      backgroundColor: "transparent",
      grid: { left: 10, right: 10, top: 10, bottom: 10, containLabel: true },
      tooltip: { trigger: "item" },
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
            { source: "Ingest", target: "Classify", value: 100 },
            { source: "Classify", target: "Deduplicate", value: 85 },
            { source: "Deduplicate", target: "Extract", value: 62 },
            { source: "Extract", target: "Decide", value: 40 },
            { source: "Decide", target: "Workspace", value: 18 },
          ],
          nodeWidth: 18,
          nodeGap: 18,
          draggable: false,
          lineStyle: {
            color: "gradient",
            curveness: 0.5,
            opacity: 0.55,
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
          text: "From 100 raw items → 18 execution-ready",
          left: "center",
          top: 0,
          textStyle: { color: muted, fontSize: 12, fontWeight: 700 },
        },
      ],
    };
  }, []);

  return (
    <div className="h-[320px] w-full sm:h-[380px]">
      <ReactECharts option={opt} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
