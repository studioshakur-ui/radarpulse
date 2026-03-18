import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell } from "@/features/geo/GeoShell";
import { loadLocalityGeoPage, type LocalityGeoPageData } from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

export default function LocalityPage() {
  const { t } = useLocale();
  const params = useParams();
  const countryCode = String(params.countryCode ?? "").trim().toUpperCase();
  const regionSlug = String(params.regionSlug ?? "").trim().toLowerCase();
  const localitySlug = String(params.localitySlug ?? "").trim().toLowerCase();
  const [data, setData] = useState<LocalityGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!countryCode || !regionSlug || !localitySlug) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadLocalityGeoPage(countryCode, regionSlug, localitySlug);
        if (cancelled) return;
        setData(next);
        setNotFound(!next);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "geo_locality_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryCode, localitySlug, regionSlug]);

  if (notFound) {
    return (
      <GeoShell title={t("geo.errors.notFoundTitle")} subtitle={t("geo.errors.notFoundBody")} breadcrumbs={[{ label: t("geo.nav.global"), to: "/global" }, { label: countryCode, to: `/countries/${countryCode}` }, { label: regionSlug, to: `/countries/${countryCode}/regions/${regionSlug}` }, { label: localitySlug }]}>
        <div className="rounded-2xl border border-border/25 bg-white/45 p-5 text-sm text-muted">{t("geo.errors.notFoundBody")}</div>
      </GeoShell>
    );
  }

  return (
    <GeoShell
      title={data?.locality.name ?? t("geo.loading")}
      subtitle={t("geo.locality.subtitle")}
      breadcrumbs={[
        { label: t("geo.nav.global"), to: "/global" },
        data?.zone ? { label: data.zone.name, to: `/zones/${data.zone.slug}` } : { label: "…" },
        data?.country ? { label: data.country.name, to: `/countries/${data.country.country_code}` } : { label: countryCode },
        data?.region ? { label: data.region.name, to: `/countries/${countryCode}/regions/${regionSlug}` } : { label: regionSlug },
        { label: data?.locality.name ?? localitySlug },
      ]}
    >
      {error ? <div className="rounded-2xl border border-bad/25 bg-bad/10 p-4 text-sm text-bad">{error}</div> : null}

      <div className="grid gap-6">
        <GeoMetricGrid
          items={[
            { label: t("geo.labels.scope"), value: data?.locality.name ?? "—", hint: t("geo.locality.metrics.scopeHint") },
            { label: t("geo.labels.regions"), value: data?.region.name ?? "—", hint: t("geo.locality.metrics.regionHint") },
            { label: t("geo.metrics.publicOpps"), value: String(data?.feed.total ?? 0), hint: t("geo.locality.metrics.publicOppsHint") },
          ]}
        />

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.locality.feedSubtitle")}>
          <GeoOpportunityList items={data?.feed.items ?? []} />
        </GeoSection>
      </div>
    </GeoShell>
  );
}
