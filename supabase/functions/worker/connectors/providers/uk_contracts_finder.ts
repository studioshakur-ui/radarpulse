import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { createLogger } from "../../../_shared/logger.ts";
import { makeFingerprint, parseDateToIso, safeJsonFetch, safeStr } from "../_utils.ts";

const log = createLogger("worker/uk_contracts_finder");

type ContractsFinderResponse = {
  releases?: any[];
};

function buyerNameFromRelease(release: any): string | null {
  const direct = safeStr(release?.buyer?.name).trim();
  if (direct) return direct;

  const parties = Array.isArray(release?.parties) ? release.parties : [];
  for (const party of parties) {
    const roles = Array.isArray(party?.roles) ? party.roles : [];
    if (roles.includes("buyer") || roles.includes("procuringEntity")) {
      const name = safeStr(party?.name).trim();
      if (name) return name;
    }
  }
  return null;
}

function firstRegionHint(release: any): string | null {
  const tenderItems = Array.isArray(release?.tender?.items) ? release.tender.items : [];
  for (const item of tenderItems) {
    const region = safeStr(item?.deliveryAddresses?.[0]?.region).trim();
    if (region) return region;
  }

  const buyerRegion = safeStr(release?.buyer?.address?.region).trim();
  if (buyerRegion) return buyerRegion;

  const parties = Array.isArray(release?.parties) ? release.parties : [];
  for (const party of parties) {
    const region = safeStr(party?.address?.region).trim();
    if (region) return region;
  }

  return null;
}

export async function apiContractsFinderFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();
  const meta = (source.meta ?? {}) as Record<string, unknown>;
  const limit = Math.max(1, Math.min(100, Number(meta.limit ?? 100) || 100));
  const stages = safeStr(meta.stages ?? "planning,tender").trim() || "planning,tender";

  const publishedFrom = source.last_run_at
    ? source.last_run_at
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const url = new URL(source.url);
  url.searchParams.set("publishedFrom", publishedFrom);
  url.searchParams.set("publishedTo", fetched_at);
  url.searchParams.set("stages", stages);
  url.searchParams.set("limit", String(limit));

  const { data } = await safeJsonFetch<ContractsFinderResponse>(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "RadarPulse/1.0",
      Accept: "application/json",
    },
    timeout_ms: 30_000,
  });

  const releases = Array.isArray(data?.releases) ? data.releases : [];
  const opportunities: OpportunityUpsertInput[] = releases.map((release) => {
    const external_id = safeStr(release?.id).trim() || safeStr(release?.ocid).trim() || null;
    const title = safeStr(release?.tender?.title).trim() || "(no title)";
    const summary = safeStr(release?.tender?.description).trim() || null;
    const buyer_name = buyerNameFromRelease(release);
    const source_url = external_id
      ? `https://www.contractsfinder.service.gov.uk/Notice/${encodeURIComponent(external_id)}`
      : source.url;

    return {
      source_id: source.id,
      external_id,
      fingerprint: makeFingerprint(source.key, external_id, title, source_url),
      type: "tender",
      status: "active",
      is_public: true,
      country_code: "GB",
      region: firstRegionHint(release),
      buyer_name,
      title,
      summary,
      published_at: parseDateToIso(release?.date),
      deadline_at: parseDateToIso(release?.tender?.tenderPeriod?.endDate),
      deadline_tz: null,
      source_url,
      language: "en",
      raw: { contracts_finder: release },
    };
  });

  log.info("fetch_done", {
    source_key: source.key,
    fetched_count: releases.length,
    opportunities_emitted: opportunities.length,
  });

  return { opportunities, fetched_at };
}
