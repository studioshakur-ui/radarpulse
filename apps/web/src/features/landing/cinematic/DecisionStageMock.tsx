import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Layers,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StageVariant = "hero" | "chapter";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function Pill({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        active
          ? "border-brand/35 bg-brand/10 text-brand"
          : "border-line/25 bg-surface/55 text-subtext"
      )}
    >
      {children}
    </span>
  );
}

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "good"
      ? "border-emerald-300/50 bg-emerald-50/70 text-emerald-700"
      : tone === "warn"
      ? "border-orange-300/60 bg-orange-50/70 text-orange-700"
      : "border-line/25 bg-surface/60 text-subtext";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", cls)}>
      {children}
    </span>
  );
}

function PanelShell({
  icon,
  title,
  subtitle,
  right,
  children,
  active,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-surface/65 shadow-soft backdrop-blur",
        active ? "border-brand/35 ring-1 ring-brand/15" : "border-line/25",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line/15 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl", active ? "bg-brand/10" : "bg-elevated")}>
            {icon}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text">{title}</div>
            {subtitle ? <div className="text-xs text-subtext">{subtitle}</div> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="p-5">{children}</div>

      {/* ultra subtle premium glaze */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <div className="absolute -inset-[35%] rotate-12 bg-[radial-gradient(circle_at_30%_40%,rgba(124,58,237,0.25),transparent_55%)]" />
      </div>
    </div>
  );
}

function Row({
  left,
  right,
  tone = "neutral",
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  const border =
    tone === "good"
      ? "border-emerald-200/60"
      : tone === "warn"
      ? "border-orange-200/60"
      : "border-line/15";

  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-2xl border bg-surface/55 px-4 py-3", border)}>
      <div className="min-w-0 truncate text-sm font-semibold text-subtext">{left}</div>
      <div className="shrink-0 text-sm font-semibold text-text">{right}</div>
    </div>
  );
}

function KV({
  k,
  v,
}: {
  k: string;
  v: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line/15 bg-surface/55 px-4 py-3">
      <div className="text-xs font-semibold text-subtext">{k}</div>
      <div className="text-xs font-semibold text-text">{v}</div>
    </div>
  );
}

function StepRailItem({
  title,
  subtitle,
  active,
  icon,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface/55 p-4 shadow-soft backdrop-blur",
        active ? "border-brand/35 ring-1 ring-brand/10" : "border-line/20"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-2xl", active ? "bg-brand/10" : "bg-elevated")}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text">{title}</div>
          <div className="mt-1 text-xs text-subtext">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main idea:
 * - One large “table/view” per step (full width), animated left/right.
 * - Right rail shows other steps (context) but stays secondary.
 * - Looks + feels premium like ZipHQ (no static mini columns).
 */
export function DecisionStageMock({
  variant = "chapter",
  progress = 0,
  activeStep,
  className,
}: {
  variant?: StageVariant;
  progress?: number;
  activeStep?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  const step = useMemo(() => {
    if (typeof activeStep === "number") return Math.max(0, Math.min(3, activeStep));
    const raw = clamp01(progress) * 4;
    return Math.min(3, Math.floor(raw));
  }, [activeStep, progress]);

  const localT = useMemo(() => {
    const raw = clamp01(progress) * 4;
    return raw - Math.floor(raw);
  }, [progress]);

  // scan on step change
  const [scanKey, setScanKey] = useState(0);
  useEffect(() => {
    if (reduce) return;
    setScanKey((x) => x + 1);
  }, [step, reduce]);

  const dir = step % 2 === 0 ? "left" : "right"; // alternate entry directions

  const header = (
    <div className="mb-4">
      <div className="text-xs font-semibold text-subtext">Evidence-linked decisioning</div>
      <div className="mt-1 text-sm font-semibold text-text">
        Incoming → Normalized → Evidence → GO/HOLD/NO-GO
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={step === 0}>INCOMING</Pill>
        <Pill active={step === 1}>DEDUP</Pill>
        <Pill active={step === 2}>EVIDENCE</Pill>
        <Pill active={step === 3}>DECISION</Pill>
      </div>
    </div>
  );

  const mainPanel = (() => {
    if (step === 0) {
      return (
        <PanelShell
          active
          icon={<FileSearch className="h-4 w-4 text-brand" />}
          title="Inbox (low-noise)"
          subtitle="Ingest + classify across sources"
          right={<Badge tone="good">ACTIVE</Badge>}
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7">
              <div className="mb-3 flex flex-wrap gap-2">
                <Pill active>All</Pill>
                <Pill>Tenders</Pill>
                <Pill>Grants</Pill>
                <Pill>Updates</Pill>
                <Pill>Duplicates</Pill>
              </div>

              <div className="space-y-3">
                <Row left="EU Renewable infra — Call (Energy)" right={<Badge tone="good">NEW</Badge>} />
                <Row left="EU Mobility fund — Notice (Transport)" right={<Badge tone="warn">POSSIBLE DUP</Badge>} tone="warn" />
                <Row left="Regional grant — Update (Innovation)" right={<Badge>UPDATE</Badge>} />
                <Row left="Partner alert — Digest (Email)" right={<Badge>3m</Badge>} />
                <Row left="Gazette listing — Procurement" right={<Badge>6m</Badge>} />
              </div>

              <div className="mt-4 rounded-2xl border border-line/15 bg-surface/55 p-4">
                <div className="text-xs font-semibold text-subtext">Noise → signal</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <KV k="Noise" v="↓ 80%" />
                  <KV k="Decision time" v="15s" />
                  <KV k="Evidence" v="Source-linked" />
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5">
              <div className="rounded-2xl border border-line/15 bg-surface/55 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-subtext">Auto-structured fields</div>
                  <Badge>Extracted</Badge>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <KV k="Buyer" v="EU Infrastructure Agency" />
                  <KV k="Budget" v="€12,000,000" />
                  <KV k="Deadline" v="2026-02-18 · 17:00 CET" />
                  <KV k="Region" v="EU / EEA" />
                  <KV k="Eligibility" v="SME / Consortium" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>12 items ingested</Badge>
                <Badge>3 sources merged</Badge>
                <Badge>3 cited</Badge>
              </div>
            </div>
          </div>
        </PanelShell>
      );
    }

    if (step === 1) {
      return (
        <PanelShell
          active
          icon={<Layers className="h-4 w-4 text-brand" />}
          title="Dedup → canonical record"
          subtitle="Collapse repeats into one truth"
          right={<Badge tone="good">ACTIVE</Badge>}
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7">
              <div className="rounded-2xl border border-line/15 bg-surface/55 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-text">Canonical opportunity</div>
                  <Badge tone="good">Merged: 3 sources</Badge>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <KV k="Buyer" v="EU Infrastructure Agency" />
                  <KV k="Budget" v="€12,000,000" />
                  <KV k="Deadline" v="2026-02-18 · 17:00 CET" />
                  <KV k="Region" v="EU / EEA" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>Duplicates collapsed</Badge>
                  <Badge>Provenance preserved</Badge>
                  <Badge>Evidence linked</Badge>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Row left="EU portal notice (HTML)" right={<Badge>Source A</Badge>} />
                <Row left="Gazette publication (PDF)" right={<Badge>Source B</Badge>} />
                <Row left="Partner email alert (Email)" right={<Badge>Source C</Badge>} />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5">
              <div className="rounded-2xl border border-line/15 bg-surface/55 p-4">
                <div className="text-xs font-semibold text-subtext">Why this is premium</div>
                <div className="mt-2 space-y-2 text-sm text-subtext">
                  <div>• One record to review, not four.</div>
                  <div>• No double work across teams.</div>
                  <div>• Audit trail intact: sources stay linked.</div>
                </div>
                <div className="mt-4 rounded-2xl border border-line/15 bg-surface/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-subtext">Dedup score</div>
                    <Badge tone="good">0.91</Badge>
                  </div>
                  <div className="mt-2 text-xs text-subtext">
                    High overlap across title, buyer, budget, dates, and annex references.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PanelShell>
      );
    }

    if (step === 2) {
      return (
        <PanelShell
          active
          icon={<Link2 className="h-4 w-4 text-brand" />}
          title="Evidence drawer"
          subtitle="Citations + excerpts + provenance"
          right={<Badge tone="good">ACTIVE</Badge>}
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7">
              <div className="rounded-2xl border border-line/15 bg-surface/55 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-text">Cited excerpts</div>
                  <Badge>View source</Badge>
                </div>

                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-line/15 bg-surface/60 p-4">
                    <div className="text-xs font-semibold text-subtext">Excerpt #1</div>
                    <div className="mt-2 text-sm text-subtext">
                      Eligible applicants include SMEs and consortia established within the EU/EEA.
                    </div>
                    <div className="mt-3 text-xs text-subtext">EU Portal PDF · p.4 · §2.1</div>
                  </div>

                  <div className="rounded-2xl border border-line/15 bg-surface/60 p-4">
                    <div className="text-xs font-semibold text-subtext">Excerpt #2</div>
                    <div className="mt-2 text-sm text-subtext">
                      Proposals must include evidence of at least one comparable infrastructure project delivered in the last 36 months.
                    </div>
                    <div className="mt-3 text-xs text-subtext">EU Portal PDF · p.7</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5">
              <div className="rounded-2xl border border-line/15 bg-surface/55 p-4">
                <div className="text-sm font-semibold text-text">Audit-ready rationale</div>
                <div className="mt-2 space-y-2 text-sm text-subtext">
                  <div>• Every claim references a source + page.</div>
                  <div>• Evidence remains attached to the canonical record.</div>
                  <div>• Decisions become defensible, not vibes.</div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <KV k="Citations per claim" v="Enabled" />
                  <KV k="Reproducible log" v="Enabled" />
                  <KV k="Provenance chain" v="Preserved" />
                </div>

                <div className="mt-4 text-xs text-subtext">
                  Decisions are auditable: every highlight links back to its source.
                </div>
              </div>
            </div>
          </div>
        </PanelShell>
      );
    }

    // step === 3
    return (
      <PanelShell
        active
        icon={<ShieldCheck className="h-4 w-4 text-brand" />}
        title="GO/HOLD/NO-GO engine"
        subtitle="Structured rationale + confidence signals"
        right={<Badge tone="good">ACTIVE</Badge>}
      >
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7">
            <div className="rounded-2xl border border-line/15 bg-surface/55 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warn">HOLD</Badge>
                <Badge>Confidence 0.86</Badge>
                <Badge>3 sources</Badge>
                <Badge>3 cited excerpts</Badge>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold text-text">Why HOLD</div>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-subtext">
                  <li>Eligibility matches (EU/EEA + SME/Consortium)</li>
                  <li>Budget fits target range (€8M–€15M)</li>
                  <li>Risk: comparable project evidence not yet verified</li>
                </ul>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Row left="Next action" right={<Badge>Request missing proof</Badge>} />
                <Row left="Open" right={<Badge>Decision log</Badge>} />
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-2xl border border-line/15 bg-surface/55 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-text">Execution</div>
                <Badge tone="good">Ready</Badge>
              </div>

              <div className="mt-3 space-y-3">
                <Row left="Checklist + owners" right={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} tone="good" />
                <Row left="Milestones" right={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} tone="good" />
                <Row left="Evidence attached" right={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} tone="good" />
              </div>

              <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90">
                Convert to GO <ArrowRight className="h-4 w-4" />
              </div>

              <div className="mt-3 text-xs text-subtext">
                No black-box decisions: rationale is structured and source-linked.
              </div>
            </div>
          </div>
        </div>
      </PanelShell>
    );
  })();

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[28px] border border-line/25 bg-surface/55 shadow-soft backdrop-blur",
        variant === "hero" ? "min-h-[640px]" : "min-h-[580px]",
        className
      )}
    >
      <div className="p-5 sm:p-7">{header}</div>

      <div className="grid grid-cols-12 gap-4 px-5 pb-6 sm:px-7 sm:pb-7">
        {/* MAIN VIEW (big, full width feel) */}
        <div className="col-span-12 lg:col-span-9">
          {reduce ? (
            mainPanel
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`main-${step}`}
                initial={{ opacity: 0, x: dir === "left" ? -56 : 56, filter: "blur(10px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: dir === "left" ? 28 : -28, filter: "blur(10px)" }}
                transition={{ type: "spring", stiffness: 170, damping: 22, mass: 0.75 }}
              >
                {mainPanel}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* RIGHT RAIL (context, not the hero) */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <StepRailItem
            active={step === 0}
            icon={<FileSearch className="h-4 w-4 text-brand" />}
            title="Incoming"
            subtitle="Ingest + classify into a low-noise inbox"
          />
          <StepRailItem
            active={step === 1}
            icon={<Layers className="h-4 w-4 text-brand" />}
            title="Dedup"
            subtitle="Collapse duplicates into one truth"
          />
          <StepRailItem
            active={step === 2}
            icon={<Link2 className="h-4 w-4 text-brand" />}
            title="Evidence"
            subtitle="Cited excerpts linked to sources"
          />
          <StepRailItem
            active={step === 3}
            icon={<ShieldCheck className="h-4 w-4 text-brand" />}
            title="Decision"
            subtitle="GO/HOLD/NO-GO with rationale + confidence"
          />

          <div className="rounded-2xl border border-line/20 bg-surface/55 p-4 shadow-soft backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold text-subtext">
              <Sparkles className="h-4 w-4 text-brand" />
              Premium motion
            </div>
            <div className="mt-2 text-xs text-subtext">
              One large view per step — sliding, readable, and audit-grade.
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <KV k="Smoothness" v="High" />
              <KV k="Readability" v="Max" />
            </div>
          </div>
        </div>
      </div>

      {/* Lamination scan overlay */}
      {reduce ? null : (
        <AnimatePresence>
          <motion.div
            key={`scan-${scanKey}`}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              className="absolute top-0 h-full w-[26%] bg-gradient-to-r from-transparent via-white/35 to-transparent blur-[1px]"
              initial={{ left: "-30%" }}
              animate={{ left: "110%" }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              style={{ mixBlendMode: "overlay" }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_30%,rgba(124,58,237,0.10),transparent_55%)]" />
          </motion.div>
        </AnimatePresence>
      )}

      {/* tiny drift tied to scroll (micro-motion, zero gimmick) */}
      {reduce ? null : (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            transform: `translateY(${Math.round((1 - smoothstep(0.0, 1.0, localT)) * 6)}px)`,
          }}
        />
      )}
    </div>
  );
}
