import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ExternalLink, FolderCheck, ListTodo, Sparkles } from "lucide-react";
import { PageIntro, SurfaceSection } from "@/components/ds/surfacePrimitives";
import {
  DecisionStateBadge,
  ScoreStateBadge,
  SemanticPill,
  SignalBadge,
  StatePanel,
} from "@/components/ds/statusPrimitives";
import { useLocale } from "@/lib/i18n";
import type { DossierStatus } from "@/lib/types";
import { fmtDateTime, fmtRelative } from "@/lib/utils";
import { useOpportunityBrief, type OpportunityBrief } from "@/features/workspace/useOpportunityBrief";
import { useOpportunityScore } from "@/features/workspace/useOpportunityScore";
import { useOpportunityPrep } from "@/features/workspace/useOpportunityPrep";
import { useWorkspaceData } from "@/features/workspace/useWorkspaceData";
import { useDossier } from "./useDossier";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
};

const DOSSIER_STATUS_OPTIONS: DossierStatus[] = ["NEW", "REVIEW", "GO", "HOLD", "BLOCKED", "READY", "SUBMITTED"];

function dossierTone(status: DossierStatus): "neutral" | "brand" | "good" | "warn" | "bad" {
  switch (status) {
    case "GO":
    case "READY":
    case "SUBMITTED":
      return "good";
    case "HOLD":
    case "BLOCKED":
      return "warn";
    case "REVIEW":
      return "brand";
    default:
      return "neutral";
  }
}

function BriefSummary({
  brief,
  emptyLabel,
  t,
}: {
  brief: OpportunityBrief | null;
  emptyLabel: string;
  t: (key: string) => string;
}) {
  if (!brief) {
    return <p className="text-sm text-subtext">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      {brief.executive_summary ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-subtext/75">{t("inbox.card.brief.executiveSummary")}</p>
          <p className="mt-2 leading-relaxed text-text">{brief.executive_summary}</p>
        </div>
      ) : null}
      {brief.fit_assessment ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-subtext/75">{t("inbox.card.brief.fitAssessment")}</p>
          <p className="mt-2 leading-relaxed text-subtext">{brief.fit_assessment}</p>
        </div>
      ) : null}
      {brief.risk_flags.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-subtext/75">{t("inbox.card.brief.riskFlags")}</p>
          <ul className="mt-2 space-y-1.5 text-subtext">
            {brief.risk_flags.map((flag, index) => (
              <li key={`${flag}-${index}`} className="flex gap-2">
                <span>{"•"}</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {brief.next_action ? (
        <StatePanel
          tone="brand"
          title={t("inbox.card.brief.nextAction")}
          description={brief.next_action}
          className="p-3 shadow-none"
        />
      ) : null}
    </div>
  );
}

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const fmtLocale = LOCALE_MAP[locale] ?? "en-US";
  const { detail, loading, savingStatus, savingTask, error, saveStatus, addTask, toggleTask } = useDossier(id ?? null);
  const opportunityId = detail?.dossier.opportunity_id ?? null;
  const { opportunity, loading: opportunityLoading, error: opportunityError } = useWorkspaceData(opportunityId ?? "");
  const { prep, loading: prepLoading, generate: generatePrep, generating: prepGenerating } = useOpportunityPrep(opportunityId);
  const { score, loading: scoreLoading, generating: scoreGenerating, generate: generateScore } = useOpportunityScore(opportunityId, opportunity?.deadline_at ?? null);
  const {
    generate,
    loadFromDB,
    getBrief,
    isLoading: isBriefLoading,
    getError: getBriefError,
  } = useOpportunityBrief();
  const [taskInput, setTaskInput] = useState("");

  const brief = opportunityId ? getBrief(opportunityId) : null;
  const briefLoading = opportunityId ? isBriefLoading(opportunityId) : false;
  const briefError = opportunityId ? getBriefError(opportunityId) : null;

  useEffect(() => {
    if (!opportunityId || brief || briefLoading) return;
    void loadFromDB(opportunityId);
  }, [brief, briefLoading, loadFromDB, opportunityId]);

  const briefInput = useMemo(() => {
    if (!opportunity) return null;
    return {
      id: opportunity.id,
      title: opportunity.title,
      locale,
      buyer_name: opportunity.buyer_name,
      status: opportunity.status,
      deadline_at: opportunity.deadline_at,
      country_code: opportunity.country_code,
      region: null,
    };
  }, [locale, opportunity]);

  async function handleAddTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = taskInput.trim();
    if (!label) return;
    try {
      await addTask(label);
      setTaskInput("");
    } catch {
      // Error state is surfaced by the hook.
    }
  }

  if (!id) {
    return <StatePanel description={t("dossier.notFound")} />;
  }

  if (loading || opportunityLoading) {
    return <StatePanel description={t("dossier.loading")} />;
  }

  if (error || opportunityError || !detail || !opportunity) {
    return <StatePanel tone="bad" description={error ?? opportunityError ?? t("dossier.notFound")} />;
  }

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1.5 px-1 text-xs font-medium text-subtext/60">
        <Link to="/workspaces" className="transition hover:text-text">
          {t("dossiers.title")}
        </Link>
        <span>/</span>
        <span className="truncate text-text/80">{opportunity.title}</span>
      </nav>
      <PageIntro
        eyebrow={t("dossier.eyebrow")}
        title={opportunity.title}
        subtitle={opportunity.summary ?? t("dossier.subtitleFallback")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/workspaces"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm font-semibold text-subtext transition hover:bg-elevated"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("dossier.back")}
            </Link>
            <a
              href={opportunity.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/25 bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-elevated"
            >
              <ExternalLink className="h-4 w-4" />
              {t("dossier.source")}
            </a>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SemanticPill tone={dossierTone(detail.dossier.status)}>
          {t(`dossiers.status.${detail.dossier.status.toLowerCase()}`)}
        </SemanticPill>
        <DecisionStateBadge decision={detail.decision} undecidedLabel={t("inbox.filter.decision.undecided")} />
        {score ? (
          <ScoreStateBadge
            band={score.score_band}
            label={t(`workspace.score.${score.score_band}`)}
            value={`${Math.round(score.score_value * 100)}%`}
          />
        ) : null}
        {opportunity.country_code ? <SignalBadge>{opportunity.country_code}</SignalBadge> : null}
        {opportunity.language?.toLowerCase().startsWith("cy") ? (
          <SignalBadge>
            Bilingual
          </SignalBadge>
        ) : null}
        <span className="inline-flex items-center gap-1.5 text-sm text-subtext">
          <CalendarDays className="h-4 w-4" />
          {fmtRelative(opportunity.deadline_at, fmtLocale)}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <SurfaceSection
            title={t("dossier.header.title")}
            subtitle={t("dossier.header.subtitle")}
            action={
              <select
                value={detail.dossier.status}
                onChange={(event) => void saveStatus(event.target.value as DossierStatus)}
                disabled={savingStatus}
                className="rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40 disabled:opacity-70"
              >
                {DOSSIER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`dossiers.status.${status.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-line/15 bg-surface/92 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtext/75">{t("dossier.header.updated")}</p>
                <p className="mt-2 text-sm text-text">{fmtDateTime(detail.dossier.updated_at, fmtLocale)}</p>
              </div>
              <div className="rounded-2xl border border-line/15 bg-surface/92 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtext/75">{t("dossier.header.opportunityStatus")}</p>
                <p className="mt-2 text-sm text-text">{opportunity.status}</p>
              </div>
            </div>
          </SurfaceSection>

          <SurfaceSection
            title={t("dossier.brief.title")}
            subtitle={t("dossier.brief.subtitle")}
            action={
              briefInput ? (
                <button
                  type="button"
                  onClick={() => void generate(briefInput, brief ? { force: true } : undefined)}
                  disabled={briefLoading}
                  className="rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm font-semibold text-subtext transition hover:bg-elevated disabled:opacity-70"
                >
                  {briefLoading ? t("inbox.card.brief.generating") : t("dossier.brief.generate")}
                </button>
              ) : null
            }
          >
            {briefError ? (
              <StatePanel tone="bad" description={t("inbox.card.brief.error")} className="p-3 shadow-none" />
            ) : (
              <BriefSummary brief={brief} emptyLabel={t("workspace.brief.empty")} t={t} />
            )}
          </SurfaceSection>

          <SurfaceSection
            title={t("dossier.score.title")}
            subtitle={t("dossier.score.subtitle")}
            action={
                <button
                  type="button"
                  onClick={() => {
                    if (!opportunityId) return;
                    void generateScore(opportunityId);
                  }}
                  disabled={scoreLoading || scoreGenerating}
                  className="rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm font-semibold text-subtext transition hover:bg-elevated disabled:opacity-70"
                >
                {scoreGenerating ? t("workspace.score.computing") : t("dossier.score.generate")}
              </button>
            }
          >
            {score ? (
              <div className="space-y-3">
                <ScoreStateBadge
                  band={score.score_band}
                  label={t(`workspace.score.${score.score_band}`)}
                  value={`${Math.round(score.score_value * 100)}%`}
                />
                {score.rationale_summary ? (
                  <p className="text-sm leading-relaxed text-subtext">{score.rationale_summary}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-subtext">{t("workspace.score.pending")}</p>
            )}
          </SurfaceSection>
        </div>

        <div className="space-y-4">
          <SurfaceSection
            title={t("dossier.checklist.title")}
            subtitle={t("dossier.checklist.subtitle")}
          >
            <form onSubmit={handleAddTask} className="mb-4 flex gap-2">
              <input
                value={taskInput}
                onChange={(event) => setTaskInput(event.target.value)}
                placeholder={t("dossier.checklist.placeholder")}
                className="flex-1 rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/40"
              />
              <button
                type="submit"
                disabled={savingTask || !taskInput.trim()}
                className="rounded-xl border border-line/25 bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-elevated disabled:opacity-70"
              >
                {t("dossier.checklist.add")}
              </button>
            </form>

            {detail.tasks.length === 0 ? (
              <StatePanel description={t("dossier.checklist.empty")} className="p-4 shadow-none" />
            ) : (
              <div className="space-y-2">
                {detail.tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-start gap-3 rounded-2xl border border-line/15 bg-surface/92 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={task.is_done}
                      onChange={() => void toggleTask(task.id)}
                      disabled={savingTask}
                      className="mt-1 h-4 w-4 rounded border-line/40"
                    />
                    <span className={task.is_done ? "text-sm text-subtext line-through" : "text-sm text-text"}>
                      {task.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </SurfaceSection>

          <SurfaceSection
            title={t("dossier.next.title")}
            subtitle={t("dossier.next.subtitle")}
          >
            <div className="space-y-3">
              {brief?.next_action ? (
                <StatePanel
                  tone="brand"
                  title={t("inbox.card.brief.nextAction")}
                  description={brief.next_action}
                  className="p-3 shadow-none"
                />
              ) : null}
              {prep?.response_plan ? (
                <div className="rounded-2xl border border-line/15 bg-surface/92 p-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                    <Sparkles className="h-4 w-4 text-brand" />
                    {t("workspace.prep.responsePlan")}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-subtext">{prep.response_plan}</p>
                </div>
              ) : null}
              {detail.tasks.length > 0 ? (
                <div className="rounded-2xl border border-line/15 bg-surface/92 p-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                    <ListTodo className="h-4 w-4 text-brand" />
                    {t("dossier.next.taskSummary")}
                  </div>
                  <p className="mt-2 text-sm text-subtext">
                    {detail.tasks.filter((task) => !task.is_done).length} {t("dossier.next.remaining")}
                  </p>
                </div>
              ) : null}
              {!brief?.next_action && !prep?.response_plan && detail.tasks.length === 0 ? (
                <StatePanel description={t("dossier.next.empty")} className="p-4 shadow-none" />
              ) : null}
            </div>
          </SurfaceSection>

          <SurfaceSection
            title={t("dossier.links.title")}
            subtitle={t("dossier.links.subtitle")}
          >
            <div className="grid gap-3">
              <Link
                to={`/workspace/${detail.dossier.opportunity_id}`}
                className="inline-flex items-center justify-between rounded-2xl border border-line/15 bg-surface/92 px-4 py-3 text-sm font-semibold text-text transition hover:bg-elevated"
              >
                <span className="inline-flex items-center gap-2">
                  <FolderCheck className="h-4 w-4 text-brand" />
                  {t("dossier.links.workspace")}
                </span>
                <span>{t("workspace.openBtn")}</span>
              </Link>
              <p className="text-xs text-subtext">
                {prepLoading || prepGenerating ? t("workspace.prep.computing") : t("dossier.links.helper")}
              </p>
              {!prep && !prepGenerating ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!opportunityId) return;
                    void generatePrep(opportunityId);
                  }}
                  className="inline-flex items-center rounded-xl border border-line/25 bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-elevated"
                >
                  {t("workspace.prep.generate")}
                </button>
              ) : null}
            </div>
          </SurfaceSection>
        </div>
      </div>
    </div>
  );
}
