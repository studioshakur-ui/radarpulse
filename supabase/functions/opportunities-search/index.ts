import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

type Cursor = {
  published_at: string;
  id: string;
};

type RequestBody = {
  q?: string;
  status?: string;
  min_quality?: number;
  date_from?: string;
  date_to?: string;
  region?: string;
  origin_type?: string;
  country_code?: string;
  cursor?: Cursor | null;
  limit?: number;
};

type OpportunityCard = {
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

type AuthUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  role?: string;
};

type SearchQueryInput = {
  q?: string;
  status?: string;
  min_quality?: number;
  date_from?: string;
  date_to?: string;
  region?: string;
  origin_type?: string;
  cursor?: Cursor | null;
  limit: number;
  country_code?: string | null;
};

export type OpportunitiesSearchDeps = {
  verifyBearer: (authHeader: string | null) => Promise<{ user: AuthUser | null; error: "unauthorized" | null }>;
  listSubscriptions: (userId: string) => Promise<Record<string, unknown>[]>;
  searchOpportunities: (input: SearchQueryInput) => Promise<OpportunityCard[]>;
  getEnv: (name: string) => string | undefined;
  now: () => Date;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function err(status: number, code: string, message: string, details?: Record<string, unknown>): Response {
  return json({ ok: false, error: code, message, ...(details ? { details } : {}) }, status);
}

function parseBody(input: unknown): { ok: true; value: SearchQueryInput } | { ok: false; response: Response } {
  const body = (input ?? {}) as RequestBody;

  const limit = body.limit === undefined ? 50 : Number(body.limit);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return { ok: false, response: err(400, "INVALID_LIMIT", "limit must be an integer between 1 and 100") };
  }

  const cursor = body.cursor ?? null;
  if (cursor !== null) {
    const publishedAt = String((cursor as Record<string, unknown>)?.published_at ?? "").trim();
    const id = String((cursor as Record<string, unknown>)?.id ?? "").trim();
    if (!publishedAt || !id) {
      return { ok: false, response: err(400, "INVALID_CURSOR", "cursor must include published_at and id") };
    }
    // BUG-15 FIX: validate formats to prevent cursor injection into the PostgREST query string
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(publishedAt)) {
      return { ok: false, response: err(400, "INVALID_CURSOR", "cursor.published_at must be an ISO 8601 datetime") };
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { ok: false, response: err(400, "INVALID_CURSOR", "cursor.id must be a valid UUID") };
    }
  }

  return {
    ok: true,
    value: {
      q: typeof body.q === "string" ? body.q : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      min_quality: typeof body.min_quality === "number" ? body.min_quality : undefined,
      date_from: typeof body.date_from === "string" ? body.date_from : undefined,
      date_to: typeof body.date_to === "string" ? body.date_to : undefined,
      region: typeof body.region === "string" ? body.region : undefined,
      origin_type: typeof body.origin_type === "string" ? body.origin_type : undefined,
      cursor,
      limit,
      country_code: typeof body.country_code === "string" && body.country_code.trim()
        ? body.country_code.trim().toUpperCase()
        : null,
    },
  };
}

function isAdminUser(user: AuthUser): boolean {
  const roleCandidates = [
    user?.app_metadata?.role,
    user?.user_metadata?.role,
    user?.role,
  ]
    .map((v: unknown) => String(v ?? "").toUpperCase())
    .filter(Boolean);
  return roleCandidates.includes("ADMIN");
}

function isSubscriptionActive(row: Record<string, unknown> | null): boolean {
  if (!row) return false;

  const status = String(row.status ?? row.subscription_status ?? "").toLowerCase();
  const periodEndRaw = row.current_period_end ?? row.period_end ?? null;
  const isActiveBool = row.is_active === true;

  if (status === "active") {
    if (!periodEndRaw) return true;
    const d = new Date(String(periodEndRaw));
    return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now();
  }

  return isActiveBool;
}

function buildRealDeps(req: Request): OpportunitiesSearchDeps {
  const getEnv = (name: string) => Deno.env.get(name);

  const requestUrl = new URL(req.url);
  const url = requestUrl.origin || getEnv("SB_URL") || getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SERVICE_ROLE_KEY") ?? getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("SERVER_CONFIG_ERROR");
  }

  const sbAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

  return {
    verifyBearer: async (authHeader: string | null) => {
      if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        return { user: null, error: "unauthorized" as const };
      }
      const token = authHeader.slice(7).trim();
      if (!token) return { user: null, error: "unauthorized" as const };

      const { data, error } = await sbAdmin.auth.getUser(token);
      if (error || !data?.user?.id) return { user: null, error: "unauthorized" as const };
      return { user: data.user as unknown as AuthUser, error: null };
    },
    listSubscriptions: async (userId: string) => {
      const { data, error } = await sbAdmin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw new Error("SUBSCRIPTION_CHECK_FAILED");
      return (data ?? []) as Record<string, unknown>[];
    },
    searchOpportunities: async (input: SearchQueryInput) => {
      let query = sbAdmin
        .from("opportunities_search_v1")
        .select(
          "id,title,buyer_name,region,budget_amount,budget_currency,deadline_at,published_at,source_key,status,is_public,country_code,quality_score,completeness_score,origin_type"
        )
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(input.limit);

      if (input.country_code) {
        query = query.eq("country_code", input.country_code);
      }

      const q = String(input.q ?? "").trim();
      if (q) {
        const escaped = q.replace(/,/g, " ");
        query = query.or(`title.ilike.%${escaped}%,buyer_name.ilike.%${escaped}%`);
      }

      if (typeof input.status === "string" && input.status.trim()) {
        query = query.eq("status", input.status.trim());
      }
      if (typeof input.min_quality === "number" && Number.isFinite(input.min_quality)) {
        query = query.gte("quality_score", input.min_quality);
      }
      if (typeof input.origin_type === "string" && input.origin_type.trim()) {
        query = query.eq("origin_type", input.origin_type.trim());
      }
      if (typeof input.region === "string" && input.region.trim()) {
        query = query.eq("region", input.region.trim());
      }
      if (typeof input.date_from === "string" && input.date_from.trim()) {
        query = query.gte("published_at", input.date_from.trim());
      }
      if (typeof input.date_to === "string" && input.date_to.trim()) {
        query = query.lte("published_at", input.date_to.trim());
      }
      if (input.cursor?.published_at && input.cursor?.id) {
        query = query.or(
          `published_at.lt.${input.cursor.published_at},and(published_at.eq.${input.cursor.published_at},id.lt.${input.cursor.id})`
        );
      }

      const { data, error } = await query.returns<OpportunityCard[]>();
      if (error) throw new Error("QUERY_FAILED");
      return data ?? [];
    },
    getEnv,
    now: () => new Date(),
  };
}

export function createHandler(deps: OpportunitiesSearchDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return err(405, "METHOD_NOT_ALLOWED", "Method not allowed");

    const authRes = await deps.verifyBearer(req.headers.get("Authorization"));
    if (authRes.error || !authRes.user) return err(401, "UNAUTHORIZED", "Authentication required");
    const user = authRes.user;

    try {
      if (!isAdminUser(user)) {
        let subRows: Record<string, unknown>[] = [];
        try {
          subRows = await deps.listSubscriptions(user.id);
        } catch {
          return err(500, "SUBSCRIPTION_CHECK_FAILED", "Failed to validate subscription");
        }

        const active = subRows.some((row) => isSubscriptionActive(row));
        if (!active) {
          return err(402, "SUBSCRIPTION_REQUIRED", "Active subscription required for Inbox access");
        }
      }

    let body: RequestBody = {};
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      body = {};
    }
    const parsed = parseBody(body);
    if (!parsed.ok) return parsed.response;
    const input = parsed.value;

      const rows = await deps.searchOpportunities(input);
      const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      buyer_name: row.buyer_name,
      region: row.region,
      budget_amount: row.budget_amount,
      budget_currency: row.budget_currency,
      deadline_at: row.deadline_at,
      published_at: row.published_at,
      source_key: row.source_key,
      status: row.status,
      is_public: row.is_public,
      country_code: row.country_code,
      quality_score: row.quality_score,
      completeness_score: row.completeness_score,
      origin_type: row.origin_type,
    }));

    const nextCursor =
      items.length === input.limit
        ? {
            published_at: items[items.length - 1].published_at,
            id: items[items.length - 1].id,
          }
        : null;

    return json({
      ok: true,
      items,
      nextCursor,
      meta: { limit: input.limit, returned: items.length },
    });
    } catch {
      return err(500, "INTERNAL_ERROR", "Unexpected server error");
    }
  };
}

if (import.meta.main) {
  Deno.serve((req) => {
    const realDeps = buildRealDeps(req);
    return createHandler(realDeps)(req);
  });
}
