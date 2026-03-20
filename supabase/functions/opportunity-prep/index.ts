import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin, sbAdminForRequest } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";
import { PrepRunnerError, generateOpportunityPrep } from "../_shared/opportunity_prep_runner.ts";

const log = createLogger("opportunity-prep");

type PrepInput = {
  id: string;
  locale?: "en" | "fr" | "it";
};

function normalizeLocale(value: unknown): "en" | "fr" | "it" {
  return value === "fr" || value === "it" ? value : "en";
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  let userId: string;
  try {
    sb = sbAdminForRequest(req);
    const { data, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !data?.user?.id) return json(401, { ok: false, error: "UNAUTHORIZED" });
    userId = data.user.id;
  } catch {
    return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });
  }

  let body: PrepInput;
  try {
    body = (await req.json()) as PrepInput;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }

  if (!body?.id) return json(400, { ok: false, error: "MISSING_FIELDS" });
  const outputLocale = normalizeLocale(body.locale);

  try {
    const result = await generateOpportunityPrep(sb, {
      opportunityId: body.id,
      userId,
      triggerType: "user",
      outputLocale,
    });
    return json(200, { ok: true, prep: result.prep, cached: result.cached });
  } catch (e) {
    const originalError = e instanceof Error ? e : new Error(String(e));
    log.error("handler_error", { error: originalError.message });
    if (originalError instanceof PrepRunnerError) {
      return json(originalError.status, { ok: false, error: originalError.code });
    }
    return json(500, { ok: false, error: "INTERNAL_ERROR" });
  }
});
