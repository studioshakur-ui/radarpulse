import { ENV } from "@/lib/env";

export type OpportunitiesSearchCursor = {
  published_at: string;
  id: string;
};

export type OpportunitiesSearchItem = {
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

export type OpportunitiesSearchInput = {
  q?: string;
  status?: string;
  min_quality?: number;
  origin_type?: string;
  country_code?: string | null;
  limit?: number;
  cursor?: OpportunitiesSearchCursor | null;
};

export type OpportunitiesSearchResult = {
  items: OpportunitiesSearchItem[];
  nextCursor: OpportunitiesSearchCursor | null;
};

type ErrorCode =
  | "AUTH_SESSION_INVALID"
  | "GATEWAY_INVALID_JWT"
  | "HANDLER_UNAUTHORIZED"
  | "SUBSCRIPTION_REQUIRED"
  | "NETWORK_ERROR"
  | "UNEXPECTED_RESPONSE";

export class EdgeFunctionRequestError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "EdgeFunctionRequestError";
    this.code = code;
  }
}

function asItem(value: unknown): OpportunitiesSearchItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.status !== "string") {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    buyer_name: typeof row.buyer_name === "string" ? row.buyer_name : null,
    region: typeof row.region === "string" ? row.region : null,
    budget_amount: typeof row.budget_amount === "number" ? row.budget_amount : null,
    budget_currency: typeof row.budget_currency === "string" ? row.budget_currency : null,
    deadline_at: typeof row.deadline_at === "string" ? row.deadline_at : null,
    published_at: typeof row.published_at === "string" ? row.published_at : null,
    source_key: typeof row.source_key === "string" ? row.source_key : null,
    status: row.status,
    is_public: row.is_public === true,
    country_code: typeof row.country_code === "string" ? row.country_code : null,
    quality_score: typeof row.quality_score === "number" ? row.quality_score : null,
    completeness_score: typeof row.completeness_score === "number" ? row.completeness_score : null,
    origin_type: typeof row.origin_type === "string" ? row.origin_type : null,
  };
}

function asCursor(value: unknown): OpportunitiesSearchCursor | null {
  if (!value || typeof value !== "object") return null;
  const cursor = value as Record<string, unknown>;
  if (typeof cursor.published_at !== "string" || typeof cursor.id !== "string") return null;
  return { published_at: cursor.published_at, id: cursor.id };
}

export async function callOpportunitiesSearch(input: OpportunitiesSearchInput, jwt: string): Promise<OpportunitiesSearchResult> {
  if (!jwt) {
    throw new EdgeFunctionRequestError("AUTH_SESSION_INVALID", "Session expired. Please sign in again.");
  }

  const payload = {
    q: typeof input.q === "string" && input.q.trim() ? input.q.trim() : undefined,
    status: typeof input.status === "string" && input.status.trim() ? input.status.trim() : undefined,
    min_quality: typeof input.min_quality === "number" ? input.min_quality : undefined,
    origin_type: typeof input.origin_type === "string" && input.origin_type.trim() ? input.origin_type.trim() : undefined,
    limit: typeof input.limit === "number" ? input.limit : 20,
    cursor: input.cursor ?? null,
    country_code: input.country_code ?? undefined,
  };

  let response: Response;
  try {
    response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/opportunities-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        apikey: ENV.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new EdgeFunctionRequestError("NETWORK_ERROR", "Network error while contacting the search service.");
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message : "";
  const handlerError = typeof body.error === "string" ? body.error : "";

  if (response.status === 401) {
    if (handlerError === "UNAUTHORIZED") {
      throw new EdgeFunctionRequestError("HANDLER_UNAUTHORIZED", "Authentication required.");
    }
    if (message.toLowerCase().includes("invalid jwt")) {
      throw new EdgeFunctionRequestError("GATEWAY_INVALID_JWT", "Invalid JWT.");
    }
    throw new EdgeFunctionRequestError("GATEWAY_INVALID_JWT", "JWT rejected by function gateway.");
  }

  if (response.status === 402) {
    throw new EdgeFunctionRequestError("SUBSCRIPTION_REQUIRED", "Subscription required.");
  }

  if (!response.ok) {
    throw new EdgeFunctionRequestError("UNEXPECTED_RESPONSE", `Unexpected response status: ${response.status}.`);
  }

  if (!Array.isArray(body.items)) {
    throw new EdgeFunctionRequestError("UNEXPECTED_RESPONSE", "Unexpected response payload.");
  }

  const rawItems = body.items as unknown[];
  const items = rawItems.map(asItem).filter((row): row is OpportunitiesSearchItem => row !== null);
  const nextCursor = asCursor(body.nextCursor);

  return { items, nextCursor };
}
