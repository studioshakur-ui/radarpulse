import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin, sbAdminForRequest } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("opportunity-workflow");

type WorkflowStatus =
  | "NEW"
  | "REVIEWED"
  | "GO"
  | "PREPARATION"
  | "READY"
  | "SUBMITTED"
  | "EXPIRED";

type WorkflowRequest = {
  opportunity_id?: string;
  workflow_status?: WorkflowStatus;
};

type WorkflowRow = {
  id: string;
  workflow_status: WorkflowStatus;
  updated_at: string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeString(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s : null;
}

function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return value === "NEW" ||
    value === "REVIEWED" ||
    value === "GO" ||
    value === "PREPARATION" ||
    value === "READY" ||
    value === "SUBMITTED" ||
    value === "EXPIRED";
}

function firstWorkflowRow(value: unknown): WorkflowRow | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const row = value[0];
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    !isWorkflowStatus(record.workflow_status) ||
    typeof record.updated_at !== "string"
  ) {
    return null;
  }
  return {
    id: record.id,
    workflow_status: record.workflow_status,
    updated_at: record.updated_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "UNAUTHORIZED" });
  }
  const token = authHeader.slice(7).trim();

  let sb: ReturnType<typeof sbAdmin>;
  let userId = "";
  try {
    sb = sbAdminForRequest(req);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user?.id) return json(401, { ok: false, error: "UNAUTHORIZED" });
    userId = data.user.id;
  } catch {
    return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });
  }

  let body: WorkflowRequest;
  try {
    body = (await req.json()) as WorkflowRequest;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }

  const opportunityId = normalizeString(body?.opportunity_id);
  const workflowStatus = body?.workflow_status;

  if (!opportunityId || !isWorkflowStatus(workflowStatus)) {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }

  try {
    const { data: existingRow, error: existingError } = await sb
      .from("opportunity_workflows")
      .select("id, workflow_status")
      .eq("opportunity_id", opportunityId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      log.error("load_workflow_failed", { error: existingError.message });
      return json(500, { ok: false, error: "WORKFLOW_LOAD_FAILED", detail: existingError.message });
    }

    if (existingRow?.workflow_status === workflowStatus) {
      return json(200, {
        ok: true,
        changed: false,
        workflow_status: workflowStatus,
      });
    }

    const payload = {
      opportunity_id: opportunityId,
      user_id: userId,
      workflow_status: workflowStatus,
    };

    const { data: upsertedRows, error: upsertError } = await sb
      .from("opportunity_workflows")
      .upsert(payload, { onConflict: "opportunity_id,user_id" })
      .select("id, workflow_status, updated_at")
      ;

    let upsertedRow = firstWorkflowRow(upsertedRows);
    if (!upsertedRow && !upsertError) {
      const { data: fetchedRow, error: fetchError } = await sb
        .from("opportunity_workflows")
        .select("id, workflow_status, updated_at")
        .eq("opportunity_id", opportunityId)
        .eq("user_id", userId)
        .maybeSingle();
      if (fetchError) {
        log.error("fetch_workflow_after_upsert_failed", { error: fetchError.message });
      } else if (
        fetchedRow?.id &&
        isWorkflowStatus(fetchedRow.workflow_status) &&
        typeof fetchedRow.updated_at === "string"
      ) {
        upsertedRow = {
          id: String(fetchedRow.id),
          workflow_status: fetchedRow.workflow_status,
          updated_at: fetchedRow.updated_at,
        };
      }
    }

    if (upsertError || !upsertedRow?.id) {
      log.error("upsert_workflow_failed", { error: upsertError?.message });
      return json(500, {
        ok: false,
        error: "WORKFLOW_UPSERT_FAILED",
        detail: upsertError?.message ?? "Workflow upsert returned no row",
      });
    }

    return json(200, {
      ok: true,
      changed: true,
      workflow_status: String(upsertedRow.workflow_status),
      updated_at: upsertedRow.updated_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("handler_error", { error: message });
    return json(500, { ok: false, error: "WORKFLOW_INTERNAL_ERROR", detail: message });
  }
});
