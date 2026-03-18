import React from "react";
import { cn } from "@/lib/utils";

type SurfaceTone = "default" | "brand" | "good" | "warn" | "bad";

const SURFACE_TONES: Record<SurfaceTone, string> = {
  default: "border-line/25 bg-surface/92",
  brand: "border-brand/25 bg-brand/10",
  good: "border-good/25 bg-good/8",
  warn: "border-warn/25 bg-warn/8",
  bad: "border-bad/25 bg-bad/8",
};

export function PageIntro({
  title,
  subtitle,
  eyebrow,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-3xl border border-line/25 bg-surface/92 p-5 shadow-soft sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtext/75">
            {eyebrow}
          </div>
        ) : null}
        <h1 className={cn("text-2xl font-semibold tracking-tight text-text", eyebrow && "mt-2")}>{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-subtext">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SurfaceSection({
  title,
  subtitle,
  action,
  children,
  className,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: SurfaceTone;
}) {
  return (
    <section className={cn("rounded-2xl border p-5 shadow-soft", SURFACE_TONES[tone], className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-relaxed text-subtext">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function MetricBlock({
  label,
  value,
  hint,
  className,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  tone?: SurfaceTone;
}) {
  return (
    <div className={cn("rounded-2xl border p-4 shadow-soft", SURFACE_TONES[tone], className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">{label}</div>
      <div className="mt-2 text-xl font-semibold text-text">{value}</div>
      {hint ? <div className="mt-2 text-sm leading-relaxed text-subtext">{hint}</div> : null}
    </div>
  );
}

export function SwitchControl({
  checked,
  onCheckedChange,
  ariaLabel,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-brand" : "bg-border/60",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
