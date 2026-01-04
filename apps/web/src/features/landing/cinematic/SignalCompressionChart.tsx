import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";

function readCssRgbVar(name: string, alpha = 1): string {
  if (typeof window === "undefined") return `rgba(124,58,237,${alpha})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw
    .split(/\s+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
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

/**
 * Large, readable ECharts scene: demonstrates noise→signal compression.
 * Progress-coupled so it “feels alive” while scrolling.
 */
export function SignalCompressionChart({ progress = 1 }: { progress?: number }) {
  const t = clamp01(progress);

  const opt = useMemo(() => {
    const accent = readCssRgbVar("--rp-accent", 0.9);
    const accent2 = readCssRgbVar("--rp-accent2", 0.85);
    const text = readCssRgbVar("--rp-text", 0.9);
    const muted = readCssRgbVar("--rp-muted", 0.85);
    const border = readCssRgbVar("--rp-border", 0.28);

    const ease = t * t * (3 - 2 * t);

    // illustrative counts (no real procurement data)
    const cats = ["News", "Tenders", "Grants", "Other"];
    const raw = [240, 90, 55, 40];
    const filtered = raw.map((v, i) => {
      const target = i === 0 ? 20 : i === 1 ? 28 : i === 2 ? 14 : 6;
      return Math.round(lerp(v, target, ease));
    });

    const totalRaw = raw.reduce((a, b) => a + b, 0);
    const totalFiltered = filtered.reduce((a, b) => a + b, 0);
    const reductionPct = Math.round((1 - totalFiltered / totalRaw) * 100);

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 700,
      animationEasing: "cubicOut",
      animationDurationUpdate: 650,
      animationEasingUpdate: "cubicOut",
      grid: { left: 12, right: 12, top: 46, bottom: 14, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "category",
        data: cats,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: border } },
        axisLabel: { color: muted, fontWeight: 700 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(123,116,145,0.14)" } },
        axisLabel: { color: muted, fontWeight: 600 },
      },
      title: {
        text: `Noise ↓ ${reductionPct}%  •  ${totalRaw} → ${totalFiltered}`,
        left: "center",
        top: 6,
        textStyle: { color: text, fontSize: 12, fontWeight: 800 },
      },
      legend: {
        right: 10,
        top: 6,
        textStyle: { color: muted, fontSize: 11, fontWeight: 700 },
      },
      series: [
        {
          name: "Raw",
          type: "bar",
          data: raw,
          barWidth: 22,
          itemStyle: {
            color: "rgba(123,116,145,0.18)",
            borderColor: "rgba(123,116,145,0.35)",
            borderWidth: 1,
            borderRadius: [14, 14, 8, 8],
          },
          emphasis: { focus: "series" },
        },
        {
          name: "Actionable",
          type: "bar",
          data: filtered,
          barWidth: 22,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: accent2 },
                { offset: 1, color: accent },
              ],
            },
            borderColor: "rgba(124,58,237,0.35)",
            borderWidth: 1,
            borderRadius: [14, 14, 8, 8],
          },
          emphasis: { focus: "series" },
        },
      ],
    };
  }, [t]);

  return (
    <div className="h-[300px] w-full sm:h-[360px]">
      <ReactECharts option={opt} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
