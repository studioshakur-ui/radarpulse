// verify-magic-link — RadarPulse
// Verifies a magic link token and creates a Supabase auth user.
// Called from frontend with ?token=xxx
// Response: { ok: true, accessToken, email } OR { ok: false, error }

import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

// BUG-08 FIX: use crypto.getRandomValues() instead of Math.random()
function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  let pwd = "";
  for (const byte of buf) {
    pwd += chars.charAt(byte % chars.length);
  }
  return pwd;
}

// BUG-09 FIX: look up user by email via admin API — O(1) instead of listUsers() O(n)
async function findUserByEmail(sbUrl: string, serviceKey: string, email: string): Promise<{ id: string; email: string } | null> {
  const res = await fetch(
    `${sbUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
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
    const token = String(body?.token ?? "").trim();

    if (!token) {
      return json({ ok: false, error: "token is required" }, 400);
    }

    // 1. Verify token in DB
    const sb = sbAdmin();
    const sbAuth = sbAdmin();
    const sbUrl = Deno.env.get("SB_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const { data: tokenData, error: tokenError } = await sb
      .from("magic_link_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (tokenError) throw new Error(tokenError.message);
    if (!tokenData) {
      return json({ ok: false, error: "Invalid or expired token" }, 400);
    }

    const email = tokenData.email;

    // 2. Check if user already exists — BUG-09 FIX: O(1) lookup, not listUsers()
    const existingUser = await findUserByEmail(sbUrl, serviceKey, email);

    let userId: string;
    let accessToken: string;

    let refreshToken = "";

    if (existingUser?.id) {
      // User exists — rotate temp password and sign in (magic-link-only users have no known password)
      userId = existingUser.id;
      const tempPassword = generateRandomPassword(); // BUG-08 FIX: crypto-secure
      await sbAuth.auth.admin.updateUserById(userId, { password: tempPassword });
      const signInRes = await sbAuth.auth.signInWithPassword({ email, password: tempPassword });
      if (signInRes.error) throw new Error(signInRes.error.message);
      accessToken = signInRes.data.session?.access_token ?? "";
      refreshToken = signInRes.data.session?.refresh_token ?? "";
    } else {
      // Create new user
      const tempPassword = generateRandomPassword(); // BUG-08 FIX: crypto-secure
      const createRes = await sbAuth.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

      if (createRes.error) throw new Error(createRes.error.message);
      userId = createRes.data.user.id;

      // Sign in immediately to get access token
      const signInRes = await sbAuth.auth.signInWithPassword({ email, password: tempPassword });
      if (signInRes.error) throw new Error(signInRes.error.message);
      accessToken = signInRes.data.session?.access_token ?? "";
      refreshToken = signInRes.data.session?.refresh_token ?? "";

      // Create subscription record for trial (7 days)
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: subError } = await sb.from("subscriptions").insert({
        user_id: userId,
        status: "trial",
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        stripe_price_id: null,
        cancel_at_period_end: false,
      });

      if (subError) console.error("[verify-magic-link] subscription insert failed:", subError);
    }

    // 3. Mark token as used — BUG-11 FIX: fail hard if this fails (prevents token reuse)
    const { error: updateError } = await sb
      .from("magic_link_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("token", token)
      .eq("used", false);

    if (updateError) {
      console.error("[verify-magic-link] token mark-used failed:", updateError);
      throw new Error("Token invalidation failed — please try again");
    }

    return json({
      ok: true,
      accessToken,
      refreshToken,
      email,
      userId,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
