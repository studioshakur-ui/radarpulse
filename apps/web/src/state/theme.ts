import { create } from "zustand";

/**
 * RadarPulse — Single "Twilight" theme
 *
 * Product direction: no Light/Dark switch. The UI lives in one curated palette
 * (lavender / mist / graphite) and stays consistent across marketing + app.
 */

export type ThemeMode = "twilight";
export type ResolvedTheme = "twilight";

type ThemeState = {
  mode: ThemeMode;
  effective: ResolvedTheme;
  hydrated: boolean;
  setMode: (_m: ThemeMode) => void;
  init: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "twilight",
  effective: "twilight",
  hydrated: false,
  setMode: () => {
    // intentionally no-op: single theme
  },
  init: () => {
    const st = get();
    if (st.hydrated) return;
    // ensure we never apply dark classes; we keep this for future extensibility
    set({ hydrated: true, mode: "twilight", effective: "twilight" });
  },
}));

/**
 * Backwards compatible hook name used in older code.
 */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const effective = useThemeStore((s) => s.effective);
  const setMode = useThemeStore((s) => s.setMode);
  const init = useThemeStore((s) => s.init);
  const hydrated = useThemeStore((s) => s.hydrated);
  return { mode, effective, setMode, init, hydrated };
}
