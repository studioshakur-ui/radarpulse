import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowUpRight, Building2, Clock3, RadioTower, Sparkles } from "lucide-react";
import { GeoChildCard, GeoInsightList, GeoMetricGrid, GeoOpportunityList, GeoSection, GeoShell, GeoSignalStrip } from "@/features/geo/GeoShell";
import { buildGeoFeedInsights, loadRegionGeoPage, type RegionGeoPageData } from "@/features/geo/geoData";
import { useLocale } from "@/lib/i18n";

function regionStory(countryCode: string, t: (key: string) => string) {
  switch (countryCode) {
    case "FR":
      return {
        eyebrow: t("geo.region.story.fr.eyebrow"),
        title: t("geo.region.story.fr.title"),
        body: t("geo.region.story.fr.body"),
      };
    case "GB":
      return {
        eyebrow: t("geo.region.story.gb.eyebrow"),
        title: t("geo.region.story.gb.title"),
        body: t("geo.region.story.gb.body"),
      };
    default:
      return {
        eyebrow: t("geo.region.story.it.eyebrow"),
        title: t("geo.region.story.it.title"),
        body: t("geo.region.story.it.body"),
      };
  }
}

export default function RegionPage() {
  const { t } = useLocale();
  const params = useParams();
  const countryCode = String(params.countryCode ?? "").trim().toUpperCase();
  const regionSlug = String(params.regionSlug ?? "").trim().toLowerCase();
  const [data, setData] = useState<RegionGeoPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const insights = useMemo(() => buildGeoFeedInsights(data?.feed.items ?? []), [data]);
  const story = useMemo(() => regionStory(countryCode, t), [countryCode, t]);
  const leadSource = insights.sourceMix[0] ?? null;
  const leadLocality = insights.localityHotspots[0] ?? null;

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
        <section className="overflow-hidden rounded-[32px] border border-border/30 bg-white/72 shadow-soft">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.95fr]">
            <div className="border-b border-border/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82))] p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/75">{story.eyebrow}</div>
              <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-text sm:text-3xl">{story.title}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-subtext">{story.body}</p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                    <RadioTower className="h-4 w-4 text-brand" />
                    {t("geo.region.hero.panel1.title")}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-subtext">{t("geo.region.hero.panel1.body")}</p>
                </div>
                <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                    <Clock3 className="h-4 w-4 text-brand" />
                    {t("geo.region.hero.panel2.title")}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-subtext">{t("geo.region.hero.panel2.body")}</p>
                </div>
                <div className="rounded-3xl border border-border/25 bg-bg/45 p-5 shadow-soft">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                    <Sparkles className="h-4 w-4 text-brand" />
                    {t("geo.region.hero.panel3.title")}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-subtext">{t("geo.region.hero.panel3.body")}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 bg-[linear-gradient(160deg,rgba(246,248,252,0.96),rgba(255,255,255,0.78))] p-6 sm:p-8">
              <div className="rounded-3xl border border-border/25 bg-bg/55 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.region.intelligence.eyebrow")}</div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-subtext">{t("geo.insights.sourceCoverage")}</div>
                    <div className="mt-1 text-2xl font-semibold text-text">{leadSource?.label ?? "—"}</div>
                    <div className="mt-1 text-sm text-subtext">{leadSource ? `${leadSource.value} ${t("geo.region.intelligence.visibleItems")}` : t("geo.feed.empty")}</div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-brand" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border/25 bg-bg/55 p-5 shadow-soft">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.hotLocalities")}</div>
                  <div className="mt-2 text-xl font-semibold text-text">{leadLocality?.label ?? "—"}</div>
                  <div className="mt-1 text-sm text-subtext">{leadLocality ? `${leadLocality.value} ${t("geo.region.intelligence.visibleItems")}` : t("geo.feed.empty")}</div>
                </div>
                <div className="rounded-3xl border border-border/25 bg-bg/55 p-5 shadow-soft">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{t("geo.insights.urgent")}</div>
                  <div className="mt-2 text-xl font-semibold text-text">{insights.urgentCount}</div>
                  <div className="mt-1 text-sm text-subtext">{t("geo.region.intelligence.urgencyHint")}</div>
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
            </div>
          </div>
        </section>

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
                tone: item.label.toLowerCase().endsWith("native") ? "good" : item.label === "EU" ? "default" : "warn",
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
