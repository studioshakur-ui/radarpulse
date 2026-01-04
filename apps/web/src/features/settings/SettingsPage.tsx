import React from "react";
import { cx } from "@/lib/utils";
import { useTheme, type ThemeMode } from "@/state/theme";


function SegBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-10 rounded-xl border px-3 text-sm font-semibold transition",
        active ? "border-accent/40 bg-accent/10" : "border-border/60 bg-elevated/30 hover:bg-elevated/40"
      )}
    >
      {label}
    </button>
  );
}

export default function SettingsPage() {
  const { mode, effective, setMode } = useTheme();

  const set = (m: ThemeMode) => setMode(m);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-surface p-5 shadow-soft">
        <div className="text-sm font-semibold">Settings</div>
        <div className="mt-1 text-sm text-muted">Preferences for RadarPulse.</div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface p-5 shadow-soft">
        <div className="text-sm font-semibold">Theme</div>
        <div className="mt-1 text-sm text-muted">
          Choose Auto to match your device setting. Current: <span className="font-semibold text-text">{effective}</span>
        </div>

        <div className="mt-4 inline-flex flex-wrap gap-2">
          <SegBtn active={mode === "auto"} label="Auto (System)" onClick={() => set("auto")} />
          <SegBtn active={mode === "light"} label="Light" onClick={() => set("light")} />
          <SegBtn active={mode === "dark"} label="Dark" onClick={() => set("dark")} />
        </div>

        <div className="mt-4 rounded-2xl border border-border/60 bg-bg p-4 text-sm text-muted">
          Mode selected: <span className="font-semibold text-text">{mode}</span>
        </div>
      </div>
    </div>
  );
}
