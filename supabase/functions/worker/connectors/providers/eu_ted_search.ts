import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";
import { sha256Hex } from "../../../_shared/rp_ai_utils.ts";

import type { ConnectorResult } from "../index.ts";
import { makeFingerprint, safeJsonFetch } from "../_utils.ts";
import { createLogger } from "../../../_shared/logger.ts";

const log = createLogger("worker/eu_ted_search");

type TedSearchParams = {
  base_url?: string;
  query?: string;
  scope?: "ACTIVE" | "ARCHIVE";
  page?: number;
  limit?: number;
  onlyLatestVersions?: boolean;
  checkQuerySyntax?: boolean;
  paginationMode?: "PAGE_NUMBER" | "ITERATION";
};

// TED API v3 field names -- must be sent with every request (empty fields = 400 error).
const TED_FIELDS_V3 = [
  "publication-number",
  "notice-title",
  "publication-date",
  "deadline",
  "buyer-country",
];

// ISO 3166-1 alpha-3 to alpha-2 mapping (covers all TED/EU countries + common extras)
const ISO3_TO_ISO2: Record<string, string> = {
  AUT: "AT", BEL: "BE", BGR: "BG", HRV: "HR", CYP: "CY", CZE: "CZ",
  DNK: "DK", EST: "EE", FIN: "FI", FRA: "FR", DEU: "DE", GRC: "GR",
  HUN: "HU", IRL: "IE", ITA: "IT", LVA: "LV", LTU: "LT", LUX: "LU",
  MLT: "MT", NLD: "NL", POL: "PL", PRT: "PT", ROU: "RO", SVK: "SK",
  SVN: "SI", ESP: "ES", SWE: "SE", GBR: "GB", NOR: "NO", CHE: "CH",
  ISL: "IS", LIE: "LI", TUR: "TR", UKR: "UA", USA: "US", CAN: "CA",
};

// Rolling 12-month default query -- TED API v3 requires a non-empty query.
function buildDefaultQuery(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return "publication-date >= " + y + m + day;
}

function getMeta(source: SourceRow): TedSearchParams {
  const meta = (source.meta ?? {}) as Record<string, unknown>;
  const scope = String(meta.scope ?? "ACTIVE").toUpperCase();
  const paginationMode = String(meta.paginationMode ?? "PAGE_NUMBER").toUpperCase();

  return {
    base_url: String(meta.base_url ?? source.url ?? "https://api.ted.europa.eu/v3/notices/search"),
    query: typeof meta.query === "string" ? meta.query : "",
    scope: (scope === "ARCHIVE" ? "ARCHIVE" : "ACTIVE") as TedSearchParams["scope"],
    page: Number(meta.page ?? 1) || 1,
    limit: Number(meta.limit ?? 25) || 25,
    onlyLatestVersions: Boolean(meta.onlyLatestVersions ?? false),
    checkQuerySyntax: Boolean(meta.checkQuerySyntax ?? false),
    paginationMode: (paginationMode === "ITERATION" ? "ITERATION" : "PAGE_NUMBER") as TedSearchParams["paginationMode"],
  };
}

// firstString handles TED v3 multilingual objects: { eng: "...", deu: "...", ... }
// Prefers English ("eng"/"en") then falls back to any first string value found.
function firstString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v) {
    const anyV = v as any;
    if (typeof anyV.eng === "string") return anyV.eng;
    if (typeof anyV.en === "string") return anyV.en;
    if (typeof anyV.text === "string") return anyV.text;
    if (typeof anyV.value === "string") return anyV.value;
    if (typeof anyV.label === "string") return anyV.label;
    const vals = Object.values(anyV).filter((x): x is string => typeof x === "string");
    if (vals.length > 0) return vals[0];
  }
  return "";
}

function pick(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    const s = firstString(v).trim();
    if (s) return s;
  }
  return "";
}

function parseMaybeIsoDate(v: string): string | null {
  const s = String(v || "").trim();
  if (!s) return null;
  // Handle YYYYMMDD compact format -- new Date("20260115") is Invalid Date in V8.
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const d = new Date(compact[1] + "-" + compact[2] + "-" + compact[3] + "T00:00:00Z");
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  // Try standard parse (handles full ISO timestamps).
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  // Fallback: TED v3 returns dates like "2025-12-30+01:00" (no time component).
  // Extract YYYY-MM-DD prefix and parse as UTC midnight.
  const prefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (prefix) {
    const d2 = new Date(prefix[1] + "T00:00:00Z");
    return Number.isNaN(d2.getTime()) ? null : d2.toISOString();
  }
  return null;
}

function inferNoticeCountryCode(n: any): string | null {
  const raw = pick(n, [
    "buyer-country",
    "country",
    "country_code",
    "buyer_country",
    "buyerCountry",
    "place-of-performance-country",
    "placeOfPerformanceCountry",
    "nuts_country",
    "nutsCountry",
  ]);
  const cc = String(raw || "").trim().toUpperCase();
  if (!cc) return null;
  if (cc.length === 2) return cc;
  // TED API v3 returns ISO alpha-3 codes -- map to alpha-2
  const iso2 = ISO3_TO_ISO2[cc];
  if (iso2) return iso2;
  if (cc === "ITA" || cc === "ITALY") return "IT";
  return cc;
}

function tedNoticeUrl(publicationNumber: string): string {
  const pn = String(publicationNumber || "").trim();
  return "https://ted.europa.eu/en/notice/" + encodeURIComponent(pn) + "/html";
}

export async function apiEuTedSearchFetch(source: SourceRow): Promise<ConnectorResult> {
  // "EU" = accept all TED notices; any other code = filter to that country only.
  const sourceCountry = (source.country_code ?? "EU").trim().toUpperCase() || "EU";
  const meta = getMeta(source);

  // TED API v3 requires both "query" (non-empty) and "fields" (non-empty).
  // Omitting either causes a 400 validation error.
  const bodyBase: Record<string, unknown> = {
    query: meta.query || buildDefaultQuery(),
    page: meta.page ?? 1,
    limit: meta.limit ?? 25,
    scope: meta.scope ?? "ACTIVE",
    checkQuerySyntax: meta.checkQuerySyntax ?? false,
    paginationMode: meta.paginationMode ?? "PAGE_NUMBER",
    onlyLatestVersions: meta.onlyLatestVersions ?? false,
    fields: TED_FIELDS_V3,
  };

  async function fetchTed(body: Record<string, unknown>): Promise<any> {
    const res = await safeJsonFetch<any>(String(meta.base_url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    return res.data;
  }

  let data: any;
  try {
    data = await fetchTed({ ...bodyBase });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const safeMeta = {
      base_url: String(meta.base_url ?? ""),
      scope: meta.scope ?? "ACTIVE",
      page: meta.page ?? 1,
      limit: meta.limit ?? 25,
    };
    throw new Error("TED_SEARCH_FAILED " + msg + " | payload_meta=" + JSON.stringify(safeMeta));
  }

  const notices: any[] = Array.isArray(data?.notices)
    ? data.notices
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.items)
        ? data.items
        : [];

  const out: OpportunityUpsertInput[] = [];
  let filteredOutByCountry = 0;

  for (const n of notices) {
    const noticeCountry = inferNoticeCountryCode(n);
    // If the source targets a specific country (not "EU"), skip non-matching notices.
    if (sourceCountry !== "EU" && noticeCountry && noticeCountry !== sourceCountry) {
      filteredOutByCountry++;
      continue;
    }

    const publicationNumber =
      pick(n, [
        "publication-number",
        "publicationNumber",
        "publication_number",
        "publicationNo",
        "publication-no",
        "noticeId",
        "id",
      ]) || "";

    const title =
      pick(n, [
        "notice-title",
        "title",
        "noticeTitle",
        "notice_title",
        "description",
        "contract-title",
        "contractTitle",
      ]) || "(untitled)";

    const buyerName = pick(n, ["buyer_name", "buyerName", "contractingAuthority", "contracting_authority", "caName"]);

    const pubDate =
      parseMaybeIsoDate(pick(n, ["publication-date", "publicationDate", "publication_date", "date"])) ?? null;
    const deadlineAt =
      parseMaybeIsoDate(pick(n, ["deadline", "deadline-date", "deadlineDate", "deadline_date", "deadlineAt"])) ?? null;

    const sourceUrl = tedNoticeUrl(publicationNumber || (await sha256Hex(title)).slice(0, 12));

    const externalId = publicationNumber || null;
    const fingerprint = makeFingerprint(source.key, externalId, title, sourceUrl);

    out.push({
      source_id: source.id,
      external_id: externalId,
      fingerprint,
      type: "tender",
      status: "active",
      is_public: true,
      country_code: noticeCountry ?? sourceCountry,
      buyer_name: buyerName || null,
      title,
      summary: buyerName ? "Buyer: " + buyerName : null,
      published_at: pubDate,
      deadline_at: deadlineAt,
      deadline_tz: null,
      source_url: sourceUrl,
      language: null,
      raw: {
        provider: "eu_ted_search",
        notice: n,
      },
    });
  }

  log.info("fetch_done", {
    source_key: source.key,
    source_country: sourceCountry,
    notices_received: notices.length,
    notices_filtered_out: filteredOutByCountry,
    opportunities_emitted: out.length,
  });

  return {
    ok: true,
    fetched_at: new Date().toISOString(),
    opportunities: out,
    meta: {
      provider: "eu_ted_search",
      notice_count: out.length,
      scope: meta.scope,
      page: meta.page,
      limit: meta.limit,
    },
  };
}
