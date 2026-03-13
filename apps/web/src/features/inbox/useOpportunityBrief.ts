import { useCallback, useState } from "react";
import { ENV } from "@/lib/env";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "radarpulse:briefs";

export type OpportunityBrief = {
  executive_summary: string;
  fit_assessment: string;
  risk_flags: string[];
  required_documents: string[];
  next_action: string;
  generatedAt: string;
};

export type BriefInput = {
  id: string;
  title: string;
  buyer_name?: string | null;
  status?: string | null;
  deadline_at?: string | null;
  budget_amount?: number | null;
  budget_currency?: string | null;
  country_code?: string | null;
  origin_type?: string | null;
  region?: string | null;
};

function loadCache(): Record<string, OpportunityBrief> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, OpportunityBrief>;
  } catch {
    return {};
  }
}

export function useOpportunityBrief() {
  const [cache, setCache] = useState<Record<string, OpportunityBrief>>(loadCache);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generate = useCallback(
    async (input: BriefInput) => {
      const { id } = input;
      if (cache[id] || loadingId === id) return;

      setLoadingId(id);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData.session?.access_token;
        if (!jwt) throw new Error("Not authenticated");

        const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/opportunity-brief`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
            apikey: ENV.SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(input),
        });

        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok || !data.brief) throw new Error((data.error as string) ?? "Request failed");

        const brief: OpportunityBrief = {
          ...(data.brief as Omit<OpportunityBrief, "generatedAt">),
          generatedAt: new Date().toISOString(),
        };

        setCache((prev) => {
          const next = { ...prev, [id]: brief };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      } catch (e) {
        setErrors((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : "Error" }));
      } finally {
        setLoadingId(null);
      }
    },
    [cache, loadingId],
  );

  const getBrief = useCallback((id: string): OpportunityBrief | null => cache[id] ?? null, [cache]);
  const isLoading = useCallback((id: string): boolean => loadingId === id, [loadingId]);
  const getError = useCallback((id: string): string | null => errors[id] ?? null, [errors]);

  return { generate, getBrief, isLoading, getError };
}
