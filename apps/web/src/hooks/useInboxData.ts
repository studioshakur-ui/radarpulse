// apps/web/src/hooks/useInboxData.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export type InboxFilter = {
  q?: string;
  region?: string;
  budgetMin?: number;
  budgetMax?: number;
  deadlineBefore?: string; // ISO
};

export type OpportunitySearchRow = {
  id: string;
  title: string;
  buyer_name: string;
  region: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  deadline_at: string | null;
  source_key: string;
  published_at: string | null;
};

export function useInboxData(initialFilters: InboxFilter = {}) {
  const [data, setData] = useState<OpportunitySearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InboxFilter>(initialFilters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const qb = supabase
      .from<OpportunitySearchRow>("opportunities_search_v1")
      .select("*");

    // Full-text search on title / buyer_name
    if (filters.q) {
      qb.ilike("title", `%${filters.q}%`).or(`buyer_name.ilike.%${filters.q}%`);
    }

    if (filters.region) {
      qb.eq("region", filters.region);
    }

    if (
      typeof filters.budgetMin === "number" ||
      typeof filters.budgetMax === "number"
    ) {
      if (typeof filters.budgetMin === "number") {
        qb.gte("budget_amount", filters.budgetMin);
      }
      if (typeof filters.budgetMax === "number") {
        qb.lte("budget_amount", filters.budgetMax);
      }
    }

    if (filters.deadlineBefore) {
      qb.lte("deadline_at", filters.deadlineBefore);
    }

    // Ordering & limit
    qb.order("deadline_at", { ascending: true }).limit(100);

    const { data: rows, error } = await qb;

    if (error) {
      setError(error.message);
    } else {
      setData(rows ?? []);
    }

    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchData,
  };
}