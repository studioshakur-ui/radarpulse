import Stripe from "npm:stripe@16.12.0";
import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ ok: false, error: "Missing bearer token" }, 401);

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const stripePriceId = Deno.env.get("STRIPE_PRICE_ID");
    if (!stripeSecret || !stripePriceId) {
      return json({ ok: false, error: "Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID" }, 500);
    }

    const sb = sbAdmin();
    const { data: authData, error: authError } = await sb.auth.getUser(token);
    if (authError || !authData?.user?.id) return json({ ok: false, error: "Invalid auth token" }, 401);

    const body = await req.json().catch(() => ({}));
    const successUrl = String(body?.success_url ?? "").trim();
    const cancelUrl = String(body?.cancel_url ?? "").trim();
    if (!successUrl || !cancelUrl) {
      return json({ ok: false, error: "Missing success_url or cancel_url" }, 400);
    }

    const user = authData.user;
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    });

    return json({ ok: true, url: session.url });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
