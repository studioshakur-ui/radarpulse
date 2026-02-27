import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";
import { sha256Hex } from "../../../_shared/rp_ai_utils.ts";

import type { ConnectorResult } from "../index.ts";
import { makeFingerprint, safeJsonFetch } from "../_utils.ts";

type TedSearchParams = {
  base_url?: string;
  query?: string;
  scope?: "ACTIVE" | "ARCHIVE";
  page?: number;
  limit?: number;
  onlyLatestVersions?: boolean;
  checkQuerySyntax?: boolean;
  paginationMode?: "PAGE_NUMBER" | "ITERATION";
  fields?: string[];
};

const DEFAULT_TED_FIELDS = [
  "publication-number",
  "title",
  "publication-date",
  "deadline",
  "buyer_name",
];
const TARGET_COUNTRY_CODE = "IT";

function getMeta(source: SourceRow): TedSearchParams {
  const meta = (source.meta ?? {}) as Record<string, unknown>;
  const fieldsRaw = meta.fields;
  const fields = Array.isArray(fieldsRaw)
    ? fieldsRaw.map((x) => String(x).trim()).filter(Boolean)
    : [];

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
    fields: fields.length ? fields : DEFAULT_TED_FIELDS,
  };
}

function firstString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v) {
    const anyV = v as any;
    if (typeof anyV.text === "string") return anyV.text;
    if (typeof anyV.value === "string") return anyV.value;
    if (typeof anyV.label === "string") return anyV.label;
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
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function inferNoticeCountryCode(n: any): string | null {
  const raw = pick(n, [
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
  if (cc === "ITA" || cc === "ITALY") return "IT";
  return cc;
}

function tedNoticeUrl(publicationNumber: string): string {
  const pn = String(publicationNumber || "").trim();
  return `https://ted.europa.eu/en/notice/${encodeURIComponent(pn)}/html`;
}

export async function apiEuTedSearchFetch(source: SourceRow): Promise<ConnectorResult> {
  const meta = getMeta(source);

  const body: Record<string, unknown> = {
    query: meta.query ?? "",
    page: meta.page ?? 1,
    limit: meta.limit ?? 25,
    scope: meta.scope ?? "ACTIVE",
    checkQuerySyntax: meta.checkQuerySyntax ?? false,
    paginationMode: meta.paginationMode ?? "PAGE_NUMBER",
    onlyLatestVersions: meta.onlyLatestVersions ?? false,
  };
  // TED v3 rejects empty "fields". Always send a non-empty list.
  body.fields = (meta.fields && meta.fields.length) ? meta.fields : DEFAULT_TED_FIELDS;

  let data: any;
  try {
    const res = await safeJsonFetch<any>(String(meta.base_url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    data = res.data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const safeMeta = {
      base_url: String(meta.base_url ?? ""),
      scope: meta.scope ?? "ACTIVE",
      page: meta.page ?? 1,
      limit: meta.limit ?? 25,
      fields_count: Array.isArray(body.fields) ? body.fields.length : 0,
    };
    throw new Error(`TED_SEARCH_FAILED ${msg} | payload_meta=${JSON.stringify(safeMeta)}`);
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
    if (noticeCountry && noticeCountry !== TARGET_COUNTRY_CODE) {
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
        "title",
        "notice-title",
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
      country_code: TARGET_COUNTRY_CODE,
      buyer_name: buyerName || null,
      title,
      summary: buyerName ? `Buyer: ${buyerName}` : null,
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

  console.info(
    JSON.stringify({
      event: "ted_it_filter_applied",
      source_key: source.key,
      requested_country: TARGET_COUNTRY_CODE,
      notices_received: notices.length,
      notices_filtered_out: filteredOutByCountry,
      opportunities_emitted: out.length,
    })
  );

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
