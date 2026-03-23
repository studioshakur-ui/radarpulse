import type { OpportunityDocumentInput, OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";
import type { ConnectorResult } from "../index.ts";
import { createLogger } from "../../../_shared/logger.ts";
import { makeFingerprint, safeStr } from "../_utils.ts";

const log = createLogger("worker/it_intercent_er");

const DEFAULT_LISTING_URLS = [
  "https://intercenter.regione.emilia-romagna.it/servizi-imprese/bandi-altri-enti/bandi-altri-enti-aperti",
  "https://intercenter.regione.emilia-romagna.it/servizi-imprese/bandi-altri-enti/bandi-altri-enti-in-corso",
];

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const BTP_KEYWORDS = [
  "lavori",
  "manutenzione",
  "edil",
  "impiant",
  "infrastrutt",
  "opere",
  "riqualific",
  "ristruttur",
  "efficientamento",
  "restauro",
  "adeguamento",
  "bim",
  "sicurezza",
  "architettura",
  "ingegneria",
  "direzione lavori",
  "coordinamento della sicurezza",
  "servizi tecnici",
  "accordo quadro",
  "global service",
];

function decodeHtml(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseItalianDateTime(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = "00", min = "00"] = match;
  const iso = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0));
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function parseAmount(value: string): number | null {
  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBtpRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return BTP_KEYWORDS.some((keyword) => text.includes(keyword));
}

function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function listingUrls(source: SourceRow): string[] {
  const configured = Array.isArray(source.meta?.listing_urls)
    ? (source.meta?.listing_urls as unknown[]).map((entry) => safeStr(entry).trim()).filter(Boolean)
    : [];
  return configured.length ? configured : DEFAULT_LISTING_URLS;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);
  return await res.text();
}

function extractDetailUrls(listingUrl: string, html: string): string[] {
  const matches = [...html.matchAll(/href="([^"]*BANDO_GARA_PORTALE(?:%40|@)\d+[^"]*)"/gi)];
  return unique(
    matches
      .map((match) => absoluteUrl(listingUrl, match[1] ?? ""))
      .filter((href) => href.includes("BANDO_GARA_PORTALE")),
  );
}

function captureField(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`${escaped}\\s*</[^>]+>\\s*<[^>]+>([\\s\\S]*?)</`, "i"),
    new RegExp(`${escaped}\\s*:?\\s*</?[^>]*>\\s*([^<\\n][\\s\\S]*?)<`, "i"),
    new RegExp(`${escaped}\\s*:?\\s*([\\s\\S]{1,300}?)\\n`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = decodeHtml(match?.[1] ?? "");
    if (value) return value;
  }

  return null;
}

function extractDocuments(detailUrl: string, html: string): OpportunityDocumentInput[] {
  const matches = [...html.matchAll(/href="([^"]+\.(?:pdf|zip|7z|docx?|xlsx?)(?:\?[^"]*)?)"[^>]*>([\s\S]*?)<\/a>/gi)];
  return unique(
    matches.map((match) => JSON.stringify({
      doc_url: absoluteUrl(detailUrl, match[1] ?? ""),
      doc_title: decodeHtml(match[2] ?? "") || null,
      doc_type: null,
    })),
  ).map((encoded) => JSON.parse(encoded) as OpportunityDocumentInput);
}

function inferStatus(statusText: string | null): "active" | "expired" {
  const normalized = (statusText ?? "").toLowerCase();
  if (normalized.includes("chiuso") || normalized.includes("conclus")) return "expired";
  return "active";
}

export async function apiIntercentErFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();
  const detailUrls: string[] = [];

  for (const url of listingUrls(source)) {
    try {
      const html = await fetchHtml(url);
      detailUrls.push(...extractDetailUrls(url, html));
    } catch (error) {
      log.error("listing_fetch_failed", {
        source_key: source.key,
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const opportunities: OpportunityUpsertInput[] = [];

  for (const detailUrl of unique(detailUrls)) {
    try {
      const html = await fetchHtml(detailUrl);
      const title = decodeHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
      if (!title) continue;

      const description = captureField(html, "Descrizione") ?? "";
      if (!isBtpRelevant(title, description)) continue;

      const buyerName = captureField(html, "Ente appaltante");
      const statusText = captureField(html, "Stato procedura");
      const amountText = captureField(html, "Importo appalto");
      const procedureType = captureField(html, "Criterio di aggiudicazione");
      const publishedAt = parseItalianDateTime(captureField(html, "Data di pubblicazione a sistema") ?? "");
      const deadlineAt = parseItalianDateTime(captureField(html, "Termine presentazione delle offerte") ?? "");
      const clarificationDeadline = parseItalianDateTime(captureField(html, "Termine richiesta chiarimenti") ?? "");
      const openingAt = parseItalianDateTime(captureField(html, "Apertura busta amministrativa") ?? "");
      const cig = captureField(html, "CIG");
      const amount = parseAmount(amountText ?? "");
      const externalId = detailUrl.match(/BANDO_GARA_PORTALE(?:%40|@)(\d+)/i)?.[1] ?? null;
      const documents = extractDocuments(detailUrl, html);

      opportunities.push({
        source_id: source.id,
        external_id: externalId,
        fingerprint: makeFingerprint(source.key, externalId, title, detailUrl),
        type: "tender",
        status: inferStatus(statusText),
        is_public: true,
        country_code: "IT",
        region: "Emilia-Romagna",
        buyer_name: buyerName,
        title,
        summary: description || null,
        published_at: publishedAt,
        deadline_at: deadlineAt,
        deadline_tz: "Europe/Rome",
        source_url: detailUrl,
        language: "it",
        documents,
        raw: {
          provider: "it_intercent_er",
          source_provider: "it_intercent_er",
          procedure_state: statusText,
          award_criterion: procedureType,
          base_amount: amount,
          currency: "EUR",
          clarification_deadline_at: clarificationDeadline,
          opening_at: openingAt,
          region_code: "IT-08",
          cig: cig || null,
        },
      });
    } catch (error) {
      log.error("detail_fetch_failed", {
        source_key: source.key,
        detail_url: detailUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log.info("fetch_done", {
    source_key: source.key,
    listings_scanned: listingUrls(source).length,
    detail_candidates: unique(detailUrls).length,
    opportunities_emitted: opportunities.length,
  });

  return {
    opportunities,
    fetched_at,
  };
}
