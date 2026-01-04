import React from "react";

export default function SettingsPage() {
  return (
    <div className="rounded-2xl border border-border/35 bg-white/60 p-5 shadow-soft">
      <div className="text-sm font-semibold">Settings</div>
      <div className="mt-1 text-sm text-muted">
        RadarPulse uses a single curated theme (“Twilight”). No Light/Dark toggle.
      </div>

      <div className="mt-6 rounded-2xl border border-border/35 bg-white/40 p-4">
        <div className="text-xs font-semibold text-muted">UI standards</div>
        <ul className="mt-3 space-y-2 text-sm">
          <li>• One universe: lavender / mist / graphite (no pure black, no blue).</li>
          <li>• Motion = subtle + controlled (never gimmicky).</li>
          <li>• Marketing and app share the same visual language.</li>
        </ul>
      </div>
    </div>
  );
}
