// apps/web/src/features/inbox/useInboxData.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { BuyerRow, Uuid } from "@/lib/types";

export type InboxFilters = {
  q: string;
  region?: string;
  budgetMin?: number;
  budgetMax?: number;
  deadlineBefore?: string;
  deadline: "any" | "7d" | "30d" | "overdue";
  hideNoGo: boolean;
  onlyPublic: boolean;
};

type OpportunitySearchRow = {
  id: string;
  title: string;
  buyer_name: string | null;
  region: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  deadline_at: string | null;
  published_at: string | null;
  source_key: string | null;
  status: string;
  is_public: boolean;
  country_code: string | null;
  quality_score: number | null;
  completeness_score: number | null;
  origin_type: string | null;
};

export type OpportunityWithMeta = {
  id: Uuid;
  title: string;
  buyer_name: string | null;
  deadline_at: string | null;
  published_at: string | null;
  source_key: string | null;
  status: string;
  is_public: boolean;
  country_code: string | null;
  raw: Record<string, unknown>;
  buyer?: BuyerRow | null;
  source?: null;
  latestEvent?: null;
};

const DEFAULT_INBOX_FILTERS: InboxFilters = Object.freeze({
  q: "",
  region: "",
  budgetMin: undefined,
  budgetMax: undefined,
  deadlineBefore: "",
  deadline: "any",
  hideNoGo: false,
  onlyPublic: false,
});

function normalizeInboxFilters(input?: InboxFilters | null): InboxFilters {
  const f = input ?? (DEFAULT_INBOX_FILTERS as InboxFilters);

  // Normalisation stricte (anti-undefined)
  return {
    q: String(f?.q ?? ""),
    region: typeof f?.region === "string" ? f.region : "",
    budgetMin: typeof f?.budgetMin === "number" ? f.budgetMin : undefined,
    budgetMax: typeof f?.budgetMax === "number" ? f.budgetMax : undefined,
    deadlineBefore: typeof f?.deadlineBefore === "string" ? f.deadlineBefore : "",
    deadline: (f?.deadline ?? "any") as InboxFilters["deadline"],
    hideNoGo: Boolean(f?.hideNoGo),
    onlyPublic: Boolean(f?.onlyPublic),
  };
}

async function fetchInbox(filters: InboxFilters) {
  let q = supabase
    .from("opportunities_inbox_it_v1")
    .select(
      "id,title,buyer_name,region,budget_amount,budget_currency,deadline_at,published_at,source_key,status,is_public,country_code,quality_score,completeness_score,origin_type"
    )
    .order("published_at", { ascending: false })
    .limit(100);

  if (filters.onlyPublic) q = q.eq("is_public", true);

  if (filters.q.trim()) {
    const s = `%${filters.q.trim()}%`;
    q = q.ilike("title", s);
  }

  if ((filters.region ?? "").trim()) {
    q = q.eq("region", filters.region!.trim());
  }

  if (typeof filters.budgetMin === "number") {
    q = q.gte("budget_amount", filters.budgetMin);
  }
  if (typeof filters.budgetMax === "number") {
    q = q.lte("budget_amount", filters.budgetMax);
  }

  if ((filters.deadlineBefore ?? "").trim()) {
    q = q.lte("deadline_at", filters.deadlineBefore!.trim());
  }

  if (filters.deadline !== "any") {
    const now = new Date();
    if (filters.deadline === "overdue") {
      q = q.lt("deadline_at", now.toISOString());
    } else {
      const days = filters.deadline === "7d" ? 7 : 30;
      const max = new Date(now.getTime() + days * 24 * 3600 * 1000);
      q = q.gte("deadline_at", now.toISOString()).lte("deadline_at", max.toISOString());
    }
  }

  const { data: opps, error: oppErr } = await q.returns<OpportunitySearchRow[]>();
  if (oppErr) throw oppErr;

  return (opps ?? []).map((o) => ({
    id: o.id as Uuid,
    title: o.title,
    buyer_name: o.buyer_name,
    deadline_at: o.deadline_at,
    published_at: o.published_at,
    source_key: o.source_key,
    status: o.status,
    is_public: o.is_public,
    country_code: o.country_code,
    raw: {
      region: o.region,
      budget_amount: o.budget_amount,
      currency: o.budget_currency,
      quality_score: o.quality_score,
      completeness_score: o.completeness_score,
      origin_type: o.origin_type,
    },
    buyer: o.buyer_name ? ({ name: o.buyer_name } as BuyerRow) : null,
    source: null,
    latestEvent: null,
  }));
}

export function useInboxData(filters?: InboxFilters | null) {
  const f = normalizeInboxFilters(filters);

  return useQuery({
    // queryKey stable (évite les surprises si un objet change d'identité)
    queryKey: [
      "inbox",
      f.q,
      f.region ?? "",
      f.budgetMin ?? null,
      f.budgetMax ?? null,
      f.deadlineBefore ?? "",
      f.deadline,
      f.hideNoGo,
      f.onlyPublic,
    ],
    queryFn: () => fetchInbox(f),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  });
}
