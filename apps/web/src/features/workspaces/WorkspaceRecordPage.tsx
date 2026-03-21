import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ExternalLink, FolderCheck, ListTodo, Sparkles, Target } from "lucide-react";
import { PageIntro, SurfaceSection } from "@/components/ds/surfacePrimitives";
import {
  DecisionStateBadge,
  ScoreStateBadge,
  SemanticPill,
  SignalBadge,
  StatePanel,
} from "@/components/ds/statusPrimitives";
import { useLocale } from "@/lib/i18n";
import { fmtDateTime, fmtRelative } from "@/lib/utils";
import { useOpportunityBrief, type OpportunityBrief } from "@/features/workspace/useOpportunityBrief";
import { useOpportunityScore } from "@/features/workspace/useOpportunityScore";
import { useOpportunityPrep } from "@/features/workspace/useOpportunityPrep";
import { useWorkspaceData } from "@/features/workspace/useWorkspaceData";
import { useWorkspaceRecord } from "./useWorkspaceRecord";
import type { WorkspaceStatus } from "./workspaceApi";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
};

const WORKSPACE_STATUS_OPTIONS: WorkspaceStatus[] = ["NEW", "REVIEW", "GO", "HOLD", "BLOCKED", "READY", "SUBMITTED"];

function workspaceTone(status: WorkspaceStatus): "neutral" | "brand" | "good" | "warn" | "bad" {
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

export default function WorkspaceRecordPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const fmtLocale = LOCALE_MAP[locale] ?? "en-US";
  const { detail, loading, savingStatus, savingTask, error, saveStatus, addTask, toggleTask } = useWorkspaceRecord(id ?? null);
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
    return (
      <div className="space-y-5">
        <div className="h-5 w-28 animate-pulse rounded-lg bg-elevated" />
        <div className="h-28 animate-pulse rounded-3xl bg-surface" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-2xl bg-surface" />
            <div className="h-56 animate-pulse rounded-2xl bg-surface" />
          </div>
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-2xl bg-surface" />
            <div className="h-44 animate-pulse rounded-2xl bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (error || opportunityError || !detail || !opportunity) {
    return <StatePanel tone="bad" title="Workspace unavailable" description={error ?? opportunityError ?? t("dossier.notFound")} />;
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

      <section className="overflow-hidden rounded-[28px] border border-line/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,243,255,0.94))] shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-line/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.1),transparent_32%),linear-gradient(140deg,rgba(255,255,255,0.99),rgba(247,243,255,0.94))] p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/75">Workspace record</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              Operational layer for tracked work.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-subtext">
              This record keeps status, checklist and next actions attached to the opportunity while the main workspace continues to hold brief, score and preparation context.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-line/15 bg-white/88 p-4 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Current lane</div>
                <div className="mt-2 inline-flex">
                  <SemanticPill tone={workspaceTone(detail.dossier.status)}>
                    {t(`dossiers.status.${detail.dossier.status.toLowerCase()}`)}
                  </SemanticPill>
                </div>
              </div>
              <div className="rounded-2xl border border-line/15 bg-white/88 p-4 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Decision</div>
                <div className="mt-2">
                  <DecisionStateBadge decision={detail.decision} undecidedLabel={t("inbox.filter.decision.undecided")} />
                </div>
              </div>
              <div className="rounded-2xl border border-line/15 bg-white/88 p-4 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Time pressure</div>
                <div className="mt-2 text-sm font-semibold text-text">{fmtRelative(opportunity.deadline_at, fmtLocale)}</div>
                <div className="mt-1 text-xs text-subtext">Keep dossier work ahead of the live deadline.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 bg-[linear-gradient(165deg,rgba(244,240,255,0.94),rgba(255,255,255,0.78))] p-5 sm:p-6">
            <div className="rounded-3xl border border-brand/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.12),rgba(255,255,255,0.95))] p-5 shadow-soft">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">
                <Target className="h-3.5 w-3.5 text-brand" />
                Next move
              </div>
              <div className="mt-3 text-lg font-semibold tracking-tight text-text">
                {brief?.next_action ?? "Advance the current workspace by locking the next operational step."}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-subtext">
                {savingStatus ? "Saving workspace status..." : `${t("dossiers.updated")} ${fmtRelative(detail.dossier.updated_at, fmtLocale)}`}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Checklist pressure</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-text">
                  {detail.tasks.filter((task) => !task.is_done).length}
                </div>
                <div className="mt-1 text-sm text-subtext">
                  open item{detail.tasks.filter((task) => !task.is_done).length === 1 ? "" : "s"} still blocking movement.
                </div>
              </div>
              <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Workspace link</div>
                <Link
                  to={`/workspace/${detail.dossier.opportunity_id}`}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-text"
                >
                  <FolderCheck className="h-4 w-4" />
                  {t("dossier.links.workspace")}
                </Link>
                <div className="mt-1 text-sm text-subtext">Open the full intelligence view without losing the tracked record.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 rounded-3xl border border-line/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,242,255,0.88))] p-4 shadow-soft sm:grid-cols-[auto_auto_auto_1fr]">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext/65">State</div>
          <SemanticPill tone={workspaceTone(detail.dossier.status)}>
            {t(`dossiers.status.${detail.dossier.status.toLowerCase()}`)}
          </SemanticPill>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext/65">Decision</div>
          <DecisionStateBadge decision={detail.decision} undecidedLabel={t("inbox.filter.decision.undecided")} />
        </div>
        {score ? (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext/65">Score</div>
            <ScoreStateBadge
              band={score.score_band}
              label={t(`workspace.score.${score.score_band}`)}
              value={`${Math.round(score.score_value * 100)}%`}
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-end justify-start gap-2 sm:justify-end">
          {opportunity.country_code ? <SignalBadge>{opportunity.country_code}</SignalBadge> : null}
          {opportunity.language?.toLowerCase().startsWith("cy") ? <SignalBadge>Bilingual</SignalBadge> : null}
          <span className="inline-flex items-center gap-1.5 text-sm text-subtext">
            <CalendarDays className="h-4 w-4" />
            {fmtRelative(opportunity.deadline_at, fmtLocale)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <SurfaceSection
            title={t("dossier.header.title")}
            subtitle={t("dossier.header.subtitle")}
            action={
              <select
                value={detail.dossier.status}
                onChange={(event) => void saveStatus(event.target.value as WorkspaceStatus)}
                disabled={savingStatus}
                className="rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40 disabled:opacity-70"
              >
                {WORKSPACE_STATUS_OPTIONS.map((status) => (
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
            tone={score ? (score.score_band === "high" ? "good" : score.score_band === "med" ? "warn" : "bad") : "default"}
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
            tone="brand"
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
              <div className="rounded-2xl border border-line/15 bg-surface/92 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Workspace intelligence</div>
                <Link
                  to={`/workspace/${detail.dossier.opportunity_id}`}
                  className="mt-3 inline-flex items-center justify-between rounded-2xl border border-line/15 bg-bg px-4 py-3 text-sm font-semibold text-text transition hover:bg-elevated"
                >
                  <span className="inline-flex items-center gap-2">
                    <FolderCheck className="h-4 w-4 text-brand" />
                    {t("dossier.links.workspace")}
                  </span>
                  <span>{t("workspace.openBtn")}</span>
                </Link>
              </div>
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
