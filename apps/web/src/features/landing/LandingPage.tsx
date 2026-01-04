import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { TwilightWebGLBackdrop } from "@/features/landing/cinematic/TwilightWebGLBackdrop";
import { TopNavCinematic } from "@/features/landing/cinematic/TopNavCinematic";
import { TechPremiumHero } from "@/features/landing/cinematic/TechPremiumHero";
import { ZipPinnedStage } from "@/features/landing/cinematic/ZipPinnedStage";
import { ScrollReveal } from "@/features/landing/cinematic/ScrollReveal";

function FeatureCard({
  title,
  desc,
  bullets,
}: {
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-[28px] border border-line/25 bg-surface/55 p-6 shadow-soft backdrop-blur">
      <div className="text-lg font-semibold text-text">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-subtext">{desc}</p>
      <ul className="mt-4 space-y-2 text-sm text-subtext">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand/10">
              <Check className="h-4 w-4 text-brand" />
            </span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal dir="up">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold text-subtext">{eyebrow}</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text sm:text-4xl">{title}</h2>
            <p className="mt-3 text-base leading-relaxed text-subtext">{subtitle}</p>
          </div>
        </ScrollReveal>

        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-bg text-text">
      <TwilightWebGLBackdrop />
      <TopNavCinematic />

      {/* HERO (canonical) */}
      <TechPremiumHero />

      {/* ZIP pinned cinematic */}
      <ZipPinnedStage />

      {/* PROOF — reveal alterné */}
      <Section
        id="proof"
        eyebrow="Proof"
        title="Evidence-linked decisions — built for speed and auditability."
        subtitle="Compliance-grade workflows: evidence, provenance, and reproducibility are first-class."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <ScrollReveal dir="left">
            <FeatureCard
              title="Source-linked excerpts"
              desc="Every highlight cites the exact source, page and section — so decisions are defensible."
              bullets={["Citations per claim", "Reproducible decision log", "Evidence drawer"]}
            />
          </ScrollReveal>

          <ScrollReveal dir="up" delay={0.03}>
            <FeatureCard
              title="Multi-source dedup"
              desc="Collapse repeats into one canonical opportunity while preserving the provenance graph."
              bullets={["Canonical record", "Merged sources preserved", "No double work"]}
            />
          </ScrollReveal>

          <ScrollReveal dir="right" delay={0.06}>
            <FeatureCard
              title="GO/HOLD/NO-GO engine"
              desc="Structured rationale + confidence signals so your team can move in seconds."
              bullets={["15s median decision", "Risk flags", "Next-action checklist"]}
            />
          </ScrollReveal>
        </div>

        <ScrollReveal dir="up" delay={0.05}>
          <div className="mt-8 rounded-[28px] border border-line/25 bg-surface/55 p-6 shadow-soft backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-text">Trust strip</div>
                <div className="mt-1 text-sm text-subtext">
                  Source-linked audit trail, reproducible decisions, and a deduped canonical record.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {["Source-linked audit trail", "Reproducible decisions", "Deduped canonical record", "Fast by design"].map((t) => (
                  <span key={t} className="rounded-full border border-line/25 bg-surface/60 px-3 py-1 text-xs font-semibold text-subtext">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Section>

      {/* SECURITY — reveal alterné */}
      <Section
        id="security"
        eyebrow="Security"
        title="Audit-ready by default — no black-box decisions."
        subtitle="Immutable trails, exportable reports, and execution-ready workspaces when it’s GO."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ScrollReveal dir="left">
            <FeatureCard
              title="Provenance + decision log"
              desc="Keep an immutable trail of what was extracted, what was cited, and why a recommendation was produced."
              bullets={["Citations per excerpt", "Change history", "Exportable decision report"]}
            />
          </ScrollReveal>

          <ScrollReveal dir="right" delay={0.04}>
            <FeatureCard
              title="Execution-ready workspaces"
              desc="When it’s GO, RadarPulse spins up a workspace with owners, milestones, and a requirements checklist."
              bullets={["Checklist + owners", "Milestones", "Evidence attached"]}
            />
          </ScrollReveal>
        </div>
      </Section>

      {/* CONTACT + FOOTER — reveal */}
      <section id="contact" className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal dir="up">
            <div>
              <div className="text-xs font-semibold text-subtext">Contact</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-text">
                Ready to see it on your sources?
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal dir="up" delay={0.05}>
            <div className="mt-8 rounded-[28px] border border-line/25 bg-surface/55 p-6 shadow-soft backdrop-blur">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <p className="max-w-2xl text-sm text-subtext">
                  RadarPulse is built in Trieste, Italy. Request access to run it on your sources, or explore the live demo without signup.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/request-access"
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-veil shadow-glow transition hover:opacity-90"
                  >
                    Request access
                  </Link>

                  <Link
                    to="/explore"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl border border-line/25 bg-surface/60 px-6 py-3 text-sm font-semibold text-text",
                      "shadow-soft backdrop-blur transition hover:bg-surface/80"
                    )}
                  >
                    Explore (no signup)
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal dir="up" delay={0.08}>
            <footer className="mt-12 border-t border-line/20 pt-8">
              <div className="flex flex-col gap-4 text-sm text-subtext md:flex-row md:items-center md:justify-between">
                <div className="font-semibold text-text">RadarPulse</div>

                <div className="flex flex-wrap gap-4">
                  <a className="hover:text-text" href="#proof">Proof</a>
                  <a className="hover:text-text" href="#security">Security</a>
                  <a className="hover:text-text" href="#contact">Contact</a>
                  <Link className="hover:text-text" to="/app">App</Link>
                </div>

                <div className="text-subtext">Made in Trieste, Italy</div>
              </div>
            </footer>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
