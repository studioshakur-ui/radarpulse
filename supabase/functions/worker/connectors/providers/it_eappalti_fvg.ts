import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { createLogger } from "../../../_shared/logger.ts";
import { makeFingerprint, safeStr } from "../_utils.ts";

const log = createLogger("worker/it_eappalti_fvg");
const FVG_REGION_NAME = "Friuli-Venezia Giulia";
const FVG_PORTAL_BOOT_URL = "https://eappalti.regione.fvg.it/web/index.html";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

function collectCookies(headers: Headers) {
  const cookieValues =
    typeof (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [headers.get("set-cookie") ?? ""].filter(Boolean);

  return cookieValues
    .map((value) => value.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function fetchWithSession(url: string) {
  const bootstrap = await fetch(FVG_PORTAL_BOOT_URL, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  const cookieHeader = collectCookies(bootstrap.headers);
  const headers = new Headers({
    "User-Agent": BROWSER_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: FVG_PORTAL_BOOT_URL,
  });
  if (cookieHeader) headers.set("Cookie", cookieHeader);

  return await fetch(url, { headers });
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#160;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value);
}

function parseItalianDateTime(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = "00", min = "00"] = match;
  const iso = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0));
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function inferLocalityFromBuyer(buyerName: string) {
  const next = buyerName.toLowerCase();
  if (next.includes("udine")) return "Udine";
  if (next.includes("trieste")) return "Trieste";
  if (next.includes("gorizia")) return "Gorizia";
  if (next.includes("pordenone")) return "Pordenone";
  return null;
}

function rowsFromListing(html: string) {
  const tbody = html.match(/<tbody class="list-tbody async-list-tbody">([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  return [...tbody.matchAll(/<tr class="[^"]+">([\s\S]*?)<\/tr>/gi)].map((match) => match[1] ?? "");
}

function cellsFromRow(rowHtml: string) {
  return [...rowHtml.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((match) => match[1] ?? "");
}

function detailMeta(rowHtml: string) {
  const hrefMatch = rowHtml.match(/goToDetail\(&#39;(\d+)&#39;,\s*&#39;(\d+)&#39;\)/i);
  const titleMatch = rowHtml.match(/title="Vedi dettaglio:\s*([^"]+)"/i);
  return {
    opportunityId: hrefMatch?.[1] ?? "",
    opportunityGroupId: hrefMatch?.[2] ?? "",
    detailTitle: titleMatch ? decodeHtml(titleMatch[1]) : "",
  };
}

export async function apiEappaltiFvgFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();
  const res = await fetchWithSession(source.url);

  if (!res.ok) {
    throw new Error(`FVG listing fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const rows = rowsFromListing(html);
  const opportunities: OpportunityUpsertInput[] = [];

  for (const row of rows) {
    const cells = cellsFromRow(row);
    if (cells.length < 7) continue;

    const meta = detailMeta(row);
    const procedure = stripTags(cells[1] ?? "");
    const buyer_name = stripTags(cells[2] ?? "");
    const title = meta.detailTitle || stripTags(cells[4] ?? "");
    const category = stripTags(cells[5] ?? "");
    const deadline_at = parseItalianDateTime(stripTags(cells[6] ?? ""));

    if (!title || !buyer_name || !meta.opportunityId) continue;

    const source_url = `https://eappalti.regione.fvg.it/esop/toolkit/opportunity/current/${meta.opportunityId}/detail.si`;
    const summaryParts = [procedure, category].filter(Boolean);

    opportunities.push({
      source_id: source.id,
      external_id: meta.opportunityId,
      fingerprint: makeFingerprint(source.key, meta.opportunityId, title, source_url),
      type: "tender",
      status: "active",
      is_public: true,
      country_code: "IT",
      region: FVG_REGION_NAME,
      locality: inferLocalityFromBuyer(buyer_name),
      buyer_name,
      title,
      summary: summaryParts.length ? summaryParts.join(" · ") : null,
      published_at: fetched_at,
      deadline_at,
      deadline_tz: "Europe/Rome",
      source_url,
      language: "it",
      raw: {
        provider: "it_eappalti_fvg",
        procedure,
        category,
        opportunity_group_id: meta.opportunityGroupId || null,
      },
    });
  }

  log.info("fetch_done", {
    source_key: source.key,
    fetched_count: rows.length,
    opportunities_emitted: opportunities.length,
  });

  return { opportunities, fetched_at };
}
