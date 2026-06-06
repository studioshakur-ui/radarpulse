import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type BriefVersion = {
  id: string;
  model: string;
  brief_version: string;
  prompt_version: string;
  is_current: boolean;
  generation_ms: number | null;
  created_at: string;
};

export function useBriefVersions(opportunityId: string | null) {
  const [versions, setVersions] = useState<BriefVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opportunityId) return;

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const { data } = await supabase
          .from("brief_versions")
          .select("id, model, brief_version, prompt_version, is_current, generation_ms, created_at")
          .eq("opportunity_id", opportunityId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!cancelled) {
          setVersions((data as BriefVersion[]) ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  return { versions, loading };
}
