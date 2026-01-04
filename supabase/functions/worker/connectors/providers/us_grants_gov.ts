import type { SourceRow } from "../../../_shared/types.ts";

import type { ConnectorResult } from "../index.ts";

/**
 * Placeholder for Grants.gov API connector.
 *
 * Why placeholder?
 * - Grants.gov has multiple endpoints and versioned contracts.
 * - We want to lock the exact request/response contract based on the official docs used by the team,
 *   before hard-coding mappings in production.
 */
export async function apiGrantsGovFetch(_source: SourceRow): Promise<ConnectorResult> {
  throw new Error(
    "grants.gov connector not implemented yet. Use an RSS source for now, or implement once the target endpoint+schema are confirmed."
  );
}
