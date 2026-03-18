import { useEffect, useMemo, useState } from "react";
import { Globe2, Map } from "lucide-react";
import { GeoChildCard, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, geoChildCountLabel, geoScopeIcon } from "@/features/geo/GeoShell";
import { loadGlobalGeoPage, type GeoCountry, type GlobalGeoPageData } from "@/features/geo/geoData";
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

  const featuredCountries = useMemo(() => (data?.countries ?? []).slice(0, 6), [data]);

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
            { label: t("geo.labels.zones"), value: String(data?.zones.length ?? 0), hint: t("geo.global.metrics.zonesHint") },
            { label: t("geo.labels.countries"), value: String(data?.countries.length ?? 0), hint: t("geo.global.metrics.countriesHint") },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <GeoSection title={t("geo.labels.zones")} subtitle={t("geo.global.zonesSubtitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {(data?.zones ?? []).map((zone) => {
                const countryCount = (data?.countries ?? []).filter((country) => country.zone_id === zone.id).length;
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
