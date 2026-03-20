import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowUpRight, Landmark, MapPinned, RadioTower, ShieldCheck } from "lucide-react";
import { GeoChildCard, GeoInsightList, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, GeoSignalStrip } from "@/features/geo/GeoShell";
import {
  buildGeoFeedInsights,
  displayOriginLabel,
  loadCountryGeoPage,
  resolveOpportunityRegionName,
  type CountryGeoPageData,
} from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

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

export default function CountryPage() {
  const { t } = useLocale();
  const params = useParams();
  const countryCode = String(params.countryCode ?? "").trim().toUpperCase();
  const [data, setData] = useState<CountryGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
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
            label: strategic?.label ?? key,
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
        <div className="rounded-2xl border border-border/25 bg-white/45 p-5 text-sm text-muted">{t("geo.errors.notFoundBody")}</div>
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
        <section className="overflow-hidden rounded-[32px] border border-border/30 bg-white/72 shadow-soft">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="border-b border-border/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82))] p-6 sm:p-8 lg:border-b-0 lg:border-r">
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
                    <div key={panel.title} className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                        <Icon className="h-4 w-4 text-brand" />
                        {panel.title}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-subtext">{panel.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 bg-[linear-gradient(160deg,rgba(246,248,252,0.96),rgba(255,255,255,0.78))] p-6 sm:p-8">
              <div className="rounded-3xl border border-border/25 bg-bg/55 p-5 shadow-soft">
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
                <div className="rounded-3xl border border-border/25 bg-bg/55 p-5 shadow-soft">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.hotRegions")}</div>
                  <div className="mt-2 text-xl font-semibold text-text">{leadRegion?.label ?? t("geo.country.reality.pendingRegion")}</div>
                  <div className="mt-1 text-sm text-subtext">
                    {leadRegion && leadRegion.label !== "Unassigned"
                      ? `${leadRegion.value} ${t("geo.country.intelligence.visibleItems")}`
                      : t("geo.country.reality.pendingRegionHint")}
                  </div>
                </div>
                <div className="rounded-3xl border border-border/25 bg-bg/55 p-5 shadow-soft">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.avgQuality")}</div>
                  <div className="mt-2 text-xl font-semibold text-text">{qualityValue}</div>
                  <div className="mt-1 text-sm text-subtext">{t("geo.country.intelligence.qualityHint")}</div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/25 bg-bg/55 p-5 shadow-soft">
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

              <div className="rounded-3xl border border-border/25 bg-bg/55 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.country.sources.eyebrow")}</div>
                <div className="mt-4 grid gap-3">
                  {strategicSourceRows.map((row) => {
                    const count = sourceCountMap.get(row.key) ?? 0;
                    return (
                      <div key={row.key} className="flex items-center justify-between gap-3 rounded-2xl border border-border/20 bg-white/60 px-4 py-3">
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

        <GeoSection title={t("geo.labels.regions")} subtitle={t("geo.country.regionsSubtitle")}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedRegions.map((region) => (
              <GeoChildCard
                key={region.id}
                title={region.name}
                subtitle={`${data?.regionOpportunityCounts?.[region.slug] ?? 0} ${t("geo.country.regionCardCountSubtitle")}`}
                to={`/countries/${countryCode}/regions/${region.slug}`}
                icon={<MapPinned className="h-4 w-4 text-brand" />}
                badge={String(data?.regionOpportunityCounts?.[region.slug] ?? 0)}
              />
            ))}
          </div>
        </GeoSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <GeoSection title={t("geo.insights.hotRegions")} subtitle={t("geo.country.hotRegionsSubtitle")}>
            <GeoInsightList
              items={regionHotspots}
              emptyLabel={t("geo.feed.empty")}
              linkBuilder={(item) => (item.slug ? `/countries/${countryCode}/regions/${item.slug}` : null)}
            />
          </GeoSection>

          <GeoSection title={t("geo.insights.sourceCoverage")} subtitle={t("geo.country.sourceCoverageSubtitle")}>
            <GeoInsightList items={countrySourceMix} emptyLabel={t("geo.feed.empty")} />
          </GeoSection>
        </div>

        <GeoSection title={t("geo.insights.originMix")} subtitle={t("geo.country.originMixSubtitle")}>
          <GeoSignalStrip
            items={insights.originMix.map((item) => ({
              label: item.label,
              value: String(item.value),
              tone: item.label.toLowerCase().endsWith("native") ? "good" : item.label === "EU" ? "default" : "warn",
            }))}
          />
        </GeoSection>

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.country.feedSubtitle")}>
          <GeoOpportunityList
            items={data?.feed.items ?? []}
            locationResolver={(item) => resolveOpportunityRegionName(item, countryCode, data?.regions ?? [])}
          />
        </GeoSection>
      </div>
    </GeoShell>
  );
}
