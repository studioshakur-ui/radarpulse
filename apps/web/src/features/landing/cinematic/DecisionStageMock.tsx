import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileSearch, Layers, Link2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type StageVariant = "hero" | "chapter";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function PanelShell({
  title,
  badge,
  icon,
  children,
  tone = "neutral",
  className,
}: {
  title: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "active";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white/55 shadow-soft backdrop-blur",
        tone === "active" ? "border-accent/35 ring-1 ring-accent/15" : "border-border/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/25 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-elevated shadow-soft">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="text-xs text-muted">Evidence-linked decisioning</div>
          </div>
        </div>
        {badge ? (
          <div className="shrink-0 rounded-full border border-border/30 bg-white/60 px-3 py-1 text-xs font-semibold text-muted">
            {badge}
          </div>
        ) : null}
      </div>

      <div className="p-4">{children}</div>

      {/* micro laminated tint */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.10]">
        <div className="absolute -inset-[40%] rotate-12 bg-[radial-gradient(circle_at_30%_40%,rgba(124,58,237,0.22),transparent_58%)]" />
      </div>
    </div>
  );
}

function Pill({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        active ? "border-accent/35 bg-accent/10 text-accent" : "border-border/30 bg-white/55 text-muted"
      )}
    >
      {children}
    </span>
  );
}

function SmallBadge({
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
      : "border-border/30 bg-white/55 text-muted";

  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", cls)}>{children}</span>;
}

function kv(label: string, value: string) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/25 bg-white/55 px-3 py-2">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}

function TableRow({
  left,
  right,
  tone = "neutral",
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  const border =
    tone === "good" ? "border-emerald-200/60" : tone === "warn" ? "border-orange-200/60" : "border-border/25";

  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl border bg-white/55 px-3 py-2", border)}>
      <div className="min-w-0 truncate text-xs font-semibold text-muted">{left}</div>
      <div className="shrink-0 text-xs font-semibold">{right}</div>
    </div>
  );
}

function AnimatedSwap({ k, dir, children }: { k: string; dir: "left" | "right"; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={k}
        initial={{ opacity: 0, x: dir === "left" ? -32 : 32, filter: "blur(8px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, x: dir === "left" ? 18 : -18, filter: "blur(10px)" }}
        transition={{ type: "spring", stiffness: 160, damping: 20, mass: 0.7 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

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

  const [scanKey, setScanKey] = useState(0);
  useEffect(() => {
    if (reduce) return;
    setScanKey((x) => x + 1);
  }, [step, reduce]);

  const header = (
    <div className="mb-3">
      <div className="text-xs font-semibold text-muted">Evidence-linked decisioning</div>
      <div className="mt-1 text-sm font-semibold">Incoming → Normalized → Evidence → GO/HOLD/NO-GO</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={step === 0}>INCOMING</Pill>
        <Pill active={step === 1}>DEDUP</Pill>
        <Pill active={step === 2}>EVIDENCE</Pill>
        <Pill active={step === 3}>DECISION</Pill>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-3xl border border-border/30 bg-white/45 shadow-soft backdrop-blur",
        variant === "hero" ? "min-h-[640px]" : "min-h-[560px]",
        className
      )}
    >
      <div className="p-5 sm:p-7">{header}</div>

      <div className="grid grid-cols-12 gap-4 px-5 pb-6 sm:px-7 sm:pb-7">
        <div className="col-span-12 md:col-span-3">
          <PanelShell
            title="Inbox"
            icon={<FileSearch className="h-4 w-4 text-accent" />}
            badge={<SmallBadge tone="neutral">STAGE</SmallBadge>}
            tone={step === 0 ? "active" : "neutral"}
          >
            <AnimatedSwap k={`inbox-${step}`} dir="left">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Pill active>All</Pill>
                  <Pill>Tenders</Pill>
                  <Pill>Grants</Pill>
                  <Pill>Updates</Pill>
                </div>

                <div className="mt-3 space-y-2">
                  <TableRow left="EU Renewable infra — Call" right={<SmallBadge tone="good">NEW</SmallBadge>} />
                  <TableRow left="EU Mobility fund — Notice" right={<SmallBadge tone="warn">POSSIBLE DUP</SmallBadge>} tone="warn" />
                  <TableRow left="Regional grant — Update" right={<SmallBadge>UPDATE</SmallBadge>} />
                  <TableRow left="Energy tender — Digest" right={<SmallBadge>3m</SmallBadge>} />
                </div>

                <div className="mt-3 text-xs text-muted">
                  <span className="font-semibold">12</span> items ingested · <span className="font-semibold">3</span> sources merged ·{" "}
                  <span className="font-semibold">3</span> cited
                </div>
              </div>
            </AnimatedSwap>
          </PanelShell>
        </div>

        <div className="col-span-12 md:col-span-4">
          <PanelShell
            title="Normalized record"
            icon={<Layers className="h-4 w-4 text-accent" />}
            badge={step === 1 ? <SmallBadge tone="good">ACTIVE</SmallBadge> : <SmallBadge tone="neutral">STAGE</SmallBadge>}
            tone={step === 1 ? "active" : "neutral"}
          >
            <AnimatedSwap k={`canon-${step}`} dir={step >= 1 ? "right" : "left"}>
              <div className="space-y-3">
                <div className="text-sm text-muted">
                  Duplicates collapsed into one truth. Canonical fields are now stable and searchable.
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {kv("Buyer", "EU Infrastructure Agency")}
                  {kv("Budget", "€12,000,000")}
                  {kv("Deadline", "2026-02-18 · 17:00 CET")}
                  {kv("Region", "EU / EEA")}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <SmallBadge tone="good">Merged: 3 sources</SmallBadge>
                  <SmallBadge>Duplicates collapsed</SmallBadge>
                  <SmallBadge>Evidence linked</SmallBadge>
                </div>
              </div>
            </AnimatedSwap>
          </PanelShell>
        </div>

        <div className="col-span-12 md:col-span-3">
          <PanelShell
            title="Evidence drawer"
            icon={<Link2 className="h-4 w-4 text-accent" />}
            badge={step === 2 ? <SmallBadge tone="good">ACTIVE</SmallBadge> : <SmallBadge tone="neutral">STAGE</SmallBadge>}
            tone={step === 2 ? "active" : "neutral"}
          >
            <AnimatedSwap k={`evidence-${step}`} dir="right">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-muted">Cited excerpts + rationale</div>
                  <SmallBadge>View source</SmallBadge>
                </div>

                <div className="space-y-2">
                  <div className="rounded-2xl border border-border/25 bg-white/60 p-3 text-xs text-muted">
                    <div className="mb-2 text-[11px] font-semibold text-muted">Excerpt #1</div>
                    Eligible applicants include SMEs and consortia established within the EU/EEA.
                    <div className="mt-2 text-[11px] text-muted">EU Portal PDF · p.4 · §2.1</div>
                  </div>

                  <div className="rounded-2xl border border-border/25 bg-white/60 p-3 text-xs text-muted">
                    <div className="mb-2 text-[11px] font-semibold text-muted">Excerpt #2</div>
                    Proposals must include evidence of at least one comparable infrastructure project delivered in the last 36 months.
                    <div className="mt-2 text-[11px] text-muted">EU Portal PDF · p.7</div>
                  </div>
                </div>

                <div className="text-xs text-muted">Decisions are auditable: every highlight links back to its source.</div>
              </div>
            </AnimatedSwap>
          </PanelShell>
        </div>

        <div className="col-span-12 md:col-span-2">
          <PanelShell
            title="Decision"
            icon={<ShieldCheck className="h-4 w-4 text-accent" />}
            badge={step === 3 ? <SmallBadge tone="good">ACTIVE</SmallBadge> : <SmallBadge tone="neutral">STAGE</SmallBadge>}
            tone={step === 3 ? "active" : "neutral"}
          >
            <AnimatedSwap k={`decision-${step}`} dir="right">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <SmallBadge tone={step === 3 ? "good" : "neutral"}>HOLD</SmallBadge>
                  <SmallBadge>Confidence 0.86</SmallBadge>
                </div>

                <div className="space-y-2 text-xs text-muted">
                  <div className="font-semibold text-text">Why HOLD</div>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Eligibility matches (EU/EEA + SME/Consortium)</li>
                    <li>Budget fits target range (€8M–€15M)</li>
                    <li>Risk: comparable project evidence not yet verified</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <SmallBadge>Request missing proof</SmallBadge>
                  <SmallBadge>Open decision log</SmallBadge>
                </div>

                <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-glow">
                  Convert to GO <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </AnimatedSwap>
          </PanelShell>
        </div>
      </div>

      {/* Lamination scan overlay (subtle) */}
      {reduce ? null : (
        <AnimatePresence>
          <motion.div
            key={`scan-${scanKey}`}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="absolute top-0 h-full w-[26%] bg-gradient-to-r from-transparent via-white/35 to-transparent blur-[1px]"
              initial={{ left: "-30%" }}
              animate={{ left: "110%" }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              style={{ mixBlendMode: "overlay" }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(124,58,237,0.10),transparent_55%)]" />
          </motion.div>
        </AnimatePresence>
      )}

      {/* micro drift (very light) */}
      {reduce ? null : (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            transform: `translateY(${Math.round((1 - smoothstep(0.0, 1.0, localT)) * 6)}px)`,
          }}
        />
      )}
    </div>
  );
}
