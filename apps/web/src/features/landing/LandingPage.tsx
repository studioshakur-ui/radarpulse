import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { CoreCard } from "@/components/ds/CoreCard";
import { CorePill } from "@/components/ds/CorePill";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

function BenefitCard({
  title,
  description,
  points,
}: {
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <CoreCard variant="glass" className="h-full rounded-3xl p-6">
      <h3 className="text-lg font-semibold tracking-tight text-text">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-subtext">{description}</p>
      <ul className="mt-5 space-y-2 text-sm text-subtext">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand/10">
              <Check className="h-3.5 w-3.5 text-brand" />
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </CoreCard>
  );
}

export function LandingPage() {
  const { t, lang, setLang } = useT();

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="border-b border-border/30 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            RadarPulse
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-line/25 bg-surface/60 p-1">
              {(["fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    lang === l ? "bg-brand text-white shadow-sm" : "text-subtext hover:text-text",
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <Link
              to="/guides"
              className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/60 px-4 py-2 text-sm font-semibold text-text shadow-soft hover:bg-surface/75"
            >
              {t("landing.nav.explore")}
            </Link>
            <Link
              to="/request-access"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow hover:opacity-95"
            >
              {t("landing.nav.requestAccess")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <main>
        <section className="relative border-b border-border/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <CorePill variant="soft">{t("landing.hero.pillEvidence")}</CorePill>
                <CorePill variant="soft">{t("landing.hero.pillAudit")}</CorePill>
                <CorePill variant="soft">{t("landing.hero.pillTriage")}</CorePill>
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-text sm:text-5xl lg:text-6xl">
                {t("landing.hero.title")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-subtext">
                {t("landing.hero.description")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/request-access"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95"
                >
                  {t("landing.hero.primaryCta")} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/guides"
                  className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/60 px-5 py-3 text-sm font-semibold text-text shadow-soft hover:bg-surface/75"
                >
                  {t("landing.hero.secondaryCta")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext">{t("landing.benefits.eyebrow")}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.benefits.title")}</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <BenefitCard
              title={t("landing.benefits.card1.title")}
              description={t("landing.benefits.card1.description")}
              points={[
                t("landing.benefits.card1.point1"),
                t("landing.benefits.card1.point2"),
                t("landing.benefits.card1.point3"),
              ]}
            />
            <BenefitCard
              title={t("landing.benefits.card2.title")}
              description={t("landing.benefits.card2.description")}
              points={[
                t("landing.benefits.card2.point1"),
                t("landing.benefits.card2.point2"),
                t("landing.benefits.card2.point3"),
              ]}
            />
            <BenefitCard
              title={t("landing.benefits.card3.title")}
              description={t("landing.benefits.card3.description")}
              points={[
                t("landing.benefits.card3.point1"),
                t("landing.benefits.card3.point2"),
                t("landing.benefits.card3.point3"),
              ]}
            />
          </div>
        </section>

        <section id="how" className="border-y border-border/20 bg-surface/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">{t("landing.how.eyebrow")}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.how.title")}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  step: "01",
                  title: t("landing.how.step1.title"),
                  desc: t("landing.how.step1.description"),
                },
                {
                  step: "02",
                  title: t("landing.how.step2.title"),
                  desc: t("landing.how.step2.description"),
                },
                {
                  step: "03",
                  title: t("landing.how.step3.title"),
                  desc: t("landing.how.step3.description"),
                },
                {
                  step: "04",
                  title: t("landing.how.step4.title"),
                  desc: t("landing.how.step4.description"),
                },
              ].map((item) => (
                <CoreCard key={item.step} variant="glass" className="rounded-3xl p-6">
                  <p className="text-xs font-semibold text-brand">{item.step}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-subtext">{item.desc}</p>
                </CoreCard>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <CoreCard variant="glass" className="rounded-3xl p-8 sm:p-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">{t("landing.final.eyebrow")}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.final.title")}</h2>
              <p className="mt-4 text-base leading-relaxed text-subtext">{t("landing.final.description")}</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/request-access"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95"
              >
                {t("landing.final.primaryCta")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/guides"
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
