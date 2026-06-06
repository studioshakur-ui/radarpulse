import React from "react";
import { MoonStar } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeMenu({ className }: { className?: string }) {
  return (
    <div
      aria-label="Theme: Twilight"
      title="Theme: Twilight"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl border border-line/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,240,255,0.92))] px-3",
        "text-brand shadow-soft",
        className,
      )}
    >
      <MoonStar className="h-4 w-4 shrink-0" />
      <span className="text-xs font-semibold tracking-wide text-text">Twilight</span>
    </div>
  );
}
