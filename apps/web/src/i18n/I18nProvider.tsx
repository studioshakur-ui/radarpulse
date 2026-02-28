import React, { createContext, useCallback, useContext, useMemo } from "react";
import { itMessages, type I18nKey } from "./messages.it";

export type Lang = "it";

type I18nContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: I18nKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const setLang = useCallback((_next: Lang) => {
    // App Italia-only: lingua fissata su italiano.
  }, []);

  const t = useCallback((key: I18nKey): string => itMessages[key], []);

  const value = useMemo<I18nContextValue>(() => ({ lang: "it", setLang, t }), [setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useT must be used within I18nProvider");
  }
  return context;
}
