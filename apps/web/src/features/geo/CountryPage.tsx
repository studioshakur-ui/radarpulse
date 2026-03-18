import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPinned } from "lucide-react";
import { GeoChildCard, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell } from "@/features/geo/GeoShell";
import { loadCountryGeoPage, type CountryGeoPageData } from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

export default function CountryPage() {
  const { t } = useLocale();
  const params = useParams();
  const countryCode = String(params.countryCode ?? "").trim().toUpperCase();
  const [data, setData] = useState<CountryGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

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
      <GeoShell title={t("geo.errors.notFoundTitle")} subtitle={t("geo.errors.notFoundBody")} breadcrumbs={[{ label: t("geo.nav.global"), to: "/global" }, { label: countryCode }]}>
        <div className="rounded-2xl border border-border/25 bg-white/45 p-5 text-sm text-muted">{t("geo.errors.notFoundBody")}</div>
      </GeoShell>
    );
  }

  return (
    <GeoShell
      title={data ? `${data.country.flag_emoji ?? ""} ${data.country.name}`.trim() : t("geo.loading")}
      subtitle={t("geo.country.subtitle")}
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

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.country.feedSubtitle")}>
          <GeoOpportunityList items={data?.feed.items ?? []} />
        </GeoSection>
      </div>
    </GeoShell>
  );
}
