import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronRight, Globe2, Map, MapPinned, Building2, CalendarDays } from "lucide-react";
import { Logo } from "@/components/Logo";
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

function geoTheme(countryCode?: string | null): GeoTheme {
  switch ((countryCode ?? "").toUpperCase()) {
    case "FR":
      return {
        haloClass:
          "bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_35%)]",
        chipClass: "border-sky-300/45 bg-sky-500/10 text-sky-700",
        accentTextClass: "text-sky-700",
        cardAccentClass: "border-sky-200/45 bg-sky-500/5",
      };
    case "IT":
      return {
        haloClass:
          "bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_35%)]",
        chipClass: "border-emerald-300/45 bg-emerald-500/10 text-emerald-700",
        accentTextClass: "text-emerald-700",
        cardAccentClass: "border-emerald-200/45 bg-emerald-500/5",
      };
    case "GB":
      return {
        haloClass:
          "bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(220,38,38,0.12),transparent_35%)]",
        chipClass: "border-indigo-300/45 bg-indigo-500/10 text-indigo-700",
        accentTextClass: "text-indigo-700",
        cardAccentClass: "border-indigo-200/45 bg-indigo-500/5",
      };
    default:
      return {
        haloClass:
          "bg-[radial-gradient(circle_at_top_left,rgba(74,211,149,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_35%)]",
        chipClass: "border-brand/25 bg-brand/10 text-brand",
        accentTextClass: "text-brand",
        cardAccentClass: "border-border/30 bg-white/70",
      };
  }
}

function GeoNavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "rounded-xl px-3 py-2 text-sm font-semibold transition",
          isActive ? "bg-surface/80 text-text shadow-soft" : "text-subtext hover:bg-surface/70 hover:text-text",
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
    ? `${themeCountryFlag ?? ""} ${themeCountryName ?? themeCountryCode}`.trim()
    : t("geo.nav.global");

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", theme.haloClass)} />

      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={24} />
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <GeoNavItem to="/global" label={t("geo.nav.global")} end />
            <GeoNavItem to="/countries/FR" label={`🇫🇷 ${t("geo.nav.france")}`} />
            <GeoNavItem to="/countries/IT" label={`🇮🇹 ${t("geo.nav.italy")}`} />
            <GeoNavItem to="/countries/GB" label={`🇬🇧 ${t("geo.nav.uk")}`} />
          </div>

          <Link
            to="/request-access"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-veil shadow-glow transition hover:opacity-90"
          >
            {t("landing.hero.primaryCta")}
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24">
        <header className="rounded-[30px] border border-border/30 bg-white/70 p-6 shadow-soft backdrop-blur-md sm:p-8">
          <div className="flex flex-col gap-4">
            <GeoBreadcrumbs items={breadcrumbs} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/75">
                    RadarPulse Geography
                  </div>
                  <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", theme.chipClass)}>
                    {marketLabel}
                  </span>
                </div>
                <div className={cn("mt-3 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-soft", theme.cardAccentClass)}>
                  <span className={theme.accentTextClass}>{marketLabel}</span>
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
        <div
          key={item.label}
          className="rounded-3xl border border-border/30 bg-white/72 p-5 shadow-soft backdrop-blur-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-subtext/75">{item.label}</div>
          <div className="mt-2 text-2xl font-semibold">{item.value}</div>
          {item.hint ? <div className="mt-2 text-sm text-subtext">{item.hint}</div> : null}
        </div>
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
  return (
    <section className="rounded-[28px] border border-border/30 bg-white/68 p-6 shadow-soft backdrop-blur-sm">
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold">{title}</div>
        {subtitle ? <div className="text-sm text-subtext">{subtitle}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
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
  return (
    <Link
      to={to}
      className="flex min-h-[120px] flex-col justify-between rounded-3xl border border-border/30 bg-white/62 p-5 shadow-soft transition hover:bg-white/78"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            {icon}
            <span className="truncate">{title}</span>
          </div>
          <div className="mt-2 text-sm leading-relaxed text-subtext">{subtitle}</div>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full border border-border/35 bg-white/80 px-2.5 py-1 text-xs font-semibold text-subtext/80">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">
        Open <ChevronRight className="h-4 w-4" />
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
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/25 bg-bg/45 px-4 py-3 shadow-soft">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text">{item.label}</div>
              {item.hint ? <div className="truncate text-xs text-subtext">{item.hint}</div> : null}
            </div>
            <span className="shrink-0 rounded-full border border-border/30 bg-white/80 px-2.5 py-1 text-xs font-semibold text-subtext">
              {item.value}
            </span>
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
    default: "border-border/30 bg-white/70 text-text",
    good: "border-good/20 bg-good/10 text-good",
    warn: "border-warn/20 bg-warn/10 text-warn",
    bad: "border-bad/20 bg-bad/10 text-bad",
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
}: {
  items: GeoOpportunity[];
}) {
  const { locale, t } = useLocale();
  const intlLocale = LOCALE_MAP[locale] ?? "en-US";

  if (items.length === 0) {
    return <div className="text-sm text-subtext">{t("geo.feed.empty")}</div>;
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const deadlineDays = daysLeft(item.deadline_at);
        return (
          <article
            key={item.id}
            className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-base font-semibold leading-snug text-text">{item.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-subtext">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {item.buyer_name || "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    {item.region || item.country_code || "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {item.deadline_at ? fmtDateTime(item.deadline_at, intlLocale) : t("workspace.deadline.none")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  {item.source_key ? (
                    <span className="rounded-full border border-border/30 bg-white/80 px-2.5 py-1 text-subtext">
                      {item.source_key}
                    </span>
                  ) : null}
                  {item.origin_type ? (
                    <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-brand">
                      {item.origin_type}
                    </span>
                  ) : null}
                  {item.geo_resolution_confidence ? (
                    <span className="rounded-full border border-border/30 bg-surface/80 px-2.5 py-1 text-subtext">
                      {item.geo_resolution_confidence}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {typeof item.quality_score === "number" ? (
                  <span className="rounded-full border border-good/25 bg-good/10 px-2.5 py-1 text-sm font-semibold text-good">
                    {Math.round(Math.max(0, Math.min(1, item.quality_score)) * 100)}%
                  </span>
                ) : null}
                {deadlineDays !== null && deadlineDays < 0 ? (
                  <span className="rounded-full border border-bad/25 bg-bad/10 px-2.5 py-1 text-sm font-semibold text-bad">
                    {t("inbox.deadline.expired")}
                  </span>
                ) : null}
                <Link
                  to={`/workspace/${item.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/35 bg-surface/70 px-3 py-2 text-sm font-semibold text-text transition hover:bg-elevated/70"
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
