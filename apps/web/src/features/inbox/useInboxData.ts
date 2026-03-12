import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
};

const PAGE_SIZE = 20;

// BUG-24 FIX: throw if JWT is null — the caller will surface a proper auth error
// instead of sending an empty token that triggers a confusing 401 from the server
async function readJwt(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token || error) {
    throw new EdgeFunctionRequestError("UNAUTHORIZED", "Sessione scaduta. Riaccedi per continuare.");
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

  const q = filters.q.trim();
  const normalizedStatus = filters.status.trim().toLowerCase() === "all" ? "" : filters.status.trim();
  const normalizedOriginType = filters.originType?.trim() ?? "";
  const normalizedMinQuality =
    typeof filters.minQuality === "number" && Number.isFinite(filters.minQuality)
      ? Math.max(0, Math.min(1, filters.minQuality))
      : undefined;
  const normalizedCountryCode = filters.countryCode?.trim().toUpperCase() || "IT";

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
        const result = await callOpportunitiesSearch({ ...baseInput, cursor }, jwt);

        if (requestVersion !== requestVersionRef.current) return;

        setError(null);
        setNextCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      } catch (unknownError) {
        if (requestVersion !== requestVersionRef.current) return;

        if (unknownError instanceof EdgeFunctionRequestError) {
          if (unknownError.code === "REQUEST_FAILED") {
            setError(unknownError.message);
            toast.error("Impossibile caricare la inbox.");
          }
          return;
        }

        setError("Impossibile caricare la inbox.");
        toast.error("Impossibile caricare la inbox.");
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
    reload,
    loadMore,
  };
}
