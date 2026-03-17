// notify-opportunities — opportunity digest mailer.
// Called by GitHub Actions (or Supabase cron) via:
//   POST /functions/v1/notify-opportunities
//   { key: DEV_CALL_KEY, since_hours?: number }
//
// For each user with email_digest_enabled=true + active subscription,
// fetches opportunities published in the last `since_hours` (default 24)
// and sends an HTML digest via Resend.
//
// Required env vars:
//   DEV_CALL_KEY       — internal call secret
//   SB_URL             — Supabase project URL
//   SERVICE_ROLE_KEY   — Supabase service role key
//   RESEND_API_KEY     — Resend API key
//   NOTIFY_FROM        — verified sender (default: noreply@radarpulse.io)
//   FRONTEND_URL       — app URL for links (default: https://app.radarpulse.io)

import { sbAdmin } from "../_shared/db.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("notify-opportunities");
import { corsHeaders } from "../_shared/cors.ts";

const DEFAULT_SINCE_HOURS = 24;
const DEFAULT_FROM = "RadarPulse <noreply@radarpulse.io>";
const DEFAULT_FRONTEND_URL = "https://app.radarpulse.io";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type OpportunityRow = {
  id: string;
  title: string;
  buyer_name: string | null;
  deadline_at: string | null;
  country_code: string | null;
  published_at: string | null;
};

function buildDigestHtml(
  opps: OpportunityRow[],
  frontendUrl: string,
): string {
  const rows = opps
    .map(
      (o) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
        <a href="${frontendUrl}/inbox" style="font-weight:600;color:#5b4fcf;text-decoration:none;">
          ${o.title}
        </a>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">
          ${o.buyer_name ?? ""}${o.country_code ? ` · ${o.country_code}` : ""}
          ${o.deadline_at ? ` · Deadline ${o.deadline_at.slice(0, 10)}` : ""}
        </div>
      </td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#5b4fcf;padding:20px 24px;">
      <div style="color:#ffffff;font-size:16px;font-weight:700;">RadarPulse</div>
      <div style="color:#c4b5fd;font-size:13px;margin-top:4px;">
        ${opps.length} new opportunit${opps.length === 1 ? "y" : "ies"} in your digest
      </div>
    </div>
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <div style="margin-top:20px;text-align:center;">
        <a href="${frontendUrl}/inbox"
           style="display:inline-block;background:#5b4fcf;color:#ffffff;padding:10px 24px;
                  border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
          View all in Inbox →
        </a>
      </div>
    </div>
    <div style="padding:12px 24px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;">
      Manage preferences in <a href="${frontendUrl}/settings" style="color:#5b4fcf;">Settings</a>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  // Auth via internal call key
  const DEV_CALL_KEY = Deno.env.get("DEV_CALL_KEY") ?? "";
  if (!DEV_CALL_KEY) return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, error: "INVALID_BODY" });
  }

  if (String(body?.key ?? "") !== DEV_CALL_KEY) {
    return json(401, { ok: false, error: "UNAUTHORIZED" });
  }

  const sinceHours = typeof body.since_hours === "number" ? body.since_hours : DEFAULT_SINCE_HOURS;
  const sinceDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? DEFAULT_FROM;
  const FRONTEND_URL = (Deno.env.get("FRONTEND_URL") ?? DEFAULT_FRONTEND_URL).replace(/\/$/, "");

  if (!RESEND_API_KEY) return json(500, { ok: false, error: "SERVER_CONFIG_ERROR" });

  const sb = sbAdmin();

  // Get new opportunities published since cutoff
  const { data: opps, error: oppsErr } = await sb
    .from("opportunities")
    .select("id,title,buyer_name,deadline_at,country_code,published_at")
    .gte("published_at", sinceDate)
    .eq("is_deleted", false)
    .order("published_at", { ascending: false })
    .limit(50)
    .returns<OpportunityRow[]>();

  if (oppsErr) {
    log.error("opps_fetch_error", { error: oppsErr.message });
    return json(500, { ok: false, error: "QUERY_FAILED" });
  }

  if (!opps || opps.length === 0) {
    log.info("no_new_opportunities");
    return json(200, { ok: true, sent: 0, reason: "no_new_opportunities" });
  }

  // Get users who want a digest and have an active subscription
  const nowIso = new Date().toISOString();
  const { data: prefs, error: prefsErr } = await sb
    .from("notification_preferences")
    .select("user_id, email_digest_frequency, last_digest_at")
    .eq("email_digest_enabled", true)
    .neq("email_digest_frequency", "off");

  if (prefsErr) {
    log.error("prefs_fetch_error", { error: prefsErr.message });
    return json(500, { ok: false, error: "QUERY_FAILED" });
  }

  if (!prefs || prefs.length === 0) {
    return json(200, { ok: true, sent: 0, reason: "no_subscribers" });
  }

  // Filter by frequency (skip users whose digest isn't due yet)
  function isDue(pref: { email_digest_frequency: string; last_digest_at: string | null }): boolean {
    if (!pref.last_digest_at) return true;
    const lastMs = new Date(pref.last_digest_at).getTime();
    const nowMs = Date.now();
    if (pref.email_digest_frequency === "immediate") return true;
    if (pref.email_digest_frequency === "daily") return nowMs - lastMs >= 22 * 60 * 60 * 1000;
    if (pref.email_digest_frequency === "weekly") return nowMs - lastMs >= 6.5 * 24 * 60 * 60 * 1000;
    return false;
  }

  const duePrefs = prefs.filter(isDue);
  if (duePrefs.length === 0) {
    return json(200, { ok: true, sent: 0, reason: "no_due_digests" });
  }

  // Get emails for due users
  const userIds = duePrefs.map((p) => p.user_id as string);
  let sent = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    try {
      const { data: userData } = await sb.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;

      const html = buildDigestHtml(opps, FRONTEND_URL);

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: NOTIFY_FROM,
          to: [email],
          subject: `RadarPulse — ${opps.length} new opportunit${opps.length === 1 ? "y" : "ies"}`,
          html,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text().catch(() => "");
        errors.push(`${userId}: ${resendRes.status} ${errText}`);
        continue;
      }

      // Update last_digest_at
      await sb
        .from("notification_preferences")
        .update({ last_digest_at: nowIso, updated_at: nowIso })
        .eq("user_id", userId);

      sent++;
    } catch (e) {
      errors.push(`${userId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  log.info("digest_sent", { sent, errors: errors.length, total_opps: opps.length });

  return json(200, { ok: true, sent, errors: errors.length > 0 ? errors : undefined });
});
