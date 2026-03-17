import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";

export type ChecklistItem = {
  task: string;
  priority: "high" | "med" | "low";
};

export type OpportunityPrep = {
  checklist: ChecklistItem[];
  missing_docs: string[];
  effort_days: number | null;
  blockers: string[];
  response_plan: string;
};

export function useOpportunityPrep(opportunityId: string | null) {
  const [prep, setPrep] = useState<OpportunityPrep | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current prep from DB
  useEffect(() => {
    if (!opportunityId) {
      setPrep(null);
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
          .from("opportunity_preps")
          .select("checklist, missing_docs, effort_days, blockers, response_plan")
          .eq("opportunity_id", opportunityId)
          .eq("user_id", userId)
          .eq("is_current", true)
          .maybeSingle();

        if (!cancelled) setPrep(data ?? null);
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  // Call edge function to generate a prep plan
  const generate = useCallback(async (id: string) => {
    if (generating) return;
    setGenerating(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;
      if (!jwt) throw new Error("Not authenticated");

      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/opportunity-prep`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          apikey: ENV.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ id }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !data.prep) throw new Error((data.error as string) ?? "Request failed");

      setPrep(data.prep as OpportunityPrep);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  return { prep, loading, generating, error, generate };
}
