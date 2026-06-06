import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";
import { AuthTokenError, getValidAccessToken, recoverInvalidSession } from "@/lib/authToken";
import type { WorkflowStatus } from "@/lib/types";

export type OpportunityWorkflow = {
  workflow_status: WorkflowStatus;
  updated_at: string;
};

export function useOpportunityWorkflow(opportunityId: string | null) {
  const [workflow, setWorkflow] = useState<OpportunityWorkflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opportunityId) {
      setWorkflow(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId || cancelled) return;

        const { data, error: loadError } = await supabase
          .from("opportunity_workflows")
          .select("workflow_status, updated_at")
          .eq("opportunity_id", opportunityId)
          .eq("user_id", userId)
          .maybeSingle();

        if (loadError) throw loadError;
        if (!cancelled) setWorkflow(data ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const saveWorkflow = useCallback(async (nextStatus: WorkflowStatus) => {
    if (!opportunityId || saving) return;
    setSaving(true);
    setError(null);

    const previous = workflow;
    const optimistic = {
      workflow_status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    setWorkflow(optimistic);

    try {
      const jwt = await getValidAccessToken();

      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/opportunity-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          apikey: ENV.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          workflow_status: nextStatus,
        }),
      });

      const response = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        if (res.status === 401) {
          throw new AuthTokenError();
        }
        const errorCode = typeof response.error === "string" ? response.error : "WORKFLOW_REQUEST_FAILED";
        const details = typeof response.detail === "string"
          ? response.detail
          : typeof response.details === "string"
            ? response.details
            : null;
        throw new Error(details ? `${errorCode}: ${details}` : errorCode);
      }

      setWorkflow({
        workflow_status: String(response?.workflow_status ?? nextStatus) as WorkflowStatus,
        updated_at: String(response?.updated_at ?? optimistic.updated_at),
      });
    } catch (e) {
      if (e instanceof AuthTokenError) {
        void recoverInvalidSession();
      }
      setWorkflow(previous);
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }, [opportunityId, saving, workflow]);

  return { workflow, loading, saving, error, saveWorkflow };
}
