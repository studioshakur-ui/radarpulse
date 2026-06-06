// verify-magic-link — RadarPulse
// Verifies a magic link token and creates/signs in a Supabase auth user.
// Called from frontend with POST { token }
// Response: { ok: true, accessToken, refreshToken, email, userId }
//           { ok: false, error: "..." }

import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("verify-magic-link");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

// BUG-08 FIX: use crypto.getRandomValues() — Math.random() is not CSPRNG.
// Only used for new users (temp bootstrap password, immediately discarded).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "").trim();

    if (!token) {
      return json({ ok: false, error: "token is required" }, 400);
    }

    const sb = sbAdmin();
    const sbAuth = sbAdmin();
    const sbUrl = Deno.env.get("SB_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // 1. Verify our custom token in DB
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

    const email = tokenData.email as string;

    // 2. BUG-09 FIX: use admin SDK getUserByEmail — O(1), no listUsers() enumeration.
    const { data: existingData } = await sbAuth.auth.admin.getUserByEmail(email);
    const existingUser = existingData?.user ?? null;

    let userId: string;
    let accessToken: string;
    let refreshToken = "";

    if (existingUser?.id) {
      // User exists — BUG-10 FIX: never overwrite the user's password.
      // Instead, generate a one-time Supabase magic-link OTP and immediately
      // exchange the hashed_token for a real session. The user's password
      // (if any) is untouched.
      userId = existingUser.id;

      const { data: linkData, error: linkErr } = await sbAuth.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (linkErr || !linkData?.properties?.hashed_token) {
        throw new Error("Failed to generate auth session for existing user");
      }

      // Exchange the hashed OTP token for an actual session.
      const { data: sessionData, error: sessionErr } = await sbAuth.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "email",
      });

      if (sessionErr || !sessionData?.session) {
        throw new Error(sessionErr?.message ?? "Failed to create session");
      }

      accessToken = sessionData.session.access_token;
      refreshToken = sessionData.session.refresh_token ?? "";
    } else {
      // New user — create with a random temp password, sign in once, then discard.
      const tempPassword = generateRandomPassword();
      const createRes = await sbAuth.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

      if (createRes.error) throw new Error(createRes.error.message);
      userId = createRes.data.user.id;

      const signInRes = await sbAuth.auth.signInWithPassword({ email, password: tempPassword });
      if (signInRes.error) throw new Error(signInRes.error.message);
      accessToken = signInRes.data.session?.access_token ?? "";
      refreshToken = signInRes.data.session?.refresh_token ?? "";

      // Provision trial subscription (7 days)
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

      if (subError) log.error("subscription_insert_failed", { error: subError.message });
    }

    // 3. Mark token as used — BUG-11 FIX: fail hard to prevent token reuse on error.
    const { error: updateError } = await sb
      .from("magic_link_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("token", token)
      .eq("used", false);

    if (updateError) {
      log.error("token_mark_used_failed", { error: updateError.message });
      throw new Error("Token invalidation failed — please try again");
    }

    return json({ ok: true, accessToken, refreshToken, email, userId });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
