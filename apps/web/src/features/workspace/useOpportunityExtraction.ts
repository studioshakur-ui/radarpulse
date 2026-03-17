import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type OpportunityExtraction = {
  summary_10s: string;
  extraction_quality: "high" | "med" | "low";
  signals: Record<string, unknown>;
  budget_value: number | null;
  budget_currency: string | null;
  needs_review: boolean;
  sector: string | null;
};

export function useOpportunityExtraction(opportunityId: string | null) {
  const [extraction, setExtraction] = useState<OpportunityExtraction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opportunityId) {
      setExtraction(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data } = await supabase
          .from("opportunity_extractions")
          .select(
            "summary_10s, extraction_quality, signals, budget_value, budget_currency, needs_review, sector",
          )
          .eq("opportunity_id", opportunityId)
          .eq("is_current", true)
          .maybeSingle();

        if (!cancelled) setExtraction(data ?? null);
      } catch {
        // silent — extraction is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  return { extraction, loading };
}
