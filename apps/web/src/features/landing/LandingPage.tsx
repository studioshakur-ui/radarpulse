import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { TwilightWebGLBackdrop } from "@/features/landing/cinematic/TwilightWebGLBackdrop";
import { TopNavCinematic } from "@/features/landing/cinematic/TopNavCinematic";
import { ZipPinnedStage } from "@/features/landing/cinematic/ZipPinnedStage";
import { DecisionStageMock } from "@/features/landing/cinematic/DecisionStageMock";
import { ScrollReveal } from "@/features/landing/cinematic/ScrollReveal";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-white/55 px-3 py-1 text-xs font-semibold text-muted shadow-soft backdrop-blur">
      {children}
    </span>
  );
}

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
    <div className="rounded-[28px] border border-border/25 bg-white/45 p-6 shadow-soft backdrop-blur">
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/10">
              <Check className="h-4 w-4 text-accent" />
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
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        <ScrollReveal dir="up">
          <div className="max-w-4xl">
            <div className="text-xs font-semibold text-muted">{eyebrow}</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">{subtitle}</p>
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

      {/* HERO — STACK (haut/bas), plus de gauche/droite */}
      <section className="relative">
        <div className="mx-auto w-full max-w-[1560px] px-4 pb-10 pt-28 sm:px-6 lg:px-10 lg:pb-14 lg:pt-32">
          <ScrollReveal dir="up">
            <div className="max-w-5xl">
              <div className="flex flex-wrap gap-2">
                <Pill>✨ GO / HOLD / NO-GO</Pill>
                <Pill>🔗 Evidence-linked extraction</Pill>
                <Pill>🧬 Deduplication</Pill>
                <Pill>🛡️ Audit-ready</Pill>
              </div>

              <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                Turn tenders and grants into a{" "}
                <span className="text-accent">decision</span> in{" "}
                <span className="text-accent">seconds</span>.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
                RadarPulse compresses noise, collapses duplicates, extracts the fields that matter,
                and backs every claim with source-linked evidence—so your GO is fast and defensible.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/request-access"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95"
                >
                  Request access <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-white/55 px-5 py-3 text-sm font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
                >
                  Explore (no signup) <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="hidden text-xs text-muted md:block">
                  Strict requirements · low-noise triage · reproducible decisions
                </div>
              </div>

              <div className="mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "Noise", value: "↓ 80%" },
                  { label: "Decision time", value: "15s" },
                  { label: "Evidence", value: "Source-linked" },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded-2xl border border-border/25 bg-white/45 p-4 shadow-soft backdrop-blur"
                  >
                    <div className="text-xs font-semibold text-muted">{k.label}</div>
                    <div className="mt-1 text-sm font-semibold">{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Console full width EN DESSOUS */}
          <div className="mt-10">
            <ScrollReveal dir="up" delay={0.05}>
              <div className="rounded-[36px] border border-border/30 bg-white/40 p-4 shadow-glow backdrop-blur sm:p-5">
                <div className="flex flex-col gap-2 px-2 pb-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold text-muted">
                      RadarPulse Decision Console
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      Incoming → Dedup → Evidence → GO/HOLD/NO-GO
                    </div>
                  </div>

                  <div className="hidden text-xs text-muted sm:block">
                    Evidence-linked · auditable · reproducible
                  </div>
                </div>

                <DecisionStageMock variant="hero" progress={0.78} className="w-full" />
              </div>
            </ScrollReveal>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/35 to-transparent" />
      </section>

      {/* ZIP-LIKE SCROLLTELLING */}
      <ZipPinnedStage />

      {/* PROOF */}
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
      </Section>

      {/* SECURITY */}
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

      {/* CONTACT + FOOTER */}
      <section id="contact" className="relative py-20">
        <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
          <ScrollReveal dir="up">
            <div>
              <div className="text-xs font-semibold text-muted">Contact</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">
                Ready to see it on your sources?
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal dir="up" delay={0.05}>
            <div className="mt-8 rounded-[28px] border border-border/25 bg-white/45 p-6 shadow-soft backdrop-blur">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <p className="max-w-2xl text-sm text-muted">
                  RadarPulse is built in Trieste, Italy. Request access to run it on your sources,
                  or explore the live demo without signup.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/request-access"
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95"
                  >
                    Request access <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/explore"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-border/30 bg-white/55 px-5 py-3 text-sm font-semibold text-text",
                      "shadow-soft backdrop-blur hover:bg-white/65"
                    )}
                  >
                    Explore (no signup) <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal dir="up" delay={0.08}>
            <footer className="mt-12 border-t border-border/20 pt-8">
              <div className="flex flex-col gap-4 text-sm text-muted md:flex-row md:items-center md:justify-between">
                <div className="font-semibold text-text">RadarPulse</div>

                <div className="flex flex-wrap gap-4">
                  <a className="hover:text-text" href="#proof">
                    Proof
                  </a>
                  <a className="hover:text-text" href="#security">
                    Security
                  </a>
                  <a className="hover:text-text" href="#contact">
                    Contact
                  </a>
                  <Link className="hover:text-text" to="/app">
                    App
                  </Link>
                </div>

                <div className="text-muted">Made in Trieste, Italy</div>
              </div>
            </footer>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
