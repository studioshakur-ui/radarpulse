import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPinned } from "lucide-react";
import { GeoChildCard, GeoInsightList, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, GeoSignalStrip } from "@/features/geo/GeoShell";
import { buildGeoFeedInsights, loadCountryGeoPage, type CountryGeoPageData } from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

export default function CountryPage() {
  const { t } = useLocale();
  const params = useParams();
  const countryCode = String(params.countryCode ?? "").trim().toUpperCase();
  const [data, setData] = useState<CountryGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const insights = useMemo(() => buildGeoFeedInsights(data?.feed.items ?? []), [data]);

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
      title={data ? `${data.country.flag_emoji ?? ""} ${data.country.name}`.trim() : t("geo.loading")}
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
        <GeoMetricGrid
          items={[
            { label: t("geo.metrics.publicOpps"), value: String(data?.feed.total ?? 0), hint: t("geo.country.metrics.publicOppsHint") },
            { label: t("geo.labels.regions"), value: String(data?.regions.length ?? 0), hint: t("geo.country.metrics.regionsHint") },
            { label: t("geo.labels.scope"), value: data?.country.country_code ?? "—", hint: t("geo.country.metrics.scopeHint") },
            { label: t("geo.insights.sources"), value: String(insights.activeSources), hint: t("geo.country.metrics.sourcesHint") },
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
            {(data?.regions ?? []).map((region) => (
              <GeoChildCard
                key={region.id}
                title={region.name}
                subtitle={t("geo.country.regionCardSubtitle")}
                to={`/countries/${countryCode}/regions/${region.slug}`}
                icon={<MapPinned className="h-4 w-4 text-brand" />}
              />
            ))}
          </div>
        </GeoSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <GeoSection title={t("geo.insights.hotRegions")} subtitle={t("geo.country.hotRegionsSubtitle")}>
            <GeoInsightList
              items={insights.regionHotspots}
              emptyLabel={t("geo.feed.empty")}
              linkBuilder={(item) => (item.slug ? `/countries/${countryCode}/regions/${item.slug}` : null)}
            />
          </GeoSection>

          <GeoSection title={t("geo.insights.sourceCoverage")} subtitle={t("geo.country.sourceCoverageSubtitle")}>
            <GeoInsightList items={insights.sourceMix} emptyLabel={t("geo.feed.empty")} />
          </GeoSection>
        </div>

        <GeoSection title={t("geo.insights.originMix")} subtitle={t("geo.country.originMixSubtitle")}>
          <GeoSignalStrip
            items={insights.originMix.map((item) => ({
              label: item.label,
              value: String(item.value),
              tone: item.label === "IT native" ? "good" : item.label === "EU" ? "default" : "warn",
            }))}
          />
        </GeoSection>

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.country.feedSubtitle")}>
          <GeoOpportunityList items={data?.feed.items ?? []} />
        </GeoSection>
      </div>
    </GeoShell>
  );
}
