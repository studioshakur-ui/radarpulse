import React from "react";
import { cn, daysLeft } from "@/lib/utils";
import type { Decision, WorkflowStatus } from "@/lib/types";

type StatusTone = "neutral" | "brand" | "good" | "warn" | "bad";
type PillSize = "sm" | "md";

type RecommendationValue = Decision | null;
type ScoreBand = "high" | "med" | "low";

const PILL_TONES: Record<StatusTone, string> = {
  neutral: "border-line/20 bg-white/76 text-subtext",
  brand: "border-brand/35 bg-brand/10 text-brand",
  good: "border-good/35 bg-good/12 text-good",
  warn: "border-warn/35 bg-warn/12 text-warn",
  bad: "border-bad/35 bg-bad/12 text-bad",
};

const PILL_SIZES: Record<PillSize, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

const PANEL_TONES: Record<StatusTone, string> = {
  neutral: "border-line/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,243,255,0.9))]",
  brand: "border-brand/20 bg-[linear-gradient(180deg,rgba(124,58,237,0.12),rgba(255,255,255,0.96))]",
  good: "border-good/20 bg-[linear-gradient(180deg,rgba(22,163,74,0.10),rgba(255,255,255,0.96))]",
  warn: "border-warn/20 bg-[linear-gradient(180deg,rgba(217,119,6,0.10),rgba(255,255,255,0.96))]",
  bad: "border-bad/20 bg-[linear-gradient(180deg,rgba(220,38,38,0.10),rgba(255,255,255,0.96))]",
};

function decisionTone(decision: Decision): StatusTone {
  if (decision === "GO") return "good";
  if (decision === "HOLD") return "warn";
  return "bad";
}

function workflowTone(status: WorkflowStatus): StatusTone {
  switch (status) {
    case "GO":
    case "SUBMITTED":
      return "good";
    case "PREPARATION":
      return "warn";
    case "REVIEWED":
    case "READY":
      return "brand";
    case "EXPIRED":
      return "bad";
    default:
      return "neutral";
  }
}

function scoreTone(band: ScoreBand): StatusTone {
  if (band === "high") return "good";
  if (band === "med") return "warn";
  return "bad";
}

export function SemanticPill({
  children,
  className,
  size = "md",
  tone = "neutral",
  uppercase = false,
  mono = false,
}: {
  children: React.ReactNode;
  className?: string;
  size?: PillSize;
  tone?: StatusTone;
  uppercase?: boolean;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        PILL_TONES[tone],
        PILL_SIZES[size],
        uppercase && "uppercase tracking-wide",
        mono && "tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SignalBadge({
  children,
  className,
  size = "md",
  tone = "neutral",
  uppercase = false,
  mono = false,
}: {
  children: React.ReactNode;
  className?: string;
  size?: PillSize;
  tone?: StatusTone;
  uppercase?: boolean;
  mono?: boolean;
}) {
  return (
    <SemanticPill className={className} size={size} tone={tone} uppercase={uppercase} mono={mono}>
      {children}
    </SemanticPill>
  );
}

export function DecisionStateBadge({
  decision,
  undecidedLabel,
  noGoLabel = "NO-GO",
  size = "md",
}: {
  decision: Decision | null;
  undecidedLabel?: string;
  noGoLabel?: string;
  size?: PillSize;
}) {
  if (!decision) {
    return undecidedLabel ? <SemanticPill size={size}>{undecidedLabel}</SemanticPill> : null;
  }

  return (
    <SemanticPill size={size} tone={decisionTone(decision)} uppercase>
      {decision === "NO_GO" ? noGoLabel : decision}
    </SemanticPill>
  );
}

export function RecommendationStateBadge({
  recommendation,
  formatLabel,
  size = "md",
}: {
  recommendation: RecommendationValue;
  formatLabel: (decision: Decision) => string;
  size?: PillSize;
}) {
  if (!recommendation) return null;
  return (
    <SemanticPill size={size} tone={decisionTone(recommendation)}>
      {formatLabel(recommendation)}
    </SemanticPill>
  );
}

export function WorkflowStateBadge({
  status,
  formatLabel,
  size = "md",
}: {
  status: WorkflowStatus | null;
  formatLabel: (status: WorkflowStatus) => string;
  size?: PillSize;
}) {
  if (!status) return null;
  return (
    <SemanticPill size={size} tone={workflowTone(status)}>
      {formatLabel(status)}
    </SemanticPill>
  );
}

export function ScoreStateBadge({
  band,
  label,
  value,
  size = "md",
}: {
  band: ScoreBand;
  label: string;
  value?: string | null;
  size?: PillSize;
}) {
  return (
    <SemanticPill size={size} tone={scoreTone(band)} mono={Boolean(value)}>
      <span>{label}</span>
      {value ? <span>{value}</span> : null}
    </SemanticPill>
  );
}

export function DeadlinePill({
  deadline,
  daySuffix,
  expiredLabel,
  size = "md",
}: {
  deadline: string | null | undefined;
  daySuffix: string;
  expiredLabel: string;
  size?: PillSize;
}) {
  const remaining = daysLeft(deadline ?? null);
  if (remaining === null) return null;
  if (remaining < 0) return <SemanticPill size={size} tone="bad">{expiredLabel}</SemanticPill>;
  if (remaining <= 7) return <SemanticPill size={size} tone="bad" mono>{remaining}{daySuffix}</SemanticPill>;
  if (remaining <= 30) return <SemanticPill size={size} tone="warn" mono>{remaining}{daySuffix}</SemanticPill>;
  return <SemanticPill size={size} mono>{remaining}{daySuffix}</SemanticPill>;
}

export function DecisionControl({
  value,
  onChange,
  className,
  size = "md",
  noGoLabel = "NO-GO",
}: {
  value: Decision | null;
  onChange: (decision: Decision) => void;
  className?: string;
  size?: "sm" | "md";
  noGoLabel?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "rounded-lg px-2 py-0.5 text-[11px]"
      : "flex-1 rounded-xl px-3 py-2.5 text-sm";

  return (
    <div className={cn("flex gap-1.5", className)}>
      {(["GO", "HOLD", "NO_GO"] as Decision[]).map((decision) => {
        const active = value === decision;
        return (
          <button
            key={decision}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(decision)}
            className={cn(
              "border font-semibold transition",
              sizeClass,
              active && decision === "GO" && "border-good/60 bg-good/20 text-good",
              active && decision === "HOLD" && "border-warn/60 bg-warn/20 text-warn",
              active && decision === "NO_GO" && "border-bad/60 bg-bad/20 text-bad",
              !active && "border-line/25 bg-bg text-subtext hover:bg-elevated hover:text-text",
            )}
          >
            {decision === "NO_GO" ? noGoLabel : decision}
          </button>
        );
      })}
    </div>
  );
}

export function StatePanel({
  title,
  description,
  children,
  tone = "neutral",
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-4 shadow-soft", PANEL_TONES[tone], className)}>
      {title ? <p className="text-sm font-semibold text-text">{title}</p> : null}
      {description ? (
        <div className={cn("text-sm leading-relaxed text-subtext", title && "mt-1")}>{description}</div>
      ) : null}
      {children ? <div className={cn((title || description) && "mt-3")}>{children}</div> : null}
    </div>
  );
}
