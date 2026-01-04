import React, { useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileSearch, Layers, Link2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useChapterProgress } from "@/features/landing/cinematic/useChapterProgress";
import { DecisionStageMock } from "@/features/landing/cinematic/DecisionStageMock";
import { useLandingMotionStore } from "@/features/landing/cinematic/landingMotionStore";

type Step = {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    eyebrow: "INCOMING",
    title: "Ingest every source. Stop reading noise.",
    desc: "RadarPulse classifies tenders, grants, news and alerts into a single low-noise inbox.",
    bullets: ["Structured fields", "Fast triage", "Noise reduction"],
    icon: <FileSearch className="h-4 w-4 text-accent" />,
  },
  {
    eyebrow: "DEDUP",
    title: "Collapse duplicates into one truth.",
    desc: "Multiple portals, gazettes and emails announce the same opportunity. Dedup keeps a canonical record.",
    bullets: ["Canonical item", "Source graph preserved", "No double work"],
    icon: <Layers className="h-4 w-4 text-accent" />,
  },
  {
    eyebrow: "EVIDENCE",
    title: "Extract, cite, and prove.",
    desc: "Every claim is backed by excerpts that link back to the source. Evidence-first, audit-ready.",
    bullets: ["Cited excerpts", "Traceable provenance", "Confidence signals"],
    icon: <Link2 className="h-4 w-4 text-accent" />,
  },
  {
    eyebrow: "DECISION",
    title: "GO/HOLD/NO-GO in seconds.",
    desc: "Make the call with a structured rationale. When it’s GO, create a workspace with owners + checklist.",
    bullets: ["Decision log", "One-click workspace", "Execution ready"],
    icon: <Sparkles className="h-4 w-4 text-accent" />,
  },
];

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function ZipPinnedStage({ id = "how", className }: { id?: string; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();

  // Only re-render on step changes (premium smooth).
  const [stepIndex, setStepIndex] = useState(0);
  const stepRef = useRef(0);

  const setStageProgress = useLandingMotionStore((s) => s.setStageProgress);

  useChapterProgress(ref, {
    start: "top top",
    end: "+=340%",
    scrub: true,
    pin: true,
    enabled: !reduce,
    state: false, // <- key: no per-frame React state
    onUpdate: (p) => {
      const steps = STEPS.length;
      const raw = clamp01(p) * steps;
      const idx = Math.min(steps - 1, Math.floor(raw));
      const t = raw - idx;
      const eased = smoothstep(0.05, 0.95, t);
      const stageProgress = clamp01((idx + eased) / steps);

      setStageProgress(stageProgress, idx);

      if (idx !== stepRef.current) {
        stepRef.current = idx;
        setStepIndex(idx);
      }
    },
  });

  const stageProgressForMock = useMemo(() => {
    // for subtle internal drift only (not required), keep it stable when reduced motion
    return reduce ? 0.7 : (stepIndex + 0.25) / STEPS.length;
  }, [reduce, stepIndex]);

  return (
    <section id={id} ref={ref} className={cn("relative min-h-[380vh]", className)}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-16 sm:py-20">
        <div className="mb-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-white/55 px-3 py-1 text-xs font-semibold text-muted shadow-soft backdrop-blur">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Zip-style scrollytelling · Evidence-first decisioning
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-text sm:text-5xl">
            One stage. Four steps. <span className="text-accent">Zero ambiguity</span>.
          </h2>

          <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
            Tables should not be static. This stage moves with the narrative: panels slide in, focus shifts, and the
            background breathes — without compromising readability.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
          {/* Steps — compact */}
          <div className="md:col-span-4">
            <div className="space-y-3">
              {STEPS.map((s, idx) => {
                const active = idx === stepIndex;
                const near = Math.abs(idx - stepIndex) <= 1;

                return (
                  <motion.div
                    key={s.eyebrow}
                    initial={false}
                    animate={{
                      opacity: active ? 1 : near ? 0.78 : 0.5,
                      y: active ? 0 : 2,
                    }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className={cn(
                      "rounded-2xl border bg-white/55 p-5 shadow-soft backdrop-blur",
                      active ? "border-accent/35 ring-1 ring-accent/15" : "border-border/25"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-xl",
                              active ? "bg-accent/10" : "bg-elevated"
                            )}
                          >
                            {s.icon}
                          </span>
                          <div className="text-xs font-semibold tracking-wide text-muted">{s.eyebrow}</div>
                        </div>
                        <div className="mt-2 text-base font-semibold text-text sm:text-lg">{s.title}</div>
                        <div className="mt-2 text-sm text-muted">{s.desc}</div>
                      </div>
                      {active ? (
                        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          ACTIVE
                        </span>
                      ) : null}
                    </div>

                    <ul className="mt-4 space-y-2">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-text/95">
                          <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent/12">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/request-access"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                Request access <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/30 bg-white/55 px-6 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-white/75"
              >
                Explore (no signup) <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-4 text-xs text-muted">
              Scroll drives the stage. React re-renders only on step changes (no jitter).
            </div>
          </div>

          {/* Stage — BIG, uses width */}
          <div className="md:col-span-8">
            <DecisionStageMock variant="chapter" progress={stageProgressForMock} activeStep={stepIndex} />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
    </section>
  );
}
