import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Landmark, RadioTower, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeoInsightList, GeoMarketSignalRail, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, GeoSignalStrip } from "@/features/geo/GeoShell";
import {
  buildGeoFeedInsights,
  displayOriginLabel,
  loadCountryGeoPage,
  resolveOpportunityRegionName,
  type CountryGeoPageData,
} from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

const SOURCE_KEY_LABELS: Record<string, string> = {
  // FR — national
  fr_boamp_active: "BOAMP",
  eu_ted_fr_active: "TED · France",
  // FR — regional BOAMP
  fr_boamp_ile_de_france: "BOAMP · Île-de-France",
  fr_boamp_auvergne_rhone_alpes: "BOAMP · Auvergne-Rhône-Alpes",
  fr_boamp_occitanie: "BOAMP · Occitanie",
  fr_boamp_nouvelle_aquitaine: "BOAMP · Nouvelle-Aquitaine",
  fr_boamp_hauts_de_france: "BOAMP · Hauts-de-France",
  fr_boamp_provence_alpes_cote_azur: "BOAMP · Provence-Alpes-Côte d'Azur",
  fr_boamp_grand_est: "BOAMP · Grand Est",
  fr_boamp_bretagne: "BOAMP · Bretagne",
  fr_boamp_normandie: "BOAMP · Normandie",
  fr_boamp_pays_de_la_loire: "BOAMP · Pays de la Loire",
  fr_boamp_centre_val_de_loire: "BOAMP · Centre-Val de Loire",
  fr_boamp_bourgogne_franche_comte: "BOAMP · Bourgogne-Franche-Comté",
  fr_boamp_corse: "BOAMP · Corse",
  // GB
  uk_find_a_tender: "Find a Tender",
  uk_contracts_finder_active: "Contracts Finder",
  uk_sell2wales_active: "Sell2Wales",
  // IT
  it_anac_ocds: "ANAC",
  it_roma_bandi_rss: "Roma Bandi",
  it_aria_lombardia_rss: "ARIA Lombardia",
};

function humanizeSourceKey(key: string): string {
  if (SOURCE_KEY_LABELS[key]) return SOURCE_KEY_LABELS[key];
  // Generic fallback: strip country prefix, replace underscores, title-case
  return key
    .replace(/^(fr|uk|it|eu)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function strategicSources(countryCode: string, t: (key: string) => string) {
  if (countryCode === "GB") {
    return [
      { key: "uk_find_a_tender", label: t("geo.country.sources.gb.fts") },
      { key: "uk_contracts_finder_active", label: t("geo.country.sources.gb.cf") },
      { key: "uk_sell2wales_active", label: t("geo.country.sources.gb.s2w") },
    ];
  }

  if (countryCode === "FR") {
    return [
      { key: "fr_boamp_active", label: t("geo.country.sources.fr.boamp") },
      { key: "eu_ted_fr_active", label: t("geo.country.sources.fr.ted") },
    ];
  }

  return [
    { key: "it_anac_ocds", label: t("geo.country.sources.it.anac") },
    { key: "it_roma_bandi_rss", label: t("geo.country.sources.it.roma") },
    { key: "it_aria_lombardia_rss", label: t("geo.country.sources.it.lombardia") },
  ];
}

function isCountryNativeSource(countryCode: string, sourceKey: string | null | undefined, originType: string | null | undefined) {
  const label = displayOriginLabel(originType, sourceKey);
  if (countryCode === "IT") return label === "IT native";
  if (countryCode === "FR") return label === "FR native";
  if (countryCode === "GB") return label === "UK native";
  return label.toLowerCase().endsWith("native");
}

function countryStory(countryCode: string, t: (key: string) => string) {
  switch (countryCode) {
    case "FR":
      return {
        eyebrow: t("geo.country.story.fr.eyebrow"),
        title: t("geo.country.story.fr.title"),
        body: t("geo.country.story.fr.body"),
        panels: [
          { icon: Landmark, title: t("geo.country.story.fr.panel1.title"), body: t("geo.country.story.fr.panel1.body") },
          { icon: RadioTower, title: t("geo.country.story.fr.panel2.title"), body: t("geo.country.story.fr.panel2.body") },
          { icon: ShieldCheck, title: t("geo.country.story.fr.panel3.title"), body: t("geo.country.story.fr.panel3.body") },
        ],
      };
    case "GB":
      return {
        eyebrow: t("geo.country.story.gb.eyebrow"),
        title: t("geo.country.story.gb.title"),
        body: t("geo.country.story.gb.body"),
        panels: [
          { icon: Landmark, title: t("geo.country.story.gb.panel1.title"), body: t("geo.country.story.gb.panel1.body") },
          { icon: RadioTower, title: t("geo.country.story.gb.panel2.title"), body: t("geo.country.story.gb.panel2.body") },
          { icon: ShieldCheck, title: t("geo.country.story.gb.panel3.title"), body: t("geo.country.story.gb.panel3.body") },
        ],
      };
    default:
      return {
        eyebrow: t("geo.country.story.it.eyebrow"),
        title: t("geo.country.story.it.title"),
        body: t("geo.country.story.it.body"),
        panels: [
          { icon: Landmark, title: t("geo.country.story.it.panel1.title"), body: t("geo.country.story.it.panel1.body") },
          { icon: RadioTower, title: t("geo.country.story.it.panel2.title"), body: t("geo.country.story.it.panel2.body") },
          { icon: ShieldCheck, title: t("geo.country.story.it.panel3.title"), body: t("geo.country.story.it.panel3.body") },
        ],
      };
  }
}

function RegionChipBar({
  regions,
  counts,
  selected,
  onSelect,
  allLabel,
}: {
  regions: Array<{ slug: string; name: string }>;
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  allLabel: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
          selected === null
            ? "border-brand/40 bg-brand/12 text-brand"
            : "border-line/25 bg-surface/80 text-text/70 hover:border-brand/25 hover:text-text",
        )}
      >
        {allLabel}
      </button>
      {regions.map((region) => {
        const count = counts[region.slug] ?? 0;
        const isActive = selected === region.slug;
        return (
          <button
            key={region.slug}
            type="button"
            onClick={() => onSelect(region.slug)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              isActive
                ? "border-brand/40 bg-brand/12 text-brand"
                : count > 0
                  ? "border-line/25 bg-surface/80 text-text/70 hover:border-brand/25 hover:text-text"
                  : "border-line/15 bg-surface/50 text-text/35",
            )}
          >
            {region.name}
            {count > 0 && (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", isActive ? "bg-brand/20 text-brand" : "bg-line/20 text-text/55")}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function CountryPage() {
  const { t } = useLocale();
  const params = useParams();
  const countryCode = String(params.countryCode ?? "").trim().toUpperCase();
  const [data, setData] = useState<CountryGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string | null>(null);
  const insights = useMemo(
    () => buildGeoFeedInsights(data?.feed.items ?? [], { countryCode, regions: data?.regions ?? [] }),
    [countryCode, data],
  );
  const story = useMemo(() => countryStory(countryCode, t), [countryCode, t]);
  const countrySourceMix = useMemo(
    () =>
      Object.entries(data?.sourceOpportunityCounts ?? {})
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([key, value]) => {
          const strategic = strategicSources(countryCode, t).find((row) => row.key === key);
          return {
            label: strategic?.label ?? humanizeSourceKey(key),
            hint: key,
            value,
          };
        }),
    [countryCode, data, t],
  );
  const regionHotspots = useMemo(
    () =>
      [...(data?.regions ?? [])]
        .map((region) => ({
          label: region.name,
          hint: data?.country.country_code ?? countryCode,
          value: data?.regionOpportunityCounts?.[region.slug] ?? 0,
          slug: region.slug,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
        .slice(0, 6),
    [countryCode, data],
  );
  const leadSource = countrySourceMix[0] ?? null;
  const leadRegion = regionHotspots[0] ?? null;
  const qualityValue = insights.avgQuality === null ? "—" : `${Math.round(insights.avgQuality * 100)}%`;
  const strategicSourceRows = useMemo(() => strategicSources(countryCode, t), [countryCode, t]);
  const sourceCountMap = useMemo(() => new Map(Object.entries(data?.sourceOpportunityCounts ?? {})), [data]);
  const nativeVisibleCount = useMemo(
    () => (data?.feed.items ?? []).filter((item) => isCountryNativeSource(countryCode, item.source_key, item.origin_type)).length,
    [countryCode, data],
  );
  const countryOnlyVisibleCount = useMemo(
    () => (data?.feed.items ?? []).filter((item) => item.geo_resolution_confidence === "country_only").length,
    [data],
  );
  const resolvedRegionalCount = useMemo(
    () =>
      (data?.feed.items ?? []).filter((item) =>
        Boolean(resolveOpportunityRegionName(item, countryCode, data?.regions ?? [])),
      ).length,
    [countryCode, data],
  );
  const litRegionCount = useMemo(
    () => Object.values(data?.regionOpportunityCounts ?? {}).filter((value) => value > 0).length,
    [data],
  );
  const sortedRegions = useMemo(
    () =>
      [...(data?.regions ?? [])].sort((a, b) => {
        const aCount = data?.regionOpportunityCounts?.[a.slug] ?? 0;
        const bCount = data?.regionOpportunityCounts?.[b.slug] ?? 0;
        return bCount - aCount || a.sort_order - b.sort_order || a.name.localeCompare(b.name);
      }),
    [data],
  );
  const filteredFeedItems = useMemo(() => {
    const items = data?.feed.items ?? [];
    if (!selectedRegionSlug) return items;
    const region = data?.regions.find((r) => r.slug === selectedRegionSlug);
    if (!region) return items;
    return items.filter(
      (item) => resolveOpportunityRegionName(item, countryCode, data?.regions ?? []) === region.name,
    );
  }, [data, selectedRegionSlug, countryCode]);
  const dominantSector = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of filteredFeedItems) {
      const sector = String(item.sector ?? "").trim();
      if (!sector) continue;
      counts.set(sector, (counts.get(sector) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? null;
  }, [filteredFeedItems]);

  const isCoverageThin =
    (data?.feed.total ?? 0) <= 20
    || countrySourceMix.length <= 1
    || !leadRegion
    || ((data?.feed.items.length ?? 0) > 0 && countryOnlyVisibleCount >= Math.ceil((data?.feed.items.length ?? 0) * 0.6));
  const storyTitle = isCoverageThin ? t(`geo.country.reality.${countryCode === "FR" ? "fr" : countryCode === "GB" ? "gb" : "it"}.title`) : story.title;
  const storyBody = isCoverageThin ? t(`geo.country.reality.${countryCode === "FR" ? "fr" : countryCode === "GB" ? "gb" : "it"}.body`) : story.body;

  useEffect(() => {
    if (!countryCode) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadCountryGeoPage(countryCode);
        if (cancelled) return;
        setData(next);
        setNotFound(!next);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "geo_country_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  if (notFound) {
    return (
      <GeoShell
        title={t("geo.errors.notFoundTitle")}
        subtitle={t("geo.errors.notFoundBody")}
        themeCountryCode={countryCode}
        themeCountryName={countryCode}
        breadcrumbs={[{ label: t("geo.nav.global"), to: "/global" }, { label: countryCode }]}
      >
        <div className="rounded-2xl border border-line/15 bg-surface/92 p-5 text-sm text-muted shadow-soft">{t("geo.errors.notFoundBody")}</div>
      </GeoShell>
    );
  }

  return (
    <GeoShell
      title={data?.country.name ?? t("geo.loading")}
      subtitle={t("geo.country.subtitle")}
      themeCountryCode={data?.country.country_code ?? countryCode}
      themeCountryName={data?.country.name ?? countryCode}
      themeCountryFlag={data?.country.flag_emoji}
      breadcrumbs={[
        { label: t("geo.nav.global"), to: "/global" },
        data?.zone ? { label: data.zone.name, to: `/zones/${data.zone.slug}` } : { label: "…" },
        { label: data?.country.name ?? countryCode },
      ]}
    >
      {error ? <div className="rounded-2xl border border-bad/25 bg-bad/10 p-4 text-sm text-bad">{error}</div> : null}

      <div className="grid gap-6">
        <GeoMarketSignalRail
          items={[
            {
              label: t("geo.country.signal.leadSource"),
              value: leadSource?.label ?? "—",
              hint: leadSource ? `${leadSource.value} ${t("geo.country.intelligence.visibleItems")}` : t("geo.feed.empty"),
              tone: "brand",
            },
            {
              label: t("geo.country.signal.leadRegion"),
              value: leadRegion?.label ?? "—",
              hint: leadRegion ? `${leadRegion.value} ${t("geo.country.intelligence.visibleItems")}` : t("geo.country.reality.pendingRegionHint"),
              tone: leadRegion ? "good" : "default",
            },
            {
              label: t("geo.country.signal.domainLead"),
              value: dominantSector?.[0] ?? "—",
              hint: dominantSector ? `${dominantSector[1]} ${t("geo.country.intelligence.visibleItems")}` : t("geo.feed.empty"),
              tone: dominantSector ? "good" : "default",
            },
            {
              label: t("geo.country.signal.urgentFlow"),
              value: String(insights.urgentCount),
              hint: t("geo.country.signal.urgentFlowHint"),
              tone: insights.urgentCount > 0 ? "warn" : "default",
            },
          ]}
        />

        <section className="overflow-hidden rounded-[32px] border border-line/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,242,255,0.92))] shadow-soft">
          <div className="grid gap-0 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="border-b border-line/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.08),transparent_28%),linear-gradient(140deg,rgba(255,255,255,0.98),rgba(247,243,255,0.92))] p-6 sm:p-8 xl:border-b-0 xl:border-r">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/75">{story.eyebrow}</div>
              <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-text sm:text-3xl">{storyTitle}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-subtext">{storyBody}</p>

              <div className="mt-5">
                <GeoSignalStrip
                  items={[
                    {
                      label: t("geo.country.reality.visibleSources"),
                      value: String(countrySourceMix.length),
                      tone: countrySourceMix.length >= 3 ? "good" : "warn",
                    },
                    {
                      label: t("geo.country.reality.nativeVisible"),
                      value: String(nativeVisibleCount),
                      tone: nativeVisibleCount > 0 ? "good" : "warn",
                    },
                    {
                      label: t("geo.country.reality.regionResolved"),
                      value: `${resolvedRegionalCount}/${data?.feed.items.length ?? 0}`,
                      tone: resolvedRegionalCount > 0 ? "default" : "warn",
                    },
                    {
                      label: t("geo.country.reality.countryOnly"),
                      value: `${countryOnlyVisibleCount}/${data?.feed.items.length ?? 0}`,
                      tone: countryOnlyVisibleCount > 0 ? "warn" : "good",
                    },
                    {
                      label: t("geo.country.reality.regionsLit"),
                      value: `${litRegionCount}/${data?.regions.length ?? 0}`,
                      tone: litRegionCount >= 3 ? "good" : litRegionCount > 0 ? "default" : "warn",
                    },
                  ]}
                />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {story.panels.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <div key={panel.title} className="rounded-3xl border border-line/15 bg-surface/92 p-4 shadow-soft">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                        <Icon className="h-4 w-4 text-brand" />
                        {panel.title}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-subtext">{panel.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 bg-[linear-gradient(165deg,rgba(244,240,255,0.94),rgba(255,255,255,0.78))] p-6 sm:p-8">
              <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.country.intelligence.eyebrow")}</div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-subtext">{t("geo.insights.sourceCoverage")}</div>
                    <div className="mt-1 text-2xl font-semibold text-text">{leadSource?.label ?? "—"}</div>
                    <div className="mt-1 text-sm text-subtext">{leadSource ? `${leadSource.value} ${t("geo.country.intelligence.visibleItems")}` : t("geo.feed.empty")}</div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-brand" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.hotRegions")}</div>
                  <div className="mt-2 text-xl font-semibold text-text">{leadRegion?.label ?? t("geo.country.reality.pendingRegion")}</div>
                  <div className="mt-1 text-sm text-subtext">
                    {leadRegion && leadRegion.label !== "Unassigned"
                      ? `${leadRegion.value} ${t("geo.country.intelligence.visibleItems")}`
                      : t("geo.country.reality.pendingRegionHint")}
                  </div>
                </div>
                <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.avgQuality")}</div>
                  <div className="mt-2 text-xl font-semibold text-text">{qualityValue}</div>
                  <div className="mt-1 text-sm text-subtext">{t("geo.country.intelligence.qualityHint")}</div>
                </div>
              </div>

              <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.originMix")}</div>
                <div className="mt-4">
                  <GeoSignalStrip
                    items={insights.originMix.slice(0, 3).map((item) => ({
                      label: item.label,
                      value: String(item.value),
                      tone: item.label.toLowerCase().endsWith("native") ? "good" : item.label === "EU" ? "default" : "warn",
                    }))}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.country.sources.eyebrow")}</div>
                <div className="mt-4 grid gap-3">
                  {strategicSourceRows.map((row) => {
                    const count = sourceCountMap.get(row.key) ?? 0;
                    return (
                      <div key={row.key} className="flex items-center justify-between gap-3 rounded-2xl border border-line/15 bg-surface/88 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-text">{row.label}</div>
                          <div className="truncate text-xs text-subtext">{row.key}</div>
                        </div>
                        <span className="rounded-full border border-border/20 bg-bg/70 px-2.5 py-1 text-xs font-semibold text-text">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <GeoMetricGrid
          items={[
                    { label: t("geo.metrics.publicOpps"), value: String(data?.feed.total ?? 0), hint: t("geo.country.metrics.publicOppsHint") },
                    { label: t("geo.labels.regions"), value: String(data?.regions.length ?? 0), hint: t("geo.country.metrics.regionsHint") },
                    { label: t("geo.country.metrics.regionsLit"), value: String(litRegionCount), hint: t("geo.country.metrics.regionsLitHint") },
                    { label: t("geo.labels.scope"), value: data?.country.country_code ?? "—", hint: t("geo.country.metrics.scopeHint") },
            { label: t("geo.insights.sources"), value: String(countrySourceMix.length), hint: t("geo.country.metrics.sourcesHint") },
          ]}
        />

        <GeoSignalStrip
          items={[
            { label: t("geo.insights.urgent"), value: String(insights.urgentCount), tone: insights.urgentCount > 0 ? "warn" : "default" },
            { label: t("geo.insights.expired"), value: String(insights.expiredCount), tone: insights.expiredCount > 0 ? "bad" : "default" },
            {
              label: t("geo.insights.avgQuality"),
              value: insights.avgQuality === null ? "—" : `${Math.round(insights.avgQuality * 100)}%`,
              tone: insights.avgQuality !== null && insights.avgQuality >= 0.7 ? "good" : "default",
            },
          ]}
        />


        <GeoSection
          title={t("geo.feed.title")}
          subtitle={t("geo.country.feedSubtitle")}
        >
          <div className="mb-4">
            <RegionChipBar
              regions={sortedRegions}
              counts={data?.regionOpportunityCounts ?? {}}
              selected={selectedRegionSlug}
              onSelect={setSelectedRegionSlug}
              allLabel={t("geo.labels.allRegions")}
            />
          </div>
          <GeoOpportunityList
            items={filteredFeedItems}
            locationResolver={(item) => resolveOpportunityRegionName(item, countryCode, data?.regions ?? [])}
          />
          <div className="mt-4 flex justify-end">
            <Link
              to="/workspaces"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/25 bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-elevated"
            >
              {t("nav.dossiers")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </GeoSection>
      </div>
    </GeoShell>
  );
}
