import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, CalendarDays, Globe, Tag, Clock } from "lucide-react";
import { cn, daysLeft, fmtRelative, fmtDateTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import type { Decision } from "@/lib/types";
import { useDecisions } from "@/features/inbox/useDecisions";
import { useOpportunityBrief, type OpportunityBrief } from "@/features/inbox/useOpportunityBrief";
import { useWorkspaceData } from "./useWorkspaceData";
import { useOpportunityScore } from "./useOpportunityScore";
import { useOpportunityDocuments } from "./useOpportunityDocuments";
import { useOpportunityExtraction } from "./useOpportunityExtraction";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
};

// --- Micro-components ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtext">
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
      <p className="text-[10px] font-semibold uppercase tracking-wide text-subtext/50">{label}</p>
      {entries.map((e) => (
        <div key={e.label} className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold capitalize text-subtext/60">{e.label}</span>
          <span className="text-[11px] leading-relaxed text-subtext/80">{e.text}</span>
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
  const { score, loading: scoreLoading } = useOpportunityScore(id ?? null);
  const { documents } = useOpportunityDocuments(id ?? null);
  const { extraction } = useOpportunityExtraction(id ?? null);
  const { decide, getDecision } = useDecisions();
  const {
    generate,
    loadFromDB: loadBriefFromDB,
    getBrief,
    isLoading: isBriefLoading,
    getError: getBriefError,
  } = useOpportunityBrief();

  const decision = opportunity ? getDecision(opportunity.id) : null;
  const brief = opportunity ? getBrief(opportunity.id) : null;
  const briefLoading = opportunity ? isBriefLoading(opportunity.id) : false;
  const briefError = opportunity ? getBriefError(opportunity.id) : null;

  // DB-first brief load on mount: read from opportunity_briefs before calling edge function
  useEffect(() => {
    if (!opportunity || brief || briefLoading) return;
    void loadBriefFromDB(opportunity.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity?.id]);

  function handleGenerateBrief() {
    if (!opportunity) return;
    const input = {
      id: opportunity.id,
      title: opportunity.title,
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
      <div className="py-12 text-center text-sm text-muted">{t("workspace.notFound")}</div>
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-line/25 bg-surface px-3 py-1.5 text-xs font-semibold text-subtext transition hover:bg-elevated"
        >
          {t("workspace.source")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Opportunity header */}
      <section className="rounded-2xl border border-line/25 bg-surface px-5 py-4 shadow-soft">
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

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Brief + Documents — left, larger */}
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-2xl border border-line/25 bg-surface p-5 shadow-soft">
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
                    : "border-line/25 bg-bg text-subtext hover:bg-elevated",
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
              <BriefContent brief={brief} t={t} />
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
                <p className="text-[10px] font-semibold uppercase tracking-wide text-subtext/50">
                  {t("workspace.extraction.quickSnapshot")}
                </p>
                <p className="text-sm leading-relaxed text-subtext/80">
                  {extraction.summary_10s}
                </p>
              </div>
            ) : (
              <p className="text-sm text-subtext/60">{t("workspace.brief.empty")}</p>
            )}
          </div>

        {/* Documents */}
        {documents.length > 0 ? (
          <div className="rounded-2xl border border-line/25 bg-surface p-5 shadow-soft">
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
        </div>

        {/* Sidebar — right */}
        <div className="space-y-4 lg:col-span-5">
          {/* Decision */}
          <div className="rounded-2xl border border-line/25 bg-surface p-4 shadow-soft">
            <SectionLabel>{t("workspace.decision")}</SectionLabel>
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
                {decision === "NO_GO" ? "NO-GO" : decision}
              </p>
            ) : null}
          </div>

          {/* Score */}
          <div className="rounded-2xl border border-line/25 bg-surface p-4 shadow-soft">
            <SectionLabel>{t("workspace.score.label")}</SectionLabel>
            {scoreLoading ? (
              <div className="h-5 w-24 animate-pulse rounded-lg bg-elevated" />
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
                {score.rationale_summary ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-subtext/70">
                    {score.rationale_summary}
                  </p>
                ) : null}
                {score.rationale_json ? (
                  <RationaleBreakdown json={score.rationale_json} label={t("workspace.score.breakdown")} />
                ) : null}
              </>
            ) : (
              <p className="text-xs text-muted">{t("workspace.score.pending")}</p>
            )}
          </div>

          {/* Deadline */}
          <div className="rounded-2xl border border-line/25 bg-surface p-4 shadow-soft">
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
          <div className="rounded-2xl border border-line/25 bg-surface p-4 shadow-soft">
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

      {/* Lineage strip */}
      <section className="rounded-xl border border-line/15 bg-bg px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-subtext">
          <span className="font-semibold uppercase tracking-wide text-muted">
            {t("workspace.lineage.title")}
          </span>
          {brief ? (
            <span>
              {t("workspace.lineage.briefGenerated")}{" "}
              <span className="text-text">{fmtRelative(brief.generatedAt, fmtLocale)}</span>
            </span>
          ) : null}
          <span>
            {t("workspace.lineage.added")}{" "}
            <span className="text-text">{fmtRelative(opportunity.created_at, fmtLocale)}</span>
          </span>
        </div>
      </section>
    </div>
  );
}
