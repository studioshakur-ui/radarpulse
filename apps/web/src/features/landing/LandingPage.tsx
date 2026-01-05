// apps/web/src/features/landing/LandingPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { TwilightWebGLBackdrop } from "@/features/landing/cinematic/TwilightWebGLBackdrop";
import { TopNavCinematic } from "@/features/landing/cinematic/TopNavCinematic";
import { ScrollReveal } from "@/features/landing/cinematic/ScrollReveal";

import { DecisionConsoleMock } from "@/features/landing/cinematic/DecisionConsoleMock";
import { WorldMapPulse } from "@/features/landing/cinematic/WorldMapPulse";

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

function StepCard({
  step,
  state,
  title,
  desc,
  bullets,
}: {
  step: string;
  state: "STAGE" | "ACTIVE";
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-[28px] border border-border/25 bg-white/45 p-6 shadow-soft backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-muted">{step}</div>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                state === "ACTIVE"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-border/30 bg-white/55 text-muted"
              )}
            >
              {state}
            </span>
          </div>

          <div className="mt-2 text-xl font-semibold">{title}</div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
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

export function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-bg text-text">
      <TwilightWebGLBackdrop />
      <TopNavCinematic />

      {/* HERO — FOTO 1 EN HAUT (texte), puis FOTO 2 (console) */}
      <section className="relative">
        <div className="mx-auto w-full max-w-[1560px] px-4 pb-10 pt-28 sm:px-6 lg:px-10 lg:pb-14 lg:pt-32">
          {/* FOTO 1 — Hero copy (top) */}
          <ScrollReveal dir="up">
            <div className="max-w-5xl">
              <div className="flex flex-wrap gap-2">
                <Pill>✨ Evidence-linked</Pill>
                <Pill>🛡️ Audit-ready</Pill>
              </div>

              <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                Turn tenders and grants into a{" "}
                <span className="text-accent">decision</span> in{" "}
                <span className="text-accent">seconds</span>.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
                RadarPulse standardizes what matters, collapses duplicates into one canonical record,
                and backs every claim with source-linked evidence—so decisions are fast and audit-defensible.
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
                  Explore demo <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="hidden text-xs text-muted md:block">
                  Low-noise triage · reproducible decision log · citations per claim
                </div>
              </div>

              <div className="mt-8 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "Evidence", value: "Citations per claim" },
                  { label: "Dedup", value: "Canonical record" },
                  { label: "Audit", value: "Exportable decision log" },
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

          {/* FOTO 2 — Console wide (plus de largeur) */}
          <div className="mt-12">
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

                <DecisionConsoleMock />
              </div>
            </ScrollReveal>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/35 to-transparent" />
      </section>

      {/* FOTO 3 — Carte originale, large, entre Hero et How */}
      <section className="relative py-16">
        <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
          <ScrollReveal dir="up">
            <WorldMapPulse />
          </ScrollReveal>
        </div>
      </section>

      {/* HOW — stack vertical, aucun pinned scroll */}
      <Section
        id="how"
        eyebrow="How it works"
        title="One stage. Four steps. Zero ambiguity."
        subtitle="Keep a single decision workflow: ingest, dedup, evidence, and a reproducible GO/HOLD/NO-GO."
      >
        <div className="space-y-6">
          <ScrollReveal dir="up">
            <StepCard
              step="INCOMING"
              state="STAGE"
              title="Ingest every source. Stop reading noise."
              desc="RadarPulse consolidates portals, feeds, and alerts into a single evidence-ready inbox with stable fields."
              bullets={[
                "Structured fields (buyer, budget, deadline)",
                "Fast triage list",
                "Noise reduction by normalization",
                "Source preserved for audit",
              ]}
            />
          </ScrollReveal>

          <ScrollReveal dir="up" delay={0.03}>
            <StepCard
              step="DEDUP"
              state="ACTIVE"
              title="Collapse duplicates into one truth."
              desc="Multiple sources announce the same opportunity. Dedup collapses repeats into one canonical record without losing provenance."
              bullets={[
                "Canonical item, stable fingerprint",
                "Merged sources preserved",
                "No double work",
                "Searchable, comparable fields",
              ]}
            />
          </ScrollReveal>

          <ScrollReveal dir="up" delay={0.06}>
            <StepCard
              step="EVIDENCE"
              state="STAGE"
              title="Extract, cite, and prove."
              desc="Every claim is backed by excerpts that link back to the source location."
              bullets={[
                "Cited excerpts (page/section)",
                "Traceable provenance",
                "Confidence signals",
                "Readable rationale",
              ]}
            />
          </ScrollReveal>

          <ScrollReveal dir="up" delay={0.09}>
            <StepCard
              step="DECISION"
              state="STAGE"
              title="GO/HOLD/NO-GO with an audit trail."
              desc="Make fast decisions and keep a defensible record: rationale, checklist, owner, and exportable log."
              bullets={[
                "Decision + why",
                "Next-action checklist",
                "Assign owner",
                "Exportable decision log",
              ]}
            />
          </ScrollReveal>
        </div>
      </Section>

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
              bullets={["Seconds-level triage", "Risk flags", "Next-action checklist"]}
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
                  Request access to run RadarPulse on your portals, feeds, and email alerts—then keep decisions
                  defensible with evidence-linked excerpts and an exportable log.
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
                    Explore demo <ArrowRight className="h-4 w-4" />
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
                  <a className="hover:text-text" href="#how">
                    How
                  </a>
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
