import type { Decision, DossierStatus, DossierTaskRecord } from "@/lib/types";
import { ENV } from "@/lib/env";
import { AuthTokenError, getValidAccessToken, recoverInvalidSession } from "@/lib/authToken";

export type DossierOpportunity = {
  id: string;
  title: string;
  buyer_name: string | null;
  country_code: string | null;
  deadline_at: string | null;
  published_at: string | null;
  source_url: string;
  summary: string | null;
  status: string;
};

export type DossierSummary = {
  id: string;
  opportunity_id: string;
  status: DossierStatus;
  created_at: string;
  updated_at: string;
  opportunity: DossierOpportunity | null;
};

export type DossierDetail = {
  dossier: DossierSummary;
  tasks: DossierTaskRecord[];
  decision: Decision | null;
  decided_at: string | null;
};

type DossiersResponse<T> = {
  ok: boolean;
  error?: string;
} & T;

async function invokeDossiers<T>(body: Record<string, unknown>): Promise<DossiersResponse<T>> {
  try {
    const jwt = await getValidAccessToken();
    const response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/dossiers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        apikey: ENV.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthTokenError();
      }
      throw new Error(typeof data.error === "string" ? data.error : "DOSSIER_REQUEST_FAILED");
    }

    return (data ?? { ok: false, error: "EMPTY_RESPONSE" }) as DossiersResponse<T>;
  } catch (error) {
    if (error instanceof AuthTokenError) {
      void recoverInvalidSession();
      throw error;
    }
    throw error instanceof Error ? error : new Error("DOSSIER_REQUEST_FAILED");
  }
}

export async function createDossier(opportunityId: string, status?: DossierStatus): Promise<DossierSummary> {
  const response = await invokeDossiers<{ dossier?: DossierSummary }>({
    action: "create_dossier",
    opportunity_id: opportunityId,
    status,
  });
  if (!response.ok || !response.dossier) {
    throw new Error(response.error ?? "Unable to create dossier.");
  }
  return response.dossier;
}

export async function getMyDossiers(status?: DossierStatus): Promise<DossierSummary[]> {
  const response = await invokeDossiers<{ items?: DossierSummary[] }>({
    action: "get_my_dossiers",
    status,
  });
  if (!response.ok) {
    throw new Error(response.error ?? "Unable to load dossiers.");
  }
  return response.items ?? [];
}

export async function getDossier(dossierId: string): Promise<DossierDetail> {
  const response = await invokeDossiers<{
    dossier?: DossierSummary;
    tasks?: DossierTaskRecord[];
    decision?: Decision | null;
    decided_at?: string | null;
  }>({
    action: "get_dossier",
    dossier_id: dossierId,
  });

  if (!response.ok || !response.dossier) {
    throw new Error(response.error ?? "Unable to load dossier.");
  }

  return {
    dossier: response.dossier,
    tasks: response.tasks ?? [],
    decision: response.decision ?? null,
    decided_at: response.decided_at ?? null,
  };
}

export async function updateDossierStatus(dossierId: string, status: DossierStatus): Promise<DossierSummary> {
  const response = await invokeDossiers<{ dossier?: DossierSummary }>({
    action: "update_dossier_status",
    dossier_id: dossierId,
    status,
  });
  if (!response.ok || !response.dossier) {
    throw new Error(response.error ?? "Unable to update dossier status.");
  }
  return response.dossier;
}

export async function addDossierTask(dossierId: string, label: string): Promise<DossierTaskRecord> {
  const response = await invokeDossiers<{ task?: DossierTaskRecord }>({
    action: "add_task",
    dossier_id: dossierId,
    label,
  });
  if (!response.ok || !response.task) {
    throw new Error(response.error ?? "Unable to add task.");
  }
  return response.task;
}

export async function toggleDossierTask(taskId: string): Promise<DossierTaskRecord> {
  const response = await invokeDossiers<{ task?: DossierTaskRecord }>({
    action: "toggle_task",
    task_id: taskId,
  });
  if (!response.ok || !response.task) {
    throw new Error(response.error ?? "Unable to update task.");
  }
  return response.task;
}
