import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { createLogger } from "../../../_shared/logger.ts";
import { makeFingerprint, parseDateToIso, safeJsonFetch, safeStr } from "../_utils.ts";

const log = createLogger("worker/uk_public_contracts_scotland");

type PcsResponse = Record<string, unknown> | unknown[] | null;

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function firstTruthyString(values: unknown[]) {
  for (const value of values) {
    const next = safeStr(value).trim();
    if (next) return next;
  }
  return null;
}

function extractReleases(data: PcsResponse): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  return asArray(record.releases)
    .concat(asArray(record.notices))
    .concat(asArray(record.data))
    .concat(asArray(record.records));
}

function buyerNameFromRelease(release: any): string | null {
  const direct = firstTruthyString([
    release?.buyer?.name,
    release?.authorityName,
    release?.contractingAuthority,
    release?.organisationName,
    release?.publishedBy,
  ]);
  if (direct) return direct;

  for (const party of asArray(release?.parties)) {
    const roles = asArray(party?.roles);
    if (roles.includes("buyer") || roles.includes("procuringEntity")) {
      const name = safeStr(party?.name).trim();
      if (name) return name;
    }
  }

  return null;
}

function firstLocalityHint(release: any): string | null {
  const direct = firstTruthyString([
    release?.buyer?.address?.locality,
    release?.buyer?.address?.city,
    release?.authorityTown,
    release?.locality,
    release?.city,
  ]);
  if (direct) return direct;

  for (const item of asArray(release?.tender?.items)) {
    const locality = firstTruthyString([
      item?.deliveryAddresses?.[0]?.locality,
      item?.deliveryAddresses?.[0]?.city,
      item?.deliveryAddress?.locality,
      item?.deliveryAddress?.city,
    ]);
    if (locality) return locality;
  }

  for (const party of asArray(release?.parties)) {
    const locality = firstTruthyString([party?.address?.locality, party?.address?.city]);
    if (locality) return locality;
  }

  return null;
}

function releaseUrl(release: any, fallbackUrl: string) {
  const noticeUrl = firstTruthyString([
    release?.url,
    release?.noticeUrl,
    release?.links?.self,
    release?.uri,
  ]);
  return noticeUrl ?? fallbackUrl;
}

function monthYearCursor(date: Date) {
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${date.getUTCFullYear()}`;
}

export async function apiPublicContractsScotlandFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();
  const meta = (source.meta ?? {}) as Record<string, unknown>;
  const outputType = Number(meta.output_type ?? 0) || 0;
  const noticeTypes = Array.isArray(meta.notice_types) && meta.notice_types.length > 0
    ? meta.notice_types.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [2, 102];
  const monthsBack = Math.max(0, Math.min(2, Number(meta.months_back ?? 1) || 1));

  const monthCursors = new Set<string>();
  for (let offset = 0; offset <= monthsBack; offset += 1) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - offset);
    monthCursors.add(monthYearCursor(d));
  }

  if (source.last_run_at) {
    monthCursors.add(monthYearCursor(new Date(source.last_run_at)));
  }

  const releases: any[] = [];
  for (const dateFrom of monthCursors) {
    for (const noticeType of noticeTypes) {
      const url = new URL(source.url);
      url.searchParams.set("dateFrom", dateFrom);
      url.searchParams.set("noticeType", String(noticeType));
      url.searchParams.set("outputType", String(outputType));

      const { data } = await safeJsonFetch<PcsResponse>(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "RadarPulse/1.0",
          Accept: "application/json",
        },
        timeout_ms: 30_000,
      });

      releases.push(...extractReleases(data));
    }
  }

  const opportunities: OpportunityUpsertInput[] = releases.map((release) => {
    const external_id = firstTruthyString([
      release?.id,
      release?.ocid,
      release?.noticeId,
      release?.notice_id,
    ]);
    const title = firstTruthyString([
      release?.tender?.title,
      release?.title,
      release?.noticeTitle,
      release?.description,
    ]) ?? "(no title)";
    const summary = firstTruthyString([
      release?.tender?.description,
      release?.description,
      release?.summary,
    ]);
    const source_url = releaseUrl(release, source.url);

    return {
      source_id: source.id,
      external_id,
      fingerprint: makeFingerprint(source.key, external_id, title, source_url),
      type: "tender",
      status: "active",
      is_public: true,
      country_code: "GB",
      region: "Scotland",
      locality: firstLocalityHint(release),
      buyer_name: buyerNameFromRelease(release),
      title,
      summary,
      published_at: parseDateToIso(release?.date ?? release?.datePublished ?? release?.publishedDate),
      deadline_at: parseDateToIso(
        release?.tender?.tenderPeriod?.endDate
          ?? release?.deadlineDate
          ?? release?.responseDeadline,
      ),
      deadline_tz: null,
      source_url,
      language: "en",
      raw: { public_contracts_scotland: release },
    };
  });

  log.info("fetch_done", {
    source_key: source.key,
    fetched_count: releases.length,
    opportunities_emitted: opportunities.length,
  });

  return { opportunities, fetched_at };
}
