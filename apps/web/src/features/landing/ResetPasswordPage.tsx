// ResetPasswordPage — handles the password-reset link sent by Supabase.
// Flow: user clicks email link → lands here with #access_token (recovery type)
// detectSessionInUrl: true processes the hash → onAuthStateChange fires PASSWORD_RECOVERY
// → show new-password form → supabase.auth.updateUser({ password }) → redirect to /dossiers.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

type Stage = "waiting" | "form" | "done" | "expired";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("waiting");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // onAuthStateChange fires PASSWORD_RECOVERY when Supabase detects
    // the recovery token in the URL hash (requires detectSessionInUrl: true).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStage("form");
      }
    });

    // If no event after 15 s, the link is likely expired or invalid.
    const timer = setTimeout(() => {
      setStage((s) => (s === "waiting" ? "expired" : s));
    }, 15_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setStage("done");
      // Redirect after short delay so the user sees the success message
      setTimeout(() => {
        window.location.href = "/dossiers";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
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
              <div className="text-[11px] text-subtext/80">Reset password</div>
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

          {/* Waiting for recovery token */}
          {stage === "waiting" && (
            <div className="flex items-center gap-3 text-sm text-subtext">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying reset link…
            </div>
          )}

          {/* Link expired */}
          {stage === "expired" && (
            <>
              <div className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
                This reset link has expired or is invalid.
              </div>
              <div className="mt-4 text-sm">
                <Link to="/login" className="text-brand hover:underline">
                  ← Request a new link
                </Link>
              </div>
            </>
          )}

          {/* New password form */}
          {stage === "form" && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
              <p className="mt-2 text-sm text-subtext">Choose a strong password (min. 8 characters).</p>

              <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
                <div>
                  <label htmlFor="rp-new" className="text-xs font-medium text-subtext">
                    New password
                  </label>
                  <input
                    id="rp-new"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
                  />
                </div>

                <div>
                  <label htmlFor="rp-confirm" className="text-xs font-medium text-subtext">
                    Confirm new password
                  </label>
                  <input
                    id="rp-confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
                  ) : (
                    <>Save new password <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Success */}
          {stage === "done" && (
            <div className="rounded-2xl border border-good/20 bg-good/10 p-4">
              <div className="text-sm font-semibold text-good">Password updated ✓</div>
              <div className="mt-1 text-sm text-subtext">Redirecting to your dossiers…</div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
