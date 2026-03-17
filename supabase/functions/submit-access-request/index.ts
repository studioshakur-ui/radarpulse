// submit-access-request — RadarPulse
// Inserts a lead into access_requests and triggers notify-email.
// Called by the frontend RequestAccessPage (no auth required).
//
// POST body: { name, email, organization?, use_case? }

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("submit-access-request");

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

    // BUG-13 FIX: stricter email regex
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return json({ ok: false, error: "Invalid email format" }, 400);
    }

    // Insert into access_requests (using anon key — RLS allows anon inserts)
    const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!sbUrl || !anonKey) {
      return json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);
    }

    const sb = createClient(sbUrl, anonKey, { auth: { persistSession: false } });
    const { error: dbError } = await sb.from("access_requests").insert({
      name,
      email,
      organization,
      use_case: useCase,
    });

    if (dbError) throw new Error(dbError.message);

    // BUG-14 FIX: notify admin via notify-email (graceful degradation if not configured)
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (serviceKey) {
      const emailRes = await fetch(`${sbUrl}/functions/v1/notify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          event: "access_request",
          payload: { name, email, organization: organization ?? "", use_case: useCase ?? "" },
        }),
      }).catch((err) => {
        log.error(" notify-email network error:", err);
        return null;
      });

      if (!emailRes?.ok) {
        // Non-fatal: lead is already saved in DB, log but don't fail the request
        const errText = emailRes ? await emailRes.text().catch(() => "") : "network error";
        log.error(" notify-email failed (non-fatal):", errText);
      }
    } else {
      log.warn(" SERVICE_ROLE_KEY not set — admin notification skipped");
    }

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
