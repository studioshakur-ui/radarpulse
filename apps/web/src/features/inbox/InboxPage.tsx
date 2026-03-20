import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CalendarDays, CircleGauge, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn, fmtRelative, formatOriginType } from "@/lib/utils";
import {
  DeadlinePill,
  DecisionControl,
  DecisionStateBadge,
  ScoreStateBadge,
  SemanticPill,
  SignalBadge,
  StatePanel,
} from "@/components/ds/statusPrimitives";
import { useLocale, type TFn } from "@/lib/i18n";
import type { Decision } from "@/lib/types";
import { useInboxData } from "./useInboxData";
import { useDecisions } from "./useDecisions";
import { useOpportunityBrief, type BriefInput, type OpportunityBrief } from "./useOpportunityBrief";
import { useOpportunityScore, type OpportunityScore } from "@/features/workspace/useOpportunityScore";
import { createDossier } from "@/features/dossiers/dossierApi";

type InboxItem = ReturnType<typeof useInboxData>["items"][number];

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
};

function formatBudget(value: number | null, currency: string | null, t: TFn): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return t("inbox.card.budgetUnavailable");
  return new Intl.NumberFormat(navigator.language, {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQualityShort(score: number | null): string | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

function formatQuality(score: number | null, t: TFn): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return t("inbox.card.qualityNa");
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return `${t("inbox.card.qualityPrefix")} ${percent}%`;
}

function BriefPanel({ brief, t }: { brief: OpportunityBrief; t: TFn }) {
  return (
    <div className="space-y-3 text-sm">
      {brief.executive_summary ? (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtext">
            {t("inbox.card.brief.executiveSummary")}
          </div>
          <p className="leading-relaxed text-text">{brief.executive_summary}</p>
        </div>
      ) : null}

      {brief.fit_assessment ? (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtext">
            {t("inbox.card.brief.fitAssessment")}
          </div>
          <p className="leading-relaxed text-subtext">{brief.fit_assessment}</p>
        </div>
      ) : null}

      {brief.risk_flags.length > 0 ? (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtext">
            {t("inbox.card.brief.riskFlags")}
          </div>
          <ul className="space-y-1">
            {brief.risk_flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-1.5 text-warn">
                <span className="mt-0.5 shrink-0">{"•"}</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief.required_documents.length > 0 ? (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtext">
            {t("inbox.card.brief.requiredDocuments")}
          </div>
          <ul className="space-y-1 text-subtext">
            {brief.required_documents.map((doc, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-subtext">{"•"}</span>
                <span>{doc}</span>
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
          className="rounded-xl p-3 shadow-none"
        />
      ) : null}
    </div>
  );
}

// Desktop compact list row
function InboxRow({
  item,
  selected,
  decision,
  t,
  fmtLocale,
  daySuffix,
  onClick,
}: {
  item: InboxItem;
  selected: boolean;
  decision: Decision | null;
  t: TFn;
  fmtLocale: string;
  daySuffix: string;
  onClick: () => void;
}) {
  return (
    <article
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border px-4 py-3 transition-colors",
        selected
          ? "border-brand/50 bg-brand/8"
          : "border-line/20 bg-surface hover:bg-elevated/70",
        decision === "GO" && "border-l-2 border-l-good",
        decision === "HOLD" && "border-l-2 border-l-warn",
        decision === "NO_GO" && "border-l-2 border-l-bad",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold text-text">{item.title}</p>
        <DeadlinePill
          deadline={item.deadline_at}
          daySuffix={daySuffix}
          expiredLabel={t("inbox.deadline.expired")}
          size="sm"
        />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-subtext">
        {formatQualityShort(item.quality_score) ? (
          <SemanticPill className="shrink-0" size="sm" mono>
            {formatQualityShort(item.quality_score)}
          </SemanticPill>
        ) : null}
        {decision ? <DecisionStateBadge decision={decision} noGoLabel="NO-GO" size="sm" /> : null}
        <span className="truncate">{item.buyer_name || t("inbox.card.buyerUnavailable")}</span>
        {item.origin_type ? (
          <SignalBadge className="shrink-0" size="sm">
            {formatOriginType(item.origin_type)}
          </SignalBadge>
        ) : null}
        <span className="ml-auto shrink-0">{fmtRelative(item.published_at, fmtLocale)}</span>
      </div>
    </article>
  );
}

// Desktop detail panel
function InboxDetail({
  item,
  decision,
  brief,
  briefLoading,
  briefError,
  score,
  t,
  fmtLocale,
  daySuffix,
  onDecide,
  onGenerateBrief,
  onOpenDossier,
  openingDossier,
}: {
  item: InboxItem;
  decision: Decision | null;
  brief: OpportunityBrief | null;
  briefLoading: boolean;
  briefError: string | null;
  score: OpportunityScore | null;
  t: TFn;
  fmtLocale: string;
  daySuffix: string;
  onDecide: (id: string, d: Decision) => void;
  onGenerateBrief: () => void;
  onOpenDossier: (item: InboxItem, decision: Decision | null) => void;
  openingDossier: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line/25 bg-surface shadow-soft">
      <div className="flex-1 overflow-y-auto p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text">{item.title}</h2>
            <p className="mt-0.5 text-sm text-subtext">
              {item.buyer_name || t("inbox.card.buyerUnavailable")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {score ? (
              <ScoreStateBadge
                band={score.score_band}
                label={t(`workspace.score.${score.score_band}`)}
                value={`${Math.round(score.score_value * 100)}%`}
                size="sm"
              />
            ) : null}
            <SemanticPill size="sm">{formatQuality(item.quality_score, t)}</SemanticPill>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-subtext">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {item.region || item.country_code || "—"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {fmtRelative(item.published_at, fmtLocale)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {formatBudget(item.budget_amount, item.budget_currency, t)}
          </span>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <CircleGauge className="h-3.5 w-3.5 shrink-0" />
            {fmtRelative(item.deadline_at, fmtLocale)}
            <DeadlinePill
              deadline={item.deadline_at}
              daySuffix={daySuffix}
              expiredLabel={t("inbox.deadline.expired")}
              size="sm"
            />
          </span>
          {item.origin_type ? (
            <SignalBadge size="sm">
              {formatOriginType(item.origin_type)}
            </SignalBadge>
          ) : null}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-line/15 pb-4">
          <DecisionControl
            value={decision}
            onChange={(nextDecision) => onDecide(item.id, nextDecision)}
            size="sm"
            noGoLabel="NO-GO"
          />
          <button
            type="button"
            onClick={onGenerateBrief}
            disabled={briefLoading}
            className={cn(
              "rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition",
              brief
                ? "border-brand/50 bg-brand/15 text-brand"
                : "border-line/25 bg-bg text-subtext hover:bg-elevated",
              briefLoading && "cursor-wait opacity-70",
            )}
          >
            {briefLoading ? t("inbox.card.brief.generating") : t("inbox.card.brief")}
          </button>
          <button
            type="button"
            onClick={() => onOpenDossier(item, decision)}
            disabled={openingDossier}
            className="ml-auto rounded-lg border border-line/25 bg-bg px-2 py-0.5 text-[11px] font-semibold text-subtext transition hover:bg-elevated disabled:cursor-wait disabled:opacity-70"
          >
            {openingDossier ? t("dossiers.opening") : t("dossiers.open")}
          </button>
        </div>

        {/* Brief content */}
        <div className="pt-4">
          {briefError ? (
            <StatePanel
              tone="bad"
              title={t("inbox.card.brief.error")}
              className="p-3 shadow-none"
            >
              <button
                type="button"
                onClick={onGenerateBrief}
                className="inline-flex items-center rounded-lg border border-bad/30 bg-bad/10 px-3 py-1.5 text-xs font-semibold text-bad transition hover:bg-bad/15"
              >
                {t("workspace.brief.refresh")}
              </button>
            </StatePanel>
          ) : brief ? (
            <BriefPanel brief={brief} t={t} />
          ) : !briefLoading ? (
            <p className="text-sm text-subtext/60">{t("workspace.brief.empty")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type DecisionFilter = "all" | "undecided" | "GO" | "HOLD" | "NO_GO";

export default function InboxPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const fmtLocale = LOCALE_MAP[locale] ?? "en-US";
  const daySuffix = t("inbox.deadline.daysSuffix");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [minQualityInput, setMinQualityInput] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [originTypeFilter, setOriginTypeFilter] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedBriefs, setExpandedBriefs] = useState<Record<string, boolean>>({});
  const [openingDossierId, setOpeningDossierId] = useState<string | null>(null);

  const minQuality = useMemo(() => {
    const parsed = Number(minQualityInput);
    if (!minQualityInput.trim() || !Number.isFinite(parsed)) return undefined;
    return Math.max(0, Math.min(1, parsed));
  }, [minQualityInput]);

  const { items, loading, loadingMore, error, hasMore, subscriptionRequired, loadMore } =
    useInboxData({ q, status, minQuality, originType: originTypeFilter || undefined });

  const { decide, getDecision, store } = useDecisions();
  const {
    generate,
    getBrief,
    isLoading: isBriefLoading,
    getError: getBriefError,
  } = useOpportunityBrief();

  const filteredItems = useMemo(() => {
    if (decisionFilter === "all") return items;
    if (decisionFilter === "undecided") return items.filter((item) => !store[item.id]);
    return items.filter((item) => store[item.id]?.decision === decisionFilter);
  }, [items, decisionFilter, store]);

  const hasActiveFilters = q.trim() !== "" || status !== "all" || minQualityInput.trim() !== "" || decisionFilter !== "all" || originTypeFilter !== "";

  const undecidedCount = useMemo(
    () => filteredItems.filter((item) => !store[item.id]).length,
    [filteredItems, store],
  );

  // Auto-select first item after initial load
  useEffect(() => {
    if (!selectedId && filteredItems.length > 0) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems.length, selectedId]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) ?? null,
    [filteredItems, selectedId],
  );
  const { score: selectedScore } = useOpportunityScore(selectedId, selectedItem?.deadline_at ?? null);

  const selectedBriefInput = useMemo((): BriefInput | null => {
    if (!selectedItem) return null;
    return {
      id: selectedItem.id,
      title: selectedItem.title,
      locale,
      buyer_name: selectedItem.buyer_name,
      status: selectedItem.status,
      deadline_at: selectedItem.deadline_at,
      budget_amount: selectedItem.budget_amount,
      budget_currency: selectedItem.budget_currency,
      country_code: selectedItem.country_code,
      origin_type: selectedItem.origin_type,
      region: selectedItem.region,
    };
  }, [locale, selectedItem]);

  // Auto-generate brief when selected item changes
  useEffect(() => {
    if (!selectedBriefInput) return;
    if (getBrief(selectedBriefInput.id) || isBriefLoading(selectedBriefInput.id) || getBriefError(selectedBriefInput.id)) return;
    void generate(selectedBriefInput);
  }, [generate, getBrief, getBriefError, isBriefLoading, selectedBriefInput]);

  const statusLabel: Record<string, string> = {
    active: t("inbox.filter.status.active"),
    closed: t("inbox.filter.status.closed"),
  };
  const decisionLabel: Record<DecisionFilter, string> = {
    all: t("inbox.filter.decision.all"),
    undecided: t("inbox.filter.decision.undecided"),
    GO: "GO",
    HOLD: "HOLD",
    NO_GO: "NO-GO",
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ label: string; onRemove: () => void }> = [];
    if (status !== "all")
      chips.push({
        label: `${t("inbox.filter.chip.status")}: ${statusLabel[status] ?? status}`,
        onRemove: () => setStatus("all"),
      });
    if (minQualityInput.trim())
      chips.push({
        label: `${t("inbox.filter.chip.quality")} ${minQualityInput}`,
        onRemove: () => setMinQualityInput(""),
      });
    if (decisionFilter !== "all")
      chips.push({
        label: `${t("inbox.filter.chip.decision")}: ${decisionLabel[decisionFilter]}`,
        onRemove: () => setDecisionFilter("all"),
      });
    if (originTypeFilter)
      chips.push({
        label: `${t("inbox.filter.chip.originType")}: ${originTypeFilter}`,
        onRemove: () => setOriginTypeFilter(""),
      });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, minQualityInput, decisionFilter, t]);

  function resetAllFilters() {
    setStatus("all");
    setMinQualityInput("");
    setDecisionFilter("all");
    setOriginTypeFilter("");
  }

  function toggleBrief(item: BriefInput) {
    const id = item.id;
    const isExpanded = expandedBriefs[id];
    if (!isExpanded && !getBrief(id) && !isBriefLoading(id)) {
      void generate(item);
    }
    setExpandedBriefs((prev) => ({ ...prev, [id]: !isExpanded }));
  }

  async function handleOpenDossier(item: InboxItem, decision: Decision | null) {
    setOpeningDossierId(item.id);
    try {
      const dossier = await createDossier(item.id, decision === "GO" ? "GO" : undefined);
      navigate(`/dossier/${dossier.id}`);
    } catch {
      toast.error(t("dossiers.openFallback"));
      navigate(`/workspace/${item.id}`);
    } finally {
      setOpeningDossierId((current) => (current === item.id ? null : current));
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5">
      {/* Header & filter bar */}
      <section className="rounded-3xl border border-line/25 bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {t("inbox.title")}
              {!loading && (
                <span className="ml-3 inline-flex items-center gap-1 rounded-full border border-line/30 bg-surface px-2.5 py-0.5 text-xs font-medium text-subtext">
                  {filteredItems.length} {t("inbox.counter.opportunities")}
                  {undecidedCount > 0 && (
                    <><span className="text-subtext/50">&middot;</span>{undecidedCount} {t("inbox.counter.toDecide")}</>
                  )}
                </span>
              )}
            </h1>

          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("inbox.filter.search.placeholder")}
              className="rounded-xl border border-line/25 bg-bg px-3 py-1.5 text-sm outline-none transition focus:ring-2 focus:ring-brand/40"
            />
            <button
              type="button"
              onClick={() => setFilterPanelOpen((o) => !o)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-sm font-semibold transition",
                filterPanelOpen || activeChips.length > 0
                  ? "border-brand/50 bg-brand/10 text-brand"
                  : "border-line/25 bg-bg text-subtext hover:bg-elevated",
              )}
            >
              {t("inbox.filter.toggleBtn")}
              {activeChips.length > 0 && (
                <span className="ml-1.5 rounded-full bg-brand/25 px-1.5 text-[10px] font-bold text-brand">
                  {activeChips.length}
                </span>
              )}
            </button>
            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="rounded-xl border border-line/25 bg-bg px-3 py-1.5 text-sm text-subtext transition hover:bg-elevated"
              >
                {t("inbox.filter.resetAll")}
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <SignalBadge
                key={chip.label}
                tone="brand"
                className="gap-1.5 px-3 py-0.5 text-xs"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="ml-0.5 rounded-full hover:text-bad"
                  aria-label="remove filter"
                >
                  &times;
                </button>
              </SignalBadge>
            ))}
          </div>
        )}

        {/* Collapsible filter panel */}
        {filterPanelOpen && (
          <div className="mt-4 grid gap-3 border-t border-line/15 pt-4 md:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("inbox.filter.status")}
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/40"
              >
                <option value="all">{t("inbox.filter.status.all")}</option>
                <option value="active">{t("inbox.filter.status.active")}</option>
                <option value="closed">{t("inbox.filter.status.closed")}</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("inbox.filter.minQuality")}
              </span>
              <input
                value={minQualityInput}
                onChange={(e) => setMinQualityInput(e.target.value)}
                placeholder={t("inbox.filter.minQuality.placeholder")}
                inputMode="decimal"
                className="w-full rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/40"
              />
              {minQualityInput.trim() && Number.isFinite(Number(minQualityInput)) && Number(minQualityInput) > 1 ? (
                <p className="mt-1 text-xs text-warn">{t("inbox.filter.minQuality.hint")}</p>
              ) : null}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("inbox.filter.decision")}
              </span>
              <select
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value as DecisionFilter)}
                className="w-full rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/40"
              >
                <option value="all">{t("inbox.filter.decision.all")}</option>
                <option value="undecided">{t("inbox.filter.decision.undecided")}</option>
                <option value="GO">GO</option>
                <option value="HOLD">HOLD</option>
                <option value="NO_GO">NO-GO</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("inbox.filter.originType")}
              </span>
              <select
                value={originTypeFilter}
                onChange={(e) => setOriginTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-line/25 bg-bg px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/40"
              >
                <option value="">{t("inbox.filter.originType.all")}</option>
                <option value="WORKS">{formatOriginType("WORKS", locale) ?? "WORKS"}</option>
                <option value="SERVICES">{formatOriginType("SERVICES", locale) ?? "SERVICES"}</option>
                <option value="SUPPLIES">{formatOriginType("SUPPLIES", locale) ?? "SUPPLIES"}</option>
                <option value="OTHER">{formatOriginType("OTHER", locale) ?? "OTHER"}</option>
              </select>
            </label>
          </div>
        )}
      </section>

      {/* Subscription / error / loading states */}
      {subscriptionRequired ? (
        <StatePanel
          tone="warn"
          title={t("inbox.subscription.title")}
          description={t("inbox.subscription.description")}
          className="mt-5 p-6"
        >
          <Link
            to="/abbonamento"
            className="inline-flex items-center rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand/20"
          >
            {t("inbox.subscription.cta")}
          </Link>
        </StatePanel>
      ) : null}

      {error ? (
        <StatePanel tone="bad" description={error} className="mt-5" />
      ) : null}

      {loading ? (
        <StatePanel description={t("inbox.loading")} className="mt-5" />
      ) : null}

      {!loading && filteredItems.length === 0 ? (
        <StatePanel
          description={hasActiveFilters ? t("inbox.empty.filtered") : t("inbox.empty")}
          className="mt-5 p-6"
        >
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-1 inline-flex items-center rounded-xl border border-line/25 bg-surface px-4 py-2 text-sm font-medium text-subtext transition hover:bg-elevated"
            >
              {t("inbox.filter.resetAll")}
            </button>
          ) : null}
        </StatePanel>
      ) : null}

      {/* Desktop split-pane (lg+) */}
      {!loading ? (
        <div
          className="mt-4 hidden gap-4 lg:flex"
          style={{ height: "calc(100dvh - 18rem)" }}
        >
          {/* Left: compact scrollable list */}
          <div className="w-[42%] shrink-0 space-y-2 overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                decision={getDecision(item.id)}
                t={t}
                fmtLocale={fmtLocale}
                daySuffix={daySuffix}
                onClick={() => setSelectedId(item.id)}
              />
            ))}
            {hasMore && decisionFilter === "all" ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="inline-flex items-center rounded-xl border border-line/25 bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-elevated/70 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loadingMore ? t("inbox.loadingMore") : t("inbox.loadMore")}
                </button>
              </div>
            ) : null}
          </div>

          {/* Right: detail panel */}
          <div className="min-w-0 flex-1">
            {selectedItem && selectedBriefInput ? (
              <InboxDetail
                item={selectedItem}
                decision={getDecision(selectedItem.id)}
                brief={getBrief(selectedItem.id)}
                briefLoading={isBriefLoading(selectedItem.id)}
                briefError={getBriefError(selectedItem.id)}
                score={selectedScore}
                t={t}
                fmtLocale={fmtLocale}
                daySuffix={daySuffix}
                onDecide={decide}
                onGenerateBrief={() => void generate(selectedBriefInput)}
                onOpenDossier={handleOpenDossier}
                openingDossier={openingDossierId === selectedItem.id}
              />
            ) : (
              <StatePanel
                description={t("inbox.noSelection")}
                className="flex h-full items-center justify-center"
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Mobile card stack (< lg) */}
      {!loading ? (
        <section className="mt-5 space-y-3 lg:hidden">
          {filteredItems.map((item) => {
            const decision = getDecision(item.id);
            const brief = getBrief(item.id);
            const briefLoading = isBriefLoading(item.id);
            const briefError = getBriefError(item.id);
            const briefExpanded = expandedBriefs[item.id] ?? false;

            const briefInput: BriefInput = {
              id: item.id,
              title: item.title,
              locale,
              buyer_name: item.buyer_name,
              status: item.status,
              deadline_at: item.deadline_at,
              budget_amount: item.budget_amount,
              budget_currency: item.budget_currency,
              country_code: item.country_code,
              origin_type: item.origin_type,
              region: item.region,
            };

            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-2xl border bg-surface p-4 shadow-soft transition",
                  decision === "GO" && "border-good/40",
                  decision === "HOLD" && "border-warn/40",
                  decision === "NO_GO" && "border-bad/40",
                  !decision && "border-line/25",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-text">{item.title}</h2>
                    <div className="mt-1 text-sm text-subtext">
                      {item.buyer_name || t("inbox.card.buyerUnavailable")}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DeadlinePill
                      deadline={item.deadline_at}
                      daySuffix={daySuffix}
                      expiredLabel={t("inbox.deadline.expired")}
                    />
                    <SemanticPill>{formatQuality(item.quality_score, t)}</SemanticPill>
                    {item.origin_type ? (
                      <SignalBadge uppercase size="md">
                        {formatOriginType(item.origin_type)}
                      </SignalBadge>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <DecisionControl
                    value={decision}
                    onChange={(nextDecision) => decide(item.id, nextDecision)}
                    noGoLabel="NO-GO"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-subtext">
                  <div className="inline-flex items-center gap-2 rounded-full border border-line/20 bg-bg px-2.5 py-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{item.region || item.country_code || "—"}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-line/20 bg-bg px-2.5 py-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{formatBudget(item.budget_amount, item.budget_currency, t)}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-line/20 bg-bg px-2.5 py-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{fmtRelative(item.published_at, fmtLocale)}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleBrief(briefInput)}
                    disabled={briefLoading}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                      briefExpanded && brief
                        ? "border-brand/50 bg-brand/15 text-brand"
                        : "border-line/25 bg-bg text-subtext hover:bg-elevated",
                      briefLoading && "cursor-wait opacity-70",
                    )}
                  >
                    {briefLoading ? t("inbox.card.brief.generating") : t("inbox.card.brief")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleOpenDossier(item, decision)}
                    disabled={openingDossierId === item.id}
                    className="rounded-xl border border-line/25 bg-bg px-3 py-2.5 text-center text-sm font-semibold text-subtext transition hover:bg-elevated disabled:cursor-wait disabled:opacity-70"
                  >
                    {openingDossierId === item.id ? t("dossiers.opening") : t("dossiers.open")}
                  </button>
                </div>

                {briefExpanded ? (
                  briefError ? (
                    <StatePanel
                      tone="bad"
                      description={t("inbox.card.brief.error")}
                      className="mt-3 p-3 shadow-none"
                    />
                  ) : brief ? (
                    <div className="mt-4 border-t border-border/30 pt-4">
                      <BriefPanel brief={brief} t={t} />
                    </div>
                  ) : null
                ) : null}
              </article>
            );
          })}

          {hasMore && decisionFilter === "all" ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex items-center rounded-xl border border-line/25 bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-elevated/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingMore ? t("inbox.loadingMore") : t("inbox.loadMore")}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
