import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

function friendlyAuthError(error: unknown): string {
  if (error instanceof Error && /Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED/i.test(error.message)) {
    return "RadarPulse cannot reach the authentication service right now. Check your connection or Supabase configuration.";
  }
  return error instanceof Error ? error.message : "An error occurred. Please try again.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "forgot password" mode
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // If already logged in, go straight to inbox
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/inbox", { replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      navigate("/inbox", { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/20 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo size={24} showWordmark={false} />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-text">RadarPulse</div>
              <div className="text-[11px] text-subtext/80">Sign in</div>
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {forgotMode ? "Reset password" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-subtext">
            {forgotMode
              ? "Enter your email to receive a reset link."
              : "Enter your email and password."}
          </p>

          {/* ── Forgot password mode ── */}
          {forgotMode ? (
            resetSent ? (
              <div className="mt-6 rounded-2xl border border-good/20 bg-good/10 p-4">
                <div className="text-sm font-semibold text-good">Reset link sent ✓</div>
                <div className="mt-1 text-sm text-muted">
                  Check <strong>{email}</strong> — click the link to set a new password.
                </div>
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setResetSent(false); setError(null); }}
                  className="mt-3 text-xs text-brand hover:underline"
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={(e) => void handleForgot(e)}>
                <div>
                  <label htmlFor="reset-email" className="text-xs font-medium text-subtext">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  ) : (
                    <>Send reset link <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>

              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(null); }}
                className="w-full text-center text-xs text-subtext hover:text-text"
              >
                ← Back to sign in
              </button>
              </form>
            )
          ) : (
            /* ── Sign in mode ── */
            <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <div>
                <label htmlFor="login-email" className="text-xs font-medium text-subtext">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-medium text-subtext">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(null); }}
                    className="text-xs text-brand hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign in <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 text-xs text-subtext">
            No account yet?{" "}
            <Link className="text-brand hover:underline" to="/request-access">
              Request access
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
