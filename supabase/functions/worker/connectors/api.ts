import type { SourceRow } from "../../_shared/types.ts";
import type { ConnectorResult } from "./index.ts";

import { apiProviderFetch } from "./providers/api.ts";

export async function apiFetch(source: SourceRow): Promise<ConnectorResult> {
  // NOTE:
  // - We keep this as a thin wrapper so the worker can stay stable while
  //   providers evolve independently.
  return await apiProviderFetch(source);
}
