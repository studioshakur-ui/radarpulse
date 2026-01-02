import type { SourceRow, OpportunityUpsertInput } from "../../_shared/types.ts";
import { rssFetch } from "./rss.ts";

export type ConnectorResult = {
  opportunities: OpportunityUpsertInput[];
  fetched_at: string;
};

export async function runConnector(source: SourceRow): Promise<ConnectorResult> {
  switch (source.kind) {
    case "rss":
      return await rssFetch(source);
    default:
      throw new Error(`Unsupported source.kind=${source.kind} (MVP supports rss only)`);
  }
}
