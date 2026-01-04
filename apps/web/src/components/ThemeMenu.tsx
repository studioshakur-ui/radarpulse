import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/state/theme";

/**
 * ThemeMenu (compat): product is single-theme.
 * We keep this component to avoid churn where it's referenced, but it does not
 * offer switching.
 */
export function ThemeMenu({ className }: { className?: string }) {
  const init = useThemeStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  // Intentionally minimal (no dropdown).
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border/35 bg-white/40 px-3 py-2 text-xs font-semibold text-text shadow-soft",
        className
      )}
      aria-label="Theme"
      title="RadarPulse Twilight"
    >
      Twilight
    </div>
  );
}
