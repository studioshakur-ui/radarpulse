import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type WorkspaceOpportunity = {
  id: string;
  title: string;
  buyer_name: string | null;
  country_code: string | null;
  published_at: string | null;
  deadline_at: string | null;
  deadline_tz: string | null;
  source_url: string;
  summary: string | null;
  status: string;
  type: string;
  language: string | null;
  created_at: string;
};

export function useWorkspaceData(opportunityId: string) {
  const [opportunity, setOpportunity] = useState<WorkspaceOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opportunityId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const { data, error: err } = await supabase
          .from("opportunities")
          .select(
            "id,title,buyer_name,country_code,published_at,deadline_at,deadline_tz,source_url,summary,status,type,language,created_at",
          )
          .eq("id", opportunityId)
          .single();

        if (cancelled) return;
        if (err) {
          throw new Error(err.code === "PGRST116" ? "not_found" : err.message);
        }
        setOpportunity(data as WorkspaceOpportunity);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "unknown");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  return { opportunity, loading, error };
}
