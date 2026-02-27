import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";
import { sha256Hex } from "../../../_shared/rp_ai_utils.ts";
import type { ConnectorResult } from "../index.ts";
import { safeJsonFetch } from "../_utils.ts";

type AnacOcdsParams = {
  base_url: string;
  page: number;
  limit: number;
  cursor: string | null;
};

type JsonObj = Record<string, unknown>;

function getParams(source: SourceRow): AnacOcdsParams {
  const m = (source.meta ?? {}) as JsonObj;
  return {
    base_url: String(m.base_url ?? "https://dati.anticorruzione.it/opendata/ocds/api"),
    page: Number(m.page ?? m.cursor ?? 1) || 1,
    limit: Math.min(Number(m.limit ?? 25) || 25, 100),
    cursor: typeof m.cursor === "string" && m.cursor.trim() ? m.cursor.trim() : null,
  };
}

function cigFromOcid(ocid: string): string | null {
  const match = ocid.match(/CIG-([A-Z0-9]{8,10})$/i);
  return match ? match[1] : null;
}

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function parseIso(v: unknown): string | null {
  const s = safeStr(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseNextPointer(data: JsonObj, fallbackPage: number): { page?: number; cursor?: string | null } | null {
  const directNext = typeof data.next === "string" ? data.next : null;
  const links = (data.links ?? null) as JsonObj | null;
  const linksNext = links && typeof links.next === "string" ? links.next : null;
  const nextUrl = directNext || linksNext;

  if (nextUrl) {
    try {
      const u = new URL(nextUrl);
      const pageRaw = u.searchParams.get("page");
      const cursorRaw = u.searchParams.get("cursor");
      const page = pageRaw ? Number(pageRaw) : NaN;
      return {
        page: Number.isFinite(page) && page > 0 ? page : undefined,
        cursor: cursorRaw && cursorRaw.trim() ? cursorRaw.trim() : null,
      };
    } catch {
      return { page: fallbackPage + 1, cursor: null };
    }
  }

  return { page: fallbackPage + 1, cursor: null };
}

export async function apiAnacOcdsFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();
  const { base_url, page, limit, cursor } = getParams(source);
  const url = `${base_url}/releases?page=${page}&limit=${limit}`;

  let data: unknown;
  try {
    const res = await safeJsonFetch<unknown>(url, {
      headers: { Accept: "application/json" },
      timeout_ms: 30_000,
    });
    data = res.data;
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "anac_ocds_fetch_error",
        source_key: source.key,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return { opportunities: [], fetched_at };
  }

  const root = (data ?? {}) as JsonObj;
  const releasesRaw = Array.isArray(root.releases)
    ? root.releases
    : Array.isArray(root.results)
      ? root.results
      : [];

  const out: OpportunityUpsertInput[] = [];

  for (const item of releasesRaw) {
    const release = (item ?? {}) as JsonObj;
    const tender = (release.tender ?? null) as JsonObj | null;
    if (!tender) continue;

    const status = safeStr(tender.status).toLowerCase();
    if (status && status !== "active") continue;

    const ocid = safeStr(release.ocid);
    const externalId = ocid || null;
    const title = safeStr(tender.title) || safeStr(tender.description);
    if (!title) continue;

    const cig = cigFromOcid(ocid);
    const sourceUrl = cig
      ? `https://dati.anticorruzione.it/superset/dashboard/dettaglio_cig/?cig=${encodeURIComponent(cig)}`
      : "https://dati.anticorruzione.it/opendata/ocds_it";

    const entity = (release.procuringEntity ?? null) as JsonObj | null;
    const buyerName = safeStr(entity?.name) || null;

    const tenderPeriod = (tender.tenderPeriod ?? null) as JsonObj | null;
    const deadlineAt = parseIso(tenderPeriod?.endDate);
    const publishedAt = parseIso(release.date);

    const description = safeStr(tender.description);
    const summary = description
      ? description.slice(0, 1200)
      : buyerName
        ? `Stazione appaltante: ${buyerName}`
        : null;

    const address = (entity?.address ?? null) as JsonObj | null;
    const region = safeStr(address?.region) || safeStr(address?.locality) || null;

    const value = (tender.value ?? tender.estimatedValue ?? null) as JsonObj | null;
    const fingerprintBasis = externalId
      ? `${source.key}::${externalId}`
      : `${source.key}::${title}::${buyerName ?? ""}::${deadlineAt ?? ""}`;
    const fingerprint = await sha256Hex(fingerprintBasis);

    out.push({
      source_id: source.id,
      external_id: externalId || cig || null,
      fingerprint,
      type: "tender",
      status: "active",
      is_public: true,
      country_code: "IT",
      buyer_name: buyerName,
      title,
      summary,
      published_at: publishedAt,
      deadline_at: deadlineAt,
      deadline_tz: null,
      source_url: sourceUrl,
      language: "it",
      raw: {
        provider: "it_anac_ocds",
        ocid,
        cig,
        region,
        tender_value: value,
        source_cursor: cursor,
        release,
      },
    });
  }

  const next = parseNextPointer(root, page);

  console.info(
    JSON.stringify({
      event: "anac_ocds_fetch_done",
      source_key: source.key,
      releases_received: releasesRaw.length,
      opportunities_emitted: out.length,
      page,
      limit,
      next,
    }),
  );

  return { opportunities: out, fetched_at, next };
}
