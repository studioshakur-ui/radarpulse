// supabase/functions/ai-extract-light/index.ts
// POST { raw_id: string }
// Backend-only. Requires SUPABASE_SERVICE_ROLE_KEY for DB writes.
// Requires OPENAI_API_KEY.
//
// Deploy: supabase functions deploy ai-extract-light
// Secrets:
// - SUPABASE_URL (auto)
// - SUPABASE_SERVICE_ROLE_KEY (set manually)
// - OPENAI_API_KEY
// - OPENAI_MODEL (optional, default gpt-4o-mini)
// - OPENAI_STORE (optional, "true"/"false", default false)
//
// OpenAI notes:
// - Structured Outputs with strict JSON schema is supported via Responses API text.format :contentReference[oaicite:3]{index=3}
// - Responses are stored by default unless store:false :contentReference[oaicite:4]{index=4}

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { extractLightForRawId } from "../_shared/rp_ai_extract_light.ts";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getBoolEnv(name: string, defaultValue: boolean): boolean {
  const v = Deno.env.get(name);
  if (!v) return defaultValue;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

    if (!SUPABASE_URL) return json(500, { error: "Missing SUPABASE_URL" });
    if (!SUPABASE_SERVICE_ROLE_KEY) return json(500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    if (!OPENAI_API_KEY) return json(500, { error: "Missing OPENAI_API_KEY" });

    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const OPENAI_STORE = getBoolEnv("OPENAI_STORE", false);

    const body = await req.json().catch(() => null);
    const raw_id = body?.raw_id ? String(body.raw_id) : "";

    if (!raw_id) return json(400, { error: "Missing raw_id" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const res = await extractLightForRawId(supabase, raw_id, {
      openaiApiKey: OPENAI_API_KEY,
      openaiModel: OPENAI_MODEL,
      openaiStore: OPENAI_STORE,
      extractVersion: "v1.light",
      minContentChars: 280,
      maxContentChars: 24_000,
    });

    return json(200, { ok: true, ...res });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { ok: false, error: msg });
  }
});
