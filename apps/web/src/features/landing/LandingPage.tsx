import React, { useState, useEffect, useRef } from "react";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/state/theme";
import { Link } from "react-router-dom";
import { ArrowRight, Brain, Globe, CheckCircle, Clock } from "lucide-react";
import { CoreCard } from "@/components/ds/CoreCard";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/i18n";

// ─── Announcement bar ─────────────────────────────────────────────────────────

function AnnouncementBar() {
  const { t } = useT();
  return (
    <div className="border-b border-brand/70 bg-brand px-4 py-2 text-center text-xs">
      <span className="inline-flex items-center gap-2 text-white/85">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        {t("landing.announcement.body")} —&nbsp;
        <Link
          to="/request-access"
          className="font-bold text-white underline-offset-2 hover:underline"
        >
          {t("landing.announcement.link")}
        </Link>
      </span>
    </div>
  );
}

// ─── Hero typewriter ──────────────────────────────────────────────────────────

const HERO_CYCLES: Record<Locale, Array<{ strong: string; accent: string }>> = {
  en: [
    { strong: "Find the right", accent: "public opportunities." },
    { strong: "Turn signal into", accent: "qualified dossiers." },
    { strong: "Move faster with", accent: "clear next actions." },
  ],
  fr: [
    { strong: "Identifiez les bonnes", accent: "opportunités publiques." },
    { strong: "Transformez le signal en", accent: "dossiers qualifiés." },
    { strong: "Avancez avec des", accent: "prochaines actions claires." },
  ],
  it: [
    { strong: "Trova le giuste", accent: "opportunita pubbliche." },
    { strong: "Trasforma il segnale in", accent: "dossier qualificati." },
    { strong: "Avanza con", accent: "prossime azioni chiare." },
  ],
};

function TypewriterHero() {
  const { lang } = useT();
  const cycles = HERO_CYCLES[lang] ?? HERO_CYCLES.en;
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    setIdx(0);
    setVisible(true);
  }, [lang]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % cycles.length);
        setVisible(true);
      }, 520);
    }, 5200);
    return () => window.clearInterval(interval);
  }, [cycles.length, prefersReducedMotion]);

  const line = cycles[idx] ?? { strong: "Find the right", accent: "public opportunities." };

  return (
    <h1
      className="max-w-[11ch] text-4xl font-black leading-[0.96] tracking-[-0.045em] sm:text-6xl lg:text-[4.8rem]"
      style={{
        transition: prefersReducedMotion ? "none" : "opacity 0.52s ease, filter 0.52s ease",
        opacity: prefersReducedMotion ? 1 : visible ? 1 : 0,
        filter: prefersReducedMotion ? "none" : visible ? "blur(0px)" : "blur(3px)",
      }}
    >
      <span className="text-text">{line.strong} </span>
      <span
        style={{
          background: "linear-gradient(135deg, #7c5cbf 0%, #a78bfa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {line.accent}
      </span>
    </h1>
  );
}

// ─── Hero background orbs ─────────────────────────────────────────────────────

function HeroBackground() {
  const { effective } = useTheme();
  const dk = effective === "dark";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          opacity: dk ? 0.7 : 0.4,
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,92,191,0.25) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -left-32 top-1/3 h-72 w-72 rounded-full blur-3xl"
        style={{
          opacity: dk ? 0.45 : 0.20,
          background: "radial-gradient(circle, rgba(124,92,191,0.5) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -right-16 top-0 h-96 w-96 rounded-full blur-3xl"
        style={{
          opacity: dk ? 0.35 : 0.15,
          background: "radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: dk ? 0.04 : 0.025,
          backgroundImage:
            "linear-gradient(rgba(124,92,191,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,191,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

// ─── Hero browser mockup ──────────────────────────────────────────────────────

function HeroBrowserMockup() {
  const { lang } = useT();
  const MOCKUP_LABELS: Record<
    Locale,
    {
      live: string;
      stage: string;
      source: string;
      readiness: string;
      signal: string;
      deadline: string;
      blockerTitle: string;
      blockerA: string;
      blockerB: string;
      nextAction: string;
      nextActionBody: string;
      updated: string;
      open: string;
      sideTitle: string;
      sideReview: string;
      sideChecklist: string;
      sideReady: string;
    }
  > = {
    en: {
      live: "ACTIVE DOSSIER",
      stage: "Needs review",
      source: "UK · Find a Tender",
      readiness: "Readiness",
      signal: "Signal",
      deadline: "Deadline",
      blockerTitle: "Current blockers",
      blockerA: "Security appendix missing",
      blockerB: "Partner confirmation pending",
      nextAction: "Next action",
      nextActionBody: "Validate go or hold, then open the task checklist and assign the first document pull.",
      updated: "Updated 3 min ago",
      open: "Open dossier →",
      sideTitle: "Workflow",
      sideReview: "Qualification",
      sideChecklist: "Checklist",
      sideReady: "Ready",
    },
    fr: {
      live: "DOSSIER ACTIF",
      stage: "A qualifier",
      source: "UK · Find a Tender",
      readiness: "Preparation",
      signal: "Signal",
      deadline: "Echeance",
      blockerTitle: "Blocages actuels",
      blockerA: "Annexe securite manquante",
      blockerB: "Confirmation partenaire en attente",
      nextAction: "Prochaine action",
      nextActionBody: "Valider go ou hold, puis ouvrir la checklist et lancer la premiere collecte documentaire.",
      updated: "Mis a jour il y a 3 min",
      open: "Ouvrir le dossier →",
      sideTitle: "Workflow",
      sideReview: "Qualification",
      sideChecklist: "Checklist",
      sideReady: "Pret",
    },
    it: {
      live: "DOSSIER ATTIVO",
      stage: "Da rivedere",
      source: "UK · Find a Tender",
      readiness: "Prontezza",
      signal: "Segnale",
      deadline: "Scadenza",
      blockerTitle: "Blocchi correnti",
      blockerA: "Appendice sicurezza mancante",
      blockerB: "Conferma partner in attesa",
      nextAction: "Prossima azione",
      nextActionBody: "Valida go o hold, poi apri la checklist e assegna il primo recupero documentale.",
      updated: "Aggiornato 3 min fa",
      open: "Apri dossier →",
      sideTitle: "Workflow",
      sideReview: "Qualifica",
      sideChecklist: "Checklist",
      sideReady: "Pronto",
    },
  };
  const ml = MOCKUP_LABELS[lang] ?? MOCKUP_LABELS.en;
  const [tick, setTick] = useState(0);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (prefersReducedMotion) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 5600);
    return () => window.clearInterval(t);
  }, [prefersReducedMotion]);
  const stages = [ml.sideReview, ml.sideChecklist, ml.sideReady];

  return (
    <div className="relative mx-auto flex w-full max-w-xl items-center justify-center lg:max-w-[35rem] lg:justify-end">
      <div
        className="w-full max-w-[34rem] overflow-hidden rounded-[28px] border border-white/55 bg-white/82 shadow-[0_30px_80px_rgba(93,72,152,0.14)] backdrop-blur"
        style={{
          transform: prefersReducedMotion ? "none" : "translateY(0px)",
          transformStyle: "preserve-3d",
          transition: prefersReducedMotion ? "none" : "box-shadow 0.6s ease, transform 0.6s ease",
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="mx-3 flex-1 rounded-md bg-white/70 px-3 py-1 text-center text-xs text-subtext/50">
            app.radarpulse.io/dossiers
          </div>
        </div>
        <div className="border-b border-border/10 bg-[#faf8ff] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand/70">
                {ml.stage}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-text">
                NHS England cloud modernisation
              </h3>
              <p className="mt-1 text-xs text-subtext/70">{ml.source}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {ml.live}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/15 bg-white/70 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtext/45">
                {ml.signal}
              </p>
              <p className="mt-1 text-2xl font-bold text-text">84</p>
              <p className="text-[11px] text-emerald-600">shortlisted</p>
            </div>
            <div className="rounded-2xl border border-border/15 bg-white/70 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtext/45">
                {ml.readiness}
              </p>
              <p className="mt-1 text-2xl font-bold text-text">62%</p>
              <p className="text-[11px] text-amber-600">awaiting review</p>
            </div>
            <div className="rounded-2xl border border-border/15 bg-white/70 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtext/45">
                {ml.deadline}
              </p>
              <p className="mt-1 text-2xl font-bold text-text">6d</p>
              <p className="text-[11px] text-subtext/65">29 Mar 2026</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(248,244,255,0.9)_100%)] px-5 py-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <div className="rounded-2xl border border-border/15 bg-white/70 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtext/45">
                {ml.blockerTitle}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{ml.blockerA}</span>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-border/20 bg-bg/70 px-3 py-2 text-sm text-subtext/80">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" />
                  <span>{ml.blockerB}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-border/15 bg-white/70 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtext/45">
                {ml.nextAction}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-text/85">{ml.nextActionBody}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/15 bg-white/70 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtext/45">
              {ml.sideTitle}
            </p>
            <div className="mt-3 space-y-2">
              {stages.map((stage, index) => (
                <div
                  key={stage}
                  className={
                    "rounded-xl border px-3 py-2 text-sm transition-colors " +
                    (tick % stages.length === index
                      ? "border-brand/30 bg-brand/10 font-semibold text-brand"
                      : "border-border/15 bg-bg/65 text-subtext/75")
                  }
                >
                  {stage}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/10 bg-white/65 px-5 py-3">
          <span className="text-[11px] text-subtext/50">{ml.updated}</span>
          <span className="text-[11px] font-medium text-brand/80">{ml.open}</span>
        </div>
      </div>
      <div className="absolute -left-6 bottom-10 hidden rounded-2xl border border-brand/20 bg-white/92 px-4 py-3 shadow-xl backdrop-blur xl:block">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-subtext/50">UK + FR</p>
        <p className="mt-0.5 text-2xl font-bold text-text">Dossier</p>
        <p className="mt-0.5 text-[10px] text-brand/80">market qualification workflow</p>
      </div>
    </div>
  );
}

// ─── Hero stats ───────────────────────────────────────────────────────────────

const HERO_STATS: Record<Locale, Array<{ value: string; label: string }>> = {
  en: [
    { value: "UK + FR", label: "Live market coverage" },
    { value: "2 core markets", label: "Commercial focus" },
    { value: "Dossiers", label: "Core work object" },
  ],
  fr: [
    { value: "UK + FR", label: "Couverture live" },
    { value: "2 marches cles", label: "Focus commercial" },
    { value: "Dossiers", label: "Objet de travail central" },
  ],
  it: [
    { value: "UK + FR", label: "Copertura live" },
    { value: "2 mercati chiave", label: "Focus commerciale" },
    { value: "Dossier", label: "Oggetto operativo centrale" },
  ],
};

const HERO_CHIPS: Record<Locale, string[]> = {
  en: [
    "UK and France qualification flow",
    "Decision-ready brief and score",
    "Dossier workflow with next actions",
  ],
  fr: [
    "Flux de qualification UK et France",
    "Brief et score orientés decision",
    "Workflow dossier avec prochaines actions",
  ],
  it: [
    "Flusso di qualifica UK e Francia",
    "Brief e score orientati alla decisione",
    "Workflow dossier con prossime azioni",
  ],
};

// ─── Sources strip ────────────────────────────────────────────────────────────

const SOURCES = [
  { label: "TED / OJEU", flag: "🇪🇺", cls: "text-violet-400 border-violet-400/20 bg-violet-400/5" },
  { label: "ANAC", flag: "🇮🇹", cls: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" },
  { label: "FindTender", flag: "🇬🇧", cls: "text-blue-400 border-blue-400/20 bg-blue-400/5" },
  { label: "SAM.gov", flag: "🇺🇸", cls: "text-amber-400 border-amber-400/20 bg-amber-400/5" },
];

const SOURCES_LABEL: Record<Locale, string> = {
  en: "Connected sources",
  fr: "Sources connectées",
  it: "Fonti collegate",
};
const SOURCES_COMING: Record<Locale, string> = {
  en: "+ 16 coming soon",
  fr: "+ 16 à venir",
  it: "+ 16 in arrivo",
};

function SourcesStrip() {
  const { lang } = useT();
  return (
    <section className="border-y border-border/15 bg-surface/20 py-6">
      <div className="mx-auto max-w-6xl px-4">
        <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext/40">
          {SOURCES_LABEL[lang]}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SOURCES.map((s) => (
            <span
              key={s.label}
              className={"inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold " + s.cls}
            >
              <span>{s.flag}</span>
              {s.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-2 rounded-full border border-border/20 px-4 py-1.5 text-sm text-subtext/40">
            {SOURCES_COMING[lang]}
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand/80">
      <span className="h-1 w-1 rounded-full bg-brand/60" />
      {children}
    </span>
  );
}

// ─── useInView ───────────────────────────────────────────────────────────────

function useInView<T extends Element>(ref: React.RefObject<T | null>, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setInView(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

// ─── Signal Rail ─────────────────────────────────────────────────────────────

type SignalEntry =
  | { kind: "signal"; text: string; flag: string; country: string }
  | { kind: "metric"; text: string };

const SIGNALS: Record<Locale, SignalEntry[]> = {
  en: [
    { kind: "signal", text: "New energy procurement", flag: "🇪🇸", country: "Spain" },
    { kind: "metric", text: "142 new signals indexed today" },
    { kind: "signal", text: "Healthcare demand rising", flag: "🇷🇴", country: "Romania" },
    { kind: "signal", text: "Transport funding updated", flag: "🇵🇹", country: "Portugal" },
    { kind: "metric", text: "23 countries monitored live" },
    { kind: "signal", text: "New TED notices detected", flag: "🇪🇺", country: "EU" },
    { kind: "signal", text: "Infrastructure market activity", flag: "🇵🇱", country: "Poland" },
    { kind: "signal", text: "IT modernization signal", flag: "🇫🇷", country: "France" },
    { kind: "metric", text: "47 market updates this hour" },
    { kind: "signal", text: "Digital transformation opportunity", flag: "🇩🇪", country: "Germany" },
    { kind: "signal", text: "Public health framework", flag: "🇮🇹", country: "Italy" },
    { kind: "signal", text: "Defense market activity", flag: "🇸🇪", country: "Sweden" },
    { kind: "signal", text: "New SAM.gov opportunities", flag: "🇺🇸", country: "USA" },
    { kind: "signal", text: "Rail infrastructure signal", flag: "🇬🇧", country: "UK" },
    { kind: "metric", text: "Energy, transport, healthcare — live" },
    { kind: "signal", text: "Water & utilities market", flag: "🇳🇱", country: "Netherlands" },
    { kind: "signal", text: "Edtech opportunity", flag: "🇧🇪", country: "Belgium" },
    { kind: "signal", text: "Smart city market", flag: "🇳🇴", country: "Norway" },
    { kind: "signal", text: "Environmental services signal", flag: "🇨🇿", country: "Czechia" },
    { kind: "signal", text: "Public-sector IT renewal", flag: "🇦🇹", country: "Austria" },
    { kind: "metric", text: "Fresh market intelligence — live" },
    { kind: "signal", text: "Logistics & supply chain signal", flag: "🇩🇰", country: "Denmark" },
    { kind: "signal", text: "Renewable energy tender", flag: "🇫🇮", country: "Finland" },
    { kind: "signal", text: "Healthcare infrastructure update", flag: "🇬🇷", country: "Greece" },
  ],
  fr: [
    { kind: "signal", text: "Nouveau marché énergie", flag: "🇪🇸", country: "Espagne" },
    { kind: "metric", text: "142 nouveaux signaux indexés aujourd'hui" },
    { kind: "signal", text: "Hausse demande santé", flag: "🇷🇴", country: "Roumanie" },
    { kind: "signal", text: "Mise à jour financement transport", flag: "🇵🇹", country: "Portugal" },
    { kind: "metric", text: "23 pays surveillés en temps réel" },
    { kind: "signal", text: "Nouveaux avis TED détectés", flag: "🇪🇺", country: "UE" },
    { kind: "signal", text: "Activité marchés infrastructure", flag: "🇵🇱", country: "Pologne" },
    { kind: "signal", text: "Signal modernisation IT", flag: "🇫🇷", country: "France" },
    { kind: "metric", text: "47 mises à jour marchés cette heure" },
    { kind: "signal", text: "Opportunité transformation digitale", flag: "🇩🇪", country: "Allemagne" },
    { kind: "signal", text: "Cadre santé publique", flag: "🇮🇹", country: "Italie" },
    { kind: "signal", text: "Activité marchés défense", flag: "🇸🇪", country: "Suède" },
    { kind: "signal", text: "Nouvelles opportunités SAM.gov", flag: "🇺🇸", country: "USA" },
    { kind: "signal", text: "Signal infrastructure ferroviaire", flag: "🇬🇧", country: "Royaume-Uni" },
    { kind: "metric", text: "Énergie, transport, santé — live" },
    { kind: "signal", text: "Marchés eau & utilities", flag: "🇳🇱", country: "Pays-Bas" },
    { kind: "signal", text: "Opportunité edtech", flag: "🇧🇪", country: "Belgique" },
    { kind: "signal", text: "Marché ville intelligente", flag: "🇳🇴", country: "Norvège" },
    { kind: "signal", text: "Signal services environnementaux", flag: "🇨🇿", country: "Tchéquie" },
    { kind: "signal", text: "Renouvellement IT secteur public", flag: "🇦🇹", country: "Autriche" },
    { kind: "metric", text: "Intelligence marché fraîche — live" },
    { kind: "signal", text: "Signal logistique & supply chain", flag: "🇩🇰", country: "Danemark" },
    { kind: "signal", text: "Appel d'offres énergie renouvelable", flag: "🇫🇮", country: "Finlande" },
    { kind: "signal", text: "Mise à jour infrastructure santé", flag: "🇬🇷", country: "Grèce" },
  ],
  it: [
    { kind: "signal", text: "Nuova gara energia", flag: "🇪🇸", country: "Spagna" },
    { kind: "metric", text: "142 nuovi segnali indicizzati oggi" },
    { kind: "signal", text: "Crescita domanda sanità", flag: "🇷🇴", country: "Romania" },
    { kind: "signal", text: "Aggiornamento fondi trasporti", flag: "🇵🇹", country: "Portogallo" },
    { kind: "metric", text: "23 paesi monitorati live" },
    { kind: "signal", text: "Nuovi avvisi TED rilevati", flag: "🇪🇺", country: "UE" },
    { kind: "signal", text: "Attività mercato infrastrutture", flag: "🇵🇱", country: "Polonia" },
    { kind: "signal", text: "Segnale modernizzazione IT", flag: "🇫🇷", country: "Francia" },
    { kind: "metric", text: "47 aggiornamenti mercato in quest'ora" },
    { kind: "signal", text: "Opportunità trasformazione digitale", flag: "🇩🇪", country: "Germania" },
    { kind: "signal", text: "Framework sanità pubblica", flag: "🇮🇹", country: "Italia" },
    { kind: "signal", text: "Attività mercato difesa", flag: "🇸🇪", country: "Svezia" },
    { kind: "signal", text: "Nuove opportunità SAM.gov", flag: "🇺🇸", country: "USA" },
    { kind: "signal", text: "Segnale infrastruttura ferroviaria", flag: "🇬🇧", country: "Regno Unito" },
    { kind: "metric", text: "Energia, trasporti, sanità — live" },
    { kind: "signal", text: "Mercato acqua & utilities", flag: "🇳🇱", country: "Paesi Bassi" },
    { kind: "signal", text: "Opportunità edtech", flag: "🇧🇪", country: "Belgio" },
    { kind: "signal", text: "Mercato smart city", flag: "🇳🇴", country: "Norvegia" },
    { kind: "signal", text: "Segnale servizi ambientali", flag: "🇨🇿", country: "Cechia" },
    { kind: "signal", text: "Rinnovo IT settore pubblico", flag: "🇦🇹", country: "Austria" },
    { kind: "metric", text: "Market intelligence fresca — live" },
    { kind: "signal", text: "Segnale logistica & supply chain", flag: "🇩🇰", country: "Danimarca" },
    { kind: "signal", text: "Bando energia rinnovabile", flag: "🇫🇮", country: "Finlandia" },
    { kind: "signal", text: "Aggiornamento infrastruttura sanitaria", flag: "🇬🇷", country: "Grecia" },
  ],
};

function SignalRail() {
  const { lang } = useT();
  const signals = SIGNALS[lang] ?? SIGNALS.en;
  const doubled = [...signals, ...signals];
  return (
    <div className="signal-rail-wrap overflow-hidden border-b border-border/15 bg-surface/40 py-2.5">
      <div
        className="signal-rail-track flex items-center whitespace-nowrap"
        style={{ width: "max-content", willChange: "transform" }}
      >
        {doubled.map((s, i) =>
          s.kind === "signal" ? (
            <span
              key={i}
              className="flex items-center gap-1.5 px-5 text-xs"
              aria-hidden={i >= signals.length ? "true" : undefined}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" />
              <span className="text-subtext">{s.text}</span>
              <span className="text-subtext/40">·</span>
              <span className="font-medium text-text/60">
                {s.flag} {s.country}
              </span>
            </span>
          ) : (
            <span
              key={i}
              className="flex items-center gap-1.5 px-5 text-xs"
              aria-hidden={i >= signals.length ? "true" : undefined}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" />
              <span className="font-semibold text-text/50">{s.text}</span>
            </span>
          ),
        )}
      </div>
      <style>{`
        @keyframes rp-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .signal-rail-track {
          animation: rp-marquee 80s linear infinite;
        }
        .signal-rail-wrap:hover .signal-rail-track {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

// ─── Mock tender card ────────────────────────────────────────────────────────

function MockTenderCard({
  flag,
  country,
  title,
  buyer,
  budget,
  deadline,
  score,
  decision,
}: {
  flag: string;
  country: string;
  title: string;
  buyer: string;
  budget: string;
  deadline: string;
  score: number;
  decision: "GO" | "HOLD" | "NO";
}) {
  const scoreBg =
    score >= 70
      ? "bg-emerald-100 text-emerald-700"
      : score >= 40
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  const decisionBg = {
    GO: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    HOLD: "bg-amber-100 text-amber-700 border border-amber-200",
    NO: "bg-red-100 text-red-700 border border-red-200",
  }[decision];
  return (
    <CoreCard variant="glass" className="rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-sm">{flag}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-subtext">
              {country}
            </span>
          </div>
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-text">{title}</p>
          <p className="mt-1 text-xs text-subtext">{buyer}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={"rounded-full px-2 py-0.5 text-xs font-bold " + scoreBg}>
            AI {score}%
          </span>
          <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + decisionBg}>
            {decision}
          </span>
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-subtext">
        <span>💰 {budget}</span>
        <span>📅 {deadline}</span>
      </div>
    </CoreCard>
  );
}

// ─── Bento card ───────────────────────────────────────────────────────────────

function BentoCard({
  icon,
  label,
  title,
  description,
  className,
  children,
  accent = "bg-brand/10",
  iconColor = "text-brand",
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
  accent?: string;
  iconColor?: string;
}) {
  return (
    <CoreCard variant="glass" className={"flex flex-col rounded-3xl p-6 " + (className ?? "")}>
      <div className={"mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl " + accent}>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtext/50">
        {label}
      </p>
      <h3 className="text-lg font-semibold tracking-tight text-text">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-subtext">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </CoreCard>
  );
}

// ─── How step ────────────────────────────────────────────────────────────────

function HowStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <CoreCard variant="glass" className="rounded-3xl p-6">
      <p className="text-xs font-bold text-brand">{step}</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-subtext">{description}</p>
    </CoreCard>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  ctaHref,
  highlight,
  badgeText,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight?: boolean;
  badgeText?: string;
}) {
  return (
    <CoreCard
      variant={highlight ? "glassStrong" : "glass"}
      className={"relative flex flex-col rounded-3xl p-8 " + (highlight ? "ring-1 ring-brand/40" : "")}
    >
      {highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-brand px-4 py-1 text-xs font-bold text-white shadow-glow">
            {badgeText}
          </span>
        </div>
      )}
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-subtext/60">{name}</p>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-4xl font-bold text-text">{price}</span>
          <span className="mb-1 text-sm text-subtext/60">{period}</span>
        </div>
        <p className="mt-2 text-sm text-subtext">{description}</p>
      </div>
      <ul className="mb-8 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-text/80">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        to={ctaHref}
        className={
          "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 " +
          (highlight
            ? "bg-brand text-white shadow-glow"
            : "border border-line/25 bg-surface/60 text-text shadow-soft")
        }
      >
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </CoreCard>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const { t } = useT();
  return (
    <footer className="border-t border-border/20 bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="text-base font-bold text-text">RadarPulse</p>
            <p className="mt-1.5 text-xs leading-relaxed text-subtext/60">
              {t("landing.footer.tagline.line1")}
              <br />
              {t("landing.footer.tagline.line2")}
            </p>
            <div className="mt-4 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs text-subtext/50">{t("landing.footer.status")}</span>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-subtext/50">
              {t("landing.footer.product")}
            </p>
            <ul className="space-y-2 text-sm text-subtext/70">
              <li>
                <Link to="/login" className="transition-colors hover:text-text">
                  {t("landing.footer.product.inbox")}
                </Link>
              </li>
              <li>
                <Link to="/request-access" className="transition-colors hover:text-text">
                  {t("landing.footer.product.access")}
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:text-text">
                  {t("landing.footer.product.signin")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-subtext/50">
              {t("landing.footer.resources")}
            </p>
            <ul className="space-y-2 text-sm text-subtext/70">
              <li>
                <Link to="/guides" className="transition-colors hover:text-text">
                  {t("landing.footer.resources.guides")}
                </Link>
              </li>
              <li>
                <a
                  href="https://www.find-tender.service.gov.uk/Search"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-text"
                >
                  Find a Tender
                </a>
              </li>
              <li>
                <a
                  href="https://www.boamp.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-text"
                >
                  BOAMP
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-subtext/50">
              {t("landing.footer.legal")}
            </p>
            <ul className="space-y-2 text-sm text-subtext/70">
              <li>
                <Link to="/privacy" className="transition-colors hover:text-text">
                  {t("landing.footer.legal.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="transition-colors hover:text-text">
                  {t("landing.footer.legal.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex items-center justify-between border-t border-border/10 pt-6">
          <p className="text-xs text-subtext/40">
            © 2026 RadarPulse · {t("landing.footer.madeInEurope")} 🇪🇺
          </p>
          <p className="text-xs text-subtext/30">v2.0</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Pricing data helper ──────────────────────────────────────────────────────

function getPricingPlans(lang: Locale) {
  if (lang === "fr")
    return {
      free: {
        name: "Pilot",
        price: "Sur revue",
        period: "",
        description: "Pour les equipes qui valident RadarPulse sur du flux reel UK et France.",
        features: [
          "Intake UK et France",
          "Qualification rapide",
          "Brief et score de signal",
        ],
        cta: "Demander l'acces",
        ctaHref: "/request-access",
      },
      pro: {
        name: "Team",
        price: "Personnalise",
        period: "",
        description: "Pour les equipes qui veulent operer des dossiers en continu.",
        features: [
          "Board dossiers et checklist",
          "Decision support et prep",
          "Couverture live UK et France",
        ],
        cta: "Demander l'acces",
        ctaHref: "/request-access",
      },
    };
  if (lang === "it")
    return {
      free: {
        name: "Pilot",
        price: "Su valutazione",
        period: "",
        description: "Per i team che validano RadarPulse su flusso reale UK e Francia.",
        features: [
          "Intake UK e Francia",
          "Qualifica rapida",
          "Brief e score di segnale",
        ],
        cta: "Richiedi accesso",
        ctaHref: "/request-access",
      },
      pro: {
        name: "Team",
        price: "Custom",
        period: "",
        description: "Per i team che vogliono operare dossier in continuita.",
        features: [
          "Board dossier e checklist",
          "Decision support e prep",
          "Copertura live UK e Francia",
        ],
        cta: "Richiedi accesso",
        ctaHref: "/request-access",
      },
    };
  return {
    free: {
      name: "Pilot",
      price: "By review",
      period: "",
      description: "For teams validating RadarPulse on live UK and France opportunity flow.",
      features: [
        "UK and France intake",
        "Fast qualification",
        "Brief and signal score",
      ],
      cta: "Request access",
      ctaHref: "/request-access",
    },
    pro: {
      name: "Team",
      price: "Custom",
      period: "",
      description: "For teams operating dossiers across qualification and action.",
      features: [
        "Dossier board and checklist",
        "Decision support and prep",
        "UK and France live coverage",
      ],
      cta: "Request access",
      ctaHref: "/request-access",
    },
  };
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export function LandingPage() {
  const { t, lang } = useT();
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef);
  const bentoRef = useRef<HTMLDivElement>(null);
  const bentoInView = useInView(bentoRef);
  const pricingRef = useRef<HTMLDivElement>(null);
  const pricingInView = useInView(pricingRef);

  const stats = HERO_STATS[lang] ?? HERO_STATS.en;
  const pricing = getPricingPlans(lang);

  const mockTenders = [
    {
      flag: "🇬🇧",
      country: "UK · Find a Tender",
      title: "Cloud infrastructure modernisation and managed services",
      buyer: "NHS England",
      budget: "£ 8.5M",
      deadline: "Mar 29, 2026",
      score: 88,
      decision: "GO" as const,
    },
    {
      flag: "🇫🇷",
      country: "France · BOAMP",
      title: "Digital services framework for territorial procurement support",
      buyer: "Ministere de la Transition numerique",
      budget: "€ 6.1M",
      deadline: "Apr 11, 2026",
      score: 71,
      decision: "HOLD" as const,
    },
    {
      flag: "🇬🇧",
      country: "UK · FindTender",
      title: "Commercial due diligence support for regional transport expansion",
      buyer: "Transport for Greater Manchester",
      budget: "£ 3.4M",
      deadline: "Apr 6, 2026",
      score: 54,
      decision: "NO" as const,
    },
  ];

  const PRICING_LABEL: Record<Locale, string> = {
    en: "Access",
    fr: "Acces",
    it: "Accesso",
  };
  const PRICING_TITLE: Record<Locale, string> = {
    en: "Controlled access, aligned to your operating model.",
    fr: "Un acces controle, aligne a votre mode operatoire.",
    it: "Accesso controllato, allineato al tuo modello operativo.",
  };
  const PRICING_SUB: Record<Locale, string> = {
    en: "RadarPulse is currently onboarded through reviewed access while the dossier system hardens.",
    fr: "RadarPulse est actuellement ouvert via un acces revu pendant que le systeme dossier se consolide.",
    it: "RadarPulse viene attualmente aperto tramite accesso valutato mentre il sistema dossier si consolida.",
  };
  const HERO_PILL: Record<Locale, string> = {
    en: "Public opportunity intelligence",
    fr: "Intelligence opportunites publiques",
    it: "Intelligence opportunita pubbliche",
  };
  const NO_CARD: Record<Locale, string> = {
    en: "Access is reviewed with each team before rollout.",
    fr: "L'acces est revu avec chaque equipe avant ouverture.",
    it: "L'accesso viene valutato con ogni team prima dell'apertura.",
  };
  const TIMELINE_ROWS: Record<Locale, Array<{ time: string; label: string; active: boolean }>> = {
    en: [
      { time: "08:40", label: "New market signal captured", active: false },
      { time: "09:00", label: "Qualification updated", active: true },
      { time: "09:15", label: "Dossier ready for review", active: false },
    ],
    fr: [
      { time: "08:40", label: "Nouveau signal marche capte", active: false },
      { time: "09:00", label: "Qualification mise a jour", active: true },
      { time: "09:15", label: "Dossier pret pour revue", active: false },
    ],
    it: [
      { time: "08:40", label: "Nuovo segnale mercato acquisito", active: false },
      { time: "09:00", label: "Qualifica aggiornata", active: true },
      { time: "09:15", label: "Dossier pronto per revisione", active: false },
    ],
  };

  const fade = (inView: boolean, delay = 0): React.CSSProperties => ({
    transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(20px)",
  });

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/30 bg-bg/90 backdrop-blur">
        <AnnouncementBar />
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" aria-label="RadarPulse">
            <Logo size={24} />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/60 px-4 py-2 text-sm font-semibold text-text shadow-soft hover:bg-surface/75"
            >
              {t("landing.nav.signin")}
            </Link>
            <Link
              to="/request-access"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow hover:opacity-95"
            >
              {t("landing.nav.primaryCta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/20">
          <HeroBackground />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-24 lg:py-28">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:gap-10">
              {/* Left */}
              <div className="max-w-2xl">
                <div className="mb-5">
                  <SectionLabel>{HERO_PILL[lang]}</SectionLabel>
                </div>
                <TypewriterHero />
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-subtext">
                  {t("landing.hero.description")}
                </p>
                <div className="mt-8 lg:hidden">
                  <HeroBrowserMockup />
                </div>
                <div className="mt-7 flex flex-wrap gap-2 text-sm text-subtext/80">
                  {(HERO_CHIPS[lang] ?? HERO_CHIPS.en).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-line/20 bg-surface/70 px-3 py-1.5"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    to="/request-access"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 hover:opacity-95"
                  >
                    {t("landing.hero.primaryCta")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/60 px-5 py-3 text-sm font-semibold text-text shadow-soft hover:bg-surface/75"
                  >
                    {t("landing.hero.secondaryCta")}
                  </Link>
                </div>
                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {stats.map((s) => (
                    <div
                      key={s.value}
                      className="rounded-2xl border border-line/20 bg-white/55 px-4 py-4 shadow-soft backdrop-blur"
                    >
                      <p className="text-xl font-bold text-text">{s.value}</p>
                      <p className="mt-1 text-sm text-muted">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right */}
              <div className="hidden lg:block">
                <HeroBrowserMockup />
              </div>
            </div>
          </div>
        </section>

        {/* Bento features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-10 max-w-3xl">
            <SectionLabel>{t("landing.diff.eyebrow")}</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.diff.title")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-subtext">
              {t("landing.diff.subtitle")}
            </p>
          </div>
          <div ref={bentoRef} className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Wide top-left */}
            <div className="md:col-span-7" style={fade(bentoInView, 0)}>
              <BentoCard
                icon={<Clock className="h-5 w-5" />}
                label="01"
                title={t("landing.diff1.title")}
                description={t("landing.diff1.description")}
                className="h-full"
              >
                <div className="space-y-1.5 rounded-2xl bg-bg/60 p-3">
                  {(TIMELINE_ROWS[lang] ?? TIMELINE_ROWS.en).map((r) => (
                    <div key={r.time} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 font-mono text-[10px] text-subtext/50">
                        {r.time}
                      </span>
                      <span
                        className={
                          "h-1.5 w-1.5 shrink-0 rounded-full " +
                          (r.active ? "animate-pulse bg-emerald-500" : "bg-border/40")
                        }
                      />
                      <span
                        className={
                          "text-xs " + (r.active ? "font-medium text-text" : "text-subtext/60")
                        }
                      >
                        {r.label}
                      </span>
                    </div>
                  ))}
                </div>
              </BentoCard>
            </div>
            {/* Tall top-right */}
            <div className="md:col-span-5" style={fade(bentoInView, 100)}>
              <BentoCard
                icon={<Brain className="h-5 w-5" />}
                label="02"
                title={t("landing.diff2.title")}
                description={t("landing.diff2.description")}
                accent="bg-violet-500/10"
                iconColor="text-violet-400"
                className="h-full"
              >
                <div className="flex flex-col items-center rounded-2xl bg-bg/60 p-4">
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke="rgba(124,92,191,0.1)"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke="rgba(124,92,191,0.8)"
                        strokeWidth="2.5"
                        strokeDasharray="88, 100"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-xl font-bold text-text">88</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-brand">{t("landing.mockup.aiScore")}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      GO
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      HOLD
                    </span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      NO
                    </span>
                  </div>
                </div>
              </BentoCard>
            </div>
            {/* Full-width bottom */}
            <div className="md:col-span-12" style={fade(bentoInView, 200)}>
              <BentoCard
                icon={<Globe className="h-5 w-5" />}
                label="03"
                title={t("landing.diff3.title")}
                description={t("landing.diff3.description")}
                accent="bg-blue-500/10"
                iconColor="text-blue-400"
              >
                <div className="flex flex-wrap gap-2">
                  {[
                    ["EU", "🇪🇺"],
                    ["IT", "🇮🇹"],
                    ["UK", "🇬🇧"],
                    ["US", "🇺🇸"],
                    ["FR", "🇫🇷"],
                    ["DE", "🇩🇪"],
                    ["ES", "🇪🇸"],
                    ["PL", "🇵🇱"],
                    ["NL", "🇳🇱"],
                    ["BE", "🇧🇪"],
                    ["SE", "🇸🇪"],
                    ["NO", "🇳🇴"],
                  ].map(([name, flag]) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/20 bg-bg/60 px-3 py-1.5 text-xs font-medium text-text/70"
                    >
                      {flag} {name}
                    </span>
                  ))}
                  <span className="inline-flex items-center rounded-xl border border-border/10 bg-bg/40 px-3 py-1.5 text-xs text-subtext/40">
                    +8
                  </span>
                </div>
              </BentoCard>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border/20 bg-surface/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <div className="mb-10 max-w-3xl">
              <SectionLabel>{t("landing.how.eyebrow")}</SectionLabel>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("landing.how.title")}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <HowStep
                step="01"
                title={t("landing.how.step1.title")}
                description={t("landing.how.step1.description")}
              />
              <HowStep
                step="02"
                title={t("landing.how.step2.title")}
                description={t("landing.how.step2.description")}
              />
              <HowStep
                step="03"
                title={t("landing.how.step3.title")}
                description={t("landing.how.step3.description")}
              />
            </div>
          </div>
        </section>

        {/* Product preview */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-8">
            <SectionLabel>{t("landing.preview.eyebrow")}</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.preview.title")}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-subtext">{t("landing.preview.subtitle")}</p>
          </div>
          <div ref={cardsRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockTenders.map((tender, i) => (
              <div key={tender.title} style={fade(cardsInView, i * 120)}>
                <MockTenderCard {...tender} />
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-subtext">{t("landing.preview.hint")}</p>
        </section>

        {/* Pricing */}
        <section className="border-y border-border/20 bg-surface/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <div className="mb-10 text-center">
              <SectionLabel>{PRICING_LABEL[lang]}</SectionLabel>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {PRICING_TITLE[lang]}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-subtext">{PRICING_SUB[lang]}</p>
            </div>
            <div ref={pricingRef} className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
              <div style={fade(pricingInView, 0)}>
                <PricingCard {...pricing.free} />
              </div>
              <div style={fade(pricingInView, 120)}>
                <PricingCard {...pricing.pro} highlight badgeText={t("landing.pricing.popular")} />
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(124,92,191,0.12) 0%, rgba(167,139,250,0.08) 50%, rgba(124,92,191,0.06) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(124,92,191,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,191,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative mx-auto w-full max-w-4xl px-4 py-20 text-center sm:py-28">
            <SectionLabel>{t("landing.final.eyebrow")}</SectionLabel>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              {t("landing.final.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-subtext">
              {t("landing.final.description")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/request-access"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow hover:opacity-95"
              >
                {t("landing.final.primaryCta")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/60 px-6 py-3.5 text-sm font-semibold text-text shadow-soft hover:bg-surface/75"
              >
                {t("landing.final.secondaryCta")}
              </Link>
            </div>
            <p className="mt-6 text-xs text-subtext/50">{NO_CARD[lang]}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
