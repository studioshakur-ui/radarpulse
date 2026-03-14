import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";
import type { OnboardingState } from "./useOnboarding";

const COUNTRY_OPTIONS = [
  { value: "GLOBAL", label: "🌍 Global" },
  { value: "IT", label: "🇮🇹 Italy" },
  { value: "FR", label: "🇫🇷 France" },
  { value: "DE", label: "🇩🇪 Germany" },
  { value: "UK", label: "🇬🇧 United Kingdom" },
  { value: "ES", label: "🇪🇸 Spain" },
  { value: "NL", label: "🇳🇱 Netherlands" },
  { value: "PL", label: "🇵🇱 Poland" },
  { value: "BE", label: "🇧🇪 Belgium" },
];

type StepIndicatorProps = { total: number; current: number };

function StepIndicator({ total, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i < current ? "w-6 bg-accent" : i === current ? "w-8 bg-accent" : "w-4 bg-border/50",
          )}
        />
      ))}
    </div>
  );
}

type OnboardingModalProps = {
  user: User;
  saving: boolean;
  onComplete: (state: OnboardingState) => void;
};

export default function OnboardingModal({ user, saving, onComplete }: OnboardingModalProps) {
  const { t } = useLocale();
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [countryFocus, setCountryFocus] = useState("GLOBAL");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailFrequency, setEmailFrequency] = useState<"immediate" | "daily" | "weekly" | "off">("daily");

  function handleFinish() {
    onComplete({
      full_name: fullName,
      organization,
      country_focus: countryFocus,
      email_digest_enabled: emailEnabled,
      email_digest_frequency: emailFrequency,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-border/40 bg-surface shadow-soft">
        {/* Header */}
        <div className="border-b border-border/30 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-text">RadarPulse</div>
            <StepIndicator total={2} current={step} />
          </div>
        </div>

        {/* Step 1 — Profile */}
        {step === 0 ? (
          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-text">{t("onboarding.step1.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("onboarding.step1.subtitle")}</p>

            <div className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("onboarding.name")}
                </span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={user.email ?? ""}
                  className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("onboarding.organization")}
                </span>
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("onboarding.countryFocus")}
                </span>
                <select
                  value={countryFocus}
                  onChange={(e) => setCountryFocus(e.target.value)}
                  className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
              >
                {t("onboarding.next")} →
              </button>
            </div>
          </div>
        ) : null}

        {/* Step 2 — Notifications */}
        {step === 1 ? (
          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-text">{t("onboarding.step2.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("onboarding.step2.subtitle")}</p>

            <div className="mt-6 space-y-5">
              {/* Email digest toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-border/35 bg-bg/40 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-text">{t("onboarding.notify.email")}</div>
                  <div className="mt-0.5 text-xs text-muted">{user.email}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailEnabled}
                  onClick={() => setEmailEnabled((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                    emailEnabled ? "bg-accent" : "bg-border/60",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                      emailEnabled ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>

              {/* Frequency */}
              {emailEnabled ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    {t("onboarding.notify.frequency")}
                  </span>
                  <select
                    value={emailFrequency}
                    onChange={(e) =>
                      setEmailFrequency(e.target.value as "immediate" | "daily" | "weekly" | "off")
                    }
                    className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="immediate">{t("onboarding.notify.frequency.immediate")}</option>
                    <option value="daily">{t("onboarding.notify.frequency.daily")}</option>
                    <option value="weekly">{t("onboarding.notify.frequency.weekly")}</option>
                  </select>
                </label>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition hover:bg-elevated/60"
              >
                ← {t("onboarding.back")}
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="inline-flex items-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              >
                {saving ? t("onboarding.saving") : t("onboarding.finish")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
