import type { OpportunityUpsertInput, SourceRow } from "../../_shared/types.ts";

import { apiFetch } from "./providers/api.ts";
import { rssFetch } from "./rss.ts";

export type ConnectorResult = {
  opportunities: OpportunityUpsertInput[];
  fetched_at: string;
};

export async function runConnector(source: SourceRow): Promise<ConnectorResult> {
  switch (source.kind) {
    case "rss":
      return await rssFetch(source);
    case "api":
      return await apiFetch(source);
    default:
      throw new Error(
        `Unsupported source.kind=${source.kind}. Supported: rss, api. (Other kinds are planned: html, pdf)`
      );
  }
}
