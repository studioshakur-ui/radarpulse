import { createContext, useCallback, useContext, useState } from "react";

export type Locale = "en" | "fr" | "it";

const STORAGE_KEY = "radarpulse:locale";

const dict: Record<Locale, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.inbox": "Inbox",
    "nav.settings": "Settings",
    "app.loading": "Loading...",
    "app.checkingSubscription": "Checking subscription...",

    "inbox.title": "Opportunity Inbox",
    "inbox.subtitle": "Search by title or buyer. Results load progressively.",
    "inbox.filter.search": "Search",
    "inbox.filter.search.placeholder": "Title or buyer",
    "inbox.filter.status": "Status",
    "inbox.filter.status.all": "All",
    "inbox.filter.status.active": "Active",
    "inbox.filter.status.closed": "Closed",
    "inbox.filter.minQuality": "Min quality (0–1)",
    "inbox.filter.minQuality.placeholder": "e.g. 0.7",
    "inbox.filter.decision": "Decision",
    "inbox.filter.decision.all": "All",
    "inbox.filter.decision.undecided": "Undecided",
    "inbox.loading": "Loading...",
    "inbox.loadingMore": "Loading...",
    "inbox.loadMore": "Load more",
    "inbox.empty": "No opportunities found for the selected filters.",
    "inbox.error.load": "Unable to load the inbox.",
    "inbox.card.buyerUnavailable": "Buyer unavailable",
    "inbox.card.budgetUnavailable": "Budget unavailable",
    "inbox.card.dateUnavailable": "Date unavailable",
    "inbox.card.qualityNa": "Quality n/a",
    "inbox.card.qualityPrefix": "Quality",
    "inbox.card.published": "Published:",
    "inbox.card.deadline": "Deadline:",
    "inbox.card.brief": "Brief",
    "inbox.card.brief.generating": "Analyzing...",
    "inbox.card.brief.executiveSummary": "Summary",
    "inbox.card.brief.fitAssessment": "Fit",
    "inbox.card.brief.riskFlags": "Risk flags",
    "inbox.card.brief.requiredDocuments": "Required documents",
    "inbox.card.brief.nextAction": "Next action",
    "inbox.card.brief.error": "Analysis failed. Try again.",

    "settings.title": "Settings",
    "settings.subtitle": "RadarPulse uses a single curated theme (\"Twilight\"). No Light/Dark toggle.",
    "settings.uiStandards": "UI standards",
    "settings.standard1": "One universe: lavender / mist / graphite (no pure black, no blue).",
    "settings.standard2": "Motion = subtle + controlled (never gimmicky).",
    "settings.standard3": "Marketing and app share the same visual language.",
    "settings.language": "Language",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.inbox": "Boîte",
    "nav.settings": "Paramètres",
    "app.loading": "Chargement...",
    "app.checkingSubscription": "Vérification de l'abonnement...",

    "inbox.title": "Boîte de réception",
    "inbox.subtitle": "Recherchez par titre ou acheteur. Les résultats se chargent progressivement.",
    "inbox.filter.search": "Recherche",
    "inbox.filter.search.placeholder": "Titre ou acheteur",
    "inbox.filter.status": "Statut",
    "inbox.filter.status.all": "Tous",
    "inbox.filter.status.active": "Actif",
    "inbox.filter.status.closed": "Fermé",
    "inbox.filter.minQuality": "Qualité min (0–1)",
    "inbox.filter.minQuality.placeholder": "ex. 0,7",
    "inbox.filter.decision": "Décision",
    "inbox.filter.decision.all": "Tous",
    "inbox.filter.decision.undecided": "Indécis",
    "inbox.loading": "Chargement...",
    "inbox.loadingMore": "Chargement...",
    "inbox.loadMore": "Charger plus",
    "inbox.empty": "Aucune opportunité trouvée pour les filtres sélectionnés.",
    "inbox.error.load": "Impossible de charger la boîte de réception.",
    "inbox.card.buyerUnavailable": "Acheteur indisponible",
    "inbox.card.budgetUnavailable": "Budget indisponible",
    "inbox.card.dateUnavailable": "Date indisponible",
    "inbox.card.qualityNa": "Qualité n/d",
    "inbox.card.qualityPrefix": "Qualité",
    "inbox.card.published": "Publié :",
    "inbox.card.deadline": "Échéance :",
    "inbox.card.brief": "Analyse",
    "inbox.card.brief.generating": "Analyse...",
    "inbox.card.brief.executiveSummary": "Résumé",
    "inbox.card.brief.fitAssessment": "Adéquation",
    "inbox.card.brief.riskFlags": "Risques",
    "inbox.card.brief.requiredDocuments": "Documents requis",
    "inbox.card.brief.nextAction": "Prochaine étape",
    "inbox.card.brief.error": "Analyse échouée. Réessayez.",

    "settings.title": "Paramètres",
    "settings.subtitle": "RadarPulse utilise un thème unique (\"Twilight\"). Pas de bascule Clair/Sombre.",
    "settings.uiStandards": "Standards UI",
    "settings.standard1": "Un univers : lavande / brume / graphite (pas de noir pur, pas de bleu).",
    "settings.standard2": "Motion = subtile + contrôlée (jamais tape-à-l'œil).",
    "settings.standard3": "Marketing et app partagent le même langage visuel.",
    "settings.language": "Langue",
  },
  it: {
    "nav.home": "Home",
    "nav.inbox": "Posta",
    "nav.settings": "Impostazioni",
    "app.loading": "Caricamento...",
    "app.checkingSubscription": "Verifica abbonamento...",

    "inbox.title": "Posta in arrivo",
    "inbox.subtitle": "Cerca per titolo o committente. I risultati si caricano progressivamente.",
    "inbox.filter.search": "Ricerca",
    "inbox.filter.search.placeholder": "Titolo o committente",
    "inbox.filter.status": "Stato",
    "inbox.filter.status.all": "Tutti",
    "inbox.filter.status.active": "Attivo",
    "inbox.filter.status.closed": "Chiuso",
    "inbox.filter.minQuality": "Qualità min (0–1)",
    "inbox.filter.minQuality.placeholder": "es. 0,7",
    "inbox.filter.decision": "Decisione",
    "inbox.filter.decision.all": "Tutti",
    "inbox.filter.decision.undecided": "Indeciso",
    "inbox.loading": "Caricamento...",
    "inbox.loadingMore": "Caricamento...",
    "inbox.loadMore": "Carica altri",
    "inbox.empty": "Nessuna opportunità trovata per i filtri selezionati.",
    "inbox.error.load": "Impossibile caricare la posta in arrivo.",
    "inbox.card.buyerUnavailable": "Committente non disponibile",
    "inbox.card.budgetUnavailable": "Budget non disponibile",
    "inbox.card.dateUnavailable": "Data non disponibile",
    "inbox.card.qualityNa": "Qualità n/d",
    "inbox.card.qualityPrefix": "Qualità",
    "inbox.card.published": "Pubblicato:",
    "inbox.card.deadline": "Scadenza:",
    "inbox.card.brief": "Analisi",
    "inbox.card.brief.generating": "Analisi...",
    "inbox.card.brief.executiveSummary": "Sommario",
    "inbox.card.brief.fitAssessment": "Idoneità",
    "inbox.card.brief.riskFlags": "Rischi",
    "inbox.card.brief.requiredDocuments": "Documenti richiesti",
    "inbox.card.brief.nextAction": "Prossima azione",
    "inbox.card.brief.error": "Analisi fallita. Riprova.",

    "settings.title": "Impostazioni",
    "settings.subtitle": "RadarPulse utilizza un tema unico (\"Twilight\"). Nessun toggle Chiaro/Scuro.",
    "settings.uiStandards": "Standard UI",
    "settings.standard1": "Un universo: lavanda / foschia / grafite (nessun nero puro, nessun blu).",
    "settings.standard2": "Motion = sottile + controllata (mai pacchiana).",
    "settings.standard3": "Marketing e app condividono lo stesso linguaggio visivo.",
    "settings.language": "Lingua",
  },
};

export type TFn = (key: string) => string;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFn;
};

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "fr" || stored === "it") return stored as Locale;
  } catch {
    // ignore
  }
  const lang = (typeof navigator !== "undefined" ? navigator.language : "").slice(0, 2).toLowerCase();
  if (lang === "fr") return "fr";
  if (lang === "it") return "it";
  return "en";
}

export function useLocaleProvider(): LocaleContextValue {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: string): string => dict[locale][key] ?? dict.en[key] ?? key, [locale]);

  return { locale, setLocale, t };
}
