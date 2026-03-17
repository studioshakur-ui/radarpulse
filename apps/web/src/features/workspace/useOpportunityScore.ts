import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type OpportunityScore = {
  score_value: number;
  score_band: "high" | "med" | "low";
  rationale_summary: string;
};

export function useOpportunityScore(opportunityId: string | null) {
  const [score, setScore] = useState<OpportunityScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opportunityId) {
      setScore(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId || cancelled) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("opportunity_scores")
          .select("score_value, score_band, rationale_summary")
          .eq("opportunity_id", opportunityId)
          .eq("user_id", userId)
          .eq("is_current", true)
          .maybeSingle();

        if (!cancelled) setScore(data ?? null);
      } catch {
        // silent — score is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  return { score, loading };
}
