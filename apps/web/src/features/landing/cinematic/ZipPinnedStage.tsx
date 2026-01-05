import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileSearch, Layers, Link2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

import { DecisionStageMock } from "@/features/landing/cinematic/DecisionStageMock";
import { ScrollReveal } from "@/features/landing/cinematic/ScrollReveal";

type StepKey = 0 | 1 | 2 | 3;

const STEPS: Array<{
  key: StepKey;
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  icon: React.ReactNode;
  badge: string;
}> = [
  {
    key: 0,
    eyebrow: "INCOMING",
    title: "Ingest every source. Stop reading noise.",
    desc: "RadarPulse classifies tenders, grants, news and alerts into a single low-noise inbox.",
    bullets: ["Structured fields", "Fast triage", "Noise reduction"],
    icon: <FileSearch className="h-4 w-4 text-accent" />,
    badge: "STAGE",
  },
  {
    key: 1,
    eyebrow: "DEDUP",
    title: "Collapse duplicates into one truth.",
    desc: "Multiple portals, gazettes and emails often announce the same opportunity. Dedup keeps a canonical record.",
    bullets: ["Canonical item", "Source graph preserved", "No double work"],
    icon: <Layers className="h-4 w-4 text-accent" />,
    badge: "ACTIVE",
  },
  {
    key: 2,
    eyebrow: "EVIDENCE",
    title: "Extract, cite, and prove.",
    desc: "Every claim is backed by excerpts that link back to the source. Evidence-first, audit-ready.",
    bullets: ["Cited excerpts", "Traceable provenance", "Confidence signals"],
    icon: <Link2 className="h-4 w-4 text-accent" />,
    badge: "STAGE",
  },
  {
    key: 3,
    eyebrow: "DECISION",
    title: "GO/HOLD/NO-GO in seconds.",
    desc: "Structured rationale, risk flags, and a next-action checklist—so the team moves fast and defensibly.",
    bullets: ["15s median decision", "Risk flags", "Reproducible decision log"],
    icon: <ShieldCheck className="h-4 w-4 text-accent" />,
    badge: "STAGE",
  },
];

function StepCard({
  step,
  active,
  onRef,
}: {
  step: (typeof STEPS)[number];
  active: boolean;
  onRef: (el: HTMLDivElement | null) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div ref={onRef} data-step={step.key}>
      <motion.div
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-30% 0px -55% 0px" }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={cn(
          "rounded-[28px] border bg-white/45 shadow-soft backdrop-blur",
          active ? "border-accent/35 ring-1 ring-accent/15" : "border-border/25"
        )}
      >
        <div className="flex items-start justify-between gap-4 p-6 sm:p-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">{step.eyebrow}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold",
                  active
                    ? "border-accent/35 bg-accent/10 text-accent"
                    : "border-border/25 bg-white/55 text-muted"
                )}
              >
                {step.badge}
              </span>
            </div>

            <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{step.title}</h3>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted sm:text-base">{step.desc}</p>

            <ul className="mt-5 space-y-2 text-sm text-muted">
              {step.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden sm:flex">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/25 bg-white/55 shadow-soft">
              {step.icon}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ZipPinnedStage() {
  const reduce = useReducedMotion();
  const [activeStep, setActiveStep] = useState<StepKey>(0);

  const stepEls = useRef<Array<HTMLDivElement | null>>([]);
  const visibleRatios = useRef<Map<StepKey, number>>(new Map());

  const setStepRef = (idx: number) => (el: HTMLDivElement | null) => {
    stepEls.current[idx] = el;
  };

  const observerOptions = useMemo<IntersectionObserverInit>(
    () => ({
      root: null,
      rootMargin: "-25% 0px -55% 0px",
      threshold: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
    }),
    []
  );

  useEffect(() => {
    if (reduce) return;

    const els = stepEls.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length) return;

    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const raw = e.target.getAttribute("data-step");
        if (raw == null) continue;
        const k = Number(raw) as StepKey;
        const ratio = e.isIntersecting ? e.intersectionRatio : 0;
        visibleRatios.current.set(k, ratio);
      }

      let best: StepKey = activeStep;
      let bestRatio = -1;

      for (const [k, r] of visibleRatios.current.entries()) {
        if (r > bestRatio) {
          bestRatio = r;
          best = k;
        }
      }

      if (best !== activeStep && bestRatio >= 0.1) setActiveStep(best);
    }, observerOptions);

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observerOptions, reduce]);

  return (
    <section className="relative py-20">
      {/* IMPORTANT: container plus large */}
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        <ScrollReveal dir="up">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/25 bg-white/55 px-4 py-2 text-xs font-semibold text-muted shadow-soft backdrop-blur">
              Zip-style scrollytelling · Evidence-first decisioning
            </div>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              One stage. Four steps. <span className="text-accent">Zero ambiguity.</span>
            </h2>
            <p className="mt-4 max-w-4xl text-base leading-relaxed text-muted">
              Keep a single product “stage” pinned while the story advances. The result is clarity, pace, and premium perception.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-10 space-y-10">
          {/* STAGE pinned */}
          <div className={cn("relative", !reduce && "lg:sticky lg:top-24")}>
            <ScrollReveal dir="up">
              <div className="rounded-[36px] border border-border/25 bg-white/40 p-4 sm:p-5 shadow-glow backdrop-blur">
                <div className="flex flex-col gap-2 px-2 pb-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold text-muted">RadarPulse Decision Console</div>
                    <div className="mt-1 text-sm font-semibold">Incoming → Dedup → Evidence → GO/HOLD/NO-GO</div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border/25 bg-white/55 px-3 py-1 font-semibold text-muted">
                      Step: {activeStep + 1}/4
                    </span>
                    <span className="rounded-full border border-border/25 bg-white/55 px-3 py-1 font-semibold text-muted">
                      Evidence-linked
                    </span>
                  </div>
                </div>

                {/* Full-width stage */}
                <DecisionStageMock variant="chapter" activeStep={activeStep} className="w-full" />

                <div className="mt-4 flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted">Decisions are auditable: every highlight links back to its source.</div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/explore"
                      className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-white/55 px-4 py-2 text-xs font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
                    >
                      Explore demo <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/request-access"
                      className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-glow hover:opacity-95"
                    >
                      Request access <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* STORY below */}
          <div className="space-y-6">
            {STEPS.map((s, idx) => (
              <StepCard key={s.key} step={s} active={activeStep === s.key} onRef={setStepRef(idx)} />
            ))}
          </div>
        </div>

        <div className="pointer-events-none mt-14 h-px w-full bg-gradient-to-r from-transparent via-border/35 to-transparent" />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <div className="absolute -left-24 top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.25),transparent_60%)] blur-2xl" />
        <div className="absolute -right-24 bottom-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_60%_60%,rgba(124,58,237,0.18),transparent_60%)] blur-2xl" />
      </div>
    </section>
  );
}
