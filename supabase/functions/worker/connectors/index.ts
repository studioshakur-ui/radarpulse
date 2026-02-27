import type { SourceRow, OpportunityUpsertInput } from "../../_shared/types.ts";
import { rssFetch } from "./rss.ts";
import { apiFetch } from "./providers/api.ts";

export type ConnectorResult = {
  opportunities: OpportunityUpsertInput[];
  fetched_at: string;
  next?: { page?: number; cursor?: string | null } | null;
};

export async function runConnector(source: SourceRow): Promise<ConnectorResult> {
  switch (source.kind) {
    case "rss":
      return await rssFetch(source);
    case "api":
      return await apiFetch(source);
    default:
      throw new Error(`Unsupported source.kind=${source.kind} (supported: rss, api)`);
  }
}
