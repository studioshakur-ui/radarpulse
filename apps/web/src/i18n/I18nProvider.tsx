import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { enMessages } from "./messages.en";
import { frMessages } from "./messages.fr";
import { itMessages, type I18nKey } from "./messages.it";

const STORAGE_KEY = "radarpulse.lang";
const SUPPORTED_LANGS = ["it", "en", "fr"] as const;

export type Lang = (typeof SUPPORTED_LANGS)[number];

type TranslationMap = Partial<Record<I18nKey, string>>;

const messages: Record<Lang, TranslationMap> = {
  it: itMessages,
  en: enMessages,
  fr: frMessages
};

type I18nContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: I18nKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLang(raw: string | null | undefined): Lang | null {
  if (!raw) return null;
  const base = raw.toLowerCase().split("-")[0];
  return SUPPORTED_LANGS.includes(base as Lang) ? (base as Lang) : null;
}

function resolveInitialLang(): Lang {
  if (typeof window === "undefined") return "it";

  const fromQuery = normalizeLang(new URLSearchParams(window.location.search).get("lang"));
  if (fromQuery) return fromQuery;

  const fromStorage = normalizeLang(window.localStorage.getItem(STORAGE_KEY));
  if (fromStorage) return fromStorage;

  const navigatorCandidates = [window.navigator.language, ...(window.navigator.languages ?? [])];
  for (const candidate of navigatorCandidates) {
    const normalized = normalizeLang(candidate);
    if (normalized) return normalized;
  }

  return "it";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => resolveInitialLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);

    if (typeof window === "undefined") return;

    window.localStorage.setItem(STORAGE_KEY, next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const t = useCallback(
    (key: I18nKey): string => {
      const translated = messages[lang][key];
      if (translated) return translated;

      const fallback = itMessages[key];
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing key "${key}" for lang "${lang}", fallback IT.`);
      }
      return fallback;
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useT must be used within I18nProvider");
  }
  return context;
}
