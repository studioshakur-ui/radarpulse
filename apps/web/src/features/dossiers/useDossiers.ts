import { useCallback, useEffect, useState } from "react";
import type { DossierStatus } from "@/lib/types";
import { getMyDossiers, type DossierSummary } from "./dossierApi";

export function useDossiers(status?: DossierStatus) {
  const [items, setItems] = useState<DossierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getMyDossiers(status);
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dossiers.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
