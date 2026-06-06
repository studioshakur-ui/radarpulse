import type { OpportunityUpsertInput, SourceRow } from "../../../_shared/types.ts";
import type { ConnectorResult } from "../index.ts";
import { createLogger } from "../../../_shared/logger.ts";
import { makeFingerprint, parseDateToIso, safeJsonFetch, safeStr } from "../_utils.ts";

const log = createLogger("worker/it_sintel_lombardia");

const SOCRATA_BASE = "https://www.dati.lombardia.it/resource/8txy-zjw2.json";

// Active states: open for bids + pre-award evaluation
const ACTIVE_STATI = [
  "Pubblicata",
  "Invio Offerte Offline",
  "Valutazione ammissioni",
  "Nomina Commissione",
  "Aperta pre-qualifica",
  "Asta Elettronica Aperta",
  "Preparazione lancio asta elettronica",
];

const PAGE_SIZE = 1000;

type SocrataProcedura = {
  multilotto?: string;
  id_procedura?: string;
  nome_procedura?: string;
  valore_economico_procedura?: string | number;
  importo_aggiudicaz_procedura?: string | number;
  stato_procedura?: string;
  stazione_appaltante?: string;
  cf_stazione_appaltante?: string;
  data_inizio_negoziazione?: string;
  data_fine_negoziazione?: string;
  modalita_scelta_contraente?: string;
  accordo_quadro?: string;
  cig?: string;
  id_lotto?: string;
  nome_lotto?: string;
  ambito_merceologico?: string;
  categoria_merceologiche?: string;
  codice_cpv?: string;
  link_procedura?: { url?: string } | string;
};

function pickLinkUrl(raw: SocrataProcedura): string {
  const lp = raw.link_procedura;
  if (!lp) return "";
  if (typeof lp === "string") return lp.trim();
  return safeStr(lp.url).trim();
}

function parseAmount(v: string | number | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(safeStr(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function buildSocrataUrl(offset: number, stati: string[]): string {
  const statiFilter = stati.map((s) => `'${s}'`).join(",");
  const where = `ambito_merceologico='Procedura per lavori' AND stato_procedura IN(${statiFilter})`;
  const params = new URLSearchParams({
    "$where": where,
    "$order": "data_inizio_negoziazione DESC",
    "$limit": String(PAGE_SIZE),
    "$offset": String(offset),
  });
  return `${SOCRATA_BASE}?${params.toString()}`;
}

export async function apiSintelLombardiaFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();

  // Allow overriding which stati to include via source.meta
  const statiOverride = Array.isArray(source.meta?.stati) ? source.meta.stati as string[] : null;
  const stati = statiOverride ?? ACTIVE_STATI;

  const opportunities: OpportunityUpsertInput[] = [];
  let offset = 0;
  let totalFetched = 0;

  while (true) {
    const url = buildSocrataUrl(offset, stati);

    const { data: rows } = await safeJsonFetch<SocrataProcedura[]>(url, {
      headers: {
        "Accept": "application/json",
        "X-App-Token": safeStr(source.meta?.app_token ?? ""),
      },
      timeout_ms: 30_000,
    });

    if (!Array.isArray(rows) || rows.length === 0) break;

    totalFetched += rows.length;

    for (const row of rows) {
      const idProcedura = safeStr(row.id_procedura).trim();
      const title = safeStr(row.nome_procedura).trim();
      if (!title || !idProcedura) continue;

      // Deduplicate by id_procedura (multi-lot procedures appear once per lot)
      // We keep the first row we see (highest base amount where applicable)
      const sourceUrl =
        pickLinkUrl(row) ||
        `https://www.sintel.regione.lombardia.it/eprocdata/auctionDetail.xhtml?id=${idProcedura}`;

      const fingerprint = makeFingerprint(source.key, idProcedura, title, sourceUrl);

      const amount =
        parseAmount(row.valore_economico_procedura) ??
        parseAmount(row.importo_aggiudicaz_procedura);

      const cpvCodes = row.codice_cpv ? [safeStr(row.codice_cpv).trim()] : [];

      opportunities.push({
        source_id: source.id,
        external_id: idProcedura,
        fingerprint,
        type: "tender",
        status: "active",
        is_public: true,
        country_code: "IT",
        region: "Lombardia",
        buyer_name: safeStr(row.stazione_appaltante).trim() || null,
        title,
        summary: [row.modalita_scelta_contraente, row.categoria_merceologiche]
          .filter(Boolean)
          .join(" · ") || null,
        published_at: parseDateToIso(row.data_inizio_negoziazione),
        deadline_at: parseDateToIso(row.data_fine_negoziazione),
        deadline_tz: "Europe/Rome",
        source_url: sourceUrl,
        language: "it",
        raw: {
          provider: "it_sintel_lombardia",
          source_provider: "it_sintel_lombardia",
          cig: safeStr(row.cig).trim() || null,
          cf_stazione_appaltante: safeStr(row.cf_stazione_appaltante).trim() || null,
          procedure_type: safeStr(row.modalita_scelta_contraente).trim() || null,
          contract_type: safeStr(row.categoria_merceologiche).trim() || null,
          category: "Lavori",
          cpv_codes: cpvCodes,
          base_amount: amount,
          currency: "EUR",
          accordo_quadro: row.accordo_quadro === "SI",
          multilotto: row.multilotto === "SI",
          stato_procedura: safeStr(row.stato_procedura).trim(),
          region_code: "IT-03",
          province_code: null,
        },
      });
    }

    // If we got a full page, there may be more
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // Deduplicate: keep one record per id_procedura (multi-lot → first occurrence)
  const seen = new Set<string>();
  const deduped = opportunities.filter((opp) => {
    if (!opp.external_id) return true;
    if (seen.has(opp.external_id)) return false;
    seen.add(opp.external_id);
    return true;
  });

  log.info("fetch_done", {
    source_key: source.key,
    raw_rows: totalFetched,
    opportunities_emitted: deduped.length,
  });

  return { opportunities: deduped, fetched_at };
}
