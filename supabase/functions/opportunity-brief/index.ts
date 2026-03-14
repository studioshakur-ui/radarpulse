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

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "UNAUTHORIZED" });
  }
  const token = authHeader.slice(7).trim();

  try {
    const sb = sbAdmin();
    const { data, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !data?.user?.id) return json(401, { ok: false, error: "UNAUTHORIZED" });
  } catch {
    return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });
  }

  // Parse body
  let body: BriefInput;
  try {
    body = (await req.json()) as BriefInput;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }
  if (!body?.id || !body?.title) {
    return json(400, { ok: false, error: "MISSING_FIELDS" });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });

  // Build prompt context from available fields
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

  const opportunityText = lines.join("\n");

  const systemPrompt = [
    "You are an expert public procurement analyst. Analyze the opportunity and respond with a JSON object with exactly these fields:",
    "- executive_summary: string (2-3 sentences, plain language overview)",
    "- fit_assessment: string (who should apply, typical company profile, size/experience requirements)",
    "- risk_flags: string[] (up to 5 red flags or complexity factors, each max 15 words)",
    "- required_documents: string[] (up to 7 typical documents or certifications required)",
    "- next_action: string (one concrete immediate next step, max 20 words)",
    "Be concise and actionable. Respond in the same language as the opportunity title.",
  ].join("\n");

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this public procurement opportunity:\n\n${opportunityText}` },
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

    console.info(
      JSON.stringify({
        event: "opportunity_brief_generated",
        opportunity_id: body.id,
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
      }),
    );

    return json(200, { ok: true, brief });
  } catch (e) {
    console.error("[opportunity-brief] error:", serializeError(e));
    return json(500, { ok: false, error: "INTERNAL_ERROR" });
  }
});
