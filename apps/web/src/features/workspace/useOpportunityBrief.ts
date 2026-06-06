import { useCallback, useState } from "react";
import { ENV } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { AuthTokenError, getValidAccessToken, recoverInvalidSession } from "@/lib/authToken";
import { useLocale, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "radarpulse:briefs";
const BRIEF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  locale: Locale;
  buyer_name?: string | null;
  status?: string | null;
  deadline_at?: string | null;
  budget_amount?: number | null;
  budget_currency?: string | null;
  country_code?: string | null;
  origin_type?: string | null;
  region?: string | null;
};

function cacheKey(id: string, locale: Locale): string {
  return `${id}:${locale}`;
}

function loadCache(): Record<string, OpportunityBrief> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, OpportunityBrief>;
    const now = Date.now();
    const valid: Record<string, OpportunityBrief> = {};
    for (const [id, brief] of Object.entries(raw)) {
      if (brief.generatedAt && now - new Date(brief.generatedAt).getTime() < BRIEF_TTL_MS) {
        valid[id] = brief;
      }
    }
    if (Object.keys(valid).length !== Object.keys(raw).length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      } catch {
        // ignore
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function persistCache(next: Record<string, OpportunityBrief>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function useOpportunityBrief() {
  const { locale } = useLocale();
  const [cache, setCache] = useState<Record<string, OpportunityBrief>>(loadCache);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadFromDB = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("opportunity_briefs")
        .select("executive_summary, fit_assessment, risk_flags, required_documents, next_action, updated_at")
        .eq("opportunity_id", id)
        .eq("output_locale", locale)
        .maybeSingle();

      if (!data) return false;
      if (Date.now() - new Date(data.updated_at as string).getTime() > BRIEF_TTL_MS) return false;

      const brief: OpportunityBrief = {
        executive_summary: data.executive_summary as string,
        fit_assessment: data.fit_assessment as string,
        risk_flags: (data.risk_flags as string[]) ?? [],
        required_documents: (data.required_documents as string[]) ?? [],
        next_action: data.next_action as string,
        generatedAt: data.updated_at as string,
      };

      setCache((prev) => {
        const next = { ...prev, [cacheKey(id, locale)]: brief };
        persistCache(next);
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, [locale]);

  const generate = useCallback(async (input: BriefInput, options?: { force?: boolean }) => {
    const { id } = input;
    const force = options?.force ?? false;
    const scopedKey = cacheKey(id, locale);

    if (loadingId === id) return;
    if (!force && cache[scopedKey]) return;

    if (force) {
      setCache((prev) => {
        const next = { ...prev };
        delete next[scopedKey];
        persistCache(next);
        return next;
      });
    }

    setLoadingId(id);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const jwt = await getValidAccessToken();
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
      if (!res.ok || !data.brief) {
        if (res.status === 401) {
          throw new AuthTokenError();
        }
        throw new Error((data.error as string) ?? "Request failed");
      }

      const brief: OpportunityBrief = {
        ...(data.brief as Omit<OpportunityBrief, "generatedAt">),
        generatedAt: new Date().toISOString(),
      };

      setCache((prev) => {
        const next = { ...prev, [scopedKey]: brief };
        persistCache(next);
        return next;
      });
    } catch (e) {
      if (e instanceof AuthTokenError) {
        void recoverInvalidSession();
      }
      const message = e instanceof AuthTokenError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Error";
      setErrors((prev) => ({ ...prev, [id]: message }));
    } finally {
      setLoadingId(null);
    }
  }, [cache, loadingId, locale]);

  const getBrief = useCallback((id: string): OpportunityBrief | null => cache[cacheKey(id, locale)] ?? null, [cache, locale]);
  const isLoading = useCallback((id: string): boolean => loadingId === id, [loadingId]);
  const getError = useCallback((id: string): string | null => errors[id] ?? null, [errors]);

  return { generate, loadFromDB, getBrief, isLoading, getError };
}
