import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Lock, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { TwilightWebGLBackdrop } from "@/features/landing/cinematic/TwilightWebGLBackdrop";
import { TopNavCinematic } from "@/features/landing/cinematic/TopNavCinematic";
import { TechPremiumHero } from "@/features/landing/cinematic/TechPremiumHero";
import { ZipPinnedStage } from "@/features/landing/cinematic/ZipPinnedStage";

function Section({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl px-4 py-16 sm:py-20", className)}>
      <div className="mb-8">
        {eyebrow ? <div className="mb-2 text-xs font-semibold tracking-wide text-subtext">{eyebrow}</div> : null}
        <h2 className="text-2xl font-semibold tracking-tight text-text sm:text-4xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
  bullets,
}: {
  title: string;
  desc: string;
  icon?: React.ReactNode;
  bullets?: string[];
}) {
  return (
    <div className="rounded-2xl border border-line/20 bg-surface/60 p-6 shadow-soft backdrop-blur">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-elevated shadow-soft">
          {icon}
        </div>
        <div className="text-base font-semibold text-text">{title}</div>
      </div>
      <div className="text-sm text-subtext">{desc}</div>
      {bullets?.length ? (
        <ul className="mt-4 space-y-2 text-sm">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-text/95">
              <Check className="mt-0.5 h-4 w-4 text-brand" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <TwilightWebGLBackdrop />
      <TopNavCinematic />

      <main className="pt-14">
        {/* HERO (tech premium) */}
        <TechPremiumHero />

        {/* ZIPHQ-STYLE PINNED STAGE (replaces old chapters) */}
        <ZipPinnedStage id="how" />

        {/* PROOF */}
        <Section id="proof" eyebrow="Proof" title="Evidence-linked decisions — built for speed and auditability.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FeatureCard
              title="Source-linked excerpts"
              desc="Every highlight cites the exact source, page and section — so decisions are defensible."
              icon={<Sparkles className="h-5 w-5 text-brand" />}
              bullets={["Citations per claim", "Reproducible decision log", "Evidence drawer"]}
            />
            <FeatureCard
              title="Multi-source dedup"
              desc="Collapse repeats into one canonical opportunity while preserving the provenance graph."
              icon={<Workflow className="h-5 w-5 text-brand" />}
              bullets={["Canonical record", "Merged sources preserved", "No double work"]}
            />
            <FeatureCard
              title="GO/HOLD/NO-GO engine"
              desc="Structured rationale + confidence signals so your team can move in seconds."
              icon={<ShieldCheck className="h-5 w-5 text-brand" />}
              bullets={["15s median decision", "Risk flags", "Next-action checklist"]}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-line/20 bg-surface/60 p-6 shadow-soft backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-text">Trust strip</div>
                <div className="mt-1 text-sm text-subtext">
                  Compliance-grade workflows: evidence, provenance, and reproducibility are first-class.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Source-linked audit trail", "Reproducible decisions", "Deduped canonical record", "Fast by design"].map((x) => (
                  <span
                    key={x}
                    className="inline-flex items-center rounded-full border border-line/20 bg-white/40 px-3 py-1 text-xs font-semibold text-subtext"
                  >
                    {x}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* SECURITY */}
        <Section id="security" eyebrow="Security" title="Audit-ready by default — no black-box decisions.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line/20 bg-surface/60 p-6 shadow-soft backdrop-blur">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-elevated shadow-soft">
                  <Lock className="h-5 w-5 text-brand" />
                </div>
                <div className="text-base font-semibold text-text">Provenance + decision log</div>
              </div>
              <div className="text-sm text-subtext">
                Keep an immutable trail of what was extracted, what was cited, and why a recommendation was produced.
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {["Citations per excerpt", "Change history", "Exportable decision report"].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-text/95">
                    <Check className="mt-0.5 h-4 w-4 text-brand" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line/20 bg-surface/60 p-6 shadow-soft backdrop-blur">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-elevated shadow-soft">
                  <ShieldCheck className="h-5 w-5 text-brand" />
                </div>
                <div className="text-base font-semibold text-text">Execution-ready workspaces</div>
              </div>
              <div className="text-sm text-subtext">
                When it’s GO, RadarPulse spins up a workspace with owners, milestones, and a requirements checklist.
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {["Checklist + owners", "Milestones", "Evidence attached"].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-text/95">
                    <Check className="mt-0.5 h-4 w-4 text-brand" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* CONTACT */}
        <Section id="contact" eyebrow="Contact" title="Ready to see it on your sources?">
          <div className="rounded-2xl border border-line/20 bg-surface/60 p-7 shadow-soft backdrop-blur">
            <div className="text-sm text-subtext">
              RadarPulse is built in Trieste, Italy. Request access to run it on your sources, or explore the live demo
              without signup.
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/request-access"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-veil shadow-glow transition hover:opacity-90"
              >
                Request access <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line/25 bg-surface/60 px-6 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-surface/80"
              >
                Explore (no signup) <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Section>

        <footer className="border-t border-line/20 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-sm text-subtext sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <div className="relative h-6 w-6 overflow-hidden rounded-lg border border-line/25 bg-surface/70 shadow-soft">
                <div className="absolute -left-3 -top-3 h-10 w-10 rounded-full bg-brand/15 blur-xl" />
              </div>
              <span className="text-text">RadarPulse</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <a className="hover:text-text" href="#security">
                Security
              </a>
              <a className="hover:text-text" href="#contact">
                Contact
              </a>
              <Link className="hover:text-text" to="/inbox">
                App
              </Link>
            </div>
            <div>Made in Trieste, Italy</div>
          </div>
        </footer>
      </main>
    </div>
  );
}
