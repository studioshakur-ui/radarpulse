// apps/web/src/features/inbox/useInboxData.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { OpportunityRow, OpportunityEventRow, BuyerRow, SourceRow, Uuid } from "@/lib/types";

export type InboxFilters = {
  q: string;
  deadline: "any" | "7d" | "30d" | "overdue";
  hideNoGo: boolean;
  onlyPublic: boolean;
};

export type OpportunityWithMeta = OpportunityRow & {
  buyer?: BuyerRow | null;
  source?: SourceRow | null;
  latestEvent?: OpportunityEventRow | null;
};

const DEFAULT_INBOX_FILTERS: InboxFilters = Object.freeze({
  q: "",
  deadline: "any",
  hideNoGo: false,
  onlyPublic: false,
});

function normalizeInboxFilters(input?: InboxFilters | null): InboxFilters {
  const f = input ?? (DEFAULT_INBOX_FILTERS as InboxFilters);

  // Normalisation stricte (anti-undefined)
  return {
    q: String(f?.q ?? ""),
    deadline: (f?.deadline ?? "any") as InboxFilters["deadline"],
    hideNoGo: Boolean(f?.hideNoGo),
    onlyPublic: Boolean(f?.onlyPublic),
  };
}

async function fetchInbox(filters: InboxFilters) {
  // 1) Opportunities: last 500 updated (V1)
  let q = supabase
    .from("opportunities")
    .select(
      "id,source_id,external_id,fingerprint,type,status,is_public,country_code,buyer_id,buyer_name,title,summary,published_at,deadline_at,deadline_tz,source_url,language,created_at,updated_at"
    )
    .eq("country_code", "IT")
    .order("updated_at", { ascending: false })
    .limit(500);

  // FIX: filters est désormais toujours normalisé, mais on garde la lecture propre
  if (filters.onlyPublic) q = q.eq("is_public", true);

  if (filters.q.trim()) {
    const s = `%${filters.q.trim()}%`;
    q = q.ilike("title", s);
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

  const { data: opps, error: oppErr } = await q;
  if (oppErr) throw oppErr;

  const ids = (opps ?? []).map((o) => o.id) as Uuid[];
  const sourceIds = Array.from(new Set((opps ?? []).map((o) => o.source_id))).filter(Boolean) as Uuid[];
  const buyerIds = Array.from(new Set((opps ?? []).map((o) => o.buyer_id).filter(Boolean))) as Uuid[];

  // 2) Latest events for those opportunities (V1 strategy: fetch recent events, then pick latest per opp)
  // We cap to keep it fast.
  const latestEventsMap = new Map<Uuid, OpportunityEventRow>();
  if (ids.length) {
    const { data: evs, error: evErr } = await supabase
      .from("opportunity_events")
      .select("id,opportunity_id,type,occurred_at,data")
      .in("opportunity_id", ids)
      .order("occurred_at", { ascending: false })
      .limit(2500);

    if (evErr) throw evErr;

    for (const ev of evs ?? []) {
      const oid = ev.opportunity_id as Uuid;
      if (!latestEventsMap.has(oid)) latestEventsMap.set(oid, ev as any);
    }
  }

  // 3) Sources lookup
  const sourcesMap = new Map<Uuid, SourceRow>();
  if (sourceIds.length) {
    const { data: srcs, error: srcErr } = await supabase
      .from("sources")
      .select("id,key,name,kind,url,country_code,is_active,schedule_minutes,last_run_at,last_success_at,last_error,meta,created_at,updated_at")
      .in("id", sourceIds);

    if (srcErr) throw srcErr;

    for (const s of srcs ?? []) sourcesMap.set(s.id as Uuid, s as any);
  }

  // 4) Buyers lookup
  const buyersMap = new Map<Uuid, BuyerRow>();
  if (buyerIds.length) {
    const { data: bs, error: bErr } = await supabase
      .from("buyers")
      .select("id,country_code,name,normalized_name,created_at")
      .in("id", buyerIds);

    if (bErr) throw bErr;

    for (const b of bs ?? []) buyersMap.set(b.id as Uuid, b as any);
  }

  return (opps ?? []).map((o) => ({
    ...(o as any as OpportunityRow),
    source: sourcesMap.get(o.source_id as Uuid) ?? null,
    buyer: o.buyer_id ? buyersMap.get(o.buyer_id as Uuid) ?? null : null,
    latestEvent: latestEventsMap.get(o.id as Uuid) ?? null,
  }));
}

export function useInboxData(filters?: InboxFilters | null) {
  const f = normalizeInboxFilters(filters);

  return useQuery({
    // queryKey stable (évite les surprises si un objet change d'identité)
    queryKey: ["inbox", f.q, f.deadline, f.hideNoGo, f.onlyPublic],
    queryFn: () => fetchInbox(f),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  });
}
