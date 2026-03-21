import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin, sbAdminForRequest } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("workspaces");

type WorkspaceStatus = "NEW" | "REVIEW" | "GO" | "HOLD" | "BLOCKED" | "READY" | "SUBMITTED";
type WorkspaceAction =
  | "create_workspace"
  | "get_my_workspaces"
  | "get_workspace"
  | "update_workspace_status"
  | "add_task"
  | "toggle_task";

type WorkspaceRequest = {
  action?: WorkspaceAction;
  opportunity_id?: string;
  workspace_id?: string;
  task_id?: string;
  status?: WorkspaceStatus;
  label?: string;
};

type OpportunityJoinRow = {
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

type WorkspaceRow = {
  id: string;
  opportunity_id: string;
  user_id: string;
  status: WorkspaceStatus;
  created_at: string;
  updated_at: string;
  opportunities?: OpportunityJoinRow | OpportunityJoinRow[] | null;
};

type WorkspaceTaskRow = {
  id: string;
  dossier_id: string;
  label: string;
  is_done: boolean;
  created_at: string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeString(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function normalizeStatus(value: unknown): WorkspaceStatus | null {
  return value === "NEW" ||
      value === "REVIEW" ||
      value === "GO" ||
      value === "HOLD" ||
      value === "BLOCKED" ||
      value === "READY" ||
      value === "SUBMITTED"
    ? value
    : null;
}

function flattenOpportunity(value: WorkspaceRow["opportunities"]): OpportunityJoinRow | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function serializeWorkspace(row: WorkspaceRow) {
  return {
    id: row.id,
    opportunity_id: row.opportunity_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    opportunity: flattenOpportunity(row.opportunities),
  };
}

function checklistLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (!entry || typeof entry !== "object") return "";
      const row = entry as Record<string, unknown>;
      const task = normalizeString(row.task) ?? normalizeString(row.label) ?? normalizeString(row.title);
      return task ?? "";
    })
    .filter(Boolean)
    .slice(0, 12);
}

async function authUserId(
  req: Request,
  authHeader: string | null,
): Promise<{ sb: ReturnType<typeof sbAdminForRequest>; userId: string }> {
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    throw new Error("UNAUTHORIZED");
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new Error("UNAUTHORIZED");

  const sb = sbAdminForRequest(req);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return { sb, userId: data.user.id };
}

async function loadWorkspaceRow(
  sb: ReturnType<typeof sbAdmin>,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRow | null> {
  const { data, error } = await sb
    .from("dossiers")
    .select(
      "id, opportunity_id, user_id, status, created_at, updated_at, opportunities!inner(id, title, buyer_name, country_code, deadline_at, published_at, source_url, summary, status)",
    )
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as WorkspaceRow | null) ?? null;
}

async function maybeSyncStatus(
  sb: ReturnType<typeof sbAdmin>,
  workspace: WorkspaceRow,
  desiredStatus: WorkspaceStatus | null,
): Promise<WorkspaceRow> {
  if (!desiredStatus) return workspace;
  if (workspace.status === desiredStatus) return workspace;

  const canAutoAdvance =
    (desiredStatus === "GO" || desiredStatus === "HOLD") &&
    (workspace.status === "NEW" || workspace.status === "REVIEW" || workspace.status === "HOLD" || workspace.status === "GO");

  if (!canAutoAdvance) return workspace;

  const { data, error } = await sb
    .from("dossiers")
    .update({ status: desiredStatus })
    .eq("id", workspace.id)
    .select(
      "id, opportunity_id, user_id, status, created_at, updated_at, opportunities!inner(id, title, buyer_name, country_code, deadline_at, published_at, source_url, summary, status)",
    )
    .single();

  if (error) throw new Error(error.message);
  return data as WorkspaceRow;
}

async function seedTasksFromPrepIfEmpty(
  sb: ReturnType<typeof sbAdmin>,
  workspaceId: string,
  opportunityId: string,
  userId: string,
) {
  const { count, error: countError } = await sb
    .from("dossier_tasks")
    .select("id", { count: "exact", head: true })
    .eq("dossier_id", workspaceId);

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) return;

  const { data: prep, error: prepError } = await sb
    .from("opportunity_preps")
    .select("checklist")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prepError) throw new Error(prepError.message);

  const labels = checklistLabels((prep as { checklist?: unknown } | null)?.checklist);
  if (!labels.length) return;

  const payload = labels.map((label) => ({
    dossier_id: workspaceId,
    label,
    is_done: false,
  }));

  const { error: insertError } = await sb.from("dossier_tasks").insert(payload);
  if (insertError) throw new Error(insertError.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  let sb: ReturnType<typeof sbAdmin>;
  let userId = "";
  try {
    const auth = await authUserId(req, req.headers.get("Authorization"));
    sb = auth.sb;
    userId = auth.userId;
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNAUTHORIZED";
    const status = code === "UNAUTHORIZED" ? 401 : 500;
    return json(status, { ok: false, error: code });
  }

  let body: WorkspaceRequest;
  try {
    body = (await req.json()) as WorkspaceRequest;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }

  const action = body.action;
  if (!action) return json(400, { ok: false, error: "INVALID_ACTION" });

  try {
    if (action === "create_workspace") {
      const opportunityId = normalizeString(body.opportunity_id);
      if (!opportunityId) return json(400, { ok: false, error: "INVALID_OPPORTUNITY_ID" });

      const desiredStatus = normalizeStatus(body.status);

      const { data: opportunity, error: oppError } = await sb
        .from("opportunities")
        .select("id")
        .eq("id", opportunityId)
        .maybeSingle();

      if (oppError) throw new Error(oppError.message);
      if (!opportunity?.id) return json(404, { ok: false, error: "OPPORTUNITY_NOT_FOUND" });

      const { data: existing, error: existingError } = await sb
        .from("dossiers")
        .select(
          "id, opportunity_id, user_id, status, created_at, updated_at, opportunities!inner(id, title, buyer_name, country_code, deadline_at, published_at, source_url, summary, status)",
        )
        .eq("opportunity_id", opportunityId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);

      let workspaceRow = existing as WorkspaceRow | null;
      if (!workspaceRow) {
        const derivedStatus = desiredStatus ?? "NEW";
        const { data: inserted, error: insertError } = await sb
          .from("dossiers")
          .insert({
            opportunity_id: opportunityId,
            user_id: userId,
            status: derivedStatus,
          })
          .select(
            "id, opportunity_id, user_id, status, created_at, updated_at, opportunities!inner(id, title, buyer_name, country_code, deadline_at, published_at, source_url, summary, status)",
          )
          .maybeSingle();

        if (insertError) {
          if (insertError.code !== "23505") {
            throw new Error(insertError.message);
          }
          const { data: racedIdRow, error: racedIdError } = await sb
            .from("dossiers")
            .select("id")
            .eq("opportunity_id", opportunityId)
            .eq("user_id", userId)
            .maybeSingle();

          if (racedIdError || !racedIdRow?.id) {
            throw new Error(insertError.message);
          }

          const raced = await loadWorkspaceRow(
            sb,
            String(racedIdRow.id),
            userId,
          );
          if (!raced) throw new Error(insertError.message);
          workspaceRow = raced;
        } else if (!inserted) {
          throw new Error("Failed to create workspace.");
        } else {
          workspaceRow = inserted as WorkspaceRow;
        }
      }
      if (!workspaceRow) throw new Error("Failed to resolve workspace.");
      workspaceRow = await maybeSyncStatus(sb, workspaceRow, desiredStatus);

      await seedTasksFromPrepIfEmpty(sb, workspaceRow.id, workspaceRow.opportunity_id, userId);

      return json(200, {
        ok: true,
        workspace: serializeWorkspace(workspaceRow),
      });
    }

    if (action === "get_my_workspaces") {
      const status = normalizeStatus(body.status);
      let query = sb
        .from("dossiers")
        .select(
          "id, opportunity_id, user_id, status, created_at, updated_at, opportunities!inner(id, title, buyer_name, country_code, deadline_at, published_at, source_url, summary, status)",
        )
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return json(200, {
        ok: true,
        items: ((data as WorkspaceRow[] | null) ?? []).map(serializeWorkspace),
      });
    }

    if (action === "get_workspace") {
      const workspaceId = normalizeString(body.workspace_id);
      if (!workspaceId) return json(400, { ok: false, error: "INVALID_WORKSPACE_ID" });

      const workspace = await loadWorkspaceRow(sb, workspaceId, userId);
      if (!workspace) return json(404, { ok: false, error: "WORKSPACE_NOT_FOUND" });

      const [{ data: tasks, error: tasksError }, { data: decision, error: decisionError }] = await Promise.all([
        sb
          .from("dossier_tasks")
          .select("id, dossier_id, label, is_done, created_at")
          .eq("dossier_id", workspaceId)
          .order("created_at", { ascending: true }),
        sb
          .from("opportunity_decisions")
          .select("decision, decided_at")
          .eq("opportunity_id", workspace.opportunity_id)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (tasksError) throw new Error(tasksError.message);
      if (decisionError) throw new Error(decisionError.message);

      return json(200, {
        ok: true,
        workspace: serializeWorkspace(workspace),
        tasks: (tasks as WorkspaceTaskRow[] | null) ?? [],
        decision: decision?.decision ?? null,
        decided_at: decision?.decided_at ?? null,
      });
    }

    if (action === "update_workspace_status") {
      const workspaceId = normalizeString(body.workspace_id);
      const status = normalizeStatus(body.status);
      if (!workspaceId || !status) return json(400, { ok: false, error: "INVALID_BODY" });

      const { data, error } = await sb
        .from("dossiers")
        .update({ status })
        .eq("id", workspaceId)
        .eq("user_id", userId)
        .select(
          "id, opportunity_id, user_id, status, created_at, updated_at, opportunities!inner(id, title, buyer_name, country_code, deadline_at, published_at, source_url, summary, status)",
        )
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return json(404, { ok: false, error: "WORKSPACE_NOT_FOUND" });

      return json(200, {
        ok: true,
        workspace: serializeWorkspace(data as WorkspaceRow),
      });
    }

    if (action === "add_task") {
      const workspaceId = normalizeString(body.workspace_id);
      const label = normalizeString(body.label);
      if (!workspaceId || !label) return json(400, { ok: false, error: "INVALID_BODY" });

      const workspace = await loadWorkspaceRow(sb, workspaceId, userId);
      if (!workspace) return json(404, { ok: false, error: "WORKSPACE_NOT_FOUND" });

      const { data, error } = await sb
        .from("dossier_tasks")
        .insert({
          dossier_id: workspaceId,
          label,
          is_done: false,
        })
        .select("id, dossier_id, label, is_done, created_at")
        .single();

      if (error) throw new Error(error.message);

      return json(200, {
        ok: true,
        task: data as WorkspaceTaskRow,
      });
    }

    if (action === "toggle_task") {
      const taskId = normalizeString(body.task_id);
      if (!taskId) return json(400, { ok: false, error: "INVALID_TASK_ID" });

      const { data: task, error: taskError } = await sb
        .from("dossier_tasks")
        .select("id, dossier_id, label, is_done, created_at")
        .eq("id", taskId)
        .maybeSingle();

      if (taskError) throw new Error(taskError.message);
      if (!task) return json(404, { ok: false, error: "TASK_NOT_FOUND" });

      const workspace = await loadWorkspaceRow(sb, String(task.dossier_id), userId);
      if (!workspace) return json(404, { ok: false, error: "WORKSPACE_NOT_FOUND" });

      const { data, error } = await sb
        .from("dossier_tasks")
        .update({ is_done: !task.is_done })
        .eq("id", taskId)
        .select("id, dossier_id, label, is_done, created_at")
        .single();

      if (error) throw new Error(error.message);

      return json(200, {
        ok: true,
        task: data as WorkspaceTaskRow,
      });
    }

    return json(400, { ok: false, error: "INVALID_ACTION" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("workspaces_handler_error", {
      user_id: userId,
      action,
      error: message,
    });
    return json(500, { ok: false, error: "INTERNAL_ERROR", details: message });
  }
});
