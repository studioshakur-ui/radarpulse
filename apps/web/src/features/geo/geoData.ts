import { supabase } from "@/lib/supabase";

const FEED_LIMIT = 12;

export type GeoZone = {
  id: string;
  parent_zone_id: string | null;
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  sort_order: number;
};

export type GeoCountry = {
  id: string;
  zone_id: string;
  country_code: string;
  slug: string;
  name: string;
  territory_kind: string;
  flag_emoji: string | null;
  sort_order: number;
};

export type GeoRegion = {
  id: string;
  country_id: string;
  slug: string;
  name: string;
  normalized_name: string;
  code: string | null;
  sort_order: number;
};

export type GeoLocality = {
  id: string;
  region_id: string;
  slug: string;
  name: string;
  normalized_name: string;
  code: string | null;
  sort_order: number;
};

export type GeoOpportunity = {
  id: string;
  title: string;
  buyer_name: string | null;
  region: string | null;
  locality: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  deadline_at: string | null;
  published_at: string | null;
  source_key: string | null;
  status: string;
  is_public: boolean;
  country_code: string | null;
  quality_score: number | null;
  completeness_score: number | null;
  origin_type: string | null;
  geo_zone_slug: string | null;
  geo_zone_name: string | null;
  geo_country_slug: string | null;
  geo_country_code: string | null;
  geo_country_name: string | null;
  geo_region_slug: string | null;
  geo_region_name: string | null;
  geo_locality_slug: string | null;
  geo_locality_name: string | null;
  geo_resolution_confidence: string | null;
};

export type GeoFeed = {
  items: GeoOpportunity[];
  total: number;
};

export type GeoFeedBreakdownItem = {
  label: string;
  value: number;
  hint?: string | null;
  slug?: string | null;
};

export type GeoFeedInsights = {
  activeSources: number;
  urgentCount: number;
  expiredCount: number;
  avgQuality: number | null;
  sourceMix: GeoFeedBreakdownItem[];
  originMix: GeoFeedBreakdownItem[];
  countryHotspots: GeoFeedBreakdownItem[];
  regionHotspots: GeoFeedBreakdownItem[];
  localityHotspots: GeoFeedBreakdownItem[];
};

export type GlobalGeoPageData = {
  zones: GeoZone[];
  countries: GeoCountry[];
  feed: GeoFeed;
};

export type ZoneGeoPageData = {
  zone: GeoZone;
  countries: GeoCountry[];
  feed: GeoFeed;
};

export type CountryGeoPageData = {
  country: GeoCountry;
  zone: GeoZone;
  regions: GeoRegion[];
  regionOpportunityCounts: Record<string, number>;
  feed: GeoFeed;
};

export type RegionGeoPageData = {
  country: GeoCountry;
  zone: GeoZone;
  region: GeoRegion;
  localities: GeoLocality[];
  feed: GeoFeed;
};

export type LocalityGeoPageData = {
  country: GeoCountry;
  zone: GeoZone;
  region: GeoRegion;
  locality: GeoLocality;
  feed: GeoFeed;
};

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function sourceLabel(sourceKey: string | null | undefined) {
  const next = normalizeLabel(sourceKey, "unknown_source");
  return next
    .split("_")
    .filter(Boolean)
    .map((part) => part.toUpperCase() === part ? part : part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function originLabel(originType: string | null | undefined) {
  const next = normalizeLabel(originType, "other");
  if (next === "IT_NATIVE") return "IT native";
  if (next === "EU") return "EU";
  return next[0]?.toUpperCase() + next.slice(1).toLowerCase();
}

function pushCount(map: Map<string, GeoFeedBreakdownItem>, key: string, item: GeoFeedBreakdownItem) {
  const current = map.get(key);
  if (current) {
    current.value += item.value;
    return;
  }
  map.set(key, { ...item });
}

function topBreakdown(map: Map<string, GeoFeedBreakdownItem>, limit = 5) {
  return [...map.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)).slice(0, limit);
}

function isExpired(deadlineAt: string | null) {
  if (!deadlineAt) return false;
  const ts = Date.parse(deadlineAt);
  return Number.isFinite(ts) && ts < Date.now();
}

function isUrgent(deadlineAt: string | null) {
  if (!deadlineAt) return false;
  const ts = Date.parse(deadlineAt);
  if (!Number.isFinite(ts)) return false;
  const diff = ts - Date.now();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

export function buildGeoFeedInsights(items: GeoOpportunity[]): GeoFeedInsights {
  const sourceMix = new Map<string, GeoFeedBreakdownItem>();
  const originMix = new Map<string, GeoFeedBreakdownItem>();
  const countryHotspots = new Map<string, GeoFeedBreakdownItem>();
  const regionHotspots = new Map<string, GeoFeedBreakdownItem>();
  const localityHotspots = new Map<string, GeoFeedBreakdownItem>();
  const qualityScores: number[] = [];
  let urgentCount = 0;
  let expiredCount = 0;

  for (const item of items) {
    pushCount(sourceMix, item.source_key ?? "unknown_source", {
      label: sourceLabel(item.source_key),
      hint: item.source_key,
      value: 1,
    });
    pushCount(originMix, item.origin_type ?? "other", {
      label: originLabel(item.origin_type),
      hint: item.origin_type,
      value: 1,
    });

    const countryLabel = normalizeLabel(item.geo_country_name ?? item.country_code, "Unscoped");
    pushCount(countryHotspots, countryLabel, {
      label: countryLabel,
      hint: item.geo_country_code ?? item.country_code,
      value: 1,
      slug: item.geo_country_code ?? item.country_code,
    });

    const regionLabel = normalizeLabel(item.geo_region_name ?? item.region, "Unassigned");
    pushCount(regionHotspots, regionLabel, {
      label: regionLabel,
      hint: item.geo_country_code ?? item.country_code,
      value: 1,
      slug: item.geo_region_slug,
    });

    const localityLabel = normalizeLabel(item.geo_locality_name ?? item.locality, "Unassigned");
    pushCount(localityHotspots, localityLabel, {
      label: localityLabel,
      hint: item.geo_region_name ?? item.region,
      value: 1,
      slug: item.geo_locality_slug,
    });

    if (typeof item.quality_score === "number") {
      qualityScores.push(Math.max(0, Math.min(1, item.quality_score)));
    }
    if (isUrgent(item.deadline_at)) urgentCount += 1;
    if (isExpired(item.deadline_at)) expiredCount += 1;
  }

  return {
    activeSources: sourceMix.size,
    urgentCount,
    expiredCount,
    avgQuality: qualityScores.length > 0 ? qualityScores.reduce((sum, value) => sum + value, 0) / qualityScores.length : null,
    sourceMix: topBreakdown(sourceMix),
    originMix: topBreakdown(originMix, 4),
    countryHotspots: topBreakdown(countryHotspots),
    regionHotspots: topBreakdown(regionHotspots),
    localityHotspots: topBreakdown(localityHotspots),
  };
}

function opportunitiesQuery() {
  return supabase
    .from("opportunities_geo_scope_v1")
    .select(
      "id,title,buyer_name,region,locality,budget_amount,budget_currency,deadline_at,published_at,source_key,status,is_public,country_code,quality_score,completeness_score,origin_type,geo_zone_slug,geo_zone_name,geo_country_slug,geo_country_code,geo_country_name,geo_region_slug,geo_region_name,geo_locality_slug,geo_locality_name,geo_resolution_confidence",
      { count: "exact" },
    )
    .eq("is_public", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(FEED_LIMIT);
}

async function listScopedOpportunities(scope: {
  countryCode?: string | null;
  countryCodes?: string[];
  regionName?: string | null;
  regionSlug?: string | null;
  localitySlug?: string | null;
}): Promise<GeoFeed> {
  let query = opportunitiesQuery();

  if (scope.countryCode) {
    query = query.eq("country_code", scope.countryCode);
  }

  if (scope.countryCodes && scope.countryCodes.length > 0) {
    query = query.in("country_code", scope.countryCodes);
  }

  if (scope.localitySlug) {
    query = query.eq("geo_locality_slug", scope.localitySlug);
  } else if (scope.regionSlug) {
    query = query.eq("geo_region_slug", scope.regionSlug);
  } else if (scope.regionName) {
    query = query.ilike("region", scope.regionName);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: (data ?? []) as GeoOpportunity[],
    total: count ?? 0,
  };
}

async function listCountryRegionCounts(countryCode: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("opportunities_geo_scope_v1")
    .select("geo_region_slug,region")
    .eq("is_public", true)
    .eq("country_code", countryCode)
    .limit(5000);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const slug = typeof row.geo_region_slug === "string" ? row.geo_region_slug.trim().toLowerCase() : "";
    if (!slug) continue;
    counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}

export async function loadGlobalGeoPage(): Promise<GlobalGeoPageData> {
  const [zonesRes, countriesRes, feed] = await Promise.all([
    supabase
      .from("geo_zones")
      .select("id,parent_zone_id,slug,name,kind,description,sort_order")
      .is("parent_zone_id", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("geo_countries")
      .select("id,zone_id,country_code,slug,name,territory_kind,flag_emoji,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    listScopedOpportunities({}),
  ]);

  if (zonesRes.error) throw zonesRes.error;
  if (countriesRes.error) throw countriesRes.error;

  return {
    zones: (zonesRes.data ?? []) as GeoZone[],
    countries: (countriesRes.data ?? []) as GeoCountry[],
    feed,
  };
}

export async function loadZoneGeoPage(zoneSlug: string): Promise<ZoneGeoPageData | null> {
  const { data: zone, error: zoneError } = await supabase
    .from("geo_zones")
    .select("id,parent_zone_id,slug,name,kind,description,sort_order")
    .eq("slug", zoneSlug)
    .maybeSingle();

  if (zoneError) throw zoneError;
  if (!zone) return null;

  const { data: countries, error: countriesError } = await supabase
    .from("geo_countries")
    .select("id,zone_id,country_code,slug,name,territory_kind,flag_emoji,sort_order")
    .eq("zone_id", zone.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (countriesError) throw countriesError;

  const countryRows = (countries ?? []) as GeoCountry[];
  const feed = await listScopedOpportunities({
    countryCodes: countryRows.map((row) => row.country_code),
  });

  return {
    zone: zone as GeoZone,
    countries: countryRows,
    feed,
  };
}

export async function loadCountryGeoPage(countryCode: string): Promise<CountryGeoPageData | null> {
  const { data: country, error: countryError } = await supabase
    .from("geo_countries")
    .select("id,zone_id,country_code,slug,name,territory_kind,flag_emoji,sort_order")
    .eq("country_code", countryCode)
    .maybeSingle();

  if (countryError) throw countryError;
  if (!country) return null;

  const [zoneRes, regionsRes, feed, regionOpportunityCounts] = await Promise.all([
    supabase
      .from("geo_zones")
      .select("id,parent_zone_id,slug,name,kind,description,sort_order")
      .eq("id", country.zone_id)
      .single(),
    supabase
      .from("geo_regions")
      .select("id,country_id,slug,name,normalized_name,code,sort_order")
      .eq("country_id", country.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    listScopedOpportunities({ countryCode }),
    listCountryRegionCounts(countryCode),
  ]);

  if (zoneRes.error) throw zoneRes.error;
  if (regionsRes.error) throw regionsRes.error;

  return {
    country: country as GeoCountry,
    zone: zoneRes.data as GeoZone,
    regions: (regionsRes.data ?? []) as GeoRegion[],
    regionOpportunityCounts,
    feed,
  };
}

export async function loadRegionGeoPage(countryCode: string, regionSlug: string): Promise<RegionGeoPageData | null> {
  const countryPage = await loadCountryGeoPage(countryCode);
  if (!countryPage) return null;

  const region = countryPage.regions.find((row) => row.slug === regionSlug);
  if (!region) return null;

  const [localitiesRes, feed] = await Promise.all([
    supabase
      .from("geo_localities")
      .select("id,region_id,slug,name,normalized_name,code,sort_order")
      .eq("region_id", region.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    listScopedOpportunities({
      countryCode,
      regionSlug: region.slug,
    }),
  ]);

  if (localitiesRes.error) throw localitiesRes.error;

  return {
    country: countryPage.country,
    zone: countryPage.zone,
    region,
    localities: (localitiesRes.data ?? []) as GeoLocality[],
    feed,
  };
}

export async function loadLocalityGeoPage(
  countryCode: string,
  regionSlug: string,
  localitySlug: string,
): Promise<LocalityGeoPageData | null> {
  const regionPage = await loadRegionGeoPage(countryCode, regionSlug);
  if (!regionPage) return null;

  const locality = regionPage.localities.find((row) => row.slug === localitySlug);
  if (!locality) return null;

  const feed = await listScopedOpportunities({
    countryCode,
    regionSlug: regionPage.region.slug,
    localitySlug: locality.slug,
  });

  return {
    country: regionPage.country,
    zone: regionPage.zone,
    region: regionPage.region,
    locality,
    feed,
  };
}
