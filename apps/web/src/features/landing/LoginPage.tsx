import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENV } from "@/lib/env";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/login-magic-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ENV.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "An error occurred. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/20 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-elevated shadow-glow" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">RadarPulse</div>
              <div className="text-[11px] text-muted">Sign in</div>
            </div>
          </div>
          <Link
            to="/"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-border/25 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
              "hover:bg-elevated/70",
            )}
          >
            Home
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pt-24">
        <div className="rounded-2xl border border-border/25 bg-surface/70 p-6 shadow-soft">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Enter your email to receive a login link.</p>

          {!done ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="login-email" className="text-xs font-medium text-muted">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    Send login link <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-good/20 bg-good/10 p-4">
              <div className="text-sm font-semibold text-good">Login link sent ✓</div>
              <div className="mt-1 text-sm text-muted">
                Check <strong>{email}</strong> — click the link to sign in.
              </div>
            </div>
          )}

          <div className="mt-5 text-xs text-muted">
            No account yet?{" "}
            <Link className="text-accent hover:underline" to="/request-access">
              Request access
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
