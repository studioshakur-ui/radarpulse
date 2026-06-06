import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENV } from "@/lib/env";
import { Logo } from "@/components/Logo";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/i18n";

type UseCaseValue = "consulting" | "ngo" | "sme" | "other";

type FormState = {
  name: string;
  email: string;
  organization: string;
  useCase: UseCaseValue;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  organization: "",
  useCase: "consulting",
};

const USE_CASE_OPTIONS: Record<Locale, Array<{ value: UseCaseValue; label: string }>> = {
  en: [
    { value: "consulting", label: "Consulting / agencies" },
    { value: "ngo", label: "NGO / grants" },
    { value: "sme", label: "SME / bids" },
    { value: "other", label: "Other" },
  ],
  fr: [
    { value: "consulting", label: "Conseil / agences" },
    { value: "ngo", label: "ONG / subventions" },
    { value: "sme", label: "PME / reponse aux marches" },
    { value: "other", label: "Autre" },
  ],
  it: [
    { value: "consulting", label: "Consulenza / agenzie" },
    { value: "ngo", label: "ONG / grant" },
    { value: "sme", label: "PMI / gare" },
    { value: "other", label: "Altro" },
  ],
};

export default function RequestAccessPage() {
  const { t, lang } = useT();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useCaseOptions = USE_CASE_OPTIONS[lang] ?? USE_CASE_OPTIONS.en;
  const selectedUseCase =
    useCaseOptions.find((option) => option.value === form.useCase)?.label ?? useCaseOptions[0]?.label ?? "";
  const trustPills = [
    t("requestAccess.trust.uk"),
    t("requestAccess.trust.dossiers"),
    t("requestAccess.trust.review"),
  ];

  const mailto = useMemo(() => {
    const subject = encodeURIComponent(t("requestAccess.mail.subject"));
    const body = encodeURIComponent(
      [
        t("requestAccess.mail.greeting"),
        "",
        t("requestAccess.mail.body"),
        "",
        `${t("requestAccess.field.name")}: ${form.name || "—"}`,
        `${t("requestAccess.field.email")}: ${form.email || "—"}`,
        `${t("requestAccess.field.organization")}: ${form.organization || "—"}`,
        `${t("requestAccess.field.useCase")}: ${selectedUseCase || "—"}`,
        "",
        t("requestAccess.mail.thanks"),
      ].join("\n"),
    );
    return `mailto:hello@radarpulse.io?subject=${subject}&body=${body}`;
  }, [form, selectedUseCase, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/create-magic-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ENV.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          organization: form.organization.trim() || null,
          use_case: selectedUseCase,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(String(data?.error ?? t("requestAccess.error.submit")));
      }

      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("requestAccess.error.submit"));
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
              <div className="text-[11px] text-subtext/80">{t("requestAccess.header.eyebrow")}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border/25 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
                "hover:bg-elevated/70",
              )}
            >
              {t("nav.login")}
            </Link>
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
      </div>

      <main className="mx-auto max-w-xl px-4 pb-10 pt-20">
        <div className="rounded-2xl border border-border/25 bg-surface/75 p-6 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand/70">
            {t("requestAccess.header.eyebrow")}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("requestAccess.header.title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-subtext">
            {t("requestAccess.header.subtitle")}
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

          {!done ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="request-name" className="text-xs font-medium text-subtext">
                  {t("requestAccess.field.name")}
                </label>
                <input
                  id="request-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40"
                />
                <p className="mt-1 text-xs text-subtext">{t("requestAccess.field.nameHint")}</p>
              </div>

              <div>
                <label htmlFor="request-email" className="text-xs font-medium text-subtext">
                  {t("requestAccess.field.email")}
                </label>
                <input
                  id="request-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40"
                />
                <p className="mt-1 text-xs text-subtext">{t("requestAccess.field.emailHint")}</p>
              </div>

              <div>
                <label htmlFor="request-organization" className="text-xs font-medium text-subtext">
                  {t("requestAccess.field.organization")}
                </label>
                <input
                  id="request-organization"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40"
                />
                <p className="mt-1 text-xs text-subtext">
                  {t("requestAccess.field.organizationHint")}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-subtext">
                  {t("requestAccess.field.useCase")}
                </label>
                <select
                  value={form.useCase}
                  onChange={(e) =>
                    setForm({ ...form, useCase: e.target.value as UseCaseValue })
                  }
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-3 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40"
                >
                  {useCaseOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {error ? (
                <div className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("requestAccess.submitting")}
                    </>
                  ) : (
                    <>
                      {t("requestAccess.submit")} <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <a
                  href={mailto}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/25 bg-surface/70 px-5 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
                >
                  {t("requestAccess.emailCta")} <Mail className="h-4 w-4" />
                </a>
              </div>

              <div className="text-xs text-subtext">{t("requestAccess.footer")}</div>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-good/20 bg-good/10 p-4">
              <div className="text-sm font-semibold text-good">{t("requestAccess.success.title")}</div>
              <div className="mt-1 text-sm text-subtext">
                {t("requestAccess.success.lead")} <strong>{form.email}</strong>{" "}
                {t("requestAccess.success.trail")}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                >
                  {t("requestAccess.success.primary")} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/25 bg-surface/70 px-5 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
                >
                  {t("requestAccess.success.secondary")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
