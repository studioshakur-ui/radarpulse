// login-magic-link — RadarPulse
// Generates a magic link token for existing users (login only, no signup).
// Called from LoginPage after email submission.
//
// POST body: { email }
// Response: { ok: true, message: "Check your email..." }
//           { ok: false, error: "..." }  (404 if no account found)

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

async function findUserByEmail(
  sbUrl: string,
  serviceKey: string,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const res = await fetch(
    `${sbUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=1`,
    { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const users = (data?.users ?? []) as Array<{ id: string; email: string }>;
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim();

    if (!email) {
      return json({ ok: false, error: "email is required" }, 400);
    }

    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return json({ ok: false, error: "Invalid email format" }, 400);
    }

    const sbUrl = Deno.env.get("SB_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!sbUrl || !serviceKey) throw new Error("SERVER_CONFIG_ERROR");

    // Only existing users can request a login link
    const existingUser = await findUserByEmail(sbUrl, serviceKey, email);
    if (!existingUser?.id) {
      return json(
        { ok: false, error: "No account found for this email. Please request access." },
        404,
      );
    }

    // Generate token (24 h)
    const token = await generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const sb = sbAdmin();
    const { error: tokenError } = await sb.from("magic_link_tokens").insert({
      email,
      token,
      expires_at: expiresAt,
    });
    if (tokenError) throw new Error(tokenError.message);

    // Send email via notify-email (same magic_link template as create-magic-link)
    const magicLink = `${Deno.env.get("FRONTEND_URL") ?? "https://radarpulse.io"}/?token=${token}`;
    const emailRes = await fetch(`${sbUrl}/functions/v1/notify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        event: "magic_link",
        payload: { email, name: email.split("@")[0], magic_link: magicLink },
      }),
    }).catch((err) => {
      console.error("[login-magic-link] notify-email network error:", err);
      return null;
    });

    if (!emailRes || !emailRes.ok) {
      const errText = emailRes ? await emailRes.text().catch(() => "") : "network error";
      console.error("[login-magic-link] notify-email failed:", errText);
      throw new Error("Email service unavailable — please try again");
    }

    return json({ ok: true, message: "Check your email for a login link" });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
