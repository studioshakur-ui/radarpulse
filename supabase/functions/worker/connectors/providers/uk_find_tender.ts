import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { makeFingerprint, parseDateToIso, safeStr } from "../_utils.ts";

type FindTenderApiResponse = {
  releases?: any[];
  next_page?: string | null;
};

function buyerNameFromRelease(r: any): string | null {
  const direct = safeStr(r?.buyer?.name).trim();
  if (direct) return direct;

  const parties = Array.isArray(r?.parties) ? r.parties : [];
  for (const p of parties) {
    const roles = Array.isArray(p?.roles) ? p.roles : [];
    if (roles.includes("buyer") || roles.includes("procuringEntity")) {
      const n = safeStr(p?.name).trim();
      if (n) return n;
    }
  }
  return null;
}

export async function apiFindTenderFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();

  // Find a Tender (FTS) OCDS API
  const baseUrl = source.url;

  const limit = Number(((source.meta ?? {}) as any).limit ?? 50);
  const maxPages = Number(((source.meta ?? {}) as any).max_pages ?? 10);

  // Incremental pull: since last run, else last 24h.
  const sinceIso = source.last_run_at
    ? source.last_run_at
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let pageUrl: string | null = null;
  const opportunities: OpportunityUpsertInput[] = [];

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(pageUrl || baseUrl);
    url.searchParams.set("limit", String(limit));

    // FTS supports updatedFrom/updatedTo on this endpoint.
    if (!pageUrl) {
      url.searchParams.set("updatedFrom", sinceIso);
      url.searchParams.set("updatedTo", fetched_at);
    }

    const r = await fetch(url.toString(), {
      headers: {
        "User-Agent": "RadarPulse/1.0",
        Accept: "application/json",
      },
    });

    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`FTS_FETCH_FAILED ${r.status}: ${body.slice(0, 500)}`);
    }

    const data = (await r.json()) as FindTenderApiResponse;
    const releases = Array.isArray(data.releases) ? data.releases : [];
    for (const rel of releases) {
      const external_id = safeStr(rel?.id).trim() || null;
      const title = safeStr(rel?.tender?.title).trim() || "(no title)";
      const desc = safeStr(rel?.tender?.description).trim();
      const buyer_name = buyerNameFromRelease(rel);

      // Fallback URL
      const source_url = external_id
        ? `https://www.find-tender.service.gov.uk/Notice/Search?text=${encodeURIComponent(external_id)}`
        : source.url;

      opportunities.push({
        source_id: source.id,
        external_id,
        fingerprint: makeFingerprint(source.key, external_id, title, source_url),
        type: "tender",
        status: "active",
        is_public: true,
        country_code: "GB",
        buyer_name,
        title,
        summary: desc ? desc.slice(0, 2000) : null,
        published_at: parseDateToIso(rel?.date),
        deadline_at: parseDateToIso(rel?.tender?.tenderPeriod?.endDate),
        deadline_tz: null,
        source_url,
        language: "en",
        raw: { fts: rel },
      });
    }

    pageUrl = data.next_page ? String(data.next_page) : null;
    if (!pageUrl) break;
  }

  return { opportunities, fetched_at };
}
