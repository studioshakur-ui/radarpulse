import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
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
    sb = sbAdmin();
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
      return json(500, { ok: false, error: "INTERNAL_ERROR" });
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

    const { data: upsertedRow, error: upsertError } = await sb
      .from("opportunity_workflows")
      .upsert(payload, { onConflict: "opportunity_id,user_id" })
      .select("id, workflow_status, updated_at")
      .single();

    if (upsertError || !upsertedRow?.id) {
      log.error("upsert_workflow_failed", { error: upsertError?.message });
      return json(500, { ok: false, error: "INTERNAL_ERROR" });
    }

    return json(200, {
      ok: true,
      changed: true,
      workflow_status: String(upsertedRow.workflow_status),
      updated_at: upsertedRow.updated_at,
    });
  } catch (error) {
    log.error("handler_error", { error: error instanceof Error ? error.message : String(error) });
    return json(500, { ok: false, error: "INTERNAL_ERROR" });
  }
});
