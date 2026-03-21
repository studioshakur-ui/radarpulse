import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { useT } from "@/i18n";

export default function LoginPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const trustPills = [t("login.trust.secure"), t("login.trust.uk"), t("login.trust.dossiers")];

  const friendlyAuthError = (authError: unknown): string => {
    if (
      authError instanceof Error &&
      /Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED/i.test(authError.message)
    ) {
      return t("login.error.network");
    }
    if (authError instanceof Error && /Invalid login credentials/i.test(authError.message)) {
      return t("login.error.invalid");
    }
    return authError instanceof Error ? authError.message : t("login.error.generic");
  };

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(async ({ data, error: authError }) => {
      if (!mounted) return;
      if (authError || !data.user) {
        return;
      }
      navigate("/workspaces", { replace: true });
    });

    return () => {
      mounted = false;
    };
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
      navigate("/workspaces", { replace: true });
    } catch (authError) {
      setError(friendlyAuthError(authError));
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
    } catch (authError) {
      setError(friendlyAuthError(authError));
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
              <div className="text-[11px] text-subtext/80">{t("login.header.eyebrow")}</div>
            </div>
          </div>
          <Link
            to="/"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-border/25 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
              "hover:bg-elevated/70",
            )}
          >
            {t("nav.home")}
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 pb-10 pt-24">
        <div className="rounded-2xl border border-border/25 bg-surface/75 p-6 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand/70">
            {t("login.header.eyebrow")}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {forgotMode ? t("login.mode.reset") : t("login.header.title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-subtext">
            {forgotMode ? t("login.mode.resetSubtitle") : t("login.header.subtitle")}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-subtext/80">
            {trustPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-line/20 bg-bg/60 px-3 py-1.5"
              >
                {pill}
              </span>
            ))}
          </div>

          {forgotMode ? (
            resetSent ? (
              <div className="mt-6 rounded-2xl border border-good/20 bg-good/10 p-4">
                <div className="text-sm font-semibold text-good">{t("login.reset.sentTitle")}</div>
                <div className="mt-1 text-sm text-muted">
                  {t("login.reset.sentLead")} <strong>{email}</strong>{" "}
                  {t("login.reset.sentTrail")}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setResetSent(false);
                    setError(null);
                  }}
                  className="mt-3 text-xs text-brand hover:underline"
                >
                  {t("login.back")}
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={(e) => void handleForgot(e)}>
                <div>
                  <label htmlFor="reset-email" className="text-xs font-medium text-subtext">
                    {t("login.field.email")}
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("login.placeholder.email")}
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
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("login.reset.submitting")}
                    </>
                  ) : (
                    <>
                      {t("login.reset.submit")} <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError(null);
                  }}
                  className="w-full text-center text-xs text-subtext hover:text-text"
                >
                  {t("login.back")}
                </button>
              </form>
            )
          ) : (
            <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <div>
                <label htmlFor="login-email" className="text-xs font-medium text-subtext">
                  {t("login.field.email")}
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.placeholder.email")}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-medium text-subtext">
                    {t("login.field.password")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setError(null);
                    }}
                    className="text-xs text-brand hover:underline"
                  >
                    {t("login.forgot")}
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.placeholder.password")}
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
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("login.submitting")}
                  </>
                ) : (
                  <>
                    {t("login.submit")} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 text-xs text-subtext">
            {t("login.accessPrompt")}{" "}
            <Link className="text-brand hover:underline" to="/request-access">
              {t("login.accessLink")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
