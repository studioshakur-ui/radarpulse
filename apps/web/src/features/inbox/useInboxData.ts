import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";
import {
  callOpportunitiesSearch,
  EdgeFunctionRequestError,
  type OpportunitiesSearchCursor,
  type OpportunitiesSearchItem,
} from "@/lib/edgeFunctions";

export type InboxFilters = {
  q: string;
  status: string;
  minQuality?: number;
  originType?: string;
  countryCode?: string;
};

export type UseInboxDataResult = {
  items: OpportunitiesSearchItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  subscriptionRequired: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
};

const PAGE_SIZE = 20;

type JwtForensicPayload = {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  role?: string;
};

function shouldLogJwtForensicsLocalOnly(): boolean {
  if (ENV.DEV || ENV.MODE === "development") return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
}

function decodeJwtPayloadUnverified(jwt: string): JwtForensicPayload | null {
  const parts = jwt.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as JwtForensicPayload;
  } catch {
    return null;
  }
}

// BUG-24 FIX: throw if JWT is null — the caller will surface a proper auth error
// instead of sending an empty token that triggers a confusing 401 from the server
async function readJwt(): Promise<string> {
  // Authoritative server-side validation: do not trust local session storage alone.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new EdgeFunctionRequestError("AUTH_SESSION_INVALID", "Session expired. Please sign in again.");
  }

  let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  let session = sessionData.session;
  const nowEpoch = Math.floor(Date.now() / 1000);
  const isExpiring = typeof session?.expires_at === "number" && session.expires_at <= nowEpoch + 10;

  if (sessionError || !session?.access_token || isExpiring) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      throw new EdgeFunctionRequestError("AUTH_SESSION_INVALID", "Session expired. Please sign in again.");
    }
    session = refreshData.session;
  }

  const token = session.access_token;
  if (!token || session.user?.id !== userData.user.id) {
    throw new EdgeFunctionRequestError("AUTH_SESSION_INVALID", "Session expired. Please sign in again.");
  }

  return token;
}

export function useInboxData(filters: InboxFilters): UseInboxDataResult {
  const [items, setItems] = useState<OpportunitiesSearchItem[]>([]);
  const [nextCursor, setNextCursor] = useState<OpportunitiesSearchCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);

  const q = filters.q.trim();
  const normalizedStatus = filters.status.trim().toLowerCase() === "all" ? "" : filters.status.trim();
  const normalizedOriginType = filters.originType?.trim() ?? "";
  const normalizedMinQuality =
    typeof filters.minQuality === "number" && Number.isFinite(filters.minQuality)
      ? Math.max(0, Math.min(1, filters.minQuality))
      : undefined;
  const normalizedCountryCode = filters.countryCode?.trim().toUpperCase() || undefined;

  const [debouncedQ, setDebouncedQ] = useState(q);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const baseInput = useMemo(
    () => ({
      q: debouncedQ || undefined,
      status: normalizedStatus || undefined,
      min_quality: normalizedMinQuality,
      origin_type: normalizedOriginType || undefined,
      country_code: normalizedCountryCode || undefined,
      limit: PAGE_SIZE,
    }),
    [debouncedQ, normalizedMinQuality, normalizedOriginType, normalizedStatus, normalizedCountryCode],
  );

  const fetchPage = useCallback(
    async (cursor: OpportunitiesSearchCursor | null, append: boolean) => {
      const requestVersion = ++requestVersionRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const jwt = await readJwt();
        const shouldLogForensics = shouldLogJwtForensicsLocalOnly();
        if (shouldLogForensics) {
          const payload = decodeJwtPayloadUnverified(jwt);
          const nowEpoch = Math.floor(Date.now() / 1000);
          const nowIso = new Date(nowEpoch * 1000).toISOString();
          const exp = typeof payload?.exp === "number" ? payload.exp : null;
          const expIso = exp ? new Date(exp * 1000).toISOString() : null;
          const isExpired = typeof exp === "number" ? exp <= nowEpoch : null;
          const secondsUntilExpiry = typeof exp === "number" ? exp - nowEpoch : null;
          const missingExp = exp === null;
          // Temporary local forensic debug: never log the full JWT.
          console.log("[RP JWT FORENSICS] runtime", {
            envDev: ENV.DEV,
            mode: ENV.MODE,
            host: typeof window !== "undefined" ? window.location.hostname : "(no-window)",
          });
          console.log("[RP JWT FORENSICS] before opportunities-search", {
            tokenPresent: Boolean(jwt),
            tokenLength: jwt.length,
            sub: payload?.sub ?? null,
            iss: payload?.iss ?? null,
            aud: payload?.aud ?? null,
            exp,
            expIso,
            nowEpoch,
            nowIso,
            isExpired,
            secondsUntilExpiry,
            missingExp,
            role: payload?.role ?? null,
          });
        }
        const result = await callOpportunitiesSearch({ ...baseInput, cursor }, jwt);

        if (requestVersion !== requestVersionRef.current) return;

        setError(null);
        setSubscriptionRequired(false);
        setNextCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      } catch (unknownError) {
        if (requestVersion !== requestVersionRef.current) return;

        if (unknownError instanceof EdgeFunctionRequestError) {
          if (unknownError.code === "SUBSCRIPTION_REQUIRED") {
            setSubscriptionRequired(true);
            return;
          }
          if (unknownError.code === "AUTH_SESSION_INVALID") {
            setError("Session expired. Please sign in again.");
            return;
          }
          if (unknownError.code === "GATEWAY_INVALID_JWT") {
            setError("Your sign-in token is invalid. Please sign in again.");
            return;
          }
          if (unknownError.code === "HANDLER_UNAUTHORIZED") {
            setError("You are not authorized to access inbox search.");
            return;
          }
          if (unknownError.code === "NETWORK_ERROR") {
            const msg = "Network error while loading inbox. Please check your connection.";
            setError(msg);
            toast.error(msg);
            return;
          }
          if (unknownError.code === "UNEXPECTED_RESPONSE") {
            const msg = "Temporary service error. Please try again.";
            setError(msg);
            toast.error(msg);
          }
          return;
        }

        const msg = "Unable to load the inbox.";
        setError(msg);
        toast.error(msg);
      } finally {
        if (requestVersion !== requestVersionRef.current) return;
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [baseInput],
  );

  const reload = useCallback(async () => {
    await fetchPage(null, false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || loading) return;
    await fetchPage(nextCursor, true);
  }, [fetchPage, loading, loadingMore, nextCursor]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    subscriptionRequired,
    reload,
    loadMore,
  };
}
