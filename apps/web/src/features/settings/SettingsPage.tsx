import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useLocale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Profile = {
  full_name: string;
  organization: string;
  country_focus: string;
};

type NotifPrefs = {
  email_digest_enabled: boolean;
  email_digest_frequency: string;
};

type SubscriptionRow = {
  status: string | null;
  current_period_end: string | null;
};

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/35 bg-white/40 p-5">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-subtext">{title}</div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useLocale();

  const [profile, setProfile] = useState<Profile>({ full_name: "", organization: "", country_focus: "GLOBAL" });
  const [notif, setNotif] = useState<NotifPrefs>({ email_digest_enabled: true, email_digest_frequency: "daily" });
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      const email = data.user?.email ?? "";
      setUserId(uid);
      setUserEmail(email);
      if (!uid) return;

      supabase
        .from("user_profiles")
        .select("full_name,organization,country_focus")
        .eq("user_id", uid)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p) {
            setProfile({
              full_name: p.full_name ?? "",
              organization: p.organization ?? "",
              country_focus: p.country_focus ?? "GLOBAL",
            });
          }
        });

      supabase
        .from("notification_preferences")
        .select("email_digest_enabled,email_digest_frequency")
        .eq("user_id", uid)
        .maybeSingle()
        .then(({ data: n }) => {
          if (n) {
            setNotif({
              email_digest_enabled: n.email_digest_enabled ?? true,
              email_digest_frequency: n.email_digest_frequency ?? "daily",
            });
          }
        });

      const nowIso = new Date().toISOString();
      supabase
        .from("subscriptions")
        .select("status,current_period_end")
        .eq("user_id", uid)
        .gte("current_period_end", nowIso)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: s }) => setSub(s ?? null));
    });
  }, []);

  async function handleSave() {
    if (!userId) return;
    setSaveStatus("saving");
    const now = new Date().toISOString();

    await supabase.from("user_profiles").upsert(
      { user_id: userId, ...profile, updated_at: now },
      { onConflict: "user_id" },
    );

    await supabase.from("notification_preferences").upsert(
      { user_id: userId, ...notif, updated_at: now },
      { onConflict: "user_id" },
    );

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);

    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwStatus("saving");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwStatus("saved");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwStatus("idle"), 2500);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to update password.");
      setPwStatus("error");
    }
  }

  function subLabel(): string {
    if (!sub) return t("settings.subscription.inactive");
    if (sub.status === "trial") return t("settings.subscription.trial");
    if (sub.status === "active") return t("settings.subscription.active");
    return t("settings.subscription.inactive");
  }

  function subColor(): string {
    if (!sub) return "text-bad";
    if (sub.status === "active") return "text-good";
    if (sub.status === "trial") return "text-warn";
    return "text-bad";
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <SectionCard title={t("settings.profile")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
              {t("settings.profile.name")}
            </span>
            <input
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder={userEmail}
              className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
              {t("settings.profile.organization")}
            </span>
            <input
              value={profile.organization}
              onChange={(e) => setProfile((p) => ({ ...p, organization: e.target.value }))}
              placeholder="Acme Corp"
              className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
              {t("settings.profile.countryFocus")}
            </span>
            <select
              value={profile.country_focus}
              onChange={(e) => setProfile((p) => ({ ...p, country_focus: e.target.value }))}
              className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40"
            >
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title={t("settings.notifications")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-text">{t("settings.notifications.emailDigest")}</div>
            <button
              type="button"
              role="switch"
              aria-checked={notif.email_digest_enabled}
              onClick={() => setNotif((n) => ({ ...n, email_digest_enabled: !n.email_digest_enabled }))}
              className={cn(
                "relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                notif.email_digest_enabled ? "bg-brand" : "bg-border/60",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                  notif.email_digest_enabled ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {notif.email_digest_enabled ? (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("settings.notifications.frequency")}
              </span>
              <select
                value={notif.email_digest_frequency}
                onChange={(e) => setNotif((n) => ({ ...n, email_digest_frequency: e.target.value }))}
                className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40"
              >
                <option value="immediate">{t("settings.notifications.frequency.immediate")}</option>
                <option value="daily">{t("settings.notifications.frequency.daily")}</option>
                <option value="weekly">{t("settings.notifications.frequency.weekly")}</option>
                <option value="off">{t("settings.notifications.frequency.off")}</option>
              </select>
            </label>
          ) : null}
        </div>
      </SectionCard>

      {/* Subscription */}
      <SectionCard title={t("settings.subscription")}>
        <div className="flex items-center justify-between">
          <div>
            <span className={cn("text-sm font-semibold", subColor())}>{subLabel()}</span>
            {sub?.current_period_end ? (
              <div className="mt-0.5 text-xs text-subtext">
                {t("settings.subscription.validUntil")}{" "}
                {new Intl.DateTimeFormat(navigator.language, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(sub.current_period_end))}
              </div>
            ) : null}
          </div>
          {!sub || sub.status !== "active" ? (
            <NavLink
              to="/abbonamento"
              className="inline-flex items-center rounded-xl border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/20"
            >
              {t("settings.subscription.upgrade")} →
            </NavLink>
          ) : null}
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security">
        <form className="space-y-3" onSubmit={(e) => void handleChangePassword(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                New password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                Confirm new password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
              />
            </label>
          </div>

          {pwError ? (
            <div className="rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
              {pwError}
            </div>
          ) : null}

          <div className="flex items-center gap-3 pt-1">
            {pwStatus === "saved" ? (
              <span className="text-sm font-semibold text-good">Password updated ✓</span>
            ) : null}
            <button
              type="submit"
              disabled={pwStatus === "saving"}
              className="inline-flex items-center rounded-xl border border-border/40 bg-surface px-4 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pwStatus === "saving" ? "Updating…" : "Change password"}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* UI Standards */}
      <SectionCard title={t("settings.uiStandards")}>
        <ul className="space-y-2 text-sm">
          <li>• {t("settings.standard1")}</li>
          <li>• {t("settings.standard2")}</li>
          <li>• {t("settings.standard3")}</li>
        </ul>
        <div className="mt-4 text-xs text-subtext">{t("settings.language")}: use the EN / FR / IT switcher in the navbar.</div>
      </SectionCard>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {saveStatus === "saved" ? (
          <span className="text-sm font-semibold text-good">{t("settings.saved")}</span>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveStatus === "saving" || !userId}
          className="inline-flex items-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveStatus === "saving" ? t("settings.saving") : t("settings.save")}
        </button>
      </div>
    </div>
  );
}
