import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check, Shield, Sparkles, Workflow } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cx } from "@/lib/utils";

/* -----------------------------
   Luxe motion (controlled)
----------------------------- */
function useLuxeMotion() {
  const reduced = useReducedMotion();
  return {
    reduced,
    reveal: {
      initial: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12, filter: "blur(6px)" },
      whileInView: reduced ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: "blur(0px)" },
      viewport: { once: true, amount: 0.35 },
      transition: { duration: 0.6, ease: [0.21, 0.61, 0.35, 1] },
    },
  };
}

function LuxeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Vignette */}
      <div className="absolute inset-0 [background:radial-gradient(1200px_700px_at_30%_10%,rgba(168,85,247,0.18),transparent_60%),radial-gradient(900px_600px_at_85%_30%,rgba(216,180,254,0.10),transparent_60%)]" />
      <div className="absolute inset-0 [background:radial-gradient(1200px_900px_at_50%_110%,rgba(0,0,0,0.75),transparent_55%)]" />
      {/* Noise (ultra light) */}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/></filter><rect width=%22400%22 height=%22400%22 filter=%22url(%23n)%22 opacity=%220.55%22/></svg>')]" />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:64px_64px]" />
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted shadow-soft">
      {children}
    </span>
  );
}

function PrimaryCTA({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cx(
        "group relative inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-bg shadow-glow transition",
        "bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(139,92,246,0.85),rgba(236,72,153,0.22))]",
        "hover:opacity-[0.96] active:scale-[0.99]",
        "focus:outline-none focus:ring-2 focus:ring-accent/40",
        className
      )}
    >
      <span className="absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 [background:radial-gradient(600px_200px_at_30%_30%,rgba(255,255,255,0.16),transparent_60%)]" />
      <span className="relative">{children}</span>
    </Link>
  );
}

function SecondaryCTA({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-border/30 bg-surface/70 px-5 py-3 text-sm font-semibold text-text shadow-soft transition",
        "hover:bg-elevated/70 hover:border-border/45 active:scale-[0.99]",
        className
      )}
    >
      {children}
    </Link>
  );
}

function Card({
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
    <div className="group relative rounded-2xl border border-border/30 bg-surface/70 p-5 shadow-soft transition hover:border-border/45 hover:bg-elevated/40">
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 [background:radial-gradient(700px_240px_at_25%_15%,rgba(216,180,254,0.12),transparent_60%)]" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated/70 shadow-glow">
            {icon}
          </div>
          <div className="text-base font-semibold">{title}</div>
        </div>
        <div className="text-sm text-muted">{desc}</div>
        {bullets?.length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-text/95">
                <Check className="mt-0.5 h-4 w-4 text-accent" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

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
  const m = useLuxeMotion();
  return (
    <motion.section
      id={id}
      className={cx("mx-auto max-w-6xl px-4 py-16 sm:py-20", className)}
      initial={m.reveal.initial as any}
      whileInView={m.reveal.whileInView as any}
      viewport={m.reveal.viewport as any}
      transition={m.reveal.transition as any}
    >
      <div className="mb-8">
        {eyebrow ? (
          <div className="mb-2 text-xs font-semibold tracking-wide text-muted">{eyebrow}</div>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

/* -----------------------------
   Hero "product truth"
----------------------------- */
function HeroDemoFrame() {
  const m = useLuxeMotion();

  // simple choreographed “GO -> workspace created”
  const steps = useMemo(
    () => [
      { t: "UN procurement bulletin — logistics", badge: "Grant", tone: "neutral" as const },
      { t: "Solar deployment — feasibility & design", badge: "Tender", tone: "neutral" as const },
      { t: "Emergency response — procurement", badge: "Grant", tone: "warn" as const },
    ],
    []
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-surface/60 shadow-soft">
      <div className="absolute inset-0 opacity-100 [background:radial-gradient(800px_320px_at_20%_0%,rgba(168,85,247,0.18),transparent_60%)]" />
      <div className="relative p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Inbox</div>
          <span className="rounded-full border border-border/30 bg-bg/40 px-2 py-0.5 text-[11px] font-medium text-muted">
            Demo
          </span>
        </div>

        <div className="space-y-2">
          {steps.map((s, i) => (
            <motion.div
              key={s.t}
              className="flex items-center gap-3 rounded-2xl border border-border/25 bg-bg/35 px-3 py-2"
              initial={m.reveal.initial as any}
              whileInView={m.reveal.whileInView as any}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ ...m.reveal.transition, delay: 0.05 * i }}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{s.t}</div>
                <div className="mt-0.5 text-xs text-muted">Evidence-linked · normalized fields</div>
              </div>
              <span className="rounded-full border border-border/25 bg-surface/50 px-2 py-0.5 text-[11px] font-medium text-muted">
                {s.badge}
              </span>
              <motion.button
                type="button"
                className="rounded-xl px-3 py-2 text-xs font-semibold text-bg shadow-glow"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(139,92,246,0.85), rgba(236,72,153,0.22))",
                }}
                initial={{ opacity: 0.75 }}
                whileHover={{ opacity: 0.98 }}
                whileTap={{ scale: 0.99 }}
              >
                GO
              </motion.button>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-3 flex items-center justify-between rounded-2xl border border-border/25 bg-elevated/35 px-3 py-2"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.21, 0.61, 0.35, 1] }}
        >
          <div className="text-xs text-muted">
            Workspace created: <span className="font-semibold text-text">Checklist · Milestones · Missing docs</span>
          </div>
          <span className="rounded-full border border-good/25 bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">
            Ready
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function TopNav() {
  const loc = useLocation();
  const isExplore = loc.pathname === "/explore";

  return (
    <div className="fixed inset-x-0 top-0 z-30 border-b border-border/25 bg-bg/65 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-xl bg-elevated shadow-glow" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">RadarPulse</div>
            <div className="text-[11px] text-muted">Tenders + Grants</div>
          </div>
        </div>

        <div className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a className="hover:text-text" href="#product">
            Product
          </a>
          <a className="hover:text-text" href="#how">
            How it works
          </a>
          <a className="hover:text-text" href="#pricing">
            Pricing
          </a>
          <a className="hover:text-text" href="#security">
            Security
          </a>
          <a className="hover:text-text" href="#contact">
            Contact
          </a>
        </div>

        <div className="flex items-center gap-2">
          {!isExplore ? (
            <>
              <Link
                to="/explore"
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl border border-border/30 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
                  "hover:bg-elevated/70 hover:border-border/45 active:scale-[0.99]"
                )}
              >
                Explore
              </Link>
              <PrimaryCTA to="/request-access" className="rounded-xl px-3 py-2 text-sm">
                Request access <ArrowRight className="h-4 w-4" />
              </PrimaryCTA>
            </>
          ) : (
            <Link
              to="/"
              className={cx(
                "inline-flex items-center gap-2 rounded-xl border border-border/30 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
                "hover:bg-elevated/70 hover:border-border/45 active:scale-[0.99]"
              )}
            >
              Back to landing
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const m = useLuxeMotion();

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <LuxeBackdrop />
      <TopNav />

      <main className="relative pt-14">
        {/* HERO */}
        <section id="product" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
            <motion.div
              className="md:col-span-7"
              initial={m.reveal.initial as any}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" } as any}
              transition={{ duration: 0.7, ease: [0.21, 0.61, 0.35, 1] }}
            >
              <div className="mb-4 flex flex-wrap gap-2">
                <Pill>GO / HOLD / NO-GO</Pill>
                <Pill>Structured extraction</Pill>
                <Pill>Deduplication</Pill>
                <Pill>Workspaces</Pill>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Turn tenders and grants into decisions in{" "}
                <span className="text-accent">15 seconds</span>.
              </h1>

              <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
                RadarPulse reduces noise, extracts critical fields, and turns a GO decision into a ready-to-execute
                workspace — with confidence signals and source evidence.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <PrimaryCTA to="/request-access">
                  Request access <ArrowRight className="h-4 w-4" />
                </PrimaryCTA>

                <SecondaryCTA to="/explore">
                  Explore (no signup) <ArrowRight className="h-4 w-4" />
                </SecondaryCTA>

                <div className="text-xs text-muted">
                  Built for fast triage, strict requirements, and low-noise execution.
                </div>
              </div>
            </motion.div>

            <motion.div
              className="md:col-span-5"
              initial={m.reveal.initial as any}
              whileInView={m.reveal.whileInView as any}
              viewport={m.reveal.viewport as any}
              transition={{ ...m.reveal.transition, delay: 0.1 }}
            >
              <HeroDemoFrame />
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <Section id="how" eyebrow="How it works" title="From noise to execution.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card
              title="Ingest"
              desc="Connect sources. RadarPulse classifies, deduplicates, and normalizes every item."
              icon={<Workflow className="h-5 w-5 text-accent" />}
            />
            <Card
              title="Decide"
              desc="Inbox triage: GO / HOLD / NO-GO in seconds, with confidence and “why” evidence."
              icon={<Sparkles className="h-5 w-5 text-accent" />}
            />
            <Card
              title="Execute"
              desc="GO creates a workspace with checklist, milestones, and required documents."
              icon={<ArrowRight className="h-5 w-5 text-accent" />}
            />
          </div>
        </Section>

        {/* BUILT FOR */}
        <Section eyebrow="Built for" title="Teams who can’t waste a week on the wrong opportunity.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card
              title="Consultants & agencies"
              desc="Shortlist what’s winnable. Reduce triage time and compliance misses."
              bullets={["Faster GO / NO-GO decisions", "Reusable workspaces per client", "Evidence-first extraction"]}
            />
            <Card
              title="NGOs & grant teams"
              desc="Eligibility clarity, faster first drafts, and structured checklists."
              bullets={["Eligibility checks you can trust", "Requirements matrix", "Audit trail for approvals"]}
            />
            <Card
              title="SMEs bidding on tenders"
              desc="Stop chasing dead ends. Focus on the few that fit."
              bullets={["Deadline & requirement extraction", "Filter by country/sector", "Execution checklists"]}
            />
          </div>
        </Section>

        {/* SECURITY / TRUST */}
        <Section id="security" eyebrow="Trust" title="Trust is a feature.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              title="Source transparency"
              desc="Every key field links back to its origin and timestamp — no mystery fields."
              icon={<Shield className="h-5 w-5 text-accent" />}
            />
            <Card
              title="Evidence-first"
              desc="Confidence + short “why” excerpts reduce hallucinations and missed requirements."
              icon={<Shield className="h-5 w-5 text-accent" />}
            />
            <Card
              title="Decision log"
              desc="Track who decided what, when, and why — without extra reporting work."
              icon={<Shield className="h-5 w-5 text-accent" />}
            />
            <Card
              title="Access + retention"
              desc="Clear access controls and retention posture, designed for professional workflows."
              icon={<Shield className="h-5 w-5 text-accent" />}
            />
          </div>
        </Section>

        {/* PRICING */}
        <Section id="pricing" eyebrow="Pricing" title="Start simple. Scale when it works.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Solo" desc="For individual consultants." bullets={["Inbox triage + workspaces", "Core extraction fields", "Basic views"]} />
            <Card title="Team" desc="For small bid/grant teams." bullets={["Shared workspaces", "Assignments + owners", "Saved views"]} />
            <Card title="Agency" desc="For multi-client workflows." bullets={["Client separation", "Multi-workspace structure", "Priority support"]} />
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border/30 bg-surface/70 p-5 shadow-soft sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-semibold">Need help getting started?</div>
              <div className="mt-1 text-sm text-muted">Advisory packs available: Screening Express and RadarPulse Setup.</div>
            </div>

            <div className="flex gap-2">
              <SecondaryCTA to="/explore" className="rounded-xl px-4 py-2">
                Explore <ArrowRight className="h-4 w-4" />
              </SecondaryCTA>
              <PrimaryCTA to="/request-access" className="rounded-xl px-4 py-2">
                Request access <ArrowRight className="h-4 w-4" />
              </PrimaryCTA>
            </div>
          </div>
        </Section>

        {/* CONTACT */}
        <Section id="contact" eyebrow="Contact" title="Ready to see it on your sources?">
          <div className="rounded-2xl border border-border/30 bg-surface/70 p-6 shadow-soft">
            <div className="text-sm text-muted">
              RadarPulse is built in Trieste, Italy. Request access to run it on your sources, or explore the live demo
              without signup.
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <PrimaryCTA to="/request-access">
                Request access <ArrowRight className="h-4 w-4" />
              </PrimaryCTA>
              <SecondaryCTA to="/explore">
                Explore (no signup) <ArrowRight className="h-4 w-4" />
              </SecondaryCTA>
            </div>
          </div>
        </Section>

        <footer className="border-t border-border/25 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-elevated shadow-glow" />
              <span>RadarPulse</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <a className="hover:text-text" href="#security">
                Security
              </a>
              <a className="hover:text-text" href="#pricing">
                Pricing
              </a>
              <a className="hover:text-text" href="#contact">
                Contact
              </a>
            </div>
            <div>Made in Trieste, Italy</div>
          </div>
        </footer>
      </main>
    </div>
  );
}
