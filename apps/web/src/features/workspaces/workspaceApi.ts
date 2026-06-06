import type { Decision, DossierStatus, DossierTaskRecord } from "@/lib/types";
import { ENV } from "@/lib/env";
import { AuthTokenError, getValidAccessToken, recoverInvalidSession } from "@/lib/authToken";
import type { DossierDetail, DossierOpportunity, DossierSummary } from "@/features/dossiers/dossierApi";

export type WorkspaceOpportunity = DossierOpportunity;
export type WorkspaceSummary = DossierSummary;
export type WorkspaceDetail = DossierDetail;
export type WorkspaceDecision = Decision;
export type WorkspaceStatus = DossierStatus;
export type WorkspaceTaskRecord = DossierTaskRecord;

type WorkspacesResponse<T> = {
  ok: boolean;
  error?: string;
  details?: string;
} & T;

async function invokeWorkspaces<T>(body: Record<string, unknown>): Promise<WorkspacesResponse<T>> {
  try {
    const jwt = await getValidAccessToken();
    const response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/workspaces`, {
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
      const errorCode = typeof data.error === "string" ? data.error : "WORKSPACE_REQUEST_FAILED";
      const details = typeof data.details === "string" ? data.details : null;
      throw new Error(details ? `${errorCode}: ${details}` : errorCode);
    }

    return (data ?? { ok: false, error: "EMPTY_RESPONSE" }) as WorkspacesResponse<T>;
  } catch (error) {
    if (error instanceof AuthTokenError) {
      void recoverInvalidSession();
      throw error;
    }
    throw error instanceof Error ? error : new Error("WORKSPACE_REQUEST_FAILED");
  }
}

export async function createWorkspace(opportunityId: string, status?: WorkspaceStatus): Promise<WorkspaceSummary> {
  const response = await invokeWorkspaces<{ workspace?: WorkspaceSummary }>({
    action: "create_workspace",
    opportunity_id: opportunityId,
    status,
  });
  if (!response.ok || !response.workspace) {
    throw new Error(response.error ?? "Unable to create workspace.");
  }
  return response.workspace;
}

export async function getMyWorkspaces(status?: WorkspaceStatus): Promise<WorkspaceSummary[]> {
  const response = await invokeWorkspaces<{ items?: WorkspaceSummary[] }>({
    action: "get_my_workspaces",
    status,
  });
  if (!response.ok) {
    throw new Error(response.error ?? "Unable to load workspaces.");
  }
  return response.items ?? [];
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceDetail> {
  const response = await invokeWorkspaces<{
    workspace?: WorkspaceSummary;
    tasks?: WorkspaceTaskRecord[];
    decision?: Decision | null;
    decided_at?: string | null;
  }>({
    action: "get_workspace",
    workspace_id: workspaceId,
  });

  if (!response.ok || !response.workspace) {
    throw new Error(response.error ?? "Unable to load workspace.");
  }

  return {
    dossier: response.workspace,
    tasks: response.tasks ?? [],
    decision: response.decision ?? null,
    decided_at: response.decided_at ?? null,
  };
}

export async function updateWorkspaceStatus(workspaceId: string, status: WorkspaceStatus): Promise<WorkspaceSummary> {
  const response = await invokeWorkspaces<{ workspace?: WorkspaceSummary }>({
    action: "update_workspace_status",
    workspace_id: workspaceId,
    status,
  });
  if (!response.ok || !response.workspace) {
    throw new Error(response.error ?? "Unable to update workspace status.");
  }
  return response.workspace;
}

export async function addWorkspaceTask(workspaceId: string, label: string): Promise<WorkspaceTaskRecord> {
  const response = await invokeWorkspaces<{ task?: WorkspaceTaskRecord }>({
    action: "add_task",
    workspace_id: workspaceId,
    label,
  });
  if (!response.ok || !response.task) {
    throw new Error(response.error ?? "Unable to add task.");
  }
  return response.task;
}

export async function toggleWorkspaceTask(taskId: string): Promise<WorkspaceTaskRecord> {
  const response = await invokeWorkspaces<{ task?: WorkspaceTaskRecord }>({
    action: "toggle_task",
    task_id: taskId,
  });
  if (!response.ok || !response.task) {
    throw new Error(response.error ?? "Unable to update task.");
  }
  return response.task;
}
