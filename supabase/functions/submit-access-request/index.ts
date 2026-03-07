// submit-access-request — RadarPulse
// Inserts a lead into access_requests and triggers notify-email.
// Called by the frontend RequestAccessPage (no auth required).
//
// POST body: { name, email, organization?, use_case? }

import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const organization = String(body?.organization ?? "").trim() || null;
    const useCase = String(body?.use_case ?? "").trim() || null;

    if (!name || !email) {
      return json({ ok: false, error: "name and email are required" }, 400);
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: "Invalid email format" }, 400);
    }

    // Insert into access_requests
    const sb = sbAdmin();
    const { error: dbError } = await sb.from("access_requests").insert({
      name,
      email,
      organization,
      use_case: useCase,
    });

    if (dbError) throw new Error(dbError.message);

    // TODO: notify-email via Resend — activer une fois RESEND_API_KEY configuré
    // (Supabase Dashboard > Project Settings > Edge Functions > Secrets)

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
