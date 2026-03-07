// notify-email — RadarPulse
// Sends transactional emails via Resend.
//
// Required env vars:
//   RESEND_API_KEY  — Resend secret key (re_...)
//   NOTIFY_TO       — admin email to receive notifications (e.g. hello@radarpulse.io)
//   NOTIFY_FROM     — verified sender domain (e.g. noreply@radarpulse.io)
//
// Supported event types (POST body: { event, payload }):
//   "access_request"  — new lead from the request-access form
//   "subscription_created" — new Stripe subscriber
//   "subscription_updated" — subscription status change

import { corsHeaders } from "../_shared/cors.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

type EmailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(apiKey: string, payload: EmailPayload): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}

function buildAccessRequestEmail(notifyTo: string, notifyFrom: string, p: Record<string, string>): EmailPayload {
  return {
    from: notifyFrom,
    to: notifyTo,
    subject: `[RadarPulse] New access request — ${p.name ?? "unknown"} (${p.email ?? "?"})`,
    html: `
      <h2>New access request</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#888">Name</td><td>${p.name ?? "—"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Email</td><td><a href="mailto:${p.email}">${p.email ?? "—"}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Organization</td><td>${p.organization ?? "—"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Use case</td><td>${p.use_case ?? "—"}</td></tr>
      </table>
    `,
  };
}

function buildSubscriptionEmail(
  notifyTo: string,
  notifyFrom: string,
  p: Record<string, string>,
  eventType: "subscription_created" | "subscription_updated"
): EmailPayload {
  const label = eventType === "subscription_created" ? "New subscriber" : "Subscription updated";
  return {
    from: notifyFrom,
    to: notifyTo,
    subject: `[RadarPulse] ${label} — user ${p.user_id ?? "?"}`,
    html: `
      <h2>${label}</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#888">User ID</td><td>${p.user_id ?? "—"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Status</td><td>${p.status ?? "—"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Stripe sub ID</td><td>${p.stripe_subscription_id ?? "—"}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Period end</td><td>${p.current_period_end ?? "—"}</td></tr>
      </table>
    `,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const notifyTo = Deno.env.get("NOTIFY_TO");
    const notifyFrom = Deno.env.get("NOTIFY_FROM") ?? "noreply@radarpulse.io";

    if (!resendApiKey) return json({ ok: false, error: "Missing RESEND_API_KEY" }, 500);
    if (!notifyTo) return json({ ok: false, error: "Missing NOTIFY_TO" }, 500);

    const body = await req.json().catch(() => ({}));
    const event = String(body?.event ?? "").trim();
    const payload = (body?.payload ?? {}) as Record<string, string>;

    if (!event) return json({ ok: false, error: "Missing event" }, 400);

    let emailPayload: EmailPayload;

    if (event === "access_request") {
      emailPayload = buildAccessRequestEmail(notifyTo, notifyFrom, payload);
    } else if (event === "subscription_created" || event === "subscription_updated") {
      emailPayload = buildSubscriptionEmail(notifyTo, notifyFrom, payload, event);
    } else {
      return json({ ok: false, error: `Unknown event: ${event}` }, 400);
    }

    await sendEmail(resendApiKey, emailPayload);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
