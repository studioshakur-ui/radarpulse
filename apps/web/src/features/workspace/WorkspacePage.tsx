import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, CalendarDays, Globe, Tag, Clock, History, ChevronDown, ChevronUp, Zap, Activity } from "lucide-react";
import { cn, daysLeft, fmtRelative, fmtDateTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import type { Decision, WorkflowStatus } from "@/lib/types";
import { useDecisions } from "@/features/inbox/useDecisions";
import { useOpportunityBrief, type OpportunityBrief } from "@/features/inbox/useOpportunityBrief";
import { useWorkspaceData } from "./useWorkspaceData";
import { useOpportunityWorkflow } from "./useOpportunityWorkflow";
import { useOpportunityScore, type OpportunityScore } from "./useOpportunityScore";
import { useOpportunityDocuments } from "./useOpportunityDocuments";
import { useOpportunityExtraction } from "./useOpportunityExtraction";
import { useBriefVersions } from "./useBriefVersions";
import { useOpportunityTimeline } from "./useOpportunityTimeline";
import { useOpportunityPrep } from "./useOpportunityPrep";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
};

const WORKFLOW_OPTIONS: WorkflowStatus[] = [
  "NEW",
  "REVIEWED",
  "GO",
  "PREPARATION",
  "READY",
  "SUBMITTED",
  "EXPIRED",
];

function formatDecisionLabel(decision: Decision | null, t: (k: string) => string) {
  if (!decision) return t("workspace.status.undecided");
  if (decision === "NO_GO") return t("workspace.decision.noGo");
  return t(`workspace.decision.${decision.toLowerCase()}`);
}

function formatRecommendationLabel(
  recommendation: OpportunityScore["recommendation"],
  t: (k: string) => string,
) {
  if (!recommendation) return null;
  if (recommendation === "NO_GO") return t("workspace.recommendation.noGo");
  return t(`workspace.recommendation.${recommendation.toLowerCase()}`);
}

function formatWorkflowLabel(status: WorkflowStatus, t: (k: string) => string) {
  return t(`workspace.workflow.status.${status.toLowerCase()}`);
}

// --- Micro-components ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtext/85">
      {children}
    </div>
  );
}

function DeadlineBadge({
  deadline,
  daySuffix,
  t,
}: {
  deadline: string | null;
  daySuffix: string;
  t: (k: string) => string;
}) {
  const dl = daysLeft(deadline);
  if (dl === null) return null;
  if (dl < 0)
    return (
      <span className="rounded-full border border-bad/30 bg-bad/15 px-2 py-0.5 text-[10px] font-semibold text-bad">
        {t("inbox.deadline.expired")}
      </span>
    );
  if (dl <= 7)
    return (
      <span className="rounded-full border border-bad/30 bg-bad/15 px-2 py-0.5 text-[10px] font-semibold text-bad">
        ⚠ {dl}
        {daySuffix}
      </span>
    );
  if (dl <= 30)
    return (
      <span className="rounded-full border border-warn/30 bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
        {dl}
        {daySuffix}
      </span>
    );
  return (
    <span className="rounded-full border border-line/30 bg-bg px-2 py-0.5 text-[10px] font-semibold text-subtext">
      {dl}
      {daySuffix}
    </span>
  );
}

function RecommendationBadge({
  recommendation,
  t,
}: {
  recommendation: OpportunityScore["recommendation"];
  t: (k: string) => string;
}) {
  if (!recommendation) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        recommendation === "GO" && "border border-good/40 bg-good/12 text-good",
        recommendation === "HOLD" && "border border-warn/40 bg-warn/12 text-warn",
        recommendation === "NO_GO" && "border border-bad/40 bg-bad/12 text-bad",
      )}
    >
      {formatRecommendationLabel(recommendation, t)}
    </span>
  );
}

function WorkflowBadge({
  workflowStatus,
  t,
}: {
  workflowStatus: WorkflowStatus | null;
  t: (k: string) => string;
}) {
  if (!workflowStatus) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        workflowStatus === "NEW" && "border border-line/25 bg-bg text-subtext",
        workflowStatus === "REVIEWED" && "border border-brand/30 bg-brand/8 text-brand",
        workflowStatus === "GO" && "border border-good/40 bg-good/12 text-good",
        workflowStatus === "PREPARATION" && "border border-warn/40 bg-warn/12 text-warn",
        workflowStatus === "READY" && "border border-brand/40 bg-brand/12 text-brand",
        workflowStatus === "SUBMITTED" && "border border-good/30 bg-good/10 text-good",
        workflowStatus === "EXPIRED" && "border border-bad/40 bg-bad/12 text-bad",
      )}
    >
      {formatWorkflowLabel(workflowStatus, t)}
    </span>
  );
}

function StatusPill({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-line/15 bg-bg/70 px-2.5 py-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">
        {label}
      </span>
      {children}
    </div>
  );
}

function DecisionButtons({
  id,
  current,
  onDecide,
}: {
  id: string;
  current: Decision | null;
  onDecide: (id: string, d: Decision) => void;
}) {
  return (
    <div className="flex gap-2">
      {(["GO", "HOLD", "NO_GO"] as Decision[]).map((d) => {
        const active = current === d;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onDecide(id, d)}
            className={cn(
              "flex-1 rounded-xl border py-2 text-sm font-semibold transition",
              active && d === "GO" && "border-good/60 bg-good/20 text-good",
              active && d === "HOLD" && "border-warn/60 bg-warn/20 text-warn",
              active && d === "NO_GO" && "border-bad/60 bg-bad/20 text-bad",
              !active && "border-line/25 bg-bg text-subtext hover:bg-elevated",
            )}
          >
            {d === "NO_GO" ? "NO" : d}
          </button>
        );
      })}
    </div>
  );
}

function BriefContent({ brief, t }: { brief: OpportunityBrief; t: (k: string) => string }) {
  return (
    <div className="space-y-4 text-sm">
      {brief.executive_summary ? (
        <div>
          <SectionLabel>{t("inbox.card.brief.executiveSummary")}</SectionLabel>
          <p className="leading-relaxed text-text">{brief.executive_summary}</p>
        </div>
      ) : null}

      {brief.fit_assessment ? (
        <div>
          <SectionLabel>{t("inbox.card.brief.fitAssessment")}</SectionLabel>
          <p className="leading-relaxed text-subtext">{brief.fit_assessment}</p>
        </div>
      ) : null}

      {brief.risk_flags.length > 0 ? (
        <div>
          <SectionLabel>{t("inbox.card.brief.riskFlags")}</SectionLabel>
          <ul className="space-y-1.5">
            {brief.risk_flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-warn">
                <span className="mt-0.5 shrink-0">{"•"}</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief.required_documents.length > 0 ? (
        <div>
          <SectionLabel>{t("inbox.card.brief.requiredDocuments")}</SectionLabel>
          <ul className="space-y-1.5 text-subtext">
            {brief.required_documents.map((doc, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">{"•"}</span>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief.next_action ? (
        <div className="rounded-xl border border-brand/30 bg-brand/8 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            {t("inbox.card.brief.nextAction")}:{" "}
          </span>
          <span className="text-subtext">{brief.next_action}</span>
        </div>
      ) : null}
    </div>
  );
}

function getRationaleEntries(
  json: Record<string, unknown>,
): { label: string; text: string }[] {
  if (Array.isArray(json.dimensions)) {
    return json.dimensions
      .slice(0, 4)
      .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
      .map((d) => ({
        label: String(d.label ?? d.key ?? d.name ?? ""),
        text: d.comment
          ? String(d.comment)
          : d.score !== undefined
            ? `${Math.round(Number(d.score) * 100)}%`
            : "",
      }))
      .filter((e) => e.label && e.text);
  }
  return Object.entries(json)
    .filter(([, v]) => typeof v === "string")
    .slice(0, 3)
    .map(([k, v]) => ({ label: k, text: String(v) }));
}

function RationaleBreakdown({
  json,
  label,
}: {
  json: Record<string, unknown>;
  label: string;
}) {
  const entries = getRationaleEntries(json);
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5 border-t border-line/15 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">{label}</p>
      {entries.map((e) => (
        <div key={e.label} className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold capitalize text-subtext/75">{e.label}</span>
          <span className="text-[12px] leading-relaxed text-subtext">{e.text}</span>
        </div>
      ))}
    </div>
  );
}

// --- Main page ---

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const fmtLocale = LOCALE_MAP[locale] ?? "en-US";
  const daySuffix = t("inbox.deadline.daysSuffix");

  const { opportunity, loading, error } = useWorkspaceData(id ?? "");
  const {
    workflow,
    loading: workflowLoading,
    saving: workflowSaving,
    error: workflowError,
    saveWorkflow,
  } = useOpportunityWorkflow(id ?? null);
  const { score, loading: scoreLoading, generating: scoreGenerating, error: scoreError, generate: generateScore } = useOpportunityScore(id ?? null, opportunity?.deadline_at ?? null);
  const { documents } = useOpportunityDocuments(id ?? null);
  const { extraction } = useOpportunityExtraction(id ?? null);
  const { versions: briefVersions } = useBriefVersions(id ?? null);
  const { events: timelineEvents } = useOpportunityTimeline(
    id ?? null,
    opportunity?.created_at ?? null,
  );
  const { prep, loading: prepLoading, generating: prepGenerating, error: prepError, generate: generatePrep } = useOpportunityPrep(id ?? null);
  const [briefHistoryOpen, setBriefHistoryOpen] = useState(false);
  const { decide, getDecision } = useDecisions();
  const {
    generate,
    loadFromDB: loadBriefFromDB,
    getBrief,
    isLoading: isBriefLoading,
    getError: getBriefError,
  } = useOpportunityBrief();

  const decision = opportunity ? getDecision(opportunity.id) : null;
  const workflowStatus = workflow?.workflow_status ?? null;
  const displayWorkflowStatus = workflowStatus ?? "NEW";
  const brief = opportunity ? getBrief(opportunity.id) : null;
  const briefLoading = opportunity ? isBriefLoading(opportunity.id) : false;
  const briefError = opportunity ? getBriefError(opportunity.id) : null;

  // DB-first brief load on mount: read from opportunity_briefs before calling edge function
  useEffect(() => {
    if (!opportunity || brief || briefLoading) return;
    void loadBriefFromDB(opportunity.id);
  }, [brief, briefLoading, loadBriefFromDB, locale, opportunity]);

  function handleGenerateBrief() {
    if (!opportunity) return;
    const input = {
      id: opportunity.id,
      title: opportunity.title,
      locale,
      buyer_name: opportunity.buyer_name,
      status: opportunity.status,
      deadline_at: opportunity.deadline_at,
      country_code: opportunity.country_code,
    };
    // If brief already exists, force-regenerate (bypass local cache)
    void generate(input, brief ? { force: true } : undefined);
  }

  if (!id) {
    return (
      <div className="py-12 text-center text-sm text-subtext">{t("workspace.notFound")}</div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <div className="h-5 w-24 animate-pulse rounded-lg bg-elevated" />
        <div className="h-24 animate-pulse rounded-2xl bg-surface" />
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="h-64 animate-pulse rounded-2xl bg-surface lg:col-span-7" />
          <div className="space-y-4 lg:col-span-5">
            <div className="h-28 animate-pulse rounded-2xl bg-surface" />
            <div className="h-24 animate-pulse rounded-2xl bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to="/inbox"
          className="inline-flex items-center gap-1.5 text-sm text-subtext transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("workspace.back")}
        </Link>
        <div className="mt-6 rounded-2xl border border-bad/30 bg-bad/8 p-6 text-sm text-bad">
          {error === "not_found" ? t("workspace.notFound") : t("workspace.error")}
        </div>
      </div>
    );
  }

  const dl = daysLeft(opportunity.deadline_at);
  const recommendation = score?.recommendation ?? null;
  const isExpired = dl !== null && dl < 0;
  const prepBlocked = isExpired || recommendation === "NO_GO";

  const nextBestAction = (() => {
    if (isExpired) {
      return {
        tone: "bad" as const,
        title: t("workspace.nextActions.expired.title"),
        body: t("workspace.nextActions.expired.body"),
      };
    }
    if (!brief) {
      return {
        tone: "neutral" as const,
        title: t("workspace.nextActions.generateBrief.title"),
        body: t("workspace.nextActions.generateBrief.body"),
      };
    }
    if (recommendation === "NO_GO") {
      return {
        tone: "bad" as const,
        title: t("workspace.nextActions.noGo.title"),
        body: t("workspace.nextActions.noGo.body"),
      };
    }
    if (!decision) {
      return {
        tone: "warn" as const,
        title: t("workspace.nextActions.takeDecision.title"),
        body: t("workspace.nextActions.takeDecision.body"),
      };
    }
    if (recommendation === "GO" && workflowStatus !== "GO" && workflowStatus !== "PREPARATION" && workflowStatus !== "READY" && workflowStatus !== "SUBMITTED") {
      return {
        tone: "good" as const,
        title: t("workspace.nextActions.alignWorkflow.title"),
        body: t("workspace.nextActions.alignWorkflow.body"),
      };
    }
    if (score?.score_band === "low") {
      return {
        tone: "bad" as const,
        title: t("workspace.nextActions.lowScore.title"),
        body: t("workspace.nextActions.lowScore.body"),
      };
    }
    if (decision === "GO" && !prep && !prepBlocked) {
      return {
        tone: "brand" as const,
        title: t("workspace.nextActions.generatePrep.title"),
        body: t("workspace.nextActions.generatePrep.body"),
      };
    }
    if (workflowStatus === "PREPARATION" && prep && brief?.next_action) {
      return {
        tone: "brand" as const,
        title: t("workspace.nextActions.prepFocus.title"),
        body: brief.next_action,
      };
    }
    if (brief?.next_action) {
      return {
        tone: "brand" as const,
        title: t("workspace.nextActions.brief.title"),
        body: brief.next_action,
      };
    }
    return {
      tone: "neutral" as const,
      title: t("workspace.nextActions.monitor.title"),
      body: t("workspace.nextActions.monitor.body"),
    };
  })();

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/inbox"
          className="inline-flex items-center gap-1.5 text-sm text-subtext transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("workspace.back")}
        </Link>
        <a
          href={opportunity.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line/25 bg-surface/95 px-3 py-1.5 text-xs font-semibold text-text/75 transition hover:bg-elevated"
        >
          {t("workspace.source")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Opportunity header */}
      <section className="rounded-2xl border border-line/30 bg-surface/95 px-5 py-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-snug text-text">{opportunity.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-subtext">
              {opportunity.buyer_name ? <span>{opportunity.buyer_name}</span> : null}
              {opportunity.country_code ? (
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {opportunity.country_code}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {fmtRelative(opportunity.published_at, fmtLocale)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {opportunity.status === "active" ? (
              <span className="rounded-full border border-good/30 bg-good/10 px-2.5 py-0.5 text-[11px] font-semibold text-good">
                {opportunity.status}
              </span>
            ) : (
              <span className="rounded-full border border-line/30 bg-bg px-2.5 py-0.5 text-[11px] font-semibold text-subtext">
                {opportunity.status}
              </span>
            )}
            {extraction ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  extraction.extraction_quality === "high" &&
                    "border border-good/30 bg-good/8 text-good/80",
                  extraction.extraction_quality === "med" &&
                    "border border-warn/30 bg-warn/8 text-warn/80",
                  extraction.extraction_quality === "low" &&
                    "border border-bad/30 bg-bad/8 text-bad/80",
                )}
                title={t("workspace.extraction.quality")}
              >
                {t(`workspace.score.${extraction.extraction_quality}`)}
              </span>
            ) : null}
            {extraction?.needs_review ? (
              <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-semibold text-warn">
                ⚠ {t("workspace.extraction.needsReview")}
              </span>
            ) : null}
          </div>
        </div>
        {opportunity.summary ? (
          <p className="mt-3 text-sm leading-relaxed text-subtext">{opportunity.summary}</p>
        ) : null}
      </section>

      {/* Dossier status strip */}
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-line/25 bg-surface/92 px-4 py-2.5 shadow-soft">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">
          {t("workspace.status.title")}
        </span>
        <StatusPill label={t("workspace.status.workflow")}>
          <WorkflowBadge workflowStatus={displayWorkflowStatus} t={t} />
        </StatusPill>
        <StatusPill label={t("workspace.status.decision")}>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              decision === "GO" && "border border-good/40 bg-good/12 text-good",
              decision === "HOLD" && "border border-warn/40 bg-warn/12 text-warn",
              decision === "NO_GO" && "border border-bad/40 bg-bad/12 text-bad",
              !decision && "border border-line/25 bg-bg text-subtext",
            )}
          >
            {formatDecisionLabel(decision, t)}
          </span>
        </StatusPill>
        <StatusPill label={t("workspace.status.recommendation")}>
          {!scoreLoading && recommendation ? (
            <RecommendationBadge recommendation={recommendation} t={t} />
          ) : (
            <span className="rounded-full border border-line/20 bg-bg/85 px-2.5 py-0.5 text-[11px] text-subtext/80">
              {t("workspace.recommendation.pending")}
            </span>
          )}
        </StatusPill>
        <StatusPill label={t("workspace.status.score")}>
          {!scoreLoading && score ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums",
                score.score_band === "high" && "border border-good/30 bg-good/8 text-good",
                score.score_band === "med" && "border border-warn/30 bg-warn/8 text-warn",
                score.score_band === "low" && "border border-bad/30 bg-bad/8 text-bad",
              )}
            >
              {t(`workspace.score.${score.score_band}`)} · {Math.round(score.score_value * 100)}%
            </span>
          ) : !scoreLoading ? (
            <span className="rounded-full border border-line/20 bg-bg/85 px-2.5 py-0.5 text-[11px] text-subtext/80">
              {t("workspace.score.pending")}
            </span>
          ) : null}
        </StatusPill>
        {/* Deadline */}
        <StatusPill label={t("workspace.status.urgency")}>
          {opportunity.deadline_at ? (
            <DeadlineBadge deadline={opportunity.deadline_at} daySuffix={daySuffix} t={t} />
          ) : (
            <span className="rounded-full border border-line/20 bg-bg/85 px-2.5 py-0.5 text-[11px] text-subtext/80">
              {t("workspace.deadline.none")}
            </span>
          )}
        </StatusPill>
        {/* Deadline vs effort intelligence */}
        {prep?.effort_days && dl !== null && dl >= 0 ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              dl < prep.effort_days * 1.5
                ? "border border-bad/40 bg-bad/10 text-bad"
                : dl < prep.effort_days * 3
                  ? "border border-warn/40 bg-warn/10 text-warn"
                  : "border border-line/25 bg-bg text-subtext",
            )}
          >
            ~{prep.effort_days}d {t("workspace.status.effortVsDeadline")}
          </span>
        ) : null}
        {/* Brief freshness */}
        {brief ? (
          <span className="ml-auto text-[11px] text-subtext/70">
            {t("workspace.status.briefFresh")} {fmtRelative(brief.generatedAt, fmtLocale)}
          </span>
        ) : null}
      </section>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Brief + Documents — left, larger */}
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-2xl border border-line/30 bg-surface/95 p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtext">Brief</h2>
              <button
                type="button"
                onClick={handleGenerateBrief}
                disabled={briefLoading}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                  brief
                    ? "border-brand/50 bg-brand/15 text-brand"
                    : "border-line/25 bg-bg/85 text-subtext/85 hover:bg-elevated hover:text-text",
                  briefLoading && "cursor-wait opacity-70",
                )}
              >
                {briefLoading
                  ? t("inbox.card.brief.generating")
                  : brief
                    ? t("workspace.brief.refresh")
                    : t("workspace.brief.generate")}
              </button>
            </div>

            {briefError ? (
              <button
                type="button"
                onClick={handleGenerateBrief}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bad/30 bg-bad/8 px-3 py-1.5 text-xs font-semibold text-bad transition hover:bg-bad/15"
              >
                {t("inbox.card.brief.error")}
              </button>
            ) : brief ? (
              <>
                <BriefContent brief={brief} t={t} />
                {briefVersions.length > 0 ? (
                  <div className="mt-4 border-t border-line/15 pt-3">
                    <button
                      type="button"
                      onClick={() => setBriefHistoryOpen((v) => !v)}
                      className="flex w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtext/75 transition hover:text-text"
                    >
                      <History className="h-3 w-3" />
                      {t("workspace.brief.history.label")} ({briefVersions.length})
                      {briefHistoryOpen ? (
                        <ChevronUp className="ml-auto h-3 w-3" />
                      ) : (
                        <ChevronDown className="ml-auto h-3 w-3" />
                      )}
                    </button>
                    {briefHistoryOpen ? (
                      <ul className="mt-2 space-y-1.5">
                        {briefVersions.map((v) => (
                          <li
                            key={v.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-line/15 bg-bg px-3 py-2"
                          >
                            <span className="text-[11px] text-text">
                              {fmtDateTime(v.created_at, fmtLocale)}
                            </span>
                            <span className="text-[10px] font-mono text-subtext/75">{v.model}</span>
                            {v.is_current ? (
                              <span className="rounded-full border border-brand/30 bg-brand/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-brand">
                                {t("workspace.brief.history.current")}
                              </span>
                            ) : null}
                            {v.generation_ms ? (
                              <span className="ml-auto text-[10px] tabular-nums text-subtext/65">
                                {v.generation_ms}ms
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : briefLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-3.5 animate-pulse rounded-lg bg-elevated"
                    style={{ width: `${60 + i * 10}%` }}
                  />
                ))}
              </div>
            ) : extraction?.summary_10s ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">
                  {t("workspace.extraction.quickSnapshot")}
                </p>
                <p className="text-sm leading-relaxed text-subtext">
                  {extraction.summary_10s}
                </p>
              </div>
            ) : (
              <p className="text-sm text-subtext">{t("workspace.brief.empty")}</p>
            )}
          </div>

        {/* Next Actions */}
        {nextBestAction ? (
          <div className="rounded-2xl border border-brand/30 bg-brand/8 p-5 shadow-soft">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-brand/85" />
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-brand/85">
                {t("workspace.nextActions.label")}
              </h2>
            </div>
            <div className="space-y-3">
              <div
                className={cn(
                  "rounded-xl border px-4 py-3",
                  nextBestAction.tone === "good" && "border-good/30 bg-good/10",
                  nextBestAction.tone === "warn" && "border-warn/30 bg-warn/10",
                  nextBestAction.tone === "bad" && "border-bad/30 bg-bad/10",
                  nextBestAction.tone === "brand" && "border-brand/30 bg-brand/10",
                  nextBestAction.tone === "neutral" && "border-line/20 bg-bg/80",
                )}
              >
                <p className="text-sm font-semibold text-text">{nextBestAction.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-subtext">{nextBestAction.body}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-subtext/85">
                {!brief ? <span>{t("workspace.nextActions.signal.briefMissing")}</span> : null}
                {!decision ? <span>{t("workspace.nextActions.signal.decisionMissing")}</span> : null}
                {recommendation ? (
                  <span>
                    {t("workspace.status.recommendation")}: {formatRecommendationLabel(recommendation, t)}
                  </span>
                ) : null}
                {workflowStatus ? (
                  <span>
                    {t("workspace.status.workflow")}: {formatWorkflowLabel(workflowStatus, t)}
                  </span>
                ) : (
                  <span>
                    {t("workspace.status.workflow")}: {formatWorkflowLabel("NEW", t)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Documents */}
        {documents.length > 0 ? (
          <div className="rounded-2xl border border-line/30 bg-surface/95 p-5 shadow-soft">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-subtext">
              {t("workspace.documents.label")}
            </h2>
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={doc.doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-lg border border-line/20 bg-bg px-3 py-2 text-sm transition hover:bg-elevated hover:border-line/40"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-subtext group-hover:text-brand" />
                    <span className="min-w-0 flex-1 truncate text-text">
                      {doc.doc_title || doc.doc_url}
                    </span>
                    {doc.doc_type ? (
                      <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-bold uppercase text-subtext">
                        {doc.doc_type}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {/* Preparation Plan */}
        {(decision === "GO" || prep || prepGenerating) ? (
          <div className="rounded-2xl border border-line/30 bg-surface/95 p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("workspace.prep.label")}
              </h2>
              <div className="flex items-center gap-2">
                {prep?.effort_days ? (
                  <span className="text-[11px] font-semibold text-subtext/70">
                    ~{prep.effort_days}d
                  </span>
                ) : null}
                {!prepLoading && !prepGenerating && !prepBlocked ? (
                  <button
                    type="button"
                    onClick={() => opportunity && void generatePrep(opportunity.id)}
                    className={cn(
                      "rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition",
                      prep
                        ? "border-line/20 bg-bg/85 text-subtext/80 hover:bg-elevated hover:text-text"
                        : "border-brand/40 bg-brand/10 text-brand hover:bg-brand/20",
                    )}
                  >
                    {prep ? t("workspace.prep.refresh") : t("workspace.prep.generate")}
                  </button>
                ) : null}
              </div>
            </div>

            {prepLoading || prepGenerating ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-3 animate-pulse rounded-lg bg-elevated"
                    style={{ width: `${50 + i * 12}%` }}
                  />
                ))}
                {prepGenerating ? (
                  <p className="text-[11px] text-subtext/70">{t("workspace.prep.computing")}</p>
                ) : null}
              </div>
            ) : prepError ? (
              <button
                type="button"
                onClick={() => opportunity && void generatePrep(opportunity.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bad/30 bg-bad/8 px-3 py-1.5 text-xs font-semibold text-bad transition hover:bg-bad/15"
              >
                {t("workspace.prep.error")}
              </button>
            ) : prep ? (
              <div className="space-y-4">
                {/* Response plan */}
                {prep.response_plan ? (
                  <div>
                    <SectionLabel>{t("workspace.prep.responsePlan")}</SectionLabel>
                    <p className="text-sm leading-relaxed text-subtext">{prep.response_plan}</p>
                  </div>
                ) : null}

                {/* Checklist */}
                {prep.checklist.length > 0 ? (
                  <div>
                    <SectionLabel>{t("workspace.prep.checklist")}</SectionLabel>
                    <ul className="space-y-1.5">
                      {prep.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase",
                              item.priority === "high" && "bg-bad/15 text-bad",
                              item.priority === "med" && "bg-warn/15 text-warn",
                              item.priority === "low" && "bg-subtext/10 text-subtext/80",
                            )}
                          >
                            {t(`workspace.prep.priority.${item.priority}`)}
                          </span>
                          <span className="text-sm text-text">{item.task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Missing docs */}
                {prep.missing_docs.length > 0 ? (
                  <div>
                    <SectionLabel>{t("workspace.prep.missingDocs")}</SectionLabel>
                    <ul className="space-y-1 text-sm text-subtext">
                      {prep.missing_docs.map((doc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-bad/50">✗</span>
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Blockers */}
                {prep.blockers.length > 0 ? (
                  <div>
                    <SectionLabel>{t("workspace.prep.blockers")}</SectionLabel>
                    <ul className="space-y-1 text-sm text-warn">
                      {prep.blockers.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0">⚠</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-subtext">
                {isExpired
                  ? t("workspace.prep.blocked.expired")
                  : recommendation === "NO_GO"
                    ? t("workspace.prep.blocked.noGo")
                    : t("workspace.prep.empty")}
              </p>
            )}
          </div>
        ) : null}
        </div>

        {/* Sidebar — right */}
        <div className="space-y-4 lg:col-span-5">
          {/* Workflow */}
          <div className="rounded-2xl border border-line/30 bg-surface/95 p-4 shadow-soft">
            <SectionLabel>{t("workspace.workflow.label")}</SectionLabel>
            <p className="mb-3 text-sm leading-relaxed text-subtext">
              {!workflowStatus
                ? t("workspace.workflow.defaultHint")
                : t("workspace.workflow.savedHint")}
            </p>
            <select
              value={displayWorkflowStatus}
              onChange={(event) => void saveWorkflow(event.target.value as WorkflowStatus)}
              disabled={workflowSaving}
              className="w-full rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm font-semibold text-text outline-none transition hover:bg-elevated disabled:cursor-wait disabled:opacity-70"
            >
              {WORKFLOW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatWorkflowLabel(option, t)}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between gap-2">
              <WorkflowBadge workflowStatus={displayWorkflowStatus} t={t} />
              {workflowSaving ? (
                <span className="text-[11px] text-subtext/70">{t("workspace.workflow.saving")}</span>
              ) : workflow?.updated_at ? (
                <span className="text-[11px] text-subtext/70">
                  {fmtRelative(workflow.updated_at, fmtLocale)}
                </span>
              ) : (
                <span className="text-[11px] text-subtext/70">{t("workspace.workflow.notSavedYet")}</span>
              )}
            </div>
            {workflowError ? (
              <p className="mt-2 text-[11px] text-bad">{workflowError}</p>
            ) : null}
          </div>

          {/* Decision */}
          <div className="rounded-2xl border border-line/30 bg-surface/95 p-4 shadow-soft">
            <SectionLabel>{t("workspace.decision.label")}</SectionLabel>
            <p className="mb-3 text-sm leading-relaxed text-subtext">
              {t("workspace.decision.helper")}
            </p>
            <DecisionButtons id={opportunity.id} current={decision} onDecide={decide} />
            {decision ? (
              <p
                className={cn(
                  "mt-2 text-xs font-semibold",
                  decision === "GO" && "text-good",
                  decision === "HOLD" && "text-warn",
                  decision === "NO_GO" && "text-bad",
                )}
              >
                {formatDecisionLabel(decision, t)}
              </p>
            ) : null}
          </div>

          {/* Score */}
          <div className="rounded-2xl border border-line/30 bg-surface/95 p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <SectionLabel>{t("workspace.score.label")}</SectionLabel>
              {!scoreLoading && !scoreGenerating && (
                <button
                  type="button"
                  onClick={() => opportunity && void generateScore(opportunity.id)}
                  className={cn(
                    "rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition",
                    score
                      ? "border-line/20 bg-bg/85 text-subtext/80 hover:bg-elevated hover:text-text"
                      : "border-brand/40 bg-brand/10 text-brand hover:bg-brand/20",
                  )}
                >
                  {score ? t("workspace.score.refresh") : t("workspace.score.generate")}
                </button>
              )}
            </div>
            {scoreLoading || scoreGenerating ? (
              <div className="space-y-2">
                <div className="h-5 w-24 animate-pulse rounded-lg bg-elevated" />
                {scoreGenerating ? (
                  <p className="text-[11px] text-subtext/70">{t("workspace.score.computing")}</p>
                ) : null}
              </div>
            ) : scoreError ? (
              <button
                type="button"
                onClick={() => opportunity && void generateScore(opportunity.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bad/30 bg-bad/8 px-3 py-1.5 text-xs font-semibold text-bad transition hover:bg-bad/15"
              >
                {t("workspace.score.error")}
              </button>
            ) : score ? (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      score.score_band === "high" && "border border-good/40 bg-good/15 text-good",
                      score.score_band === "med" && "border border-warn/40 bg-warn/15 text-warn",
                      score.score_band === "low" && "border border-bad/40 bg-bad/15 text-bad",
                    )}
                  >
                    {t(`workspace.score.${score.score_band}`)}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-text">
                    {Math.round(score.score_value * 100)}%
                  </span>
                </div>
                {score.recommendation ? (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">
                      {t("workspace.recommendation.label")}
                    </p>
                    <RecommendationBadge recommendation={score.recommendation} t={t} />
                  </div>
                ) : null}
                {score.rationale_summary ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-subtext">
                    {score.rationale_summary}
                  </p>
                ) : null}
                {score.rationale_json ? (
                  <RationaleBreakdown json={score.rationale_json} label={t("workspace.score.breakdown")} />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-subtext">{t("workspace.score.pending")}</p>
            )}
          </div>

          {/* Deadline */}
          <div className="rounded-2xl border border-line/30 bg-surface/95 p-4 shadow-soft">
            <SectionLabel>{t("workspace.deadline.label")}</SectionLabel>
            {opportunity.deadline_at ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-subtext" />
                  <span className="text-sm text-text">
                    {fmtDateTime(opportunity.deadline_at, fmtLocale)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DeadlineBadge deadline={opportunity.deadline_at} daySuffix={daySuffix} t={t} />
                  {dl !== null && dl >= 0 ? (
                    <span className="text-xs text-subtext">
                      {dl}
                      {daySuffix} {t("workspace.deadline.remaining")}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-subtext">{t("workspace.deadline.none")}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="rounded-2xl border border-line/30 bg-surface/95 p-4 shadow-soft">
            <div className="space-y-3">
              <div>
                <SectionLabel>{t("workspace.type.label")}</SectionLabel>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line/25 bg-bg px-2.5 py-1 text-xs font-semibold text-subtext">
                  <Tag className="h-3.5 w-3.5" />
                  {opportunity.type}
                </span>
              </div>
              {extraction?.budget_value ? (
                <div>
                  <SectionLabel>{t("workspace.extraction.budget")}</SectionLabel>
                  <p className="text-sm font-semibold text-text">
                    {extraction.budget_value.toLocaleString(fmtLocale, {
                      style: "currency",
                      currency: extraction.budget_currency ?? "EUR",
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              ) : null}
              {extraction?.sector ? (
                <div>
                  <SectionLabel>{t("workspace.extraction.sector")}</SectionLabel>
                  <p className="text-sm text-subtext">{extraction.sector}</p>
                </div>
              ) : null}
              <div>
                <SectionLabel>{t("workspace.published.label")}</SectionLabel>
                <p className="text-sm text-subtext">
                  {fmtDateTime(opportunity.published_at, fmtLocale) || "—"}
                </p>
              </div>
              {opportunity.language ? (
                <div>
                  <SectionLabel>{t("workspace.language.label")}</SectionLabel>
                  <p className="text-sm font-semibold uppercase text-subtext">
                    {opportunity.language}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <section className="rounded-2xl border border-line/30 bg-surface/95 p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-subtext/65" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-subtext">
            {t("workspace.timeline.label")}
          </h2>
        </div>
        {timelineEvents.length === 0 ? (
          <p className="text-sm text-subtext">{t("workspace.timeline.empty")}</p>
        ) : (
          <ol className="space-y-0">
            {timelineEvents.map((ev, idx) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full border-2",
                      ev.type === "added" && "border-subtext/30 bg-bg",
                      ev.type === "extracted" && "border-brand/40 bg-brand/10",
                      ev.type === "brief" && "border-brand/60 bg-brand/20",
                      ev.type === "score" && "border-warn/50 bg-warn/15",
                      ev.type === "prep" && "border-good/50 bg-good/15",
                      ev.type === "decision_set" && "border-good/60 bg-good/20",
                      ev.type === "decision_change" && "border-warn/60 bg-warn/20",
                      ev.type === "decision_clear" && "border-bad/40 bg-bad/10",
                    )}
                  />
                  {idx < timelineEvents.length - 1 ? (
                    <div className="my-1 w-px flex-1 bg-line/15" style={{ minHeight: "14px" }} />
                  ) : null}
                </div>
                <div className="min-w-0 pb-3">
                  <p className="text-xs text-text">
                    {t(`workspace.timeline.${ev.type}`)}
                    {ev.type === "decision_set" && ev.decisionValue
                      ? ` · ${ev.decisionValue === "NO_GO" ? "NO-GO" : ev.decisionValue}`
                      : null}
                    {ev.type === "decision_change" && ev.decisionValue
                      ? ` → ${ev.decisionValue === "NO_GO" ? "NO-GO" : ev.decisionValue}`
                      : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-subtext/70">
                    {fmtRelative(ev.ts, fmtLocale)}
                    {ev.durationMs ? ` · ${ev.durationMs}ms` : null}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
