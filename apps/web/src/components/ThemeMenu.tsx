import React, { useEffect, useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Laptop, Moon, Sun } from "lucide-react";
import { useThemeStore, type ThemeMode } from "@/state/theme";
import { cx } from "@/lib/utils";

function IconForResolved({ resolved }: { resolved: "light" | "dark" }) {
  return resolved === "dark" ? (
    <Moon className="h-4 w-4" />
  ) : (
    <Sun className="h-4 w-4" />
  );
}

export function ThemeMenu({ className }: { className?: string }) {
  const { mode, resolved, setMode, init } = useThemeStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    init();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = useMemo(() => {
    if (mode === "auto") return "Auto (System)";
    return mode === "dark" ? "Dark" : "Light";
  }, [mode]);

  const items: Array<{ key: ThemeMode; label: string; icon: React.ReactNode }> = [
    { key: "auto", label: "Auto (System)", icon: <Laptop className="h-4 w-4" /> },
    { key: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { key: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
  ];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${label}`}
          className={cx(
            "inline-flex items-center gap-2 rounded-xl border border-border/30 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
            "hover:bg-elevated/70 focus:outline-none focus:ring-2 focus:ring-accent/50",
            className
          )}
        >
          <IconForResolved resolved={resolved} />
          <span className="hidden sm:inline">{label}</span>
          {mode === "auto" ? <span className="h-1.5 w-1.5 rounded-full bg-muted/70" /> : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cx(
            "min-w-[210px] rounded-2xl border border-border/30 bg-elevated p-2 shadow-glow",
            "outline-none"
          )}
        >
          <div className="px-2 pb-2 pt-1 text-xs font-medium text-muted">Theme</div>

          {items.map((it) => {
            const active = mode === it.key;
            return (
              <DropdownMenu.Item
                key={it.key}
                onSelect={() => setMode(it.key)}
                className={cx(
                  "flex cursor-pointer select-none items-center gap-2 rounded-xl px-2 py-2 text-sm outline-none transition",
                  active ? "bg-surface/60 text-text" : "text-text/90 hover:bg-surface/40"
                )}
              >
                <span className="text-muted">{it.icon}</span>
                <span className="flex-1">{it.label}</span>
                {active ? <span className="text-xs text-muted">{ready ? "✓" : ""}</span> : null}
              </DropdownMenu.Item>
            );
          })}

          <div className="mt-2 rounded-xl bg-surface/40 px-2 py-2 text-xs text-muted">
            Auto matches your device setting.
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
