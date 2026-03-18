import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2 } from "lucide-react";
import { GeoChildCard, GeoInsightList, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, GeoSignalStrip } from "@/features/geo/GeoShell";
import { buildGeoFeedInsights, loadRegionGeoPage, type RegionGeoPageData } from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

export default function RegionPage() {
  const { t } = useLocale();
  const params = useParams();
  const countryCode = String(params.countryCode ?? "").trim().toUpperCase();
  const regionSlug = String(params.regionSlug ?? "").trim().toLowerCase();
  const [data, setData] = useState<RegionGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const insights = useMemo(() => buildGeoFeedInsights(data?.feed.items ?? []), [data]);

  useEffect(() => {
    if (!countryCode || !regionSlug) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadRegionGeoPage(countryCode, regionSlug);
        if (cancelled) return;
        setData(next);
        setNotFound(!next);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "geo_region_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryCode, regionSlug]);

  if (notFound) {
    return (
      <GeoShell
        title={t("geo.errors.notFoundTitle")}
        subtitle={t("geo.errors.notFoundBody")}
        themeCountryCode={countryCode}
        themeCountryName={countryCode}
        breadcrumbs={[{ label: t("geo.nav.global"), to: "/global" }, { label: countryCode, to: `/countries/${countryCode}` }, { label: regionSlug }]}
      >
        <div className="rounded-2xl border border-border/25 bg-white/45 p-5 text-sm text-muted">{t("geo.errors.notFoundBody")}</div>
      </GeoShell>
    );
  }

  return (
    <GeoShell
      title={data?.region.name ?? t("geo.loading")}
      subtitle={t("geo.region.subtitle")}
      themeCountryCode={data?.country.country_code ?? countryCode}
      themeCountryName={data?.country.name ?? countryCode}
      themeCountryFlag={data?.country.flag_emoji}
      breadcrumbs={[
        { label: t("geo.nav.global"), to: "/global" },
        data?.zone ? { label: data.zone.name, to: `/zones/${data.zone.slug}` } : { label: "…" },
        data?.country ? { label: data.country.name, to: `/countries/${data.country.country_code}` } : { label: countryCode },
        { label: data?.region.name ?? regionSlug },
      ]}
    >
      {error ? <div className="rounded-2xl border border-bad/25 bg-bad/10 p-4 text-sm text-bad">{error}</div> : null}

      <div className="grid gap-6">
        <GeoMetricGrid
          items={[
            { label: t("geo.metrics.publicOpps"), value: String(data?.feed.total ?? 0), hint: t("geo.region.metrics.publicOppsHint") },
            { label: t("geo.labels.localities"), value: String(data?.localities.length ?? 0), hint: t("geo.region.metrics.localitiesHint") },
            { label: t("geo.labels.scope"), value: data?.region.name ?? "—", hint: t("geo.region.metrics.scopeHint") },
            { label: t("geo.insights.sources"), value: String(insights.activeSources), hint: t("geo.region.metrics.sourcesHint") },
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

        {data && data.localities.length > 0 ? (
          <GeoSection title={t("geo.labels.localities")} subtitle={t("geo.region.localitiesSubtitle")}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.localities.map((locality) => (
                <GeoChildCard
                  key={locality.id}
                  title={locality.name}
                  subtitle={t("geo.region.localityCardSubtitle")}
                  to={`/countries/${countryCode}/regions/${regionSlug}/localities/${locality.slug}`}
                  icon={<Building2 className="h-4 w-4 text-brand" />}
                  badge={locality.code}
                />
              ))}
            </div>
          </GeoSection>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <GeoSection title={t("geo.insights.sourceCoverage")} subtitle={t("geo.region.sourceCoverageSubtitle")}>
            <GeoInsightList items={insights.sourceMix} emptyLabel={t("geo.feed.empty")} />
          </GeoSection>

          <GeoSection title={t("geo.insights.originMix")} subtitle={t("geo.region.originMixSubtitle")}>
            <GeoSignalStrip
              items={insights.originMix.map((item) => ({
                label: item.label,
                value: String(item.value),
                tone: item.label === "IT native" ? "good" : item.label === "EU" ? "default" : "warn",
              }))}
            />
          </GeoSection>
        </div>

        {insights.localityHotspots.length > 0 ? (
          <GeoSection title={t("geo.insights.hotLocalities")} subtitle={t("geo.region.hotLocalitiesSubtitle")}>
            <GeoInsightList
              items={insights.localityHotspots}
              emptyLabel={t("geo.feed.empty")}
              linkBuilder={(item) => (item.slug ? `/countries/${countryCode}/regions/${regionSlug}/localities/${item.slug}` : null)}
            />
          </GeoSection>
        ) : null}

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.region.feedSubtitle")}>
          <GeoOpportunityList items={data?.feed.items ?? []} />
          <div className="mt-4 text-xs text-muted">{t("geo.region.feedHint")}</div>
        </GeoSection>
      </div>
    </GeoShell>
  );
}
