import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type OpportunityDocument = {
  id: string;
  doc_title: string | null;
  doc_url: string;
  doc_type: string | null;
  created_at: string;
};

export function useOpportunityDocuments(opportunityId: string | null) {
  const [documents, setDocuments] = useState<OpportunityDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opportunityId) {
      setDocuments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data } = await supabase
          .from("opportunity_documents")
          .select("id, doc_title, doc_url, doc_type, created_at")
          .eq("opportunity_id", opportunityId)
          .order("created_at", { ascending: true });

        if (!cancelled) setDocuments(data ?? []);
      } catch {
        // silent — documents are non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  return { documents, loading };
}
