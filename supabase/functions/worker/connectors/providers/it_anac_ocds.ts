import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";
import { sha256Hex } from "../../../_shared/rp_ai_utils.ts";
import type { ConnectorResult } from "../index.ts";
import { safeJsonFetch } from "../_utils.ts";
import { createLogger } from "../../../_shared/logger.ts";

const log = createLogger("worker/it_anac_ocds");

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
    base_url: String(m.base_url ?? "https://api.anticorruzione.it/opendata/ocds/api/v1/1.0.0"),
    page: Number(m.page ?? m.cursor ?? 1) || 1,
    limit: Math.min(Number(m.limit ?? 20) || 20, 50),
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
  // Try as-is first (handles clean ISO strings)
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  // ANAC API returns malformed dates like "2025-12-17 16:33:53.036T12:00:00Z"
  // (space before T, double timestamp). Extract YYYY-MM-DD prefix and parse that.
  const datePrefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (datePrefix) {
    const d2 = new Date(datePrefix[1] + "T00:00:00Z");
    return Number.isNaN(d2.getTime()) ? null : d2.toISOString();
  }
  return null;
}

// Two-phase fetch strategy:
// Phase 1 -- GET /releases/ocids?limit=N  (fast: ~1-2s, returns lightweight list)
// Phase 2 -- parallel GET /releases/{ocid} for each OCID (each ~10s, all together ~15-20s)
// This avoids the bulk /releases endpoint which takes 90s+ from cloud infra.
async function fetchReleasesViaOcids(
  base_url: string,
  limit: number,
): Promise<JsonObj[]> {
  const ocidsUrl = base_url + "/releases/ocids?limit=" + limit;
  const ocidsRes = await safeJsonFetch<unknown>(ocidsUrl, {
    headers: { Accept: "application/json" },
    timeout_ms: 20_000,
  });

  const ocidList: string[] = [];
  if (Array.isArray(ocidsRes.data)) {
    for (const item of ocidsRes.data as JsonObj[]) {
      const val = safeStr(item.value || item.ocid || item.id);
      if (val) ocidList.push(val);
    }
  }

  if (ocidList.length === 0) return [];

  // Fetch each OCID in parallel with a per-request timeout of 40s.
  const fetches = ocidList.map((ocid) =>
    safeJsonFetch<unknown>(base_url + "/releases/" + encodeURIComponent(ocid), {
      headers: { Accept: "application/json" },
      timeout_ms: 40_000,
    }).then((r) => r.data).catch(() => null)
  );

  const settled = await Promise.all(fetches);
  const releases: JsonObj[] = [];
  for (const result of settled) {
    if (Array.isArray(result)) {
      for (const r of result as JsonObj[]) {
        if (r && typeof r === "object") releases.push(r as JsonObj);
      }
    } else if (result && typeof result === "object") {
      releases.push(result as JsonObj);
    }
  }
  return releases;
}

export async function apiAnacOcdsFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();
  const { base_url, limit, cursor } = getParams(source);

  let releasesRaw: JsonObj[];
  try {
    releasesRaw = await fetchReleasesViaOcids(base_url, limit);
  } catch (e) {
    log.error("fetch_error", { source_key: source.key, error: e instanceof Error ? e.message : String(e) });
    return { opportunities: [], fetched_at };
  }

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
      ? "https://dati.anticorruzione.it/superset/dashboard/dettaglio_cig/?cig=" + encodeURIComponent(cig)
      : "https://dati.anticorruzione.it/opendata/ocds_it";

    // ANAC API v1 uses "buyer" field; older OCDS spec uses "procuringEntity".
    const entity = (release.procuringEntity ?? release.buyer ?? null) as JsonObj | null;
    const buyerName = safeStr(entity?.name) || null;

    const tenderPeriod = (tender.tenderPeriod ?? null) as JsonObj | null;
    const deadlineAt = parseIso(tenderPeriod?.endDate);
    const publishedAt = parseIso(release.date);

    const description = safeStr(tender.description);
    const summary = description
      ? description.slice(0, 1200)
      : buyerName
        ? "Stazione appaltante: " + buyerName
        : null;

    const address = (entity?.address ?? null) as JsonObj | null;
    const region = safeStr(address?.region) || safeStr(address?.locality) || null;

    const value = (tender.value ?? tender.estimatedValue ?? null) as JsonObj | null;
    const fingerprintBasis = externalId
      ? source.key + "::" + externalId
      : source.key + "::" + title + "::" + (buyerName ?? "") + "::" + (deadlineAt ?? "");
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

  log.info("fetch_done", { source_key: source.key, releases_received: releasesRaw.length, opportunities_emitted: out.length, limit });

  return { opportunities: out, fetched_at };
}
