import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";

type BriefInput = {
  id: string;
  title: string;
  buyer_name?: string | null;
  status?: string | null;
  deadline_at?: string | null;
  budget_amount?: number | null;
  budget_currency?: string | null;
  country_code?: string | null;
  origin_type?: string | null;
  region?: string | null;
};

export type Brief = {
  executive_summary: string;
  fit_assessment: string;
  risk_flags: string[];
  required_documents: string[];
  next_action: string;
};

const BRIEF_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — regenerate after
const PROMPT_VERSION = "v1";

function serializeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
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

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "UNAUTHORIZED" });
  }
  const token = authHeader.slice(7).trim();

  let sb: ReturnType<typeof sbAdmin>;
  try {
    sb = sbAdmin();
    const { data, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !data?.user?.id) return json(401, { ok: false, error: "UNAUTHORIZED" });
  } catch {
    return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });
  }

  // ─── Parse body ────────────────────────────────────────────────────────────
  let body: BriefInput;
  try {
    body = (await req.json()) as BriefInput;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }
  if (!body?.id || !body?.title) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  // ─── 1. Read from DB cache (TTL = 7 days) ─────────────────────────────────
  const staleThreshold = new Date(Date.now() - BRIEF_TTL_MS).toISOString();
  const { data: cached } = await sb
    .from("opportunity_briefs")
    .select("executive_summary, fit_assessment, risk_flags, required_documents, next_action")
    .eq("opportunity_id", body.id)
    .gt("created_at", staleThreshold)
    .maybeSingle();

  if (cached) {
    const brief: Brief = {
      executive_summary: cached.executive_summary ?? "",
      fit_assessment: cached.fit_assessment ?? "",
      risk_flags: Array.isArray(cached.risk_flags) ? cached.risk_flags : [],
      required_documents: Array.isArray(cached.required_documents) ? cached.required_documents : [],
      next_action: cached.next_action ?? "",
    };
    return json(200, { ok: true, brief, cached: true });
  }

  // ─── 2. Generate via OpenAI ────────────────────────────────────────────────
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });

  const lines: string[] = [`Title: ${body.title}`];
  if (body.buyer_name) lines.push(`Buyer: ${body.buyer_name}`);
  if (body.country_code) lines.push(`Country: ${body.country_code}`);
  if (body.region) lines.push(`Region: ${body.region}`);
  if (body.origin_type) lines.push(`Origin type: ${body.origin_type}`);
  if (body.status) lines.push(`Status: ${body.status}`);
  if (body.deadline_at) lines.push(`Deadline: ${body.deadline_at}`);
  if (body.budget_amount != null) {
    lines.push(`Budget: ${body.budget_amount} ${body.budget_currency ?? "EUR"}`);
  }

  const systemPrompt = [
    "You are an expert public procurement analyst. Analyze the opportunity and respond with a JSON object with exactly these fields:",
    "- executive_summary: string (2-3 sentences, plain language overview)",
    "- fit_assessment: string (who should apply, typical company profile, size/experience requirements)",
    "- risk_flags: string[] (up to 5 red flags or complexity factors, each max 15 words)",
    "- required_documents: string[] (up to 7 typical documents or certifications required)",
    "- next_action: string (one concrete immediate next step, max 20 words)",
    "Be concise and actionable. Respond in the same language as the opportunity title.",
  ].join("\n");

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
  const t0 = Date.now();

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this public procurement opportunity:\n\n${lines.join("\n")}` },
        ],
        max_tokens: 700,
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      console.error("[opportunity-brief] OpenAI error:", openaiRes.status, errText);
      return json(502, { ok: false, error: "AI_ERROR" });
    }

    const generation_ms = Date.now() - t0;
    const openaiData = (await openaiRes.json()) as { choices?: { message?: { content?: string } }[] };
    const content = openaiData.choices?.[0]?.message?.content ?? "{}";
    const raw = JSON.parse(content) as Record<string, unknown>;

    const brief: Brief = {
      executive_summary: String(raw.executive_summary ?? ""),
      fit_assessment: String(raw.fit_assessment ?? ""),
      risk_flags: Array.isArray(raw.risk_flags) ? raw.risk_flags.map(String).slice(0, 5) : [],
      required_documents: Array.isArray(raw.required_documents)
        ? raw.required_documents.map(String).slice(0, 7)
        : [],
      next_action: String(raw.next_action ?? ""),
    };

    // ─── 3. Persist to DB ───────────────────────────────────────────────────
    const { error: upsertErr } = await sb.from("opportunity_briefs").upsert(
      {
        opportunity_id: body.id,
        executive_summary: brief.executive_summary,
        fit_assessment: brief.fit_assessment,
        risk_flags: brief.risk_flags,
        required_documents: brief.required_documents,
        next_action: brief.next_action,
        model,
        prompt_version: PROMPT_VERSION,
        generation_ms,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "opportunity_id" },
    );

    if (upsertErr) {
      // Log but don't fail — brief is still usable even if persistence fails
      console.error("[opportunity-brief] persist error:", upsertErr.message);
    }

    console.info(
      JSON.stringify({
        event: "opportunity_brief_generated",
        opportunity_id: body.id,
        model,
        generation_ms,
        prompt_version: PROMPT_VERSION,
        cached: false,
      }),
    );

    return json(200, { ok: true, brief, cached: false });
  } catch (e) {
    console.error("[opportunity-brief] error:", serializeError(e));
    return json(500, { ok: false, error: "INTERNAL_ERROR" });
  }
});
