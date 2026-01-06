import React from "react";
import { cn } from "@/lib/utils";

export type CoreCardVariant = "glass" | "glassStrong" | "panel";

const VARIANTS: Record<CoreCardVariant, string> = {
  glass: "rounded-[28px] border border-border/25 bg-white/45 shadow-soft backdrop-blur",
  glassStrong: "rounded-[28px] border border-border/30 bg-white/55 shadow-soft backdrop-blur",
  // Token-driven dark panel (for cinematic blocks)
  panel: "rounded-[28px] border border-line/20 bg-elevated/35 shadow-soft backdrop-blur",
};

export function CoreCard({
  children,
  className,
  variant = "glass",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: CoreCardVariant;
}) {
  return <div className={cn(VARIANTS[variant], className)}>{children}</div>;
}
