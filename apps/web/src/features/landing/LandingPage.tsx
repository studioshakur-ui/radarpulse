import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/state/theme";
import { Link } from "react-router-dom";
import { ArrowRight, Brain, Globe, CheckCircle, Clock, Target, Zap, Map } from "lucide-react";
import { CoreCard } from "@/components/ds/CoreCard";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/i18n";
import { MarketingShell } from "./marketingPrimitives";

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
    </div>
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

// ─── Pricing data ─────────────────────────────────────────────────────────────

function getPricingPlans(lang: Locale) {
  if (lang === "fr")
    return {
      free: {
        name: "Solo",
        price: "Sur revue",
        period: "",
        description: "Pour les consultants et bid managers qui qualifient seuls.",
        features: [
          "Inbox Europe (UK, FR, IT, EU TED)",
          "Score qualite IA par opportunite",
          "Brief auto en un clic",
          "Decisions GO / HOLD / NO-GO",
        ],
        cta: "Demander l'acces",
        ctaHref: "/request-access",
      },
      pro: {
        name: "Team",
        price: "Personnalise",
        period: "",
        description: "Pour les equipes qui operent des dossiers en continu.",
        features: [
          "Tout Solo inclus",
          "Board dossiers et checklist equipe",
          "Decisions et workspace partages",
          "Intelligence geographique",
          "Onboarding prioritaire",
        ],
        cta: "Demander l'acces",
        ctaHref: "/request-access",
      },
    };
  if (lang === "it")
    return {
      free: {
        name: "Solo",
        price: "Su valutazione",
        period: "",
        description: "Per consulenti e bid manager che qualificano da soli.",
        features: [
          "Inbox Europa (UK, FR, IT, EU TED)",
          "Punteggio qualita AI per opportunita",
          "Brief automatico in un click",
          "Decisioni GO / HOLD / NO-GO",
        ],
        cta: "Richiedi accesso",
        ctaHref: "/request-access",
      },
      pro: {
        name: "Team",
        price: "Custom",
        period: "",
        description: "Per i team che operano dossier in continuita.",
        features: [
          "Tutto Solo incluso",
          "Board dossier e checklist team",
          "Decisioni e workspace condivisi",
          "Intelligenza geografica",
          "Onboarding prioritario",
        ],
        cta: "Richiedi accesso",
        ctaHref: "/request-access",
      },
    };
  return {
    free: {
      name: "Solo",
      price: "By review",
      period: "",
      description: "For consultants and bid managers qualifying on their own.",
      features: [
        "European inbox (UK, FR, IT, EU TED)",
        "AI quality score per opportunity",
        "One-click auto-brief",
        "GO / HOLD / NO-GO decisions",
      ],
      cta: "Request access",
      ctaHref: "/request-access",
    },
    pro: {
      name: "Team",
      price: "Custom",
      period: "",
      description: "For teams operating dossiers continuously.",
      features: [
        "Everything in Solo",
        "Dossier board & team checklist",
        "Shared decisions & workspace",
        "Geographic intelligence",
        "Priority onboarding",
      ],
      cta: "Request access",
      ctaHref: "/request-access",
    },
  };
}

// ─── Coverage data ────────────────────────────────────────────────────────────

const COVERAGE: Array<{
  flag: string;
  name: Record<Locale, string>;
  sources: string[];
}> = [
  {
    flag: "🇬🇧",
    name: { en: "United Kingdom", fr: "Royaume-Uni", it: "Regno Unito" },
    sources: ["Find a Tender", "Contracts Finder", "Sub-threshold notices"],
  },
  {
    flag: "🇫🇷",
    name: { en: "France", fr: "France", it: "Francia" },
    sources: ["BOAMP", "Marchés Publics", "Regional platforms"],
  },
  {
    flag: "🇮🇹",
    name: { en: "Italy", fr: "Italie", it: "Italia" },
    sources: ["ANAC", "eAppalti FVG", "Regional sources"],
  },
  {
    flag: "🇪🇺",
    name: { en: "EU (TED)", fr: "UE (TED)", it: "UE (TED)" },
    sources: ["TED — Tenders Electronic Daily", "EU institutions", "OJEU notices"],
  },
];

// ─── Landing page ─────────────────────────────────────────────────────────────

export function LandingPage() {
  const { t, lang } = useT();
  const bentoRef = useRef<HTMLDivElement>(null);
  const bentoInView = useInView(bentoRef);
  const pricingRef = useRef<HTMLDivElement>(null);
  const pricingInView = useInView(pricingRef);
  const problemRef = useRef<HTMLDivElement>(null);
  const problemInView = useInView(problemRef);
  const engineRef = useRef<HTMLDivElement>(null);
  const engineInView = useInView(engineRef);
  const coverageRef = useRef<HTMLDivElement>(null);
  const coverageInView = useInView(coverageRef);

  const pricing = getPricingPlans(lang);

  const HERO_STATS: Record<Locale, Array<{ value: string; label: string }>> = {
    en: [
      { value: "€2T+", label: "EU public procurement per year" },
      { value: "40+", label: "Active sources aggregated" },
      { value: "UK · FR · IT · EU", label: "Live markets" },
    ],
    fr: [
      { value: "€2T+", label: "Marchés publics EU par an" },
      { value: "40+", label: "Sources actives agrégées" },
      { value: "UK · FR · IT · EU", label: "Marchés en direct" },
    ],
    it: [
      { value: "€2T+", label: "Appalti pubblici EU all'anno" },
      { value: "40+", label: "Fonti attive aggregate" },
      { value: "UK · FR · IT · EU", label: "Mercati live" },
    ],
  };

  const TIMELINE_ROWS: Record<Locale, Array<{ time: string; label: string; active: boolean }>> = {
    en: [
      { time: "08:40", label: "UK tender captured from Find a Tender", active: false },
      { time: "09:02", label: "AI score computed: 84 — shortlisted", active: true },
      { time: "09:03", label: "Brief generated, dossier ready", active: false },
    ],
    fr: [
      { time: "08:40", label: "Appel capté depuis BOAMP", active: false },
      { time: "09:02", label: "Score IA calculé : 84 — présélectionné", active: true },
      { time: "09:03", label: "Brief généré, dossier prêt", active: false },
    ],
    it: [
      { time: "08:40", label: "Gara catturata da ANAC", active: false },
      { time: "09:02", label: "Score AI calcolato: 84 — selezionato", active: true },
      { time: "09:03", label: "Brief generato, dossier pronto", active: false },
    ],
  };

  const HERO_PILL: Record<Locale, string> = {
    en: "European public procurement intelligence",
    fr: "Intelligence sur les marchés publics européens",
    it: "Intelligence sugli appalti pubblici europei",
  };

  const NO_CARD: Record<Locale, string> = {
    en: "Reviewed access. Onboarded with your team. Cancel anytime.",
    fr: "Accès revu. Onboarding avec votre équipe. Résiliation à tout moment.",
    it: "Accesso valutato. Onboarding con il tuo team. Cancellazione in qualsiasi momento.",
  };

  const stats = HERO_STATS[lang] ?? HERO_STATS.en;

  const fade = (inView: boolean, delay = 0): React.CSSProperties => ({
    transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(20px)",
  });

  const ENGINE_FEATURES: Array<{
    icon: React.ReactNode;
    accent: string;
    iconColor: string;
    titleKey: string;
    bodyKey: string;
  }> = [
    {
      icon: <Target className="h-5 w-5" />,
      accent: "bg-brand/10",
      iconColor: "text-brand",
      titleKey: "landing.engine.feat1.title",
      bodyKey: "landing.engine.feat1.body",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      accent: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      titleKey: "landing.engine.feat2.title",
      bodyKey: "landing.engine.feat2.body",
    },
    {
      icon: <Brain className="h-5 w-5" />,
      accent: "bg-violet-500/10",
      iconColor: "text-violet-400",
      titleKey: "landing.engine.feat3.title",
      bodyKey: "landing.engine.feat3.body",
    },
    {
      icon: <Map className="h-5 w-5" />,
      accent: "bg-blue-500/10",
      iconColor: "text-blue-400",
      titleKey: "landing.engine.feat4.title",
      bodyKey: "landing.engine.feat4.body",
    },
  ];

  return (
    <MarketingShell
      locale={lang}
      activeMarket="uk"
      banner={{
        text: t("landing.announcement.body"),
        linkLabel: t("landing.announcement.link"),
        linkTo: "/request-access",
      }}
    >
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/20">
        <HeroBackground />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:gap-10">
            {/* Left */}
            <div className="max-w-2xl">
              <div className="mb-5">
                <SectionLabel>{HERO_PILL[lang]}</SectionLabel>
              </div>

              {/* Static headline — no typewriter */}
              <h1 className="max-w-[16ch] text-4xl font-black leading-[0.96] tracking-[-0.045em] sm:text-6xl lg:text-[4.8rem]">
                <span
                  style={{
                    background: "linear-gradient(135deg, #7c5cbf 0%, #a78bfa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t("landing.hero.title")}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-subtext">
                {t("landing.hero.description")}
              </p>

              <div className="mt-8 lg:hidden">
                <HeroBrowserMockup />
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

              {/* Market stats */}
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

            {/* Right — browser mockup */}
            <div className="hidden lg:block">
              <HeroBrowserMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ───────────────────────────────────────────────────────── */}
      <section className="border-b border-border/20 bg-surface/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-10 max-w-3xl">
            <SectionLabel>{t("landing.preview.eyebrow")}</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.preview.title")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-subtext">
              {t("landing.preview.subtitle")}
            </p>
          </div>
          <div ref={problemRef} className="grid gap-4 md:grid-cols-3">
            {(
              [
                { titleKey: "landing.problem.col1.title", bodyKey: "landing.problem.col1.body", dot: "bg-bad" },
                { titleKey: "landing.problem.col2.title", bodyKey: "landing.problem.col2.body", dot: "bg-warn" },
                { titleKey: "landing.problem.col3.title", bodyKey: "landing.problem.col3.body", dot: "bg-brand/50" },
              ] as const
            ).map(({ titleKey, bodyKey, dot }, i) => (
              <div key={titleKey} style={fade(problemInView, i * 100)}>
                <CoreCard variant="glass" className="h-full rounded-3xl p-6">
                  <div className={"mb-4 h-2 w-2 rounded-full " + dot} />
                  <h3 className="text-lg font-semibold tracking-tight text-text">
                    {t(titleKey as Parameters<typeof t>[0])}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-subtext">
                    {t(bodyKey as Parameters<typeof t>[0])}
                  </p>
                </CoreCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENTO — HOW IT WORKS ──────────────────────────────────────────── */}
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
                    NO-GO
                  </span>
                </div>
              </div>
            </BentoCard>
          </div>

          {/* Full-width bottom */}
          <div className="md:col-span-12" style={fade(bentoInView, 200)}>
            <BentoCard
              icon={<CheckCircle className="h-5 w-5" />}
              label="03"
              title={t("landing.diff3.title")}
              description={t("landing.diff3.description")}
              accent="bg-blue-500/10"
              iconColor="text-blue-400"
            >
              <div className="space-y-1.5 rounded-2xl bg-bg/60 p-3">
                {[
                  { label: "Security appendix", done: true },
                  { label: "Partner sign-off", done: true },
                  { label: "Budget review", done: false, active: true },
                  { label: "Final submission", done: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <span className={item.done ? "h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" : item.active ? "h-1.5 w-1.5 shrink-0 rounded-full animate-pulse bg-amber-500" : "h-1.5 w-1.5 shrink-0 rounded-full bg-border/40"} />
                    <span className={item.done ? "line-through text-subtext/40" : item.active ? "font-medium text-text" : "text-subtext/60"}>
                      {item.label}
                    </span>
                    {item.done ? <CheckCircle className="ml-auto h-3 w-3 text-emerald-500/70" /> : null}
                  </div>
                ))}
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (3 steps) ────────────────────────────────────────── */}
      <section className="border-y border-border/20 bg-surface/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-10 max-w-3xl">
            <SectionLabel>{t("landing.how.eyebrow")}</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.how.title")}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <HowStep step="01" title={t("landing.how.step1.title")} description={t("landing.how.step1.description")} />
            <HowStep step="02" title={t("landing.how.step2.title")} description={t("landing.how.step2.description")} />
            <HowStep step="03" title={t("landing.how.step3.title")} description={t("landing.how.step3.description")} />
          </div>
        </div>
      </section>

      {/* ── QUALIFICATION ENGINE ──────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-10 max-w-3xl">
          <SectionLabel>{t("landing.engine.eyebrow")}</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("landing.engine.title")}
          </h2>
        </div>
        <div ref={engineRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ENGINE_FEATURES.map((feat, i) => (
            <div key={feat.titleKey} style={fade(engineInView, i * 80)}>
              <CoreCard variant="glass" className="h-full rounded-3xl p-5">
                <div className={"mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl " + feat.accent}>
                  <span className={feat.iconColor}>{feat.icon}</span>
                </div>
                <h3 className="text-base font-semibold tracking-tight text-text">
                  {t(feat.titleKey as Parameters<typeof t>[0])}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-subtext">
                  {t(feat.bodyKey as Parameters<typeof t>[0])}
                </p>
              </CoreCard>
            </div>
          ))}
        </div>
      </section>

      {/* ── COVERAGE MAP ──────────────────────────────────────────────────── */}
      <section className="border-y border-border/20 bg-surface/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-10 max-w-3xl">
            <SectionLabel>{t("landing.coverage.eyebrow")}</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.coverage.title")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-subtext">
              {t("landing.coverage.subtitle")}
            </p>
          </div>
          <div ref={coverageRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COVERAGE.map((market, i) => (
              <div key={market.flag} style={fade(coverageInView, i * 80)}>
                <CoreCard variant="glass" className="h-full rounded-3xl p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{market.flag}</span>
                    <span className="text-sm font-semibold text-text">
                      {market.name[lang] ?? market.name.en}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {market.sources.map((source) => (
                      <li key={source} className="flex items-center gap-2 text-xs text-subtext">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-brand/50" />
                        {source}
                      </li>
                    ))}
                  </ul>
                </CoreCard>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-subtext/60">
            <Globe className="mr-1.5 inline-block h-3.5 w-3.5" />
            {t("landing.coverage.coming")}
          </p>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-10 text-center">
          <SectionLabel>
            {lang === "fr" ? "Accès" : lang === "it" ? "Accesso" : "Access"}
          </SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {lang === "fr"
              ? "Un accès clair, aligné à votre organisation."
              : lang === "it"
                ? "Un accesso chiaro, allineato alla tua organizzazione."
                : "Clear access, aligned to your team."}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-subtext">
            {lang === "fr"
              ? "Accès revu avant onboarding. Pas de carte de crédit requise pour démarrer."
              : lang === "it"
                ? "Accesso valutato prima dell'onboarding. Nessuna carta di credito richiesta per iniziare."
                : "Access reviewed before onboarding. No credit card required to get started."}
          </p>
        </div>
        <div ref={pricingRef} className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          <div style={fade(pricingInView, 0)}>
            <PricingCard {...pricing.free} />
          </div>
          <div style={fade(pricingInView, 120)}>
            <PricingCard
              {...pricing.pro}
              highlight
              badgeText={t("landing.pricing.popular")}
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/20">
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
    </MarketingShell>
  );
}
