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
export async function apiGrantsGovFetch(source: SourceRow): Promise<ConnectorResult> {
  const fetched_at = new Date().toISOString();

  return {
    ok: false,
    opportunities: [],
    fetched_at,
    error: {
      code: "not_implemented",
      message:
        "grants.gov connector not implemented yet. Choose an RSS source for now, or implement once the target endpoint+schema are confirmed.",
      details: { source_id: source.id, source_key: source.key },
    },
  };
}
