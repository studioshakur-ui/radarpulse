import React from "react";
import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

/**
 * ThemeMenu — canonical theme indicator.
 * RadarPulse uses a single curated theme to keep marketing and product
 * surfaces in one controlled visual universe.
 */
export function ThemeMenu({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div
      role="status"
      aria-label={t("theme.singleTheme")}
      title={t("theme.singleTheme")}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl border border-line/25 bg-surface/80 px-3",
        "text-subtext shadow-soft",
        className,
      )}
    >
      <Moon className="h-4 w-4 shrink-0 text-brand" />
      <span className="text-xs font-semibold tracking-wide text-text">{t("theme.twilight")}</span>
    </div>
  );
}
