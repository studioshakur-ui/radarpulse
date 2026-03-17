import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";

export type OpportunityScore = {
  score_value: number;
  score_band: "high" | "med" | "low";
  rationale_summary: string;
  rationale_json: Record<string, unknown> | null;
};

export function useOpportunityScore(opportunityId: string | null) {
  const [score, setScore] = useState<OpportunityScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current score from DB
  useEffect(() => {
    if (!opportunityId) {
      setScore(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId || cancelled) return;

        const { data } = await supabase
          .from("opportunity_scores")
          .select("score_value, score_band, rationale_summary, rationale_json")
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

  // Call edge function to generate a score
  const generate = useCallback(async (id: string) => {
    if (generating) return;
    setGenerating(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;
      if (!jwt) throw new Error("Not authenticated");

      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/opportunity-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          apikey: ENV.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ id }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !data.score) throw new Error((data.error as string) ?? "Request failed");

      setScore(data.score as OpportunityScore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  return { score, loading, generating, error, generate };
}
