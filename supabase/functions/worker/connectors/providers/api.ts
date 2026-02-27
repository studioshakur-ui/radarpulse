import type { SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { apiEuTedSearchFetch } from "./eu_ted_search.ts";
import { apiFindTenderFetch } from "./uk_find_tender.ts";
import { apiSamGovFetch } from "./us_sam_gov.ts";
import { apiGrantsGovFetch } from "./us_grants_gov.ts";

type Provider = "uk_find_tender" | "us_sam_gov" | "us_grants_gov" | "eu_ted_search";

type ProviderConfig = {
  key: Provider;
  is_active: boolean;
  country_code: "IT" | "GB" | "US" | "EU";
};

const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
  eu_ted_search: { key: "eu_ted_search", is_active: true, country_code: "IT" },
  uk_find_tender: { key: "uk_find_tender", is_active: false, country_code: "GB" },
  us_sam_gov: { key: "us_sam_gov", is_active: false, country_code: "US" },
  us_grants_gov: { key: "us_grants_gov", is_active: false, country_code: "US" },
};

function providerFromSource(source: SourceRow): Provider | null {
  const p = String(((source.meta ?? {}) as any).provider ?? "").trim();

  if (p === "uk_find_tender") return "uk_find_tender";
  if (p === "us_sam_gov") return "us_sam_gov";
  if (p === "us_grants_gov") return "us_grants_gov";
  if (p === "eu_ted_search") return "eu_ted_search";

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
  if (!cfg?.is_active || cfg.country_code !== "IT") {
    return {
      opportunities: [],
      fetched_at,
    };
  }

  switch (provider) {
    case "uk_find_tender":
      return await apiFindTenderFetch(source);
    case "us_sam_gov":
      return await apiSamGovFetch(source);
    case "us_grants_gov":
      return await apiGrantsGovFetch(source);
    case "eu_ted_search":
      return await apiEuTedSearchFetch(source);
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
