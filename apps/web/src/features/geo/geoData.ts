import { supabase } from "@/lib/supabase";

const FEED_LIMIT = 2000;
const COUNTRY_REGION_ALIAS_MAP: Record<string, Record<string, string[]>> = {
  IT: {
    abruzzo: ["abruzzo", "l aquila", "laquila", "pescara", "chieti", "teramo"],
    basilicata: ["basilicata", "potenza", "matera"],
    calabria: ["calabria", "catanzaro", "reggio calabria", "cosenza", "crotone", "vibo valentia"],
    campania: ["campania", "napoli", "naples", "salerno", "caserta", "avellino", "benevento"],
    "emilia-romagna": ["emilia romagna", "bologna", "modena", "parma", "reggio emilia", "rimini", "ferrara", "piacenza", "ravenna", "forli", "cesena"],
    "friuli-venezia-giulia": ["friuli venezia giulia", "trieste", "udine", "gorizia", "pordenone"],
    lazio: ["lazio", "roma", "rome", "frosinone", "latina", "viterbo", "rieti"],
    liguria: ["liguria", "genova", "genoa", "savona", "imperia", "la spezia"],
    lombardia: ["lombardia", "milano", "milan", "bergamo", "brescia", "como", "varese", "pavia", "monza", "mantova", "cremona", "lecco", "sondrio", "lodi"],
    marche: ["marche", "ancona", "pesaro", "urbino", "macerata", "fermo", "ascoli piceno"],
    molise: ["molise", "campobasso", "isernia"],
    piemonte: ["piemonte", "torino", "turin", "novara", "alessandria", "asti", "biella", "cuneo", "verbania", "vercelli"],
    puglia: ["puglia", "bari", "lecce", "taranto", "foggia", "brindisi", "barletta", "andria", "trani"],
    sardegna: ["sardegna", "sardinia", "cagliari", "sassari", "nuoro", "oristano"],
    sicilia: ["sicilia", "sicily", "palermo", "catania", "messina", "trapani", "siracusa", "ragusa", "agrigento", "enna", "caltanissetta"],
    toscana: ["toscana", "tuscany", "firenze", "florence", "pisa", "siena", "prato", "arezzo", "lucca", "livorno", "grosseto", "pistoia", "massa carrara"],
    "trentino-alto-adige": ["trentino alto adige", "trentino alto adige sudtirol", "trento", "bolzano", "bozen"],
    umbria: ["umbria", "perugia", "terni"],
    "valle-daosta": ["valle d aosta", "valle daosta", "aosta"],
    veneto: ["veneto", "venezia", "venice", "verona", "padova", "padua", "vicenza", "treviso", "belluno", "rovigo"],
  },
  FR: {
    "ile-de-france": ["ile de france", "paris", "seine saint denis", "hauts de seine", "val de marne", "essonne", "yvelines", "val d oise", "seine et marne"],
    "auvergne-rhone-alpes": ["auvergne rhone alpes", "lyon", "grenoble", "clermont ferrand", "annecy", "saint etienne", "valence", "chambery"],
    "provence-alpes-cote-dazur": ["provence alpes cote d azur", "marseille", "nice", "toulon", "avignon", "aix en provence", "cannes"],
    occitanie: ["occitanie", "toulouse", "montpellier", "nimes", "perpignan"],
    "nouvelle-aquitaine": ["nouvelle aquitaine", "bordeaux", "limoges", "poitiers", "pau", "la rochelle"],
    "hauts-de-france": ["hauts de france", "lille", "amiens", "arras", "calais", "dunkerque"],
  },
  GB: {
    london: ["london", "greater london"],
    "south-west": ["south west", "bristol", "bath", "plymouth", "exeter", "cornwall", "devon", "somerset", "dorset", "gloucestershire"],
    "south-east": ["south east", "kent", "surrey", "oxford", "oxfordshire", "brighton", "hampshire", "sussex", "littlehampton", "portsmouth", "southampton"],
    "east-of-england": ["east of england", "cambridge", "cambridgeshire", "norfolk", "suffolk", "essex", "luton", "hertfordshire", "bedfordshire", "peterborough"],
    "east-midlands": ["east midlands", "nottingham", "derby", "leicester", "lincoln", "northampton", "rutland", "derbyshire", "nottinghamshire"],
    "yorkshire-and-the-humber": ["yorkshire and the humber", "yorkshire", "leeds", "sheffield", "bradford", "hull", "wakefield", "york", "north yorkshire", "south yorkshire", "west yorkshire", "east riding"],
    "north-east": ["north east", "newcastle", "sunderland", "durham", "middlesbrough", "northumberland", "tyne and wear", "tees valley", "hartlepool", "stockton", "darlington", "redcar"],
    "north-west": ["north west", "manchester", "liverpool", "cumbria", "cheshire", "bolton", "merseyside", "lancashire"],
    "west-midlands": ["west midlands", "birmingham", "coventry", "wolverhampton", "sandwell", "dudley", "staffordshire", "walsall", "solihull"],
    scotland: ["scotland", "edinburgh", "glasgow", "aberdeen", "dundee", "historic environment scotland"],
    wales: ["wales", "cardiff", "swansea", "newport", "gwynedd", "carmarthenshire", "powys", "conwy", "bridgend", "monmouthshire", "anglesey", "wrexham"],
    "northern-ireland": ["northern ireland", "belfast", "derry", "londonderry", "newry", "mourne", "armagh", "causeway", "antrim"],
  },
};

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
  sector: string | null;
  content_type: string | null;
  buyer_type: string | null;
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
  sourceOpportunityCounts: Record<string, number>;
  countryOpportunityCounts: Record<string, number>;
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
  sourceOpportunityCounts: Record<string, number>;
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

export function sourceLabel(sourceKey: string | null | undefined) {
  const next = normalizeLabel(sourceKey, "unknown_source");
  if (next === "uk_find_a_tender") return "Find a Tender";
  if (next === "uk_contracts_finder_active") return "Contracts Finder";
  if (next === "uk_sell2wales_active") return "Sell2Wales";
  if (next === "fr_boamp_active") return "BOAMP";
  if (next === "eu_ted_fr_active") return "TED France";
  if (next === "it_anac_ocds") return "ANAC";
  if (next === "it_roma_bandi_rss") return "Roma buyer feed";
  if (next === "it_aria_lombardia_rss") return "ARIA Lombardia";
  return next
    .split("_")
    .filter(Boolean)
    .map((part) => part.toUpperCase() === part ? part : part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function displayOriginLabel(originType: string | null | undefined, sourceKey?: string | null | undefined) {
  const key = String(sourceKey ?? "").toLowerCase();
  if (key.startsWith("uk_")) return "UK native";
  if (key.startsWith("fr_")) return "FR native";
  if (key.startsWith("it_")) return "IT native";
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

function normalizeGeoText(value: string | null | undefined) {
  const next = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("’", " ")
    .replaceAll("'", " ")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replaceAll("/", " ")
    .replaceAll(".", " ")
    .replaceAll(",", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .replace(/\s+/g, " ")
    .trim();
  return next;
}

function isActiveOpportunity(item: Pick<GeoOpportunity, "deadline_at" | "status">) {
  if (String(item.status ?? "").toLowerCase() === "expired") return false;
  if (!item.deadline_at) return false;
  return !isExpired(item.deadline_at);
}

function buildRegionAliasIndex(countryCode: string, regions: GeoRegion[]) {
  const aliasConfig = COUNTRY_REGION_ALIAS_MAP[countryCode] ?? {};
  const aliasIndex = new Map<string, string>();

  for (const region of regions) {
    aliasIndex.set(normalizeGeoText(region.slug), region.slug);
    aliasIndex.set(normalizeGeoText(region.name), region.slug);
    aliasIndex.set(normalizeGeoText(region.normalized_name), region.slug);
  }

  for (const [slug, aliases] of Object.entries(aliasConfig)) {
    if (!regions.some((region) => region.slug === slug)) continue;
    for (const alias of aliases) {
      aliasIndex.set(normalizeGeoText(alias), slug);
    }
  }

  return aliasIndex;
}

function findRegionSlugByText(text: string, aliasIndex: Map<string, string>) {
  if (!text) return "";
  for (const [alias, slug] of aliasIndex.entries()) {
    if (alias && text.includes(alias)) return slug;
  }
  return "";
}

function sourcePriority(sourceKey: string | null | undefined, countryCode: string) {
  const key = String(sourceKey ?? "").toLowerCase();
  if (!key) return 0;
  if (countryCode === "IT") {
    if (key.startsWith("it_anac_ocds")) return 5;
    if (key.includes("roma") || key.includes("lombardia")) return 4;
    if (key.startsWith("eu_ted")) return 1;
  }
  if (countryCode === "FR") {
    if (key.startsWith("fr_boamp")) return 5;
    if (key.startsWith("eu_ted")) return 2;
  }
  if (countryCode === "GB") {
    if (key.startsWith("uk_find_a_tender") || key.startsWith("uk_contracts_finder") || key.startsWith("uk_sell2wales")) return 5;
  }
  if (key.startsWith("eu_ted")) return 1;
  return 2;
}

function publishedPriority(publishedAt: string | null | undefined) {
  const ts = Date.parse(String(publishedAt ?? ""));
  return Number.isFinite(ts) ? ts : 0;
}

function qualityPriority(item: Pick<GeoOpportunity, "quality_score" | "completeness_score">) {
  const quality = typeof item.quality_score === "number" ? item.quality_score : -1;
  const completeness = typeof item.completeness_score === "number" ? item.completeness_score : -1;
  return quality + completeness;
}

function prioritizeCountryFeed(items: GeoOpportunity[], countryCode: string, regions: GeoRegion[]) {
  return [...items].sort((a, b) => {
    const aResolved = resolveOpportunityRegionSlug(a, countryCode, regions) ? 1 : 0;
    const bResolved = resolveOpportunityRegionSlug(b, countryCode, regions) ? 1 : 0;
    if (bResolved !== aResolved) return bResolved - aResolved;

    const aSource = sourcePriority(a.source_key, countryCode);
    const bSource = sourcePriority(b.source_key, countryCode);
    if (bSource !== aSource) return bSource - aSource;

    const aQuality = qualityPriority(a);
    const bQuality = qualityPriority(b);
    if (bQuality !== aQuality) return bQuality - aQuality;

    return publishedPriority(b.published_at) - publishedPriority(a.published_at);
  });
}

export function resolveOpportunityRegionSlug(
  item: Pick<GeoOpportunity, "geo_region_slug" | "geo_region_name" | "region" | "locality" | "title" | "buyer_name">,
  countryCode: string,
  regions: GeoRegion[],
) {
  const regionBySlug = new Map(regions.map((region) => [region.slug, region]));
  const aliasIndex = buildRegionAliasIndex(countryCode, regions);
  const geoSlug = typeof item.geo_region_slug === "string" ? item.geo_region_slug.trim().toLowerCase() : "";
  if (geoSlug && regionBySlug.has(geoSlug)) return geoSlug;

  const exact =
    aliasIndex.get(normalizeGeoText(item.geo_region_name))
    || aliasIndex.get(normalizeGeoText(item.region))
    || aliasIndex.get(normalizeGeoText(item.locality));
  if (exact) return exact;

  const searchText = normalizeGeoText(
    [item.geo_region_name, item.region, item.locality, item.buyer_name, item.title]
      .filter(Boolean)
      .join(" "),
  );

  return findRegionSlugByText(searchText, aliasIndex);
}

export function resolveOpportunityRegionName(
  item: Pick<GeoOpportunity, "geo_region_slug" | "geo_region_name" | "region" | "locality" | "title" | "buyer_name">,
  countryCode: string,
  regions: GeoRegion[],
) {
  const slug = resolveOpportunityRegionSlug(item, countryCode, regions);
  if (!slug) return item.geo_region_name ?? item.region ?? item.locality ?? null;
  return regions.find((region) => region.slug === slug)?.name ?? item.geo_region_name ?? item.region ?? item.locality ?? null;
}

export function buildGeoFeedInsights(
  items: GeoOpportunity[],
  options?: { countryCode?: string | null; regions?: GeoRegion[] },
): GeoFeedInsights {
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
    pushCount(originMix, `${item.origin_type ?? "other"}:${item.source_key ?? ""}`, {
      label: displayOriginLabel(item.origin_type, item.source_key),
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

    const resolvedRegionLabel =
      options?.countryCode && options.regions?.length
        ? resolveOpportunityRegionName(item, options.countryCode, options.regions)
        : item.geo_region_name ?? item.region;
    const resolvedRegionSlug =
      options?.countryCode && options.regions?.length
        ? resolveOpportunityRegionSlug(item, options.countryCode, options.regions)
        : item.geo_region_slug;
    const regionLabel = normalizeLabel(resolvedRegionLabel, "Unassigned");
    pushCount(regionHotspots, regionLabel, {
      label: regionLabel,
      hint: item.geo_country_code ?? item.country_code,
      value: 1,
      slug: resolvedRegionSlug,
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
  const nowIso = new Date().toISOString();
  return supabase
    .from("opportunities_geo_scope_v1")
    .select(
      "id,title,buyer_name,region,locality,sector,content_type,buyer_type,budget_amount,budget_currency,deadline_at,published_at,source_key,status,is_public,country_code,quality_score,completeness_score,origin_type,geo_zone_slug,geo_zone_name,geo_country_slug,geo_country_code,geo_country_name,geo_region_slug,geo_region_name,geo_locality_slug,geo_locality_name,geo_resolution_confidence",
      { count: "exact" },
    )
    .eq("is_public", true)
    .not("deadline_at", "is", null)
    .gte("deadline_at", nowIso)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(FEED_LIMIT);
}

async function listGlobalSourceCounts(): Promise<Record<string, number>> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("opportunities_geo_scope_v1")
    .select("source_key")
    .eq("is_public", true)
    .not("deadline_at", "is", null)
    .gte("deadline_at", nowIso)
    .limit(5000);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const sourceKey = normalizeLabel((row as { source_key?: string | null }).source_key, "");
    if (!sourceKey) continue;
    counts[sourceKey] = (counts[sourceKey] ?? 0) + 1;
  }

  return counts;
}

async function listGlobalCountryCounts(): Promise<Record<string, number>> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("opportunities_geo_scope_v1")
    .select("country_code,geo_country_name")
    .eq("is_public", true)
    .not("deadline_at", "is", null)
    .gte("deadline_at", nowIso)
    .limit(5000);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const countryCode = normalizeLabel((row as { country_code?: string | null }).country_code, "");
    const countryName = normalizeLabel((row as { geo_country_name?: string | null }).geo_country_name, "");
    const key = countryCode || countryName;
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
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

async function listCountryRegionCounts(countryCode: string, regions: GeoRegion[]): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("opportunities_geo_scope_v1")
    .select("geo_region_slug,geo_region_name,region,locality,title,buyer_name,deadline_at,status,source_key")
    .eq("is_public", true)
    .eq("country_code", countryCode)
    .limit(5000);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!isActiveOpportunity(row as Pick<GeoOpportunity, "deadline_at" | "status">)) continue;
    const slug = resolveOpportunityRegionSlug(
      {
        geo_region_slug: row.geo_region_slug ?? null,
        geo_region_name: row.geo_region_name ?? null,
        region: row.region ?? null,
        locality: row.locality ?? null,
        title: row.title ?? "",
        buyer_name: row.buyer_name ?? null,
      },
      countryCode,
      regions,
    );

    if (!slug) continue;
    counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}

async function listCountrySourceCounts(countryCode: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("opportunities_geo_scope_v1")
    .select("source_key,deadline_at,status")
    .eq("is_public", true)
    .eq("country_code", countryCode)
    .limit(5000);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!isActiveOpportunity(row as Pick<GeoOpportunity, "deadline_at" | "status">)) continue;
    const sourceKey = normalizeLabel((row as { source_key?: string | null }).source_key, "");
    if (!sourceKey) continue;
    counts[sourceKey] = (counts[sourceKey] ?? 0) + 1;
  }

  return counts;
}

export async function loadGlobalGeoPage(): Promise<GlobalGeoPageData> {
  const [zonesRes, countriesRes, sourceOpportunityCounts, countryOpportunityCounts, feed] = await Promise.all([
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
    listGlobalSourceCounts(),
    listGlobalCountryCounts(),
    listScopedOpportunities({}),
  ]);

  if (zonesRes.error) throw zonesRes.error;
  if (countriesRes.error) throw countriesRes.error;

  return {
    zones: (zonesRes.data ?? []) as GeoZone[],
    countries: (countriesRes.data ?? []) as GeoCountry[],
    sourceOpportunityCounts,
    countryOpportunityCounts,
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
  const regionRows = (regionsRes.data ?? []) as GeoRegion[];
  const [regionOpportunityCounts, sourceOpportunityCounts] = await Promise.all([
    listCountryRegionCounts(countryCode, regionRows),
    listCountrySourceCounts(countryCode),
  ]);
  const prioritizedFeed = {
    items: prioritizeCountryFeed(feed.items, countryCode, regionRows),
    total: feed.total,
  };

  return {
    country: country as GeoCountry,
    zone: zoneRes.data as GeoZone,
    regions: regionRows,
    regionOpportunityCounts,
    sourceOpportunityCounts,
    feed: prioritizedFeed,
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
