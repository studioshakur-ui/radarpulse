import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Map } from "lucide-react";
import { GeoChildCard, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, geoChildCountLabel, geoScopeIcon } from "@/features/geo/GeoShell";
import { loadZoneGeoPage, type ZoneGeoPageData } from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

export default function ZonePage() {
  const { t } = useLocale();
  const params = useParams();
  const zoneSlug = String(params.zoneSlug ?? "").trim().toLowerCase();
  const [data, setData] = useState<ZoneGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!zoneSlug) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadZoneGeoPage(zoneSlug);
        if (cancelled) return;
        setData(next);
        setNotFound(!next);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "geo_zone_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zoneSlug]);

  if (notFound) {
    return (
      <GeoShell title={t("geo.errors.notFoundTitle")} subtitle={t("geo.errors.notFoundBody")} breadcrumbs={[{ label: t("geo.nav.global"), to: "/global" }, { label: zoneSlug }]}>
        <div className="rounded-2xl border border-border/25 bg-white/45 p-5 text-sm text-muted">{t("geo.errors.notFoundBody")}</div>
      </GeoShell>
    );
  }

  return (
    <GeoShell
      title={data?.zone.name ?? t("geo.loading")}
      subtitle={data?.zone.description ?? t("geo.zone.subtitle")}
      breadcrumbs={[
        { label: t("geo.nav.global"), to: "/global" },
        { label: data?.zone.name ?? zoneSlug },
      ]}
    >
      {error ? <div className="rounded-2xl border border-bad/25 bg-bad/10 p-4 text-sm text-bad">{error}</div> : null}

      <div className="grid gap-6">
        <GeoMetricGrid
          items={[
            { label: t("geo.metrics.publicOpps"), value: String(data?.feed.total ?? 0), hint: t("geo.zone.metrics.publicOppsHint") },
            { label: t("geo.labels.countries"), value: String(data?.countries.length ?? 0), hint: t("geo.zone.metrics.countriesHint") },
            { label: t("geo.labels.scope"), value: data?.zone.name ?? "—", hint: t("geo.zone.metrics.scopeHint") },
          ]}
        />

        <GeoSection title={t("geo.labels.countries")} subtitle={t("geo.zone.countriesSubtitle")}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(data?.countries ?? []).map((country) => (
              <GeoChildCard
                key={country.id}
                title={`${country.flag_emoji ?? ""} ${country.name}`.trim()}
                subtitle={t("geo.zone.countryCardSubtitle")}
                to={`/countries/${country.country_code}`}
                icon={geoScopeIcon(country.territory_kind)}
                badge={country.country_code}
              />
            ))}
          </div>
        </GeoSection>

        <GeoSection title={t("geo.feed.title")} subtitle={t("geo.zone.feedSubtitle")}>
          <GeoOpportunityList items={data?.feed.items ?? []} />
        </GeoSection>

        <GeoSection title={t("geo.zone.forwardTitle")} subtitle={t("geo.zone.forwardSubtitle")}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft text-sm text-muted">
              {t("geo.zone.forwardCard1")}
            </div>
            <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft text-sm text-muted">
              {t("geo.zone.forwardCard2")}
            </div>
            <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft text-sm text-muted">
              <span className="inline-flex items-center gap-2 font-semibold text-text">
                <Map className="h-4 w-4 text-brand" />
                {geoChildCountLabel(data?.countries.length ?? 0, t, "countries")}
              </span>
            </div>
          </div>
        </GeoSection>
      </div>
    </GeoShell>
  );
}
