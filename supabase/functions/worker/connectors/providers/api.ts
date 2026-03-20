import type { SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { apiAnacOcdsFetch } from "./it_anac_ocds.ts";
import { apiEappaltiFvgFetch } from "./it_eappalti_fvg.ts";
import { apiBoampFetch } from "./fr_boamp.ts";
import { apiContractsFinderFetch } from "./uk_contracts_finder.ts";
import { apiEuTedSearchFetch } from "./eu_ted_search.ts";
import { apiFindTenderFetch } from "./uk_find_tender.ts";
import { apiPublicContractsScotlandFetch } from "./uk_public_contracts_scotland.ts";
import { apiSell2WalesFetch } from "./uk_sell2wales.ts";
import { apiSamGovFetch } from "./us_sam_gov.ts";
import { apiGrantsGovFetch } from "./us_grants_gov.ts";

type Provider = "uk_find_tender" | "uk_contracts_finder" | "uk_sell2wales" | "uk_public_contracts_scotland" | "us_sam_gov" | "us_grants_gov" | "eu_ted_search" | "it_anac_ocds" | "it_eappalti_fvg" | "fr_boamp";

type ProviderConfig = {
  key: Provider;
  is_active: boolean;
  country_code: "IT" | "GB" | "US" | "EU" | "FR";
};

const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
  fr_boamp: { key: "fr_boamp", is_active: true, country_code: "FR" },
  eu_ted_search: { key: "eu_ted_search", is_active: true, country_code: "EU" },
  it_eappalti_fvg: { key: "it_eappalti_fvg", is_active: true, country_code: "IT" },
  uk_public_contracts_scotland: { key: "uk_public_contracts_scotland", is_active: true, country_code: "GB" },
  uk_sell2wales: { key: "uk_sell2wales", is_active: true, country_code: "GB" },
  uk_contracts_finder: { key: "uk_contracts_finder", is_active: true, country_code: "GB" },
  uk_find_tender: { key: "uk_find_tender", is_active: true, country_code: "GB" },
  us_sam_gov: { key: "us_sam_gov", is_active: true, country_code: "US" },
  us_grants_gov: { key: "us_grants_gov", is_active: true, country_code: "US" },
  it_anac_ocds: { key: "it_anac_ocds", is_active: true, country_code: "IT" },
};

function providerFromSource(source: SourceRow): Provider | null {
  const p = String(((source.meta ?? {}) as any).provider ?? "").trim();

  if (p === "fr_boamp") return "fr_boamp";
  if (p === "it_eappalti_fvg") return "it_eappalti_fvg";
  if (p === "uk_public_contracts_scotland") return "uk_public_contracts_scotland";
  if (p === "uk_sell2wales") return "uk_sell2wales";
  if (p === "uk_contracts_finder") return "uk_contracts_finder";
  if (p === "uk_find_tender") return "uk_find_tender";
  if (p === "us_sam_gov") return "us_sam_gov";
  if (p === "us_grants_gov") return "us_grants_gov";
  if (p === "eu_ted_search") return "eu_ted_search";
  if (p === "it_anac_ocds") return "it_anac_ocds";

  return null;
}

export async function apiProviderFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();

  const provider = providerFromSource(source);

  if (!provider) {
    return {
      opportunities: [],
      fetched_at,
    };
  }

  const cfg = PROVIDER_CONFIG[provider];
  if (!cfg?.is_active) {
    return {
      opportunities: [],
      fetched_at,
    };
  }

  switch (provider) {
    case "fr_boamp":
      return await apiBoampFetch(source);
    case "it_eappalti_fvg":
      return await apiEappaltiFvgFetch(source);
    case "uk_public_contracts_scotland":
      return await apiPublicContractsScotlandFetch(source);
    case "uk_sell2wales":
      return await apiSell2WalesFetch(source);
    case "uk_contracts_finder":
      return await apiContractsFinderFetch(source);
    case "uk_find_tender":
      return await apiFindTenderFetch(source);
    case "us_sam_gov":
      return await apiSamGovFetch(source);
    case "us_grants_gov":
      return await apiGrantsGovFetch(source);
    case "eu_ted_search":
      return await apiEuTedSearchFetch(source);
    case "it_anac_ocds":
      return await apiAnacOcdsFetch(source);
    default:
      return {
        opportunities: [],
        fetched_at,
      };
  }
}

/**
 * IMPORTANT:
 * connectors/index.ts imports { apiFetch } from "./providers/api.ts"
 * We provide it as an alias to apiProviderFetch to keep a stable public API.
 */
export { apiProviderFetch as apiFetch };
