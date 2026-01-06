import React from "react";
import { cn } from "@/lib/utils";

export type CorePillVariant = "soft" | "brand" | "dark";

const VARIANTS: Record<CorePillVariant, string> = {
  // Landing default (light glass)
  soft: "border-line/25 bg-surface/55 text-subtext shadow-soft",
  // Brand-forward chip (RadarPulse tokens)
  brand: "border-brand/25 bg-brand/10 text-text shadow-glow",
  // Dark-on-dark contexts (map / instrument panels)
  dark: "border-line/25 bg-veil/25 text-subtext",
};

export function CorePill({
  children,
  className,
  variant = "soft",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: CorePillVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1",
        "text-xs font-semibold backdrop-blur",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
