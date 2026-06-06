import React, { useMemo, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ENV } from "@/lib/env";
import { AuthTokenError, getValidAccessToken } from "@/lib/authToken";

const PLAN_PRICE = (import.meta.env.VITE_STRIPE_PLAN_PRICE as string) || "49 EUR / month";
const PLAN_NAME = (import.meta.env.VITE_STRIPE_PLAN_NAME as string) || "Plan Italia";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutPayload = useMemo(
    () => ({
      success_url: `${window.location.origin}/workspaces`,
      cancel_url: `${window.location.origin}/abbonamento`,
    }),
    []
  );

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidAccessToken();

      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/stripe-create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ENV.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(String(data?.error ?? "Checkout initialization failed"));
      }

      window.location.href = String(data.url);
    } catch (e) {
      if (e instanceof AuthTokenError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10 text-text">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-border/35 bg-surface/70 p-8 shadow-soft">
          <div className="inline-flex items-center gap-2 rounded-xl border border-good/30 bg-good/10 px-3 py-1 text-xs font-semibold text-text">
            <ShieldCheck className="h-4 w-4" />
            Access control enabled
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Unlock tracked work access</h1>
          <p className="mt-2 text-sm text-muted">Monthly subscription required to open tracked public opportunities and dossiers.</p>

          <div className="mt-6 rounded-2xl border border-border/35 bg-bg/45 p-5">
            <div className="text-sm font-semibold">{PLAN_NAME}</div>
            <div className="mt-1 text-2xl font-semibold">{PLAN_PRICE}</div>
            <div className="mt-1 text-xs text-muted">Includes ingestion, triage view, and continuous updates.</div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-veil shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Redirecting…" : "Subscribe with Stripe"} <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl border border-border/35 bg-surface/70 px-5 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
            >
              Back to landing
            </Link>
          </div>

          {error ? <div className="mt-4 text-sm text-bad">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}
