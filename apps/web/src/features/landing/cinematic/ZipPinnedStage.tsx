import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMotionValueEvent, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { DecisionStageMock } from "@/features/landing/cinematic/DecisionStageMock";
import { useChapterProgress } from "@/features/landing/cinematic/useChapterProgress";

type Step = {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
};

const STEPS: Step[] = [
  {
    eyebrow: "INCOMING",
    title: "Ingest every source. Stop reading noise.",
    desc: "RadarPulse classifies tenders, grants, news and alerts into a single low-noise inbox.",
    bullets: ["Structured fields", "Fast triage", "Noise reduction"],
  },
  {
    eyebrow: "DEDUP",
    title: "Collapse duplicates into one truth.",
    desc: "Multiple portals, gazettes and emails announce the same opportunity. Dedup keeps a canonical record.",
    bullets: ["Canonical item", "Source graph preserved", "No double work"],
  },
  {
    eyebrow: "EVIDENCE",
    title: "Extract, cite, and prove.",
    desc: "Every claim is backed by excerpts that link back to the source. Evidence-first, audit-ready.",
    bullets: ["Cited excerpts", "Traceable provenance", "Confidence signals"],
  },
  {
    eyebrow: "DECISION",
    title: "GO/HOLD/NO-GO in seconds.",
    desc: "Structured rationale + confidence signals. When it’s GO, create a workspace with owners + checklist.",
    bullets: ["Decision log", "One-click workspace", "Execution ready"],
  },
];

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export function ZipPinnedStage({ id = "how", className }: { id?: string; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();

  const progressMv = useChapterProgress(ref);

  const [stepIndex, setStepIndex] = useState(0);
  const stepRef = useRef(0);

  // Only update React state when the step changes (no jank).
  useMotionValueEvent(progressMv, "change", (p) => {
    if (reduce) return;
    const steps = STEPS.length;
    const raw = clamp01(p) * steps;
    const idx = Math.min(steps - 1, Math.floor(raw));
    if (idx !== stepRef.current) {
      stepRef.current = idx;
      setStepIndex(idx);
    }
  });

  const stageProgress = useMemo(() => {
    // We intentionally do NOT drive this at 60fps to avoid “scroll bug”.
    // Step-driven progress is enough for premium perception + lamination transitions.
    return (stepIndex + 0.35) / STEPS.length;
  }, [stepIndex]);

  return (
    <section id={id} ref={ref} className={cn("relative", className)}>
      {/* Big scroll area */}
      <div className="relative min-h-[340vh]">
        {/* Sticky stage */}
        <div className="sticky top-0">
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-16 sm:py-20">
            <div className="mb-10 max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-line/25 bg-surface/55 px-3 py-1 text-xs font-semibold text-subtext shadow-soft backdrop-blur">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                Zip-style scrollytelling · Evidence-first decisioning
              </div>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-text sm:text-5xl">
                One stage. Four steps. <span className="text-brand">Zero ambiguity</span>.
              </h2>

              <p className="mt-4 max-w-2xl text-base text-subtext sm:text-lg">
                As you scroll, the story advances: panels shift, focus changes, and the stage stays pinned — clean, readable,
                premium.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
              {/* Steps list */}
              <div className="md:col-span-4">
                <div className="space-y-3">
                  {STEPS.map((s, idx) => {
                    const active = idx === stepIndex;
                    return (
                      <div
                        key={s.eyebrow}
                        className={cn(
                          "rounded-2xl border p-5 shadow-soft backdrop-blur transition",
                          active
                            ? "border-brand/30 bg-surface/70 ring-1 ring-brand/10"
                            : "border-line/25 bg-surface/55"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-subtext">{s.eyebrow}</div>
                            <div className="mt-2 text-base font-semibold text-text">{s.title}</div>
                            <div className="mt-2 text-sm text-subtext">{s.desc}</div>
                          </div>

                          {active ? (
                            <span className="shrink-0 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                              ACTIVE
                            </span>
                          ) : null}
                        </div>

                        <ul className="mt-4 space-y-2 text-sm text-subtext">
                          {s.bullets.map((b) => (
                            <li key={b} className="flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                              </span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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

              {/* Stage (big) */}
              <div className="md:col-span-8">
                <DecisionStageMock variant="chapter" progress={stageProgress} activeStep={stepIndex} />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line/35 to-transparent" />
      </div>
    </section>
  );
}
