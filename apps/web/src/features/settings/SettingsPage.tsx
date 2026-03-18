import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { PageIntro, MetricBlock, SurfaceSection, SwitchControl } from "@/components/ds/surfacePrimitives";
import { SemanticPill } from "@/components/ds/statusPrimitives";
import { useLocale } from "@/lib/i18n";
import { getMarketOptions } from "@/lib/marketOptions";
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

export default function SettingsPage() {
  const { t } = useLocale();
  const marketOptions = useMemo(() => getMarketOptions(t), [t]);

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
      setPwError(t("settings.security.minLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError(t("settings.security.mismatch"));
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
      setPwError(err instanceof Error ? err.message : t("settings.security.failed"));
      setPwStatus("error");
    }
  }

  function subLabel(): string {
    if (!sub) return t("settings.subscription.inactive");
    if (sub.status === "trial") return t("settings.subscription.trial");
    if (sub.status === "active") return t("settings.subscription.active");
    return t("settings.subscription.inactive");
  }

  function subTone(): "good" | "warn" | "bad" {
    if (!sub) return "bad";
    if (sub.status === "active") return "good";
    if (sub.status === "trial") return "warn";
    return "bad";
  }

  function marketLabel(value: string): string {
    return marketOptions.find((option) => option.value === value)?.label ?? value;
  }

  function digestLabel(): string {
    if (!notif.email_digest_enabled) return t("settings.notifications.frequency.off");
    const key = `settings.notifications.frequency.${notif.email_digest_frequency}`;
    return t(key);
  }

  function subscriptionHint(): string {
    if (!sub?.current_period_end) return t("settings.subscription.subtitle");
    return `${t("settings.subscription.validUntil")} ${new Intl.DateTimeFormat(navigator.language, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(sub.current_period_end))}`;
  }

  return (
    <div className="space-y-6">
      <PageIntro title={t("settings.title")} subtitle={t("settings.subtitle")} eyebrow="RadarPulse" />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricBlock
          label={t("settings.profile.countryFocus")}
          value={marketLabel(profile.country_focus)}
          hint={profile.organization || userEmail || t("settings.profile.subtitle")}
        />
        <MetricBlock
          label={t("settings.notifications.emailDigest")}
          value={digestLabel()}
          hint={t("settings.notifications.subtitle")}
          tone={notif.email_digest_enabled ? "brand" : "default"}
        />
        <MetricBlock
          label={t("settings.subscription")}
          value={subLabel()}
          hint={subscriptionHint()}
          tone={subTone()}
        />
      </div>

      <SurfaceSection title={t("settings.profile")} subtitle={t("settings.profile.subtitle")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
              {t("settings.profile.name")}
            </span>
            <input
              value={profile.full_name}
              onChange={(e) => setProfile((current) => ({ ...current, full_name: e.target.value }))}
              placeholder={userEmail}
              className="w-full rounded-xl border border-line/25 bg-bg/70 px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
              {t("settings.profile.organization")}
            </span>
            <input
              value={profile.organization}
              onChange={(e) => setProfile((current) => ({ ...current, organization: e.target.value }))}
              placeholder="Acme Corp"
              className="w-full rounded-xl border border-line/25 bg-bg/70 px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
              {t("settings.profile.countryFocus")}
            </span>
            <select
              value={profile.country_focus}
              onChange={(e) => setProfile((current) => ({ ...current, country_focus: e.target.value }))}
              className="w-full rounded-xl border border-line/25 bg-bg/70 px-3 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40"
            >
              {marketOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SurfaceSection>

      <SurfaceSection title={t("settings.notifications")} subtitle={t("settings.notifications.subtitle")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-line/20 bg-bg/70 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-text">{t("settings.notifications.emailDigest")}</div>
              <div className="mt-1 text-sm text-subtext">{digestLabel()}</div>
            </div>
            <SwitchControl
              checked={notif.email_digest_enabled}
              onCheckedChange={(next) => setNotif((current) => ({ ...current, email_digest_enabled: next }))}
              ariaLabel={t("settings.notifications.emailDigest")}
            />
          </div>

          {notif.email_digest_enabled ? (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("settings.notifications.frequency")}
              </span>
              <select
                value={notif.email_digest_frequency}
                onChange={(e) => setNotif((current) => ({ ...current, email_digest_frequency: e.target.value }))}
                className="w-full rounded-xl border border-line/25 bg-bg/70 px-3 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-brand/40"
              >
                <option value="immediate">{t("settings.notifications.frequency.immediate")}</option>
                <option value="daily">{t("settings.notifications.frequency.daily")}</option>
                <option value="weekly">{t("settings.notifications.frequency.weekly")}</option>
                <option value="off">{t("settings.notifications.frequency.off")}</option>
              </select>
            </label>
          ) : null}
        </div>
      </SurfaceSection>

      <SurfaceSection
        title={t("settings.subscription")}
        subtitle={t("settings.subscription.subtitle")}
        action={
          !sub || sub.status !== "active" ? (
            <NavLink
              to="/abbonamento"
              className="inline-flex items-center rounded-xl border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/20"
            >
              {t("settings.subscription.upgrade")} →
            </NavLink>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <SemanticPill tone={subTone()}>{subLabel()}</SemanticPill>
          {sub?.current_period_end ? <span className="text-sm text-subtext">{subscriptionHint()}</span> : null}
        </div>
      </SurfaceSection>

      <SurfaceSection title={t("settings.security")} subtitle={t("settings.security.subtitle")}>
        <form className="space-y-3" onSubmit={(e) => void handleChangePassword(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("settings.security.newPassword")}
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line/25 bg-bg/70 px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-subtext">
                {t("settings.security.confirmPassword")}
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line/25 bg-bg/70 px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/70 focus:ring-2 focus:ring-brand/40"
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
              <SemanticPill tone="good">{t("settings.security.updated")}</SemanticPill>
            ) : null}
            <button
              type="submit"
              disabled={pwStatus === "saving"}
              className="inline-flex items-center rounded-xl border border-line/25 bg-surface px-4 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pwStatus === "saving" ? t("settings.security.updating") : t("settings.security.update")}
            </button>
          </div>
        </form>
      </SurfaceSection>

      <SurfaceSection title={t("settings.uiStandards")} subtitle={t("settings.uiStandards.subtitle")}>
        <ul className="space-y-2 text-sm text-subtext">
          <li>• {t("settings.standard1")}</li>
          <li>• {t("settings.standard2")}</li>
          <li>• {t("settings.standard3")}</li>
        </ul>
        <div className="mt-4 text-xs text-subtext">
          {t("settings.language")}: {t("settings.language.helper")}
        </div>
      </SurfaceSection>

      <div className="flex items-center justify-end gap-3 pb-2">
        {saveStatus === "saved" ? <SemanticPill tone="good">{t("settings.saved")}</SemanticPill> : null}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveStatus === "saving" || !userId}
          className={cn(
            "inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition",
            "bg-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {saveStatus === "saving" ? t("settings.saving") : t("settings.save")}
        </button>
      </div>
    </div>
  );
}
