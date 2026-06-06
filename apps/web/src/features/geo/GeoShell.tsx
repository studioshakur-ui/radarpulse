import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Globe2, Map as MapIcon, MapPinned, Building2, CalendarDays, ArrowUpRight, Radar } from "lucide-react";
import { MetricBlock, SurfaceSection } from "@/components/ds/surfacePrimitives";
import { DeadlinePill, SemanticPill, SignalBadge } from "@/components/ds/statusPrimitives";
import { cn, daysLeft, fmtDateTime } from "@/lib/utils";
import { useLocale, type TFn } from "@/lib/i18n";
import { displayOriginLabel, sourceLabel, type GeoFeedBreakdownItem, type GeoOpportunity } from "@/features/geo/geoData";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  it: "it-IT",
};

export type GeoBreadcrumbItem = {
  label: string;
  to?: string;
};

type GeoTheme = {
  haloClass: string;
  chipClass: string;
  accentTextClass: string;
  cardAccentClass: string;
};

function CountryFlagMark({ countryCode, label }: { countryCode?: string | null; label?: string | null }) {
  const code = (countryCode ?? "").toUpperCase();
  const shared = "inline-flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/70 shadow-soft";

  if (code === "FR") {
    return (
      <span aria-label={label ?? "France"} className={shared}>
        <span className="h-full w-1/3 bg-[#1d4ed8]" />
        <span className="h-full w-1/3 bg-white" />
        <span className="h-full w-1/3 bg-[#dc2626]" />
      </span>
    );
  }

  if (code === "IT") {
    return (
      <span aria-label={label ?? "Italy"} className={shared}>
        <span className="h-full w-1/3 bg-[#16a34a]" />
        <span className="h-full w-1/3 bg-white" />
        <span className="h-full w-1/3 bg-[#dc2626]" />
      </span>
    );
  }

  if (code === "GB") {
    return (
      <span
        aria-label={label ?? "United Kingdom"}
        className={cn(shared, "bg-[linear-gradient(135deg,#1d4ed8_0%,#1d4ed8_42%,white_42%,white_48%,#dc2626_48%,#dc2626_56%,white_56%,white_62%,#1d4ed8_62%,#1d4ed8_100%)]")}
      />
    );
  }

  return (
    <span className={cn(shared, "bg-surface/80 px-1 text-[10px] font-semibold text-subtext")}>
      {code || "GL"}
    </span>
  );
}

function geoTheme(countryCode?: string | null): GeoTheme {
  void countryCode;
  return {
    haloClass:
      "bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.05),transparent_36%)]",
    chipClass: "border-brand/25 bg-brand/10 text-brand",
    accentTextClass: "text-brand",
    cardAccentClass: "border-brand/25 bg-brand/10",
  };
}

function cleanGeoOpportunityTitle(title: string) {
  return title
    .replace(/^(Italy|Italia|France|United Kingdom|Royaume-Uni|Regno Unito|UK|GB|FR|IT)\s+[—\-:]\s+/i, "")
    .replace(/^Titolo:\s+/i, "")
    .trim();
}

export function GeoShell({
  title,
  subtitle,
  breadcrumbs,
  themeCountryCode,
  themeCountryName,
  themeCountryFlag,
  children,
}: {
  title: string;
  subtitle: string;
  breadcrumbs: GeoBreadcrumbItem[];
  themeCountryCode?: string | null;
  themeCountryName?: string | null;
  themeCountryFlag?: string | null;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const theme = geoTheme(themeCountryCode);
  const marketLabel = themeCountryCode
    ? `${themeCountryName ?? themeCountryCode}`.trim()
    : t("geo.nav.global");

  return (
    <div className="relative overflow-hidden text-text">
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[36px]", theme.haloClass)} />

      <header className="relative rounded-3xl border border-line/25 bg-surface/92 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4">
          <GeoBreadcrumbs items={breadcrumbs} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/75">
                  {t("geo.shell.eyebrow")}
                </div>
                <SignalBadge className={cn("gap-2", theme.chipClass)} uppercase>
                  {themeCountryCode ? <CountryFlagMark countryCode={themeCountryCode} label={themeCountryName} /> : null}
                  {themeCountryCode ? `${themeCountryCode} ${marketLabel}` : marketLabel}
                </SignalBadge>
              </div>
              <div className={cn("mt-3 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-soft", theme.cardAccentClass)}>
                {themeCountryCode ? <CountryFlagMark countryCode={themeCountryCode} label={themeCountryName} /> : null}
                <span className={theme.accentTextClass}>{marketLabel}</span>
                <span className="text-subtext">{themeCountryCode ? t("geo.hero.countryMode") : t("geo.hero.globalMode")}</span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-subtext">{subtitle}</p>
            </div>
            <Link
              to="/workspaces"
              className="inline-flex items-center gap-2 rounded-xl border border-border/30 bg-surface/70 px-3 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
            >
              {t("nav.dossiers")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <div className="relative mt-8">{children}</div>
    </div>
  );
}

export function GeoBreadcrumbs({ items }: { items: GeoBreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-subtext/80">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <ChevronRight className="h-4 w-4 text-subtext/55" /> : null}
          {item.to ? (
            <Link to={item.to} className="font-medium text-subtext/85 transition hover:text-text">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-text">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function GeoMetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string; hint?: string }>;
}) {
  return (
    <div className={cn("grid gap-4", items.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4")}>
      {items.map((item) => (
        <MetricBlock key={item.label} label={item.label} value={item.value} hint={item.hint} />
      ))}
    </div>
  );
}

export function GeoSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return <SurfaceSection title={title} subtitle={subtitle}>{children}</SurfaceSection>;
}

export function GeoChildCard({
  title,
  subtitle,
  to,
  icon,
  badge,
}: {
  title: string;
  subtitle: string;
  to: string;
  icon?: React.ReactNode;
  badge?: string | null;
}) {
  const { t } = useLocale();
  return (
    <Link
      to={to}
      className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-line/25 bg-surface/92 p-5 shadow-soft transition hover:bg-elevated/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            {icon}
            <span className="truncate">{title}</span>
          </div>
          <div className="mt-2 text-sm leading-relaxed text-subtext">{subtitle}</div>
        </div>
        {badge ? <SignalBadge size="sm">{badge}</SignalBadge> : null}
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">
        {t("geo.child.open")} <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

export function GeoInsightList({
  items,
  emptyLabel,
  linkBuilder,
}: {
  items: GeoFeedBreakdownItem[];
  emptyLabel: string;
  linkBuilder?: (item: GeoFeedBreakdownItem) => string | null;
}) {
  if (items.length === 0) {
    return <div className="text-sm text-subtext">{emptyLabel}</div>;
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const href = linkBuilder?.(item) ?? null;
        const content = (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line/25 bg-surface/92 px-4 py-3 shadow-soft">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text">{item.label}</div>
              {item.hint ? <div className="truncate text-xs text-subtext">{item.hint}</div> : null}
            </div>
            <SignalBadge size="sm" mono>
              {item.value}
            </SignalBadge>
          </div>
        );

        if (!href) return <div key={`${item.label}-${item.hint ?? ""}`}>{content}</div>;
        return (
          <Link key={`${item.label}-${item.hint ?? ""}`} to={href} className="transition hover:opacity-90">
            {content}
          </Link>
        );
      })}
    </div>
  );
}

export function GeoSignalStrip({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "good" | "warn" | "bad" }>;
}) {
  const toneClass: Record<NonNullable<(typeof items)[number]["tone"]>, string> = {
    default: "border-line/25 bg-surface/92 text-text",
    good: "border-good/25 bg-good/8 text-good",
    warn: "border-warn/25 bg-warn/8 text-warn",
    bad: "border-bad/25 bg-bad/8 text-bad",
  };

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}-${item.tone ?? "default"}`}
          className={cn(
            "rounded-2xl border px-4 py-3 shadow-soft",
            toneClass[item.tone ?? "default"],
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{item.label}</div>
          <div className="mt-1 text-lg font-semibold">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

const CONTENT_TYPE_LABELS: Record<string, Record<string, string>> = {
  en: { tender: "Tender", grant: "Grant", news: "News", other: "Other" },
  fr: { tender: "Appel d'offres", grant: "Subvention", news: "Actualité", other: "Autre" },
  it: { tender: "Gara d'appalto", grant: "Bando", news: "Notizia", other: "Altro" },
};

function contentTypeLabel(value: string, locale: string): string {
  return CONTENT_TYPE_LABELS[locale]?.[value] ?? CONTENT_TYPE_LABELS.en[value] ?? value;
}

function FilterChipBar({
  label,
  options,
  selected,
  onSelect,
  allLabel,
}: {
  label: string;
  options: Array<{ value: string; displayLabel: string; count: number }>;
  selected: string | null;
  onSelect: (value: string | null) => void;
  allLabel: string;
}) {
  const total = options.reduce((sum, o) => sum + o.count, 0);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtext/60">
        {label}
      </span>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
            selected === null
              ? "border-brand/40 bg-brand/12 text-brand"
              : "border-line/25 bg-surface/80 text-text/70 hover:border-brand/25 hover:text-text",
          )}
        >
          {allLabel}
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", selected === null ? "bg-brand/20 text-brand" : "bg-line/20 text-text/50")}>
            {total}
          </span>
        </button>
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                isActive
                  ? "border-brand/40 bg-brand/12 text-brand"
                  : "border-line/25 bg-surface/80 text-text/70 hover:border-brand/25 hover:text-text",
              )}
            >
              {opt.displayLabel}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", isActive ? "bg-brand/20 text-brand" : "bg-line/20 text-text/50")}>
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GeoOpportunityList({
  items,
  locationResolver,
}: {
  items: GeoOpportunity[];
  locationResolver?: (item: GeoOpportunity) => string | null;
}) {
  const { locale, t } = useLocale();
  const intlLocale = LOCALE_MAP[locale] ?? "en-US";
  const daySuffix = t("inbox.deadline.daysSuffix");
  const PAGE_SIZE = 20;
  const [selectedSector, setSelectedSector] = React.useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  // Build sector chip options with counts
  const sectorOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const s = String(item.sector ?? "").trim();
      if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, displayLabel: value, count }));
  }, [items]);

  // Build content_type chip options with counts
  const contentTypeOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const ct = String(item.content_type ?? "").trim();
      if (ct) counts.set(ct, (counts.get(ct) ?? 0) + 1);
    }
    // Preferred display order
    const ORDER = ["tender", "grant", "news", "other"];
    return [...counts.entries()]
      .sort((a, b) => {
        const ia = ORDER.indexOf(a[0]);
        const ib = ORDER.indexOf(b[0]);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return b[1] - a[1];
      })
      .map(([value, count]) => ({ value, displayLabel: contentTypeLabel(value, locale), count }));
  }, [items, locale]);

  const filteredItems = React.useMemo(() => {
    let result = items;
    if (selectedSector !== null) result = result.filter((item) => (item.sector ?? "").trim() === selectedSector);
    if (selectedContentType !== null) result = result.filter((item) => (item.content_type ?? "").trim() === selectedContentType);
    return result;
  }, [items, selectedSector, selectedContentType]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = React.useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page],
  );

  React.useEffect(() => { setPage(1); }, [items, selectedSector, selectedContentType]);
  React.useEffect(() => {
    if (selectedSector !== null && !sectorOptions.some((o) => o.value === selectedSector)) setSelectedSector(null);
  }, [sectorOptions, selectedSector]);
  React.useEffect(() => {
    if (selectedContentType !== null && !contentTypeOptions.some((o) => o.value === selectedContentType)) setSelectedContentType(null);
  }, [contentTypeOptions, selectedContentType]);

  if (items.length === 0) {
    return <div className="text-sm text-subtext">{t("geo.feed.empty")}</div>;
  }

  const hasFilters = sectorOptions.length > 0 || contentTypeOptions.length > 0;

  return (
    <div className="grid gap-4">
      {hasFilters ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-line/20 bg-surface/88 px-4 py-3 shadow-soft">
          {sectorOptions.length > 0 && (
            <FilterChipBar
              label={t("geo.feed.domainFilter")}
              options={sectorOptions}
              selected={selectedSector}
              onSelect={setSelectedSector}
              allLabel={t("geo.feed.domainFilter.all")}
            />
          )}
          {contentTypeOptions.length > 0 && (
            <FilterChipBar
              label={t("geo.feed.contentTypeFilter")}
              options={contentTypeOptions}
              selected={selectedContentType}
              onSelect={setSelectedContentType}
              allLabel={t("geo.feed.contentTypeFilter.all")}
            />
          )}
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-line/20 bg-surface/88 px-4 py-5 text-sm text-subtext shadow-soft">
          {t("geo.feed.filteredEmpty")}
        </div>
      ) : null}

      {pageItems.map((item) => {
        const deadlineDays = daysLeft(item.deadline_at);
        const qualityPercent =
          typeof item.quality_score === "number"
            ? `${Math.round(Math.max(0, Math.min(1, item.quality_score)) * 100)}%`
            : null;
        const qualityTone =
          typeof item.quality_score !== "number"
            ? "neutral"
            : item.quality_score >= 0.7
              ? "good"
              : item.quality_score >= 0.4
                ? "warn"
                : "bad";
        return (
          <article
            key={item.id}
            className="overflow-hidden rounded-[26px] border border-line/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,243,255,0.9))] p-5 shadow-soft"
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {item.source_key ? (
                  <SignalBadge size="sm">
                    {sourceLabel(item.source_key)}
                  </SignalBadge>
                ) : null}
                {item.origin_type ? (
                  <SignalBadge size="sm" tone="brand" uppercase>
                    {displayOriginLabel(item.origin_type, item.source_key)}
                  </SignalBadge>
                ) : null}
                {item.sector ? (
                  <SignalBadge size="sm" tone="good">
                    {item.sector}
                  </SignalBadge>
                ) : null}
              </div>

              <div className="text-base font-semibold leading-snug text-text">{cleanGeoOpportunityTitle(item.title)}</div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-subtext">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  {item.buyer_name || "—"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-line/15 bg-bg/70 px-3 py-1">
                  <MapPinned className="h-3.5 w-3.5 shrink-0" />
                  {locationResolver?.(item) || item.region || item.country_code || "—"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-line/15 bg-bg/70 px-3 py-1">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {item.deadline_at ? fmtDateTime(item.deadline_at, intlLocale) : t("workspace.deadline.none")}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {qualityPercent ? (
                  <SemanticPill tone={qualityTone} mono>
                    {qualityPercent}
                  </SemanticPill>
                ) : null}
                {deadlineDays !== null ? (
                  <DeadlinePill
                    deadline={item.deadline_at}
                    daySuffix={daySuffix}
                    expiredLabel={t("inbox.deadline.expired")}
                  />
                ) : null}
                <Link
                  to={`/workspace/${item.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand shadow-soft transition hover:bg-brand/18 hover:border-brand/50"
                >
                  {t("workspace.openBtn")}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        );
      })}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line/25 bg-surface/80 text-sm font-semibold text-text/70 transition hover:bg-elevated/80 hover:text-text disabled:pointer-events-none disabled:opacity-35"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
            .reduce<(number | "…")[]>((acc, n, idx, arr) => {
              if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(n);
              return acc;
            }, [])
            .map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-text/40">…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n as number)}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition",
                    page === n
                      ? "border-brand/35 bg-brand/12 text-brand"
                      : "border-line/25 bg-surface/80 text-text/70 hover:bg-elevated/80 hover:text-text",
                  )}
                >
                  {n}
                </button>
              ),
            )}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line/25 bg-surface/80 text-sm font-semibold text-text/70 transition hover:bg-elevated/80 hover:text-text disabled:pointer-events-none disabled:opacity-35"
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function geoScopeIcon(kind: string) {
  switch (kind) {
    case "continent":
    case "subcontinent":
    case "market_zone":
      return <Globe2 className="h-4 w-4 text-brand" />;
    case "country":
    case "territory":
    case "union":
      return <MapIcon className="h-4 w-4 text-brand" />;
    default:
      return <MapPinned className="h-4 w-4 text-brand" />;
  }
}

export function geoChildCountLabel(count: number, t: TFn, kind: "countries" | "regions" | "localities") {
  if (kind === "countries") return `${count} ${t("geo.labels.countries").toLowerCase()}`;
  if (kind === "regions") return `${count} ${t("geo.labels.regions").toLowerCase()}`;
  return `${count} ${t("geo.labels.localities").toLowerCase()}`;
}

export function GeoMarketSignalRail({
  items,
}: {
  items: Array<{ label: string; value: string; hint?: string; tone?: "default" | "good" | "warn" | "bad" | "brand" }>;
}) {
  const toneClass: Record<NonNullable<(typeof items)[number]["tone"]>, string> = {
    default: "border-line/20 bg-surface/90 text-text",
    brand: "border-brand/20 bg-brand/8 text-text",
    good: "border-good/20 bg-good/8 text-text",
    warn: "border-warn/20 bg-warn/8 text-text",
    bad: "border-bad/20 bg-bad/8 text-text",
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("rounded-3xl border p-5 shadow-soft", toneClass[item.tone ?? "default"])}
        >
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">
            <Radar className="h-3.5 w-3.5" />
            {item.label}
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-text">{item.value}</div>
          {item.hint ? <div className="mt-1 text-sm leading-relaxed text-subtext">{item.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}
