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

function toIso(ts?: number | null): string | null {
  if (!ts || !Number.isFinite(ts)) return null;
  return new Date(ts * 1000).toISOString();
}

async function upsertSubscriptionFromStripeData(input: {
  userId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  priceId?: string | null;
  status: string;
  currentPeriodStart?: number | null;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean | null;
}) {
  const sb = sbAdmin();
  const row = {
    user_id: input.userId,
    stripe_customer_id: input.customerId ?? null,
    stripe_subscription_id: input.subscriptionId ?? null,
    stripe_price_id: input.priceId ?? null,
    status: input.status || "inactive",
    current_period_start: toIso(input.currentPeriodStart),
    current_period_end: toIso(input.currentPeriodEnd),
    cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
  };

  const subscriptionId = row.stripe_subscription_id;
  if (subscriptionId) {
    const { error } = await sb.from("subscriptions").upsert(row, { onConflict: "stripe_subscription_id" });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await sb.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeSecret || !webhookSecret) {
      return json({ ok: false, error: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" }, 500);
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) return json({ ok: false, error: "Missing stripe-signature header" }, 400);

    const rawBody = await req.text();
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
    const event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        String(session.metadata?.user_id ?? "").trim() ||
        String(session.client_reference_id ?? "").trim();

      if (userId) {
        await upsertSubscriptionFromStripeData({
          userId,
          customerId: typeof session.customer === "string" ? session.customer : null,
          subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
          status: "active",
        });
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = String(sub.metadata?.user_id ?? "").trim();
      if (userId) {
        const priceId = sub.items.data[0]?.price?.id ?? null;
        await upsertSubscriptionFromStripeData({
          userId,
          customerId: typeof sub.customer === "string" ? sub.customer : null,
          subscriptionId: sub.id,
          priceId,
          status: sub.status ?? "inactive",
          currentPeriodStart: sub.current_period_start ?? null,
          currentPeriodEnd: sub.current_period_end ?? null,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        });
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = String(sub.metadata?.user_id ?? "").trim();
        if (userId) {
          const priceId = sub.items.data[0]?.price?.id ?? null;
          await upsertSubscriptionFromStripeData({
            userId,
            customerId: typeof sub.customer === "string" ? sub.customer : null,
            subscriptionId: sub.id,
            priceId,
            status: sub.status ?? "active",
            currentPeriodStart: sub.current_period_start ?? null,
            currentPeriodEnd: sub.current_period_end ?? null,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          });
        }
      }
    }

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
