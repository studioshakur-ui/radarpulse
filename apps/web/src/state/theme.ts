import { create } from "zustand";

export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const LS_KEY = "rp_theme";

function safeGetStored(): ThemeMode {
  try {
    const v = String(localStorage.getItem(LS_KEY) ?? "").trim();
    if (v === "light" || v === "dark" || v === "auto") return v;
    return "auto";
  } catch {
    return "auto";
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return systemPrefersDark() ? "dark" : "light";
}

function applyResolved(resolved: ResolvedTheme) {
  const el = document.documentElement;
  if (resolved === "dark") el.classList.add("dark");
  else el.classList.remove("dark");
  el.dataset.theme = resolved;
}

type ThemeState = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  init: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "auto",
  resolved: "light",
  setMode: (mode) => {
    const resolved = resolveTheme(mode);
    set({ mode, resolved });
    applyResolved(resolved);
    try {
      localStorage.setItem(LS_KEY, mode);
    } catch {
      // ignore
    }
  },
  init: () => {
    const mode = safeGetStored();
    const resolved = resolveTheme(mode);
    set({ mode, resolved });
    applyResolved(resolved);

    // Live-update when in Auto and OS theme changes.
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const s = get();
        if (s.mode !== "auto") return;
        const nextResolved: ResolvedTheme = mq.matches ? "dark" : "light";
        set({ resolved: nextResolved });
        applyResolved(nextResolved);
      };
      if (mq.addEventListener) mq.addEventListener("change", handler);
      else mq.addListener(handler);
    } catch {
      // ignore
    }
  },
}));
