import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "rp_theme";

// Read initial state from the DOM — the index.html FOUC script already applied
// the correct .dark class before React boots, so we just mirror it here.
function domEffective(): ResolvedTheme {
  try {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  } catch {
    return "light";
  }
}

function domMode(): ThemeMode {
  return "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  void mode;
  return "light";
}

function applyTheme(resolved: ResolvedTheme) {
  const el = document.documentElement;
  if (resolved === "dark") {
    el.classList.add("dark");
  } else {
    el.classList.remove("dark");
  }
  el.dataset.theme = resolved;
}

type ThemeState = {
  mode: ThemeMode;
  effective: ResolvedTheme;
  hydrated: boolean;
  setMode: (m: ThemeMode) => void;
  init: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: domMode(),
  effective: domEffective(),
  hydrated: true,
  setMode: (m: ThemeMode) => {
    const effective = resolveTheme(m);
    applyTheme(effective);
    try {
      localStorage.setItem(STORAGE_KEY, "light");
    } catch {
      // ignore
    }
    set({ mode: "light", effective });
  },
  init: () => {
    if (get().hydrated) return;
    const mode = domMode();
    const effective = domEffective();
    applyTheme(effective);
    set({ mode, effective, hydrated: true });
  },
}));

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const effective = useThemeStore((s) => s.effective);
  const setMode = useThemeStore((s) => s.setMode);
  const init = useThemeStore((s) => s.init);
  const hydrated = useThemeStore((s) => s.hydrated);
  return { mode, effective, setMode, init, hydrated };
}
