import { useEffect, useMemo, useState } from "react";
import { Globe2, Map } from "lucide-react";
import { GeoChildCard, GeoInsightList, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, GeoSignalStrip, geoChildCountLabel, geoScopeIcon } from "@/features/geo/GeoShell";
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

  return (
    <GeoShell
      title={t("geo.global.title")}
      subtitle={t("geo.global.subtitle")}
      breadcrumbs={[{ label: t("geo.nav.global") }]}
    >
      {error ? <div className="rounded-2xl border border-bad/25 bg-bad/10 p-4 text-sm text-bad">{error}</div> : null}

      <div className="grid gap-6">
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

        <GeoSection title={t("geo.global.coreMarketsTitle")} subtitle={t("geo.global.coreMarketsSubtitle")}>
          <GeoSignalStrip
            items={featuredCountries.slice(0, 4).map((country, index) => ({
              label: country.name,
              value: index === 0 ? t("geo.global.marketLead") : country.country_code,
              tone: index === 0 ? "good" : "default",
            }))}
          />
        </GeoSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <GeoSection title={t("geo.labels.zones")} subtitle={t("geo.global.zonesSubtitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleZones.map((zone) => {
                const countryCount = visibleCountries.filter((country) => country.zone_id === zone.id).length;
                return (
                  <GeoChildCard
                    key={zone.id}
                    title={zone.name}
                    subtitle={zone.description ?? t("geo.global.zoneFallback")}
                    to={`/zones/${zone.slug}`}
                    icon={geoScopeIcon(zone.kind)}
                    badge={geoChildCountLabel(countryCount, t, "countries")}
                  />
                );
              })}
            </div>
          </GeoSection>

          <GeoSection title={t("geo.global.featuredCountries")} subtitle={t("geo.global.featuredCountriesSubtitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredCountries.map((country: GeoCountry) => (
                <GeoChildCard
                  key={country.id}
                  title={`${country.flag_emoji ?? ""} ${country.name}`.trim()}
                  subtitle={t("geo.global.countryCardSubtitle")}
                  to={`/countries/${country.country_code}`}
                  icon={<Map className="h-4 w-4 text-brand" />}
                  badge={country.country_code}
                />
              ))}
            </div>
          </GeoSection>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
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

        <GeoSection title={t("geo.insights.originMix")} subtitle={t("geo.global.originMixSubtitle")}>
          <GeoSignalStrip
            items={insights.originMix.map((item) => ({
              label: item.label,
              value: String(item.value),
              tone: item.label === "IT native" ? "good" : item.label === "EU" ? "default" : "warn",
            }))}
          />
        </GeoSection>

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.global.feedSubtitle")}>
          <GeoOpportunityList items={data?.feed.items ?? []} />
        </GeoSection>

        <GeoSection title={t("geo.global.commercialTitle")} subtitle={t("geo.global.commercialSubtitle")}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                <Globe2 className="h-4 w-4 text-brand" />
                {t("geo.global.panel1.title")}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t("geo.global.panel1.body")}</p>
            </div>
            <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                <Map className="h-4 w-4 text-brand" />
                {t("geo.global.panel2.title")}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t("geo.global.panel2.body")}</p>
            </div>
            <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                <Map className="h-4 w-4 text-brand" />
                {t("geo.global.panel3.title")}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t("geo.global.panel3.body")}</p>
            </div>
          </div>
        </GeoSection>
      </div>
    </GeoShell>
  );
}
