import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2 } from "lucide-react";
import { GeoChildCard, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell } from "@/features/geo/GeoShell";
import { loadRegionGeoPage, type RegionGeoPageData } from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

export default function RegionPage() {
  const { t } = useLocale();
  const params = useParams();
  const countryCode = String(params.countryCode ?? "").trim().toUpperCase();
  const regionSlug = String(params.regionSlug ?? "").trim().toLowerCase();
  const [data, setData] = useState<RegionGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

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
      <GeoShell title={t("geo.errors.notFoundTitle")} subtitle={t("geo.errors.notFoundBody")} breadcrumbs={[{ label: t("geo.nav.global"), to: "/global" }, { label: countryCode, to: `/countries/${countryCode}` }, { label: regionSlug }]}>
        <div className="rounded-2xl border border-border/25 bg-white/45 p-5 text-sm text-muted">{t("geo.errors.notFoundBody")}</div>
      </GeoShell>
    );
  }

  return (
    <GeoShell
      title={data?.region.name ?? t("geo.loading")}
      subtitle={t("geo.region.subtitle")}
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

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.region.feedSubtitle")}>
          <GeoOpportunityList items={data?.feed.items ?? []} />
          <div className="mt-4 text-xs text-muted">{t("geo.region.feedHint")}</div>
        </GeoSection>
      </div>
    </GeoShell>
  );
}
