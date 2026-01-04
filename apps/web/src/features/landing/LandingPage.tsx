import React, { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Shield, Sparkles, Workflow } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cx } from "@/lib/utils";
import { TwilightWebGLBackdrop } from "@/features/landing/cinematic/TwilightWebGLBackdrop";
import { TopNavCinematic } from "@/features/landing/cinematic/TopNavCinematic";
import { DecisionPipelineChart } from "@/features/landing/cinematic/DecisionPipelineChart";
import { ChapterHeroArt } from "@/features/landing/cinematic/ChapterHeroArt";
import { useChapterProgress } from "@/features/landing/cinematic/useChapterProgress";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/30 bg-white/45 px-3 py-1 text-xs font-semibold text-muted shadow-soft">
      {children}
    </span>
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
  return (
    <section id={id} className={cx("mx-auto max-w-6xl px-4 py-16 sm:py-20", className)}>
      <div className="mb-8">
        {eyebrow ? <div className="mb-2 text-xs font-semibold tracking-wide text-muted">{eyebrow}</div> : null}
        <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
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
    <div className="rounded-2xl border border-border/30 bg-white/55 p-6 shadow-soft backdrop-blur">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-elevated shadow-soft">
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
  );
}

function CinematicChapter({
  id,
  title,
  subtitle,
  left,
  right,
  heightClass = "min-h-[180vh]",
}: {
  id: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
  heightClass?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const progress = useChapterProgress(ref, {
    end: "+=220%",
    scrub: true,
    pin: true,
    enabled: !reduce,
  });

  const lift = useMemo(() => {
    const t = progress;
    // 0..1 => subtle rise
    return Math.round((1 - t) * 16);
  }, [progress]);

  return (
    <section id={id} ref={ref} className={cx("relative", heightClass)}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <div className="rounded-2xl border border-border/30 bg-white/55 p-6 shadow-soft backdrop-blur">
              <div className="text-xs font-semibold text-muted">{subtitle}</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">{title}</div>

              <div className="mt-5">{left}</div>
            </div>
          </div>

          <div className="md:col-span-7">
            <motion.div
              className="rounded-2xl border border-border/30 bg-white/50 shadow-soft backdrop-blur"
              style={{
                transform: `translateY(${lift}px)`,
              }}
            >
              {right}
            </motion.div>
          </div>
        </div>
      </div>

      {/* soft divider */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <TwilightWebGLBackdrop />
      <TopNavCinematic />

      <main className="pt-14">
        {/* HERO — giant, photo-like */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <Pill>GO / HOLD / NO-GO</Pill>
                <Pill>Structured extraction</Pill>
                <Pill>Deduplication</Pill>
                <Pill>Workspaces</Pill>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
                Turn tenders and grants into decisions in{" "}
                <span className="text-accent">15 seconds</span>.
              </h1>

              <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
                RadarPulse reduces noise, extracts critical fields, and turns a GO decision into a ready-to-execute
                workspace — with confidence signals and source evidence.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/request-access"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                >
                  Request access <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/explore"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/35 bg-white/50 px-6 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-white/70"
                >
                  Explore (no signup) <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="text-xs text-muted">
                  Built for strict requirements, fast triage, and low-noise execution.
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/30 bg-white/45 p-4 shadow-soft">
                  <div className="text-xs font-semibold text-muted">Noise</div>
                  <div className="mt-1 text-sm font-semibold">↓ 80%</div>
                </div>
                <div className="rounded-2xl border border-border/30 bg-white/45 p-4 shadow-soft">
                  <div className="text-xs font-semibold text-muted">Decision time</div>
                  <div className="mt-1 text-sm font-semibold">15s</div>
                </div>
                <div className="hidden rounded-2xl border border-border/30 bg-white/45 p-4 shadow-soft sm:block">
                  <div className="text-xs font-semibold text-muted">Evidence</div>
                  <div className="mt-1 text-sm font-semibold">Source-linked</div>
                </div>
              </div>
            </div>

            <div className="md:col-span-6">
              <ChapterHeroArt />
            </div>
          </div>
        </section>

        {/* CINEMATIC CHAPTERS */}
        <CinematicChapter
          id="how"
          subtitle={<span className="inline-flex items-center gap-2"><Workflow className="h-4 w-4 text-accent" /> Ingest</span>}
          title={
            <>
              From noise <span className="text-accent">to signal</span>.
            </>
          }
          left={
            <div className="space-y-3 text-sm text-muted">
              <div>
                Connect sources. RadarPulse classifies content, deduplicates it, and normalizes it into a clean inbox.
              </div>
              <div>
                You stop losing time on the wrong items — the system keeps only what’s actionable, with traceable
                evidence.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>content_type</Pill>
                <Pill>buyer_type</Pill>
                <Pill>sector</Pill>
                <Pill>country</Pill>
                <Pill>language</Pill>
              </div>
            </div>
          }
          right={
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FeatureCard
                  title="Classification"
                  desc="Prevent chaos: tenders, grants, news — separated and searchable."
                  icon={<Sparkles className="h-5 w-5 text-accent" />}
                />
                <FeatureCard
                  title="Deduplication"
                  desc="Collapse repeats across sources into one canonical item."
                  icon={<Sparkles className="h-5 w-5 text-accent2" />}
                />
                <div className="sm:col-span-2">
                  <div className="rounded-2xl border border-border/30 bg-white/55 p-6 shadow-soft">
                    <div className="text-sm font-semibold">Extraction preview</div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border/30 bg-white/40 p-4">
                        <div className="text-xs font-semibold text-muted">Deadline</div>
                        <div className="mt-1 text-sm font-semibold">2026-02-15</div>
                      </div>
                      <div className="rounded-2xl border border-border/30 bg-white/40 p-4">
                        <div className="text-xs font-semibold text-muted">Eligibility</div>
                        <div className="mt-1 text-sm font-semibold">Likely match</div>
                      </div>
                      <div className="rounded-2xl border border-border/30 bg-white/40 p-4">
                        <div className="text-xs font-semibold text-muted">Confidence</div>
                        <div className="mt-1 text-sm font-semibold text-accent">High</div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted">
                      Evidence-first: every extracted field can link back to its source excerpt.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <CinematicChapter
          id="proof"
          subtitle={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Decide</span>}
          title={
            <>
              A decision engine you can <span className="text-accent">trust</span>.
            </>
          }
          left={
            <div className="space-y-3 text-sm text-muted">
              <div>
                The goal is not “more information”. The goal is a <span className="text-text font-semibold">GO/HOLD/NO-GO</span>{" "}
                decision in seconds — with clear “why” signals.
              </div>
              <div>
                RadarPulse creates a structured view of requirements, deadlines, and compliance risk — then guides the next
                action.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>Deadline window</Pill>
                <Pill>Requirements matrix</Pill>
                <Pill>Risk flags</Pill>
              </div>
            </div>
          }
          right={
            <div className="p-4 sm:p-6">
              <div className="rounded-2xl border border-border/30 bg-white/55 p-4 shadow-soft">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Pipeline view</div>
                  <span className="rounded-full border border-border/30 bg-white/50 px-3 py-1 text-xs font-semibold text-muted">
                    Large, readable data — not a tiny table
                  </span>
                </div>
                <DecisionPipelineChart />
              </div>
            </div>
          }
        />

        <CinematicChapter
          id="security"
          subtitle={<span className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-accent" /> Execute</span>}
          title={
            <>
              GO creates a workspace in <span className="text-accent">one click</span>.
            </>
          }
          left={
            <div className="space-y-3 text-sm text-muted">
              <div>
                When you press GO, RadarPulse generates a workspace with: checklist, milestones, missing documents and an
                audit trail.
              </div>
              <div>
                This is the difference between “reading opportunities” and actually winning them — without drowning in
                noise.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>Checklist</Pill>
                <Pill>Milestones</Pill>
                <Pill>Owners</Pill>
                <Pill>Evidence</Pill>
              </div>
            </div>
          }
          right={
            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border border-border/30 bg-white/55 p-6 shadow-soft">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">Workspace blueprint</div>
                    <div className="mt-1 text-sm text-muted">Auto-generated from extracted requirements + your decision.</div>
                  </div>
                  <div className="rounded-full border border-border/30 bg-white/50 px-3 py-1 text-xs font-semibold text-muted">
                    Evidence + audit ready
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/30 bg-white/45 p-4">
                    <div className="text-xs font-semibold text-muted">Checklist</div>
                    <ul className="mt-3 space-y-2 text-sm">
                      {[
                        "Eligibility confirmed",
                        "Budget + pricing model",
                        "Legal clauses reviewed",
                        "Submission package compiled",
                      ].map((x) => (
                        <li key={x} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 text-accent" />
                          <span className="text-text/95">{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-border/30 bg-white/45 p-4">
                    <div className="text-xs font-semibold text-muted">Milestones</div>
                    <div className="mt-3 space-y-3">
                      {[
                        { t: "T-7", d: "First draft", s: "Owner assigned" },
                        { t: "T-3", d: "Compliance check", s: "Evidence linked" },
                        { t: "T-1", d: "Final review", s: "Sign-off recorded" },
                      ].map((m) => (
                        <div key={m.t} className="flex items-center justify-between gap-3 rounded-2xl border border-border/30 bg-white/55 p-3">
                          <div>
                            <div className="text-sm font-semibold">{m.d}</div>
                            <div className="text-xs text-muted">{m.s}</div>
                          </div>
                          <span className="rounded-full border border-border/30 bg-white/60 px-3 py-1 text-xs font-semibold text-muted">
                            {m.t}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border/30 bg-white/40 p-4 text-sm text-muted">
                  GO → Workspace is the start. Later, AI assists drafting (grant writing, compliance), but only after the
                  structure is correct.
                </div>
              </div>
            </div>
          }
        />

        {/* CLASSIC SECTIONS (still premium) */}
        <Section eyebrow="Built for" title="Teams who can’t waste a week on the wrong opportunity.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FeatureCard
              title="Consultants & agencies"
              desc="Shortlist what’s winnable. Reduce triage time and compliance misses."
              bullets={["Faster GO / NO-GO decisions", "Reusable workspaces per client", "Evidence-first extraction"]}
            />
            <FeatureCard
              title="NGOs & grant teams"
              desc="Eligibility clarity, faster first drafts, and structured checklists."
              bullets={["Eligibility checks you can trust", "Requirements matrix", "Audit trail for approvals"]}
            />
            <FeatureCard
              title="SMEs bidding on tenders"
              desc="Stop chasing dead ends. Focus on the few that fit."
              bullets={["Deadline & requirement extraction", "Filter by country/sector", "Execution checklists"]}
            />
          </div>
        </Section>

        <Section id="contact" eyebrow="Contact" title="Ready to see it on your sources?">
          <div className="rounded-2xl border border-border/30 bg-white/55 p-7 shadow-soft backdrop-blur">
            <div className="text-sm text-muted">
              RadarPulse is built in Trieste, Italy. Request access to run it on your sources, or explore the live demo
              without signup.
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/request-access"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                Request access <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/35 bg-white/50 px-6 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-white/70"
              >
                Explore (no signup) <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Section>

        <footer className="border-t border-border/30 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-elevated shadow-soft" />
              <span>RadarPulse</span>
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
