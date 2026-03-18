import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { makeFingerprint, parseDateToIso, safeStr, safeJsonFetch } from "../_utils.ts";
import { createLogger } from "../../../_shared/logger.ts";

const log = createLogger("worker/fr_boamp");

type BoampMeta = {
  base_url?: string;
  limit?: number;
  max_pages?: number;
  select?: string;
  where?: string;
  order_by?: string;
};

type BoampRecord = Record<string, unknown>;

type BoampRecordsResponse = {
  total_count?: number;
  results?: BoampRecord[];
};

function getMeta(source: SourceRow): BoampMeta {
  const meta = (source.meta ?? {}) as Record<string, unknown>;
  return {
    base_url: safeStr(meta.base_url ?? source.url).trim() || "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records",
    limit: Number(meta.limit ?? 50) || 50,
    max_pages: Number(meta.max_pages ?? 10) || 10,
    select: safeStr(
      meta.select
        ?? "idweb,dateparution,objet,nomacheteur,datelimitereponse,type_marche,url_avis,code_departement"
    ).trim(),
    where: safeStr(meta.where ?? "").trim(),
    order_by: safeStr(meta.order_by ?? "dateparution desc").trim(),
  };
}

function defaultWhere(source: SourceRow, fetchedAt: string): string {
  const last = source.last_run_at
    ? source.last_run_at
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const fromDate = last.slice(0, 10);
  const toDate = fetchedAt.slice(0, 10);
  return `dateparution >= date'${fromDate}' and dateparution <= date'${toDate}'`;
}

function recordField(record: BoampRecord, key: string): string {
  return safeStr(record[key]).trim();
}

function noticeUrl(record: BoampRecord): string {
  const explicit = recordField(record, "url_avis");
  if (explicit) return explicit;

  const idweb = recordField(record, "idweb");
  if (idweb) return `https://www.boamp.fr/avis/detail/${encodeURIComponent(idweb)}`;

  return "https://www.boamp.fr";
}

function mapType(rawType: string): "tender" | "grant" {
  const t = rawType.toLowerCase();
  if (t.includes("subvention") || t.includes("grant")) return "grant";
  return "tender";
}

export async function apiBoampFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();
  const meta = getMeta(source);
  const opportunities: OpportunityUpsertInput[] = [];

  for (let page = 0; page < meta.max_pages!; page++) {
    const offset = page * meta.limit!;
    const url = new URL(String(meta.base_url));
    url.searchParams.set("limit", String(meta.limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("order_by", String(meta.order_by));
    url.searchParams.set("select", String(meta.select));
    url.searchParams.set("where", meta.where || defaultWhere(source, fetched_at));

    const { data } = await safeJsonFetch<BoampRecordsResponse>(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "RadarPulse/1.0",
        Accept: "application/json",
      },
      timeout_ms: 30_000,
    });

    const results = Array.isArray(data?.results) ? data.results : [];
    if (!results.length) break;

    for (const record of results) {
      const external_id = recordField(record, "idweb") || null;
      const title = recordField(record, "objet") || "(no title)";
      const buyer_name = recordField(record, "nomacheteur") || null;
      const source_url = noticeUrl(record);
      const published_at = parseDateToIso(recordField(record, "dateparution"));
      const deadline_at = parseDateToIso(recordField(record, "datelimitereponse"));
      const type = mapType(recordField(record, "type_marche"));

      opportunities.push({
        source_id: source.id,
        external_id,
        fingerprint: makeFingerprint(source.key, external_id, title, source_url),
        type,
        status: "active",
        is_public: true,
        country_code: "FR",
        buyer_name,
        title,
        summary: null,
        published_at,
        deadline_at,
        deadline_tz: null,
        source_url,
        language: "fr",
        raw: {
          provider: "fr_boamp",
          boamp: record,
          code_departement: recordField(record, "code_departement") || null,
        },
      });
    }

    if (results.length < meta.limit!) break;
  }

  log.info("fetch_done", {
    source_key: source.key,
    opportunities_emitted: opportunities.length,
  });

  return {
    opportunities,
    fetched_at,
  };
}
