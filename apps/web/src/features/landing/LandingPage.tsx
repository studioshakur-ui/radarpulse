import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Brain, Globe } from "lucide-react";
import { CoreCard } from "@/components/ds/CoreCard";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/i18n";

// ─── Announcement bar ─────────────────────────────────────────────────────────

function AnnouncementBar() {
  return (
    <div className="border-b border-brand/20 bg-brand/5 px-4 py-2 text-center text-xs">
      <span className="inline-flex items-center gap-2 text-text/70">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        UK FindTender + SAM.gov now live —&nbsp;
        <Link
          to="/request-access"
          className="font-semibold text-brand underline-offset-2 hover:underline"
        >
          Request early access →
        </Link>
      </span>
    </div>
  );
}

// ─── Hero typewriter ──────────────────────────────────────────────────────────

const HERO_CYCLES: Record<Locale, Array<{ strong: string; accent: string }>> = {
  en: [
    { strong: "Win more", accent: "public tenders." },
    { strong: "Never miss", accent: "a deadline." },
    { strong: "Track 20+ countries", accent: "live." },
  ],
  fr: [
    { strong: "Remportez plus", accent: "d'appels d'offres." },
    { strong: "Ne manquez plus", accent: "une échéance." },
    { strong: "Suivez 20+ pays", accent: "en direct." },
  ],
  it: [
    { strong: "Vinci più", accent: "gare d'appalto." },
    { strong: "Non perdere", accent: "nessuna scadenza." },
    { strong: "Monitora 20+ paesi", accent: "in tempo reale." },
  ],
};

function TypewriterHero() {
  const { lang } = useT();
  const cycles = HERO_CYCLES[lang] ?? HERO_CYCLES.en;
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  // Reset index when locale changes
  useEffect(() => {
    setIdx(0);
    setVisible(true);
  }, [lang]);

  // Cycle through phrases
  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % cycles.length);
        setVisible(true);
      }, 380);
    }, 3400);
    return () => window.clearInterval(interval);
  }, [cycles.length]);

  const line = cycles[idx] ?? { strong: "Win more", accent: "public tenders." };

  return (
    <h1
      className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
      style={{
        transition: "opacity 0.38s ease, transform 0.38s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-10px)",
      }}
    >
      <span className="text-text">{line.strong} </span>
      <span className="text-brand">{line.accent}</span>
    </h1>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-subtext/50">
      [{index}] {children}
    </p>
  );
}

// ─── useInView hook ───────────────────────────────────────────────────────────

function useInView<T extends Element>(ref: React.RefObject<T | null>, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return inView;
}

// ─── Hero stats ───────────────────────────────────────────────────────────────

const HERO_STATS = [
  { value: "15 min", label: "Refresh cycle" },
  { value: "20+", label: "Countries monitored" },
  { value: "AI 0–100", label: "Opportunity score" },
] as const;

// ─── Mock inbox card (product preview) ───────────────────────────────────────

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
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${scoreBg}`}>
            AI {score}%
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${decisionBg}`}>
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

// ─── Differentiator card ──────────────────────────────────────────────────────

function DiffCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <CoreCard variant="glass" className="h-full rounded-3xl p-6">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
        {icon}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-subtext">{description}</p>
    </CoreCard>
  );
}

// ─── How-it-works step ───────────────────────────────────────────────────────

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

// ─── Signal Rail ─────────────────────────────────────────────────────────────

type SignalEntry =
  | { kind: "signal"; text: string; flag: string; country: string }
  | { kind: "metric"; text: string };

const SIGNALS: SignalEntry[] = [
  { kind: "signal", text: "New energy procurement", flag: "🇪🇸", country: "Spain" },
  { kind: "metric", text: "142 new signals indexed today" },
  { kind: "signal", text: "Healthcare demand rising", flag: "🇷🇴", country: "Romania" },
  { kind: "signal", text: "Transport funding update", flag: "🇵🇹", country: "Portugal" },
  { kind: "metric", text: "23 countries monitored" },
  { kind: "signal", text: "Fresh TED notices detected", flag: "🇪🇺", country: "EU" },
  { kind: "signal", text: "Infrastructure procurement activity", flag: "🇵🇱", country: "Poland" },
  { kind: "signal", text: "IT modernisation signal", flag: "🇫🇷", country: "France" },
  { kind: "metric", text: "47 procurement updates this hour" },
  { kind: "signal", text: "Digital transformation opportunity", flag: "🇩🇪", country: "Germany" },
  { kind: "signal", text: "Public health framework", flag: "🇮🇹", country: "Italy" },
  { kind: "signal", text: "Defense procurement activity", flag: "🇸🇪", country: "Sweden" },
  { kind: "signal", text: "New SAM.gov opportunities", flag: "🇺🇸", country: "US" },
  { kind: "signal", text: "Rail infrastructure signal", flag: "🇬🇧", country: "UK" },
  { kind: "metric", text: "Energy, transport, health tracked live" },
  { kind: "signal", text: "Water & utilities procurement", flag: "🇳🇱", country: "Netherlands" },
  { kind: "signal", text: "Education tech opportunity", flag: "🇧🇪", country: "Belgium" },
  { kind: "signal", text: "Smart city procurement", flag: "🇳🇴", country: "Norway" },
  { kind: "signal", text: "Environmental services signal", flag: "🇨🇿", country: "Czech Republic" },
  { kind: "signal", text: "Public sector IT renewal", flag: "🇦🇹", country: "Austria" },
  { kind: "metric", text: "Fresh market intelligence — live" },
  { kind: "signal", text: "Logistics & supply chain signal", flag: "🇩🇰", country: "Denmark" },
  { kind: "signal", text: "Renewable energy tender", flag: "🇫🇮", country: "Finland" },
  { kind: "signal", text: "Healthcare infrastructure update", flag: "🇬🇷", country: "Greece" },
  { kind: "signal", text: "Smart grid procurement", flag: "🇭🇺", country: "Hungary" },
];

function SignalRail() {
  const doubled = [...SIGNALS, ...SIGNALS];

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
              aria-hidden={i >= SIGNALS.length ? "true" : undefined}
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
              aria-hidden={i >= SIGNALS.length ? "true" : undefined}
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

// ─── Landing page ─────────────────────────────────────────────────────────────

export function LandingPage() {
  const { t } = useT();
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef);

  const mockTenders = [
    {
      flag: "🇮🇹",
      country: "Italy · ANAC",
      title: "Sistema informatico integrato per la gestione delle pratiche scolastiche",
      buyer: "Ministero dell'Istruzione",
      budget: "€ 4.2M",
      deadline: "Apr 15, 2026",
      score: 88,
      decision: "GO" as const,
    },
    {
      flag: "🇪🇺",
      country: "EU · TED",
      title: "Framework agreement for IT consulting and digital transformation services",
      buyer: "European Commission — DG DIGIT",
      budget: "€ 50M",
      deadline: "May 2, 2026",
      score: 71,
      decision: "GO" as const,
    },
    {
      flag: "🇬🇧",
      country: "UK · FindTender",
      title: "Cloud infrastructure modernisation and managed services",
      buyer: "NHS England",
      budget: "£ 8.5M",
      deadline: "Apr 28, 2026",
      score: 54,
      decision: "HOLD" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ── Nav + Announcement bar ───────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/30 bg-bg/90 backdrop-blur">
        <AnnouncementBar />
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-sm font-bold tracking-tight text-text">
            RadarPulse
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
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative border-b border-border/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-28">
            <div className="max-w-4xl">
              <TypewriterHero />

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-subtext">
                {t("landing.hero.description")}
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/request-access"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95"
                >
                  {t("landing.hero.primaryCta")} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/inbox"
                  className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/60 px-5 py-3 text-sm font-semibold text-text shadow-soft hover:bg-surface/75"
                >
                  {t("landing.hero.secondaryCta")}
                </Link>
              </div>

              {/* Stats block */}
              <div className="mt-10 flex flex-wrap gap-8">
                {HERO_STATS.map((s) => (
                  <div key={s.value} className="flex items-start gap-3">
                    <div className="mt-0.5 h-9 w-px bg-brand/35" />
                    <div>
                      <p className="text-sm font-semibold text-text">{s.value}</p>
                      <p className="text-xs text-subtext">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Signal Rail ───────────────────────────────────────────────── */}
        <SignalRail />

        {/* ── Product preview ───────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-8">
            <SectionLabel index="01">{t("landing.preview.eyebrow")}</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.preview.title")}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-subtext">{t("landing.preview.subtitle")}</p>
          </div>

          <div ref={cardsRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockTenders.map((tender, i) => (
              <div
                key={tender.title}
                style={{
                  transition: `opacity 0.5s ease ${i * 120}ms, transform 0.5s ease ${i * 120}ms`,
                  opacity: cardsInView ? 1 : 0,
                  transform: cardsInView ? "translateY(0)" : "translateY(24px)",
                }}
              >
                <MockTenderCard {...tender} />
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-subtext">{t("landing.preview.hint")}</p>
        </section>

        {/* ── Differentiators ───────────────────────────────────────────── */}
        <section className="border-y border-border/20 bg-surface/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <div className="mb-8 max-w-2xl">
              <SectionLabel index="02">{t("landing.diff.eyebrow")}</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("landing.diff.title")}
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <DiffCard
                icon={<Zap className="h-5 w-5 text-brand" />}
                title={t("landing.diff1.title")}
                description={t("landing.diff1.description")}
              />
              <DiffCard
                icon={<Brain className="h-5 w-5 text-brand" />}
                title={t("landing.diff2.title")}
                description={t("landing.diff2.description")}
              />
              <DiffCard
                icon={<Globe className="h-5 w-5 text-brand" />}
                title={t("landing.diff3.title")}
                description={t("landing.diff3.description")}
              />
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-8 max-w-3xl">
            <SectionLabel index="03">{t("landing.how.eyebrow")}</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
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
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:pb-28">
          <CoreCard variant="glassStrong" className="rounded-3xl p-8 sm:p-12">
            <div className="max-w-3xl">
              <SectionLabel index="04">{t("landing.final.eyebrow")}</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("landing.final.title")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-subtext">
                {t("landing.final.description")}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/request-access"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95"
              >
                {t("landing.final.primaryCta")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/60 px-5 py-3 text-sm font-semibold text-text shadow-soft hover:bg-surface/75"
              >
                {t("landing.final.secondaryCta")}
              </Link>
            </div>
          </CoreCard>
        </section>
      </main>
    </div>
  );
}
