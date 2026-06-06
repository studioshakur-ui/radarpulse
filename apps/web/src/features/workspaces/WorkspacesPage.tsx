import { Link } from "react-router-dom";
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, FolderOpen, MapPin } from "lucide-react";
import { PageIntro, MetricBlock, SurfaceSection } from "@/components/ds/surfacePrimitives";
import { DeadlinePill, SemanticPill, StatePanel } from "@/components/ds/statusPrimitives";
import { fmtRelative } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import type { WorkspaceStatus } from "./workspaceApi";
import { useWorkspaces } from "./useWorkspaces";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
};

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

export default function WorkspacesPage() {
  const { t, locale } = useLocale();
  const fmtLocale = LOCALE_MAP[locale] ?? "en-US";
  const { items, loading, error, reload } = useWorkspaces();

  const grouped = {
    review: items.filter((item) => item.status === "NEW" || item.status === "REVIEW"),
    progress: items.filter((item) => item.status === "GO"),
    blocked: items.filter((item) => item.status === "HOLD" || item.status === "BLOCKED"),
    ready: items.filter((item) => item.status === "READY" || item.status === "SUBMITTED"),
  };

  const sections: Array<{ key: keyof typeof grouped; title: string; subtitle: string }> = [
    { key: "review", title: t("dossiers.section.review"), subtitle: t("dossiers.section.review.subtitle") },
    { key: "progress", title: t("dossiers.section.progress"), subtitle: t("dossiers.section.progress.subtitle") },
    { key: "blocked", title: t("dossiers.section.blocked"), subtitle: t("dossiers.section.blocked.subtitle") },
    { key: "ready", title: t("dossiers.section.ready"), subtitle: t("dossiers.section.ready.subtitle") },
  ];
  const leadSection = sections
    .map((section) => ({ ...section, count: grouped[section.key].length }))
    .sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-5">
      <PageIntro
        title={t("dossiers.title")}
        subtitle={t("dossiers.subtitle")}
        action={
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border border-line/25 bg-bg px-4 py-2 text-sm font-semibold text-subtext transition hover:bg-elevated"
          >
            {t("dossiers.refresh")}
          </button>
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-line/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,242,255,0.92))] shadow-soft">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-line/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.08),transparent_30%),linear-gradient(140deg,rgba(255,255,255,0.98),rgba(247,243,255,0.92))] p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/75">Workspace command</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              Tracked work, ordered by operating pressure.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-subtext">
              Qualification, active delivery, blockers and ready-to-submit work live in one surface so teams can move without bouncing between views.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-line/15 bg-surface/92 px-4 py-3 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">Lead lane</div>
                <div className="mt-1 text-lg font-semibold text-text">{leadSection?.title ?? "—"}</div>
              </div>
              <div className="rounded-2xl border border-line/15 bg-surface/92 px-4 py-3 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">Tracked</div>
                <div className="mt-1 text-lg font-semibold text-text">{items.length}</div>
              </div>
              <div className="rounded-2xl border border-line/15 bg-surface/92 px-4 py-3 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-subtext/75">Needs movement</div>
                <div className="mt-1 text-lg font-semibold text-text">{grouped.review.length + grouped.blocked.length}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 bg-[linear-gradient(165deg,rgba(244,240,255,0.94),rgba(255,255,255,0.78))] p-5 sm:p-6">
            <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Pipeline focus</div>
              <div className="mt-2 text-2xl font-semibold text-text">
                {grouped.progress.length > 0 ? t("dossiers.section.progress") : t("dossiers.section.review")}
              </div>
              <div className="mt-1 text-sm text-subtext">
                {grouped.progress.length > 0
                  ? `${grouped.progress.length} live workspaces already moving forward.`
                  : `${grouped.review.length} workspaces are waiting for qualification or first action.`}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-good/16 bg-[linear-gradient(180deg,rgba(22,163,74,0.08),rgba(255,255,255,0.96))] p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Ready</div>
                <div className="mt-2 text-xl font-semibold text-text">{grouped.ready.length}</div>
                <div className="mt-1 text-sm text-subtext">Workspaces close to submission or already shipped.</div>
              </div>
              <div className="rounded-3xl border border-warn/18 bg-[linear-gradient(180deg,rgba(217,119,6,0.08),rgba(255,255,255,0.96))] p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">Blocked</div>
                <div className="mt-2 text-xl font-semibold text-text">{grouped.blocked.length}</div>
                <div className="mt-1 text-sm text-subtext">Items that need a decision, unblocker or refreshed input.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-4">
        <MetricBlock label={t("dossiers.metric.total")} value={String(items.length)} />
        <MetricBlock label={t("dossiers.metric.review")} value={String(grouped.review.length)} tone="brand" />
        <MetricBlock label={t("dossiers.metric.active")} value={String(grouped.progress.length)} tone="good" />
        <MetricBlock label={t("dossiers.metric.ready")} value={String(grouped.ready.length)} tone="good" />
      </div>

      {loading ? <StatePanel description={t("dossiers.loading")} /> : null}
      {error ? <StatePanel tone="bad" description={error} /> : null}

      {!loading && !error ? sections.map((section) => {
        const rows = grouped[section.key];
        return (
          <SurfaceSection
            key={section.key}
            title={section.title}
            subtitle={`${section.subtitle}${rows.length > 0 ? ` • ${rows.length} workspace${rows.length === 1 ? "" : "s"}` : ""}`}
          >
            {rows.length === 0 ? (
              <StatePanel description={t("dossiers.emptySection")} className="p-4 shadow-none" />
            ) : (
              <div className="grid gap-3 2xl:grid-cols-2">
                {rows.map((item) => (
                  <article key={item.id} className="rounded-[24px] border border-line/15 bg-surface/92 p-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-text">{item.opportunity?.title ?? t("dossiers.missingTitle")}</h3>
                        <p className="mt-1 text-sm text-subtext">
                          {item.opportunity?.buyer_name ?? t("inbox.card.buyerUnavailable")}
                        </p>
                      </div>
                      <SemanticPill tone={workspaceTone(item.status)}>
                        {t(`dossiers.status.${item.status.toLowerCase()}`)}
                      </SemanticPill>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-subtext">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line/20 bg-surface px-2.5 py-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{item.opportunity?.country_code ?? "—"}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line/20 bg-surface px-2.5 py-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{fmtRelative(item.opportunity?.published_at ?? null, fmtLocale)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line/20 bg-surface px-2.5 py-1">
                        <BriefcaseBusiness className="h-3.5 w-3.5" />
                        <span>{section.title}</span>
                      </span>
                      <DeadlinePill
                        deadline={item.opportunity?.deadline_at}
                        daySuffix={t("inbox.deadline.daysSuffix")}
                        expiredLabel={t("inbox.deadline.expired")}
                        size="sm"
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-subtext">
                        {t("dossiers.updated")} {fmtRelative(item.updated_at, fmtLocale)}
                      </span>
                      <Link
                        to={`/workspaces/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line/25 bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-elevated"
                      >
                        <FolderOpen className="h-4 w-4" />
                        {t("dossiers.open")}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SurfaceSection>
        );
      }) : null}
    </div>
  );
}
