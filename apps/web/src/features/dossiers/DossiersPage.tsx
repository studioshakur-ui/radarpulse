import { Link } from "react-router-dom";
import { CalendarDays, FolderOpen, MapPin } from "lucide-react";
import { PageIntro, MetricBlock, SurfaceSection } from "@/components/ds/surfacePrimitives";
import { DeadlinePill, SemanticPill, StatePanel } from "@/components/ds/statusPrimitives";
import { fmtRelative } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import type { DossierStatus } from "@/lib/types";
import { useDossiers } from "./useDossiers";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
};

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

export default function DossiersPage() {
  const { t, locale } = useLocale();
  const fmtLocale = LOCALE_MAP[locale] ?? "en-US";
  const { items, loading, error, reload } = useDossiers();

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

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow={t("dossiers.eyebrow")}
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

      <div className="grid gap-3 md:grid-cols-4">
        <MetricBlock label={t("dossiers.metric.total")} value={String(items.length)} hint={t("dossiers.metric.totalHint")} />
        <MetricBlock label={t("dossiers.metric.review")} value={String(grouped.review.length)} hint={t("dossiers.metric.reviewHint")} tone="brand" />
        <MetricBlock label={t("dossiers.metric.active")} value={String(grouped.progress.length)} hint={t("dossiers.metric.activeHint")} tone="good" />
        <MetricBlock label={t("dossiers.metric.ready")} value={String(grouped.ready.length)} hint={t("dossiers.metric.readyHint")} tone="good" />
      </div>

      {loading ? <StatePanel description={t("dossiers.loading")} /> : null}
      {error ? <StatePanel tone="bad" description={error} /> : null}

      {!loading && !error ? sections.map((section) => {
        const rows = grouped[section.key];
        return (
          <SurfaceSection
            key={section.key}
            title={section.title}
            subtitle={section.subtitle}
          >
            {rows.length === 0 ? (
              <StatePanel description={t("dossiers.emptySection")} className="p-4 shadow-none" />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {rows.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-line/15 bg-surface/92 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-text">{item.opportunity?.title ?? t("dossiers.missingTitle")}</h3>
                        <p className="mt-1 text-sm text-subtext">
                          {item.opportunity?.buyer_name ?? t("inbox.card.buyerUnavailable")}
                        </p>
                      </div>
                      <SemanticPill tone={dossierTone(item.status)}>
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
