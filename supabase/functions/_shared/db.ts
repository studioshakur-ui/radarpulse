import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function resolveServiceRoleKey() {
  return Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function createAdminClient(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "radarpulse-edge" } },
  });
}

export function sbAdmin() {
  // NOTE: Supabase Edge runtime ignores env vars prefixed with SUPABASE_.
  // Use SB_URL + SERVICE_ROLE_KEY for Edge Functions. We keep a fallback
  // to SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for non-edge runtimes.
  const url = Deno.env.get("SB_URL") ?? Deno.env.get("SUPABASE_URL");
  const serviceKey = resolveServiceRoleKey();
  if (!url || !serviceKey) {
    throw new Error("Missing SB_URL/SUPABASE_URL or SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY");
  }

  return createAdminClient(url, serviceKey);
}

export function sbAdminForRequest(req: Request) {
  const requestUrl = new URL(req.url);
  const url = requestUrl.origin || Deno.env.get("SB_URL") || Deno.env.get("SUPABASE_URL");
  const serviceKey = resolveServiceRoleKey();
  if (!url || !serviceKey) {
    throw new Error("Missing request origin/SB_URL/SUPABASE_URL or SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY");
  }

  return createAdminClient(url, serviceKey);
}
