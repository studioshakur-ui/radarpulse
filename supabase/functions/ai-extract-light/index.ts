// supabase/functions/ai-extract-light/index.ts
// DEV ONLY: avoids JWT/gateway pain on local by using a simple shared secret.
// POST { raw_id: string, key: string }
// Requires secrets in env-file:
// - SB_URL (Supabase project URL)
// - SERVICE_ROLE_KEY
// - OPENAI_API_KEY
// - DEV_CALL_KEY (choose any string)
// Optional:
// - OPENAI_MODEL, OPENAI_STORE

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

    // Supabase Edge runtime ignores env vars prefixed with SUPABASE_.
    // Use SB_URL + SERVICE_ROLE_KEY for Edge Functions.
    const SB_URL = Deno.env.get("SB_URL") || Deno.env.get("SUPABASE_URL") || "";
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
    const DEV_CALL_KEY = Deno.env.get("DEV_CALL_KEY") || "";

    if (!SB_URL) return json(500, { error: "Missing SB_URL" });
    if (!SERVICE_ROLE_KEY) return json(500, { error: "Missing SERVICE_ROLE_KEY" });
    if (!OPENAI_API_KEY) return json(500, { error: "Missing OPENAI_API_KEY" });
    if (!DEV_CALL_KEY) return json(500, { error: "Missing DEV_CALL_KEY" });

    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const OPENAI_STORE = getBoolEnv("OPENAI_STORE", false);

    const body = await req.json().catch(() => null);
    const raw_id = body?.raw_id ? String(body.raw_id) : "";
    const key = body?.key ? String(body.key) : "";

    if (!raw_id) return json(400, { error: "Missing raw_id" });
    if (key !== DEV_CALL_KEY) return json(401, { error: "Bad dev key" });

    const supabase = createClient(SB_URL, SERVICE_ROLE_KEY);

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
