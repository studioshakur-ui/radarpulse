import React from "react";
import { ArrowRight, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DecisionStageMock } from "@/features/landing/cinematic/DecisionStageMock";

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-soft backdrop-blur",
        tone === "brand"
          ? "border-brand/30 bg-brand/10 text-brand"
          : "border-line/25 bg-surface/55 text-subtext"
      )}
    >
      {children}
    </span>
  );
}

export function TechPremiumHero({ className }: { className?: string }) {
  return (
    <section className={cn("relative", className)}>
      <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-14 pt-16 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <Pill tone="brand">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              GO / HOLD / NO-GO
            </Pill>
            <Pill>
              <Workflow className="mr-2 h-3.5 w-3.5 text-brand" />
              Evidence-linked extraction
            </Pill>
            <Pill>Deduplication</Pill>
            <Pill>
              <ShieldCheck className="mr-2 h-3.5 w-3.5 text-brand" />
              Audit-ready
            </Pill>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-6xl">
            Turn tenders and grants into a <span className="text-brand">decision</span> in{" "}
            <span className="text-brand">seconds</span>.
          </h1>

          <p className="mt-5 max-w-xl text-base text-subtext sm:text-lg">
            RadarPulse compresses noise, collapses duplicates, extracts the fields that matter, and backs every claim with
            source-linked evidence—so your GO is fast and defensible.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
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

            <div className="text-xs text-subtext">
              Strict requirements · low-noise triage · reproducible decisions
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line/20 bg-surface/60 p-4 shadow-soft backdrop-blur">
              <div className="text-xs font-semibold text-subtext">Noise</div>
              <div className="mt-1 text-sm font-semibold text-text">↓ 80%</div>
            </div>
            <div className="rounded-2xl border border-line/20 bg-surface/60 p-4 shadow-soft backdrop-blur">
              <div className="text-xs font-semibold text-subtext">Decision time</div>
              <div className="mt-1 text-sm font-semibold text-text">15s</div>
            </div>
            <div className="hidden rounded-2xl border border-line/20 bg-surface/60 p-4 shadow-soft backdrop-blur sm:block">
              <div className="text-xs font-semibold text-subtext">Evidence</div>
              <div className="mt-1 text-sm font-semibold text-text">Source-linked</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-6">
          <DecisionStageMock variant="hero" progress={0.78} />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line/35 to-transparent" />
    </section>
  );
}
