import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";
import type { ConnectorResult } from "../index.ts";
import { createLogger } from "../../../_shared/logger.ts";
import { makeFingerprint, parseDateToIso, safeJsonFetch, safeStr } from "../_utils.ts";

const log = createLogger("worker/it_anac_bdncp");

// ANAC BDNCP REST API — Banca Dati Nazionale Contratti Pubblici
// Docs: https://dati.anticorruzione.it/opendata/cig
const BDNCP_API = "https://dati.anticorruzione.it/opendata/api/v1/bandi_cig";
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // 2000 records max per run to avoid Edge Function timeout

// ANAC numeric codice_regione → ISO region codes used by BTP
const ANAC_REGION_MAP: Record<number, { code: string; name: string }> = {
  3: { code: "IT-03", name: "Lombardia" },
  6: { code: "IT-36", name: "Friuli-Venezia Giulia" },
  8: { code: "IT-08", name: "Emilia-Romagna" },
};

const DEFAULT_TARGET_REGIONS = [3, 6, 8];

type BdncpRecord = Record<string, unknown>;

type BdncpResponse = {
  data?: unknown;
  metadata?: { total?: number; page?: number; pagesize?: number; count?: number };
  total?: number;
  total_elements?: number;
  count?: number;
  items?: BdncpRecord[];
};

function buildUrl(
  base: string,
  page: number,
  regionCodes: number[],
  settore: string,
): string {
  const params = new URLSearchParams({
    pagesize: String(PAGE_SIZE),
    page: String(page),
    "filters[settore]": settore,
  });
  for (const r of regionCodes) {
    params.append("filters[codice_regione][]", String(r));
  }
  return `${base}?${params.toString()}`;
}

/**
 * Extract records array from various ANAC API response shapes.
 * Handles: { data: { bandi_cig: [...] } }, { data: [...] }, { items: [...] }, plain array.
 */
function extractRecords(body: unknown): BdncpRecord[] {
  if (Array.isArray(body)) return body;

  const b = body as BdncpResponse;

  if (Array.isArray(b.data)) return b.data;

  if (b.data && typeof b.data === "object" && !Array.isArray(b.data)) {
    const inner = (b.data as Record<string, unknown>);
    // Try nested arrays under common key names
    for (const key of ["bandi_cig", "bandi", "records", "results", "items"]) {
      if (Array.isArray(inner[key])) return inner[key] as BdncpRecord[];
    }
    // If data itself looks like a single record
    if (inner.cig || inner.oggetto_lotto) return [inner];
  }

  if (Array.isArray(b.items)) return b.items;

  return [];
}

function parseAmount(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(safeStr(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function apiAnacBdncpFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();

  const meta = (source.meta ?? {}) as Record<string, unknown>;
  const baseUrl = safeStr(meta.api_url ?? BDNCP_API).trim() || BDNCP_API;
  const settore = safeStr(meta.filter_settore ?? "Lavori").trim() || "Lavori";
  const targetRegions: number[] = Array.isArray(meta.anac_region_codes)
    ? (meta.anac_region_codes as number[])
    : DEFAULT_TARGET_REGIONS;
  const maxPages = Math.min(Number(meta.max_pages ?? MAX_PAGES) || MAX_PAGES, 100);

  const opportunities: OpportunityUpsertInput[] = [];
  let page = 1;

  while (page <= maxPages) {
    const url = buildUrl(baseUrl, page, targetRegions, settore);
    let body: unknown;

    try {
      const { data } = await safeJsonFetch<unknown>(url, {
        headers: { Accept: "application/json" },
        timeout_ms: 30_000,
      });
      body = data;
    } catch (e) {
      log.error("page_fetch_error", {
        source_key: source.key,
        page,
        error: e instanceof Error ? e.message : String(e),
      });
      break;
    }

    const records = extractRecords(body);

    if (records.length === 0) {
      log.info("no_records_stopping", { source_key: source.key, page });
      break;
    }

    for (const rec of records) {
      const cig = safeStr(rec.cig ?? rec.CIG).trim();
      const title = safeStr(
        rec.oggetto_lotto ?? rec.oggetto ?? rec.denominazione ?? rec.title ?? "",
      ).trim();
      if (!cig && !title) continue;

      const rawRegione = rec.codice_regione ?? rec.codice_nuts_regione ?? 0;
      const codicRegione = Number(rawRegione);
      const regionInfo = ANAC_REGION_MAP[codicRegione] ?? null;

      // Skip if region not in our target list (defensive — API filter might not be exact)
      if (codicRegione && !ANAC_REGION_MAP[codicRegione]) continue;

      const sourceUrl = cig
        ? `https://dati.anticorruzione.it/superset/dashboard/dettaglio_cig/?cig=${encodeURIComponent(cig)}`
        : `https://dati.anticorruzione.it/opendata/cig`;

      const externalId = cig || safeStr(rec.numero_gara ?? rec.id ?? "").trim() || null;

      const fingerprint = makeFingerprint(
        source.key,
        externalId,
        title,
        sourceUrl,
      );

      const rawCpv = rec.codice_cpv ?? rec.cpv ?? rec.codice_cpv_principale ?? "";
      const cpvCodes = safeStr(rawCpv).trim() ? [safeStr(rawCpv).trim()] : [];

      const amount = parseAmount(
        rec.importo_lotto ?? rec.importo_base ?? rec.valore_stimato ?? rec.importo ?? null,
      );

      const buyerName = safeStr(
        rec.denominazione_amministrazione_appaltante ??
          rec.denominazione_sa ??
          rec.stazione_appaltante ??
          "",
      ).trim() || null;

      const provincia = safeStr(rec.nome_provincia ?? rec.provincia ?? "").trim() || null;
      const nomeRegione = (regionInfo?.name ?? safeStr(rec.nome_regione ?? rec.regione ?? "").trim()) || null;

      const summaryParts = [
        safeStr(rec.tipo_scelta_contraente ?? rec.procedura ?? "").trim(),
        safeStr(rec.tipo_contratto ?? rec.modalita_realizzazione ?? "").trim(),
        provincia,
      ].filter(Boolean);

      opportunities.push({
        source_id: source.id,
        external_id: externalId,
        fingerprint,
        type: "tender",
        status: "active",
        is_public: true,
        country_code: "IT",
        region: nomeRegione,
        buyer_name: buyerName,
        title: title || `CIG ${cig}`,
        summary: summaryParts.length > 0 ? summaryParts.join(" · ") : null,
        published_at: parseDateToIso(
          rec.data_pubblicazione ?? rec.data_inizio ?? rec.data_creazione ?? null,
        ),
        deadline_at: parseDateToIso(
          rec.data_scadenza_offerta ?? rec.data_scadenza ?? rec.data_fine ?? null,
        ),
        deadline_tz: "Europe/Rome",
        source_url: sourceUrl,
        language: "it",
        raw: {
          provider: "it_anac_bdncp",
          source_provider: "it_anac_bdncp",
          cig,
          numero_gara: safeStr(rec.numero_gara ?? "").trim() || null,
          settore: safeStr(rec.settore ?? settore).trim() || null,
          codice_regione: codicRegione || null,
          region_code: regionInfo?.code ?? null,
          codice_provincia: Number(rec.codice_provincia ?? 0) || null,
          nome_provincia: provincia,
          cf_stazione_appaltante: safeStr(
            rec.cf_amministrazione_appaltante ?? rec.cf_sa ?? "",
          ).trim() || null,
          tipo_contratto: safeStr(rec.tipo_contratto ?? "").trim() || null,
          tipo_scelta_contraente: safeStr(rec.tipo_scelta_contraente ?? rec.procedura ?? "").trim() || null,
          codice_cpv: cpvCodes,
          base_amount: amount,
          currency: "EUR",
          modalita_realizzazione: safeStr(rec.modalita_realizzazione ?? "").trim() || null,
        },
      });
    }

    log.info("page_done", {
      source_key: source.key,
      page,
      records_parsed: records.length,
      opps_so_far: opportunities.length,
    });

    if (records.length < PAGE_SIZE) break;
    page++;
  }

  log.info("fetch_done", {
    source_key: source.key,
    pages_fetched: page - 1,
    opportunities_emitted: opportunities.length,
  });

  return { opportunities, fetched_at };
}
