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

  const [zoneRes, regionsRes, feed] = await Promise.all([
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
  ]);

  if (zoneRes.error) throw zoneRes.error;
  if (regionsRes.error) throw regionsRes.error;

  return {
    country: country as GeoCountry,
    zone: zoneRes.data as GeoZone,
    regions: (regionsRes.data ?? []) as GeoRegion[],
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
