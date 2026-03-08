// create-magic-link — RadarPulse
// Generates a magic link token for trial access (7 days).
// Called from RequestAccessPage after form submission.
//
// POST body: { name, email, organization?, use_case? }
// Response: { ok: true, message: "Check your email..." }

import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function generateToken(): Promise<string> {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    // 1. Generate magic link token (24h validity)
    const token = await generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 2. Create server-side admin client (bypasses RLS by design for trusted Edge logic)
    const sb = sbAdmin();
    const url = Deno.env.get("SB_URL") ?? Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // 3. Insert token into DB
    const { error: tokenError } = await sb.from("magic_link_tokens").insert({
      email,
      token,
      expires_at: expiresAt,
    });

    if (tokenError) throw new Error(tokenError.message);

    // 4. Insert into access_requests (for audit trail)
    const { error: accessError } = await sb.from("access_requests").insert({
      name,
      email,
      organization,
      use_case: useCase,
    });

    if (accessError) console.error("[create-magic-link] access_requests insert failed:", accessError);

    // 5. BUG-12 FIX: await email send and return error if it fails
    const magicLink = `${Deno.env.get("FRONTEND_URL") ?? "https://radarpulse.io"}/?token=${token}`;
    if (url && serviceKey) {
      const emailRes = await fetch(`${url}/functions/v1/notify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          event: "magic_link",
          payload: {
            email,
            name,
            magic_link: magicLink,
          },
        }),
      }).catch((err) => {
        console.error("[create-magic-link] notify-email network error:", err);
        return null;
      });

      if (!emailRes || !emailRes.ok) {
        const errText = emailRes ? await emailRes.text().catch(() => "") : "network error";
        console.error("[create-magic-link] notify-email failed:", errText);
        throw new Error("Email service unavailable — please try again");
      }
    } else {
      console.warn("[create-magic-link] Missing SB_URL or SERVICE_ROLE_KEY — email not sent");
    }

    return json({ ok: true, message: "Check your email for access link" });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
