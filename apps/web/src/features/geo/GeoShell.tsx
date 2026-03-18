import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronRight, Globe2, Map, MapPinned, Building2, CalendarDays } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MetricBlock, SurfaceSection } from "@/components/ds/surfacePrimitives";
import { DeadlinePill, SemanticPill, SignalBadge } from "@/components/ds/statusPrimitives";
import { cn, daysLeft, fmtDateTime } from "@/lib/utils";
import { useLocale, type TFn } from "@/lib/i18n";
import type { GeoFeedBreakdownItem, GeoOpportunity } from "@/features/geo/geoData";

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

function GeoNavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "rounded-xl px-3 py-2 text-sm font-semibold transition",
          isActive ? "bg-elevated text-text shadow-soft" : "text-subtext hover:bg-elevated/80 hover:text-text",
        )
      }
    >
      {label}
    </NavLink>
  );
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
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", theme.haloClass)} />

      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={30} />
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <GeoNavItem to="/" label={t("nav.home")} end />
            <GeoNavItem to="/global" label={t("geo.nav.global")} end />
            <GeoNavItem to="/countries/FR" label={`FR ${t("geo.nav.france")}`} />
            <GeoNavItem to="/countries/IT" label={`IT ${t("geo.nav.italy")}`} />
            <GeoNavItem to="/countries/GB" label={`GB ${t("geo.nav.uk")}`} />
          </div>

          <Link
            to="/inbox"
            className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand shadow-soft transition hover:bg-brand/16"
          >
            {t("nav.inbox")}
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24">
        <header className="rounded-3xl border border-line/25 bg-surface/92 p-6 shadow-soft sm:p-8">
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
                  <span className={theme.accentTextClass}>{themeCountryCode ? `${themeCountryCode} ${marketLabel}` : marketLabel}</span>
                  <span className="text-subtext">{themeCountryCode ? t("geo.hero.countryMode") : t("geo.hero.globalMode")}</span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-subtext">{subtitle}</p>
              </div>
              <Link
                to="/inbox"
                className="inline-flex items-center gap-2 rounded-xl border border-border/30 bg-surface/70 px-3 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
              >
                {t("nav.inbox")} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-8">{children}</div>
      </main>
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
          key={item.label}
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

  if (items.length === 0) {
    return <div className="text-sm text-subtext">{t("geo.feed.empty")}</div>;
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
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
            className="rounded-2xl border border-line/25 bg-surface/92 p-5 shadow-soft"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-base font-semibold leading-snug text-text">{cleanGeoOpportunityTitle(item.title)}</div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-subtext">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {item.buyer_name || "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    {locationResolver?.(item) || item.region || item.country_code || "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {item.deadline_at ? fmtDateTime(item.deadline_at, intlLocale) : t("workspace.deadline.none")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  {item.source_key ? (
                    <SignalBadge size="sm">
                      {item.source_key}
                    </SignalBadge>
                  ) : null}
                  {item.origin_type ? (
                    <SignalBadge size="sm" tone="brand" uppercase>
                      {item.origin_type}
                    </SignalBadge>
                  ) : null}
                  {item.geo_resolution_confidence ? (
                    <SignalBadge size="sm" uppercase>
                      {item.geo_resolution_confidence}
                    </SignalBadge>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                  className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-bg/80 px-3 py-2 text-sm font-semibold text-text transition hover:bg-elevated/80"
                >
                  {t("workspace.openBtn")}
                </Link>
              </div>
            </div>
          </article>
        );
      })}
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
      return <Map className="h-4 w-4 text-brand" />;
    default:
      return <MapPinned className="h-4 w-4 text-brand" />;
  }
}

export function geoChildCountLabel(count: number, t: TFn, kind: "countries" | "regions" | "localities") {
  if (kind === "countries") return `${count} ${t("geo.labels.countries").toLowerCase()}`;
  if (kind === "regions") return `${count} ${t("geo.labels.regions").toLowerCase()}`;
  return `${count} ${t("geo.labels.localities").toLowerCase()}`;
}
