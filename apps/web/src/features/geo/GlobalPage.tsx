import { useEffect, useMemo, useState } from "react";
import { Map } from "lucide-react";
import { GeoChildCard, GeoInsightList, GeoMarketSignalRail, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, GeoSignalStrip, geoChildCountLabel, geoScopeIcon } from "@/features/geo/GeoShell";
import { buildGeoFeedInsights, loadGlobalGeoPage, type GeoCountry, type GlobalGeoPageData } from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

export default function GlobalPage() {
  const { t } = useLocale();
  const [data, setData] = useState<GlobalGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadGlobalGeoPage();
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "geo_global_failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCountries = useMemo(
    () => (data?.countries ?? []).filter((country) => country.country_code !== "US"),
    [data],
  );
  const visibleZones = useMemo(
    () => (data?.zones ?? []).filter((zone) => visibleCountries.some((country) => country.zone_id === zone.id)),
    [data, visibleCountries],
  );
  const featuredCountries = useMemo(() => {
    const priority = ["FR", "IT", "GB", "EU"];
    const pool = [...visibleCountries];
    return pool
      .sort((a, b) => {
        const aRank = priority.indexOf(a.country_code);
        const bRank = priority.indexOf(b.country_code);
        const safeARank = aRank === -1 ? 999 : aRank;
        const safeBRank = bRank === -1 ? 999 : bRank;
        return safeARank - safeBRank || a.sort_order - b.sort_order || a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [visibleCountries]);
  const insights = useMemo(() => {
    const next = buildGeoFeedInsights((data?.feed.items ?? []).filter((item) => item.country_code !== "US"));
    next.countryHotspots = next.countryHotspots.filter((item) => item.slug !== "US");
    return next;
  }, [data]);
  const globalSourceMix = useMemo(() => {
    const counts = data?.sourceOpportunityCounts ?? {};
    return Object.entries(counts)
      .map(([sourceKey, value]) => ({
        label:
          sourceKey === "uk_find_a_tender"
            ? "Find a Tender"
            : sourceKey === "uk_contracts_finder_active"
              ? "Contracts Finder"
              : sourceKey === "uk_sell2wales_active"
                ? "Sell2Wales"
                : sourceKey === "fr_boamp_active"
                  ? "BOAMP"
                  : sourceKey === "it_anac_ocds"
                    ? "ANAC"
                    : sourceKey,
        hint: sourceKey,
        value,
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [data]);
  const globalCountryHotspots = useMemo(() => {
    const counts = data?.countryOpportunityCounts ?? {};
    const countryNameByCode = new globalThis.Map(visibleCountries.map((country) => [country.country_code, country.name]));
    return Object.entries(counts)
      .filter(([code]) => code !== "US")
      .map(([code, value]) => ({
        label: countryNameByCode.get(code) ?? code,
        hint: code,
        slug: code,
        value,
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [data, visibleCountries]);
  const dominantSector = useMemo(() => {
    const counts = new globalThis.Map<string, number>();
    for (const item of data?.feed.items ?? []) {
      const sector = String(item.sector ?? "").trim();
      if (!sector) continue;
      counts.set(sector, (counts.get(sector) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? null;
  }, [data]);

  return (
    <GeoShell
      title={t("geo.global.title")}
      subtitle={t("geo.global.subtitle")}
      breadcrumbs={[{ label: t("geo.nav.global") }]}
    >
      {error ? <div className="rounded-2xl border border-bad/25 bg-bad/10 p-4 text-sm text-bad">{error}</div> : null}
      {!data && !error ? <div className="text-sm text-subtext/60">{t("geo.loading")}</div> : null}

      <div className="grid gap-6">
        <GeoMarketSignalRail
          items={[
            {
              label: t("geo.global.signal.leadMarket"),
              value: globalCountryHotspots[0]?.label ?? "—",
              hint: globalCountryHotspots[0] ? `${globalCountryHotspots[0].value} ${t("geo.country.intelligence.visibleItems")}` : t("geo.feed.empty"),
              tone: "good",
            },
            {
              label: t("geo.global.signal.leadSource"),
              value: globalSourceMix[0]?.label ?? "—",
              hint: globalSourceMix[0] ? `${globalSourceMix[0].value} ${t("geo.country.intelligence.visibleItems")}` : t("geo.feed.empty"),
              tone: "brand",
            },
            {
              label: t("geo.global.signal.activePressure"),
              value: String(insights.urgentCount),
              hint: t("geo.global.signal.activePressureHint"),
              tone: insights.urgentCount > 0 ? "warn" : "default",
            },
            {
              label: t("geo.global.signal.domainLead"),
              value: dominantSector?.[0] ?? "—",
              hint: dominantSector ? `${dominantSector[1]} ${t("geo.country.intelligence.visibleItems")}` : t("geo.feed.empty"),
              tone: dominantSector ? "good" : "default",
            },
          ]}
        />

        <GeoMetricGrid
          items={[
            { label: t("geo.metrics.publicOpps"), value: String(data?.feed.total ?? 0), hint: t("geo.global.metrics.publicOppsHint") },
            { label: t("geo.labels.zones"), value: String(visibleZones.length), hint: t("geo.global.metrics.zonesHint") },
            { label: t("geo.labels.countries"), value: String(visibleCountries.length), hint: t("geo.global.metrics.countriesHint") },
            { label: t("geo.insights.sources"), value: String(globalSourceMix.length), hint: t("geo.global.metrics.sourcesHint") },
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

        <section className="overflow-hidden rounded-[32px] border border-line/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,242,255,0.92))] shadow-soft">
          <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-line/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.08),transparent_28%),linear-gradient(140deg,rgba(255,255,255,0.98),rgba(247,243,255,0.92))] p-6 sm:p-8 xl:border-b-0 xl:border-r">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.global.coreMarketsTitle")}</div>
              <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                {t("geo.global.subtitle")}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-subtext">
                {t("geo.global.coreMarketsSubtitle")}
              </p>

              <div className="mt-5">
                <GeoSignalStrip
                  items={featuredCountries.slice(0, 4).map((country, index) => ({
                    label: country.name,
                    value: index === 0 ? t("geo.global.marketLead") : country.country_code,
                    tone: index === 0 ? "good" : "default",
                  }))}
                />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {featuredCountries.map((country: GeoCountry) => (
                  <GeoChildCard
                    key={country.id}
                    title={`${country.flag_emoji ?? ""} ${country.name}`.trim()}
                    subtitle={`${data?.countryOpportunityCounts?.[country.country_code] ?? 0} ${t("geo.country.regionCardCountSubtitle")}`}
                    to={`/countries/${country.country_code}`}
                    icon={<Map className="h-4 w-4 text-brand" />}
                    badge={country.country_code}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 bg-[linear-gradient(165deg,rgba(244,240,255,0.94),rgba(255,255,255,0.78))] p-6 sm:p-8">
              <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.hotCountries")}</div>
                <div className="mt-2 text-2xl font-semibold text-text">{globalCountryHotspots[0]?.label ?? "—"}</div>
                <div className="mt-1 text-sm text-subtext">
                  {globalCountryHotspots[0]
                    ? `${globalCountryHotspots[0].value} ${t("geo.country.intelligence.visibleItems")}`
                    : t("geo.feed.empty")}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.sourceCoverage")}</div>
                  <div className="mt-2 text-xl font-semibold text-text">{globalSourceMix[0]?.label ?? "—"}</div>
                  <div className="mt-1 text-sm text-subtext">
                    {globalSourceMix[0] ? `${globalSourceMix[0].value} ${t("geo.country.intelligence.visibleItems")}` : t("geo.feed.empty")}
                  </div>
                </div>
                <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.originMix")}</div>
                  <div className="mt-3">
                    <GeoSignalStrip
                      items={insights.originMix.slice(0, 3).map((item) => ({
                        label: item.label,
                        value: String(item.value),
                        tone: item.label === "IT native" ? "good" : item.label === "EU" ? "default" : "warn",
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-line/15 bg-surface/92 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.labels.zones")}</div>
                <div className="mt-4 grid gap-3">
                  {visibleZones.slice(0, 4).map((zone) => {
                    const countryCount = visibleCountries.filter((country) => country.zone_id === zone.id).length;
                    return (
                      <div key={zone.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line/15 bg-surface/88 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-text">{zone.name}</div>
                          <div className="truncate text-xs text-subtext">{zone.description ?? t("geo.global.zoneFallback")}</div>
                        </div>
                        <span className="rounded-full border border-border/20 bg-bg/70 px-2.5 py-1 text-xs font-semibold text-text">
                          {geoChildCountLabel(countryCount, t, "countries")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <GeoSection title={t("geo.insights.hotCountries")} subtitle={t("geo.global.hotCountriesSubtitle")}>
            <GeoInsightList
              items={globalCountryHotspots}
              emptyLabel={t("geo.feed.empty")}
              linkBuilder={(item) => (item.slug ? `/countries/${item.slug}` : null)}
            />
          </GeoSection>

          <GeoSection title={t("geo.insights.sourceCoverage")} subtitle={t("geo.global.sourceCoverageSubtitle")}>
            <GeoInsightList items={globalSourceMix} emptyLabel={t("geo.feed.empty")} />
          </GeoSection>
        </div>

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.global.feedSubtitle")}>
          <GeoOpportunityList items={data?.feed.items ?? []} />
        </GeoSection>
      </div>
    </GeoShell>
  );
}
