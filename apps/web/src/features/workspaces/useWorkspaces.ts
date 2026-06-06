import { useCallback, useEffect, useState } from "react";
import type { WorkspaceStatus, WorkspaceSummary } from "./workspaceApi";
import { getMyWorkspaces } from "./workspaceApi";

export function useWorkspaces(status?: WorkspaceStatus) {
  const [items, setItems] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getMyWorkspaces(status);
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load workspaces.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
