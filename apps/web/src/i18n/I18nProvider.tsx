/**
 * @/i18n/I18nProvider — Sprint 7 bridge
 *
 * The landing page (and any consumer of `useT`) previously used an isolated,
 * Italian-only context. Sprint 4 introduced `@/lib/i18n` with a proper
 * LocaleContext (EN/FR/IT) mounted at the App root.
 *
 * This module is now a thin adapter: I18nProvider becomes a passthrough (the
 * real locale state lives in LocaleContext inside App), and useT() delegates
 * to useLocale() so LandingPage and any other consumer automatically
 * respects the locale switcher — zero changes required in LandingPage.tsx.
 */

import React from "react";
import { useLocale, type Locale } from "@/lib/i18n";
import type { I18nKey } from "./messages.it";

/** Locale type — now EN/FR/IT (was "it" only). */
export type Lang = Locale;

type UseT = {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: I18nKey | string) => string;
};

/**
 * I18nProvider — passthrough.
 * The LocaleContext.Provider wrapping the whole app (in App.tsx) supplies the
 * locale state; this component just renders its children unchanged.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * useT — adapter over useLocale().
 * Returns the same `{ lang, setLang, t }` shape the old hook exported so all
 * call-sites continue to work without modification.
 */
export function useT(): UseT {
  const { locale, setLocale, t } = useLocale();
  return {
    lang: locale,
    setLang: setLocale,
    t,
  };
}
