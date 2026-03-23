/**
 * it_intercent_er.ts — Intercent-ER connector (Plone REST API)
 *
 * The previous connector scraped HTML looking for BANDO_GARA_PORTALE@NNN links,
 * which disappeared when the site migrated to React/Plone SSR (RAZZLE).
 * The Plone /++api++/ REST endpoint is now the canonical data source:
 *   GET /++api++/{path}/@search → JSON listing with pagination
 *   GET /++api++/{item-path}    → JSON detail with full metadata
 */
import type { OpportunityDocumentInput, OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";
import type { ConnectorResult } from "../index.ts";
import { createLogger } from "../../../_shared/logger.ts";
import { makeFingerprint, safeStr } from "../_utils.ts";

const log = createLogger("worker/it_intercent_er");

const PLONE_BASE = "https://intercenter.regione.emilia-romagna.it";
const PLONE_API  = `${PLONE_BASE}/++api++`;

// Plone content-tree paths for BTP-relevant bando categories
const DEFAULT_SEARCH_PATHS = [
  "bandi-e-strumenti-di-acquisto/bandi-altri-enti/altri-enti-bandi-e-procedure-di-gara",
  "bandi-e-strumenti-di-acquisto/bandi-altri-enti/altri-enti-avvisi-e-indagini-di-mercato",
];

const PAGE_SIZE          = 50;
const MAX_PAGES          = 20;   // cap at 1 000 items per run
const MAX_DETAIL_FETCHES = 80;   // rate-limit detail fetches per run

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const BTP_KEYWORDS = [
  "lavori", "manutenzione", "edil", "impiant", "infrastrutt", "opere",
  "riqualific", "ristruttur", "efficientamento", "restauro", "adeguamento",
  "bim", "sicurezza", "architettura", "ingegneria", "direzione lavori",
  "coordinamento della sicurezza", "servizi tecnici", "accordo quadro",
  "global service", "costruzione", "pavimentazione", "consolidamento",
  "fognatura", "acquedotto", "pubblica illuminazione",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type PloneSearchItem = {
  "@id": string;
  "@type"?: string;
  id: string;           // e.g. BANDO_GARA_PORTALE@13206197
  title: string;
  description?: string;
  Date?: string;
  effective?: string;
  UID?: string;
};

type PloneSearchResult = {
  "@id": string;
  items_total: number;
  items: PloneSearchItem[];
  batching?: {
    first?: string;
    last?: string;
    next?: string;
  };
};

type PloneDetail = Record<string, unknown>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isBtpRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return BTP_KEYWORDS.some((k) => text.includes(k));
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.title === "string") return obj.title.trim();
    if (typeof obj.token === "string") return obj.token.trim();
  }
  return "";
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&nbsp;", " ").replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"').replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseItalianDateTime(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = "00", min = "00"] = match;
  const iso = new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min, 0));
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function parseIsoDateTime(value: string): string | null {
  if (!value) return null;
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
}

function parseAmount(value: string): number | null {
  const n = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "").trim();
  if (!n) return null;
  const parsed = Number(n);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function captureField(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`${escaped}\\s*</[^>]+>\\s*<[^>]+>([\\s\\S]*?)</`, "i"),
    new RegExp(`${escaped}\\s*:?\\s*</?[^>]*>\\s*([^<\\n][\\s\\S]*?)<`, "i"),
    new RegExp(`${escaped}\\s*:?\\s*([\\s\\S]{1,300}?)\\n`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    const v = decodeHtml(m?.[1] ?? "");
    if (v) return v;
  }
  return null;
}

function extractDocumentsFromHtml(html: string, baseUrl: string): OpportunityDocumentInput[] {
  const matches = [
    ...html.matchAll(/href="([^"]+\.(?:pdf|zip|7z|docx?|xlsx?)(?:\?[^"]*)?)"[^>]*>([\s\S]*?)<\/a>/gi),
  ];
  const seen = new Set<string>();
  const docs: OpportunityDocumentInput[] = [];
  for (const m of matches) {
    let url: string;
    try { url = new URL(m[1] ?? "", baseUrl).toString(); } catch { url = m[1] ?? ""; }
    if (!url || seen.has(url)) continue;
    seen.add(url);
    docs.push({ doc_url: url, doc_title: decodeHtml(m[2] ?? "") || null, doc_type: null });
  }
  return docs;
}

function inferStatus(statusText: string | null): "active" | "expired" {
  const n = (statusText ?? "").toLowerCase();
  if (n.includes("chiuso") || n.includes("conclus") || n.includes("scadut")) return "expired";
  return "active";
}

function searchPaths(source: SourceRow): string[] {
  const meta = (source.meta ?? {}) as Record<string, unknown>;
  const configured = Array.isArray(meta.search_paths)
    ? (meta.search_paths as unknown[]).map((e) => safeStr(e).trim()).filter(Boolean)
    : [];
  return configured.length ? configured : DEFAULT_SEARCH_PATHS;
}

// ── Network ───────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json", "Accept-Language": "it-IT,it;q=0.9" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
  return res.json() as Promise<T>;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html", "Accept-Language": "it-IT,it;q=0.9" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
  return res.text();
}

// ── Detail parsing ────────────────────────────────────────────────────────────

function parseDeadline(detail: PloneDetail, html: string): string | null {
  for (const f of ["scadenza_offerte", "data_scadenza_offerte", "data_scadenza", "termine_presentazione", "data_termine"]) {
    const v = str(detail[f]);
    if (v) return parseItalianDateTime(v) ?? parseIsoDateTime(v);
  }
  if (detail.expires) return parseIsoDateTime(str(detail.expires));
  if (html) {
    const raw = captureField(html, "Termine presentazione delle offerte")
      ?? captureField(html, "Scadenza presentazione");
    if (raw) return parseItalianDateTime(raw);
  }
  return null;
}

function parseBuyerName(detail: PloneDetail, html: string): string | null {
  for (const f of ["ente_appaltante", "stazione_appaltante", "ente_committente", "committente"]) {
    const v = str(detail[f]);
    if (v) return v;
  }
  if (html) return captureField(html, "Ente appaltante") ?? captureField(html, "Stazione appaltante");
  return null;
}

function parseBaseAmount(detail: PloneDetail, html: string): number | null {
  for (const f of ["importo_a_base_gara", "importo_gara", "importo_appalto", "valore_appalto", "importo"]) {
    const v = str(detail[f]);
    if (v) { const n = parseAmount(v); if (n !== null) return n; }
  }
  if (html) {
    const raw = captureField(html, "Importo appalto") ?? captureField(html, "Base d'asta") ?? captureField(html, "Importo a base");
    if (raw) return parseAmount(raw);
  }
  return null;
}

function parseCig(detail: PloneDetail, html: string): string | null {
  for (const f of ["codice_cig", "cig", "id_gara"]) {
    const v = str(detail[f]);
    if (v) return v;
  }
  return html ? captureField(html, "CIG") : null;
}

function parseProcedureType(detail: PloneDetail, html: string): string | null {
  for (const f of ["tipo_procedura", "procedura", "criterio_aggiudicazione", "tipo_gara"]) {
    const v = str(detail[f]);
    if (v) return v;
  }
  return html ? captureField(html, "Criterio di aggiudicazione") ?? captureField(html, "Tipo procedura") : null;
}

function parseStatusText(detail: PloneDetail, html: string): string | null {
  for (const f of ["stato_procedura", "stato", "review_state"]) {
    const v = str(detail[f]);
    if (v && v !== "published") return v;
  }
  return html ? captureField(html, "Stato procedura") : null;
}

function parsePublishedAt(detail: PloneDetail, item: PloneSearchItem): string | null {
  for (const f of ["effective", "data_pubblicazione"]) {
    const v = str(detail[f]);
    if (v) { const iso = parseIsoDateTime(v); if (iso) return iso; }
  }
  return parseIsoDateTime(item.Date ?? "") ?? parseIsoDateTime(item.effective ?? "");
}

function extractDocuments(detail: PloneDetail, detailUrl: string): OpportunityDocumentInput[] {
  const seen = new Set<string>();
  const docs: OpportunityDocumentInput[] = [];

  function add(url: string, title: string | null) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    docs.push({ doc_url: url, doc_title: title || null, doc_type: null });
  }

  // relatedItems (standard Plone relation field)
  for (const item of (Array.isArray(detail.relatedItems) ? detail.relatedItems as unknown[] : [])) {
    const i = item as Record<string, unknown>;
    add(str(i["@id"]), str(i.title) || null);
  }

  // items (Plone folder children — e.g. attached File objects)
  for (const child of (Array.isArray(detail.items) ? detail.items as unknown[] : [])) {
    const c = child as Record<string, unknown>;
    const url = str(c["@id"]);
    const type = str(c["@type"]).toLowerCase();
    if (url && (url.match(/\.(pdf|zip|docx?|xlsx?)(\?.*)?$/i) || type.includes("file"))) {
      add(url, str(c.title) || null);
    }
  }

  // HTML body text fallback (text.data is Plone RichText HTML)
  const bodyData = (detail.text as Record<string, unknown> | null)?.data;
  if (typeof bodyData === "string" && bodyData) {
    for (const d of extractDocumentsFromHtml(bodyData, detailUrl)) {
      add(d.doc_url, d.doc_title);
    }
  }

  return docs;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function apiIntercentErFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();
  const paths = searchPaths(source);
  const btpItems: PloneSearchItem[] = [];

  // ── Phase 1: paginated search ─────────────────────────────────────────────
  for (const path of paths) {
    let page = 0;
    let hasMore = true;

    while (hasMore && page < MAX_PAGES) {
      const apiUrl =
        `${PLONE_API}/${path}/@search` +
        `?b_size=${PAGE_SIZE}&b_start=${page * PAGE_SIZE}` +
        `&sort_on=effective&sort_order=descending&review_state=published`;

      try {
        const result = await fetchJson<PloneSearchResult>(apiUrl);
        const items = result.items ?? [];

        for (const item of items) {
          if (isBtpRelevant(item.title ?? "", item.description ?? "")) {
            btpItems.push(item);
          }
        }

        hasMore = !!result.batching?.next && items.length === PAGE_SIZE;
        page++;
      } catch (err) {
        log.error("search_page_failed", {
          source_key: source.key, path, page,
          error: err instanceof Error ? err.message : String(err),
        });
        break;
      }
    }
  }

  log.info("search_complete", { source_key: source.key, btp_relevant: btpItems.length });

  // ── Phase 2: detail fetch (capped) ────────────────────────────────────────
  const toFetch = btpItems.slice(0, MAX_DETAIL_FETCHES);
  const opportunities: OpportunityUpsertInput[] = [];

  for (const searchItem of toFetch) {
    const rawId = searchItem.id ?? "";
    if (!rawId) continue;

    const externalId = rawId.match(/BANDO_GARA_PORTALE(?:%40|@)(\d+)/i)?.[1] ?? rawId;
    const detailUrl  = searchItem["@id"];

    try {
      const itemPath     = detailUrl.replace(PLONE_BASE, "");
      const detailApiUrl = `${PLONE_API}${itemPath}`;

      // Plone JSON detail + HTML body in parallel (independent, best-effort)
      const [detailResult, htmlResult] = await Promise.allSettled([
        fetchJson<PloneDetail>(detailApiUrl),
        fetchHtml(detailUrl),
      ]);

      const detail  = detailResult.status  === "fulfilled" ? detailResult.value  : ({} as PloneDetail);
      const bodyHtml = htmlResult.status === "fulfilled" ? htmlResult.value : "";

      const title = str(detail.title) || decodeHtml(searchItem.title ?? "");
      if (!title) continue;

      const description   = str(detail.description) || searchItem.description || "";
      const deadlineAt    = parseDeadline(detail, bodyHtml);
      const buyerName     = parseBuyerName(detail, bodyHtml);
      const baseAmount    = parseBaseAmount(detail, bodyHtml);
      const cig           = parseCig(detail, bodyHtml);
      const procedureType = parseProcedureType(detail, bodyHtml);
      const statusText    = parseStatusText(detail, bodyHtml);
      const publishedAt   = parsePublishedAt(detail, searchItem);
      const documents     = extractDocuments(detail, detailUrl);

      opportunities.push({
        source_id:   source.id,
        external_id: externalId,
        fingerprint: makeFingerprint(source.key, externalId, title, detailUrl),
        type:        "tender",
        status:      inferStatus(statusText),
        is_public:   true,
        country_code: "IT",
        region:      "Emilia-Romagna",
        buyer_name:  buyerName,
        title,
        summary:     description || null,
        published_at: publishedAt,
        deadline_at:  deadlineAt,
        deadline_tz:  "Europe/Rome",
        source_url:   detailUrl,
        language:     "it",
        documents,
        raw: {
          provider:        "it_intercent_er",
          source_provider: "it_intercent_er",
          procedure_state: statusText,
          award_criterion: procedureType,
          base_amount:     baseAmount,
          currency:        "EUR",
          region_code:     "IT-08",
          locality:        null, // Intercent-ER doesn't expose municipality in API
          cig:             cig || null,
          plone_uid:       searchItem.UID ?? null,
        },
      });
    } catch (err) {
      log.error("detail_fetch_failed", {
        source_key: source.key,
        external_id: externalId,
        detail_url:  detailUrl,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("fetch_done", {
    source_key:           source.key,
    paths_scanned:        paths.length,
    btp_candidates:       btpItems.length,
    detail_fetched:       toFetch.length,
    opportunities_emitted: opportunities.length,
  });

  return { opportunities, fetched_at };
}
