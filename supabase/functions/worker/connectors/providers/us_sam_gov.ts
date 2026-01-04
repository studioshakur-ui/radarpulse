import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { makeFingerprint, parseDateToIso, safeStr } from "../_utils.ts";

type SamOpportunity = {
  noticeId?: string;
  title?: string;
  synopsis?: string;
  postedDate?: string;
  responseDeadLine?: string;
  agency?: string;
  department?: string;
  office?: string;
  type?: string;
  uiLink?: string;
};

type SamSearchResponse = {
  opportunitiesData?: SamOpportunity[];
};

function defaultPostedFrom(source: SourceRow, nowIso: string): string {
  if (source.last_run_at) return source.last_run_at;
  const now = new Date(nowIso);
  const back = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return back.toISOString();
}

function toSamDate(dIso: string): string {
  const d = new Date(dIso);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = String(d.getUTCFullYear());
  return `${mm}/${dd}/${yyyy}`; // MM/dd/yyyy
}

export async function apiSamGovFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();

  const apiKey = Deno.env.get("SAMGOV_API_KEY") || "";
  if (!apiKey) throw new Error("Missing SAMGOV_API_KEY (required for us_sam_gov)");

  // SAM.gov Contract Opportunities API (incremental pull by postedFrom/postedTo).
  // Official docs: https://sam.gov/content/opportunities-api (API key required).
  const baseUrl = "https://api.sam.gov/prod/opportunities/v2/search";

  const postedFrom = defaultPostedFrom(source, fetched_at);
  const postedTo = fetched_at;

  const limit = Number(((source.meta ?? {}) as any).limit ?? 50);
  const maxPages = Number(((source.meta ?? {}) as any).max_pages ?? 10);
  const ptypes = safeStr(((source.meta ?? {}) as any).ptypes ?? "").trim(); // e.g. "p,o,k"

  const opportunities: OpportunityUpsertInput[] = [];

  for (let offset = 0, page = 0; page < maxPages; page++, offset += limit) {
    const url = new URL(baseUrl);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("postedFrom", toSamDate(postedFrom));
    url.searchParams.set("postedTo", toSamDate(postedTo));
    if (ptypes) url.searchParams.set("ptype", ptypes);

    // Optional keyword search.
    const q = safeStr(((source.meta ?? {}) as any).q ?? "").trim();
    if (q) url.searchParams.set("q", q);

    const r = await fetch(url.toString(), {
      headers: {
        "User-Agent": "RadarPulse/1.0",
        Accept: "application/json",
      },
    });

    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`SAMGOV_FETCH_FAILED ${r.status}: ${body.slice(0, 500)}`);
    }

    const data = (await r.json()) as SamSearchResponse;
    const items = data.opportunitiesData ?? [];
    if (items.length === 0) break;

    for (const it of items) {
      const external_id = safeStr(it.noticeId).trim() || null;
      const title = safeStr(it.title).trim() || "(no title)";
      const link = safeStr(it.uiLink).trim() || source.url;
      const summary = safeStr(it.synopsis).trim() || null;
      const buyer_name = safeStr(it.agency).trim() || safeStr(it.department).trim() || null;

      opportunities.push({
        source_id: source.id,
        external_id,
        fingerprint: makeFingerprint(source.key, external_id, title, link),
        type: "tender",
        status: "active",
        is_public: true,
        country_code: "US",
        buyer_name,
        title,
        summary,
        published_at: parseDateToIso(it.postedDate),
        deadline_at: parseDateToIso(it.responseDeadLine),
        deadline_tz: null,
        source_url: link,
        language: "en",
        raw: { sam: it },
      });
    }
  }

  return { opportunities, fetched_at };
}
