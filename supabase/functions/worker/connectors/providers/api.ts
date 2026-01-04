import type { SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";
import { apiEuTedSearchFetch } from "./eu_ted_search.ts";
import { apiFindTenderFetch } from "./uk_find_tender.ts";
import { apiSamGovFetch } from "./us_sam_gov.ts";
import { apiGrantsGovFetch } from "./us_grants_gov.ts";

type Provider = "uk_find_tender" | "us_sam_gov" | "us_grants_gov" | "eu_ted_search";

function providerFromSource(source: SourceRow): Provider {
  const p = String(((source.meta ?? {}) as any).provider ?? "").trim();

  if (p === "uk_find_tender") return "uk_find_tender";
  if (p === "us_sam_gov") return "us_sam_gov";
  if (p === "us_grants_gov") return "us_grants_gov";
  if (p === "eu_ted_search") return "eu_ted_search";

  throw new Error(`Missing/unsupported api provider in sources.meta.provider for source '${source.key}'`);
}

export async function apiFetch(source: SourceRow): Promise<ConnectorResult> {
  const provider = providerFromSource(source);

  switch (provider) {
    case "uk_find_tender":
      return apiFindTenderFetch(source);
    case "us_sam_gov":
      return apiSamGovFetch(source);
    case "us_grants_gov":
      return apiGrantsGovFetch(source);
    case "eu_ted_search":
      return apiEuTedSearchFetch(source);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
