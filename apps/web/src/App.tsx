import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import InboxPage from "@/features/inbox/InboxPage";
import { LandingPage } from "@/features/landing/LandingPage";
import RequestAccessPage from "@/features/landing/RequestAccessPage";
import LoginPage from "@/features/landing/LoginPage";
import AuthCallbackPage from "@/features/landing/AuthCallbackPage";
import ResetPasswordPage from "@/features/landing/ResetPasswordPage";
import ItalyIndexPage from "@/features/italy/ItalyIndexPage";
import ItalyRegionPage from "@/features/italy/ItalyRegionPage";
import ItalyCategoryPage from "@/features/italy/ItalyCategoryPage";
import ItalyBuyerPage from "@/features/italy/ItalyBuyerPage";
import GuidesIndexPage from "@/features/italy/GuidesIndexPage";
import GuidePage from "@/features/italy/GuidePage";
import SubscribePage from "@/features/billing/SubscribePage";
import SettingsPage from "@/features/settings/SettingsPage";
import WorkspacePage from "@/features/workspace/WorkspacePage";
import { ENV } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { ThemeMenu } from "@/components/ThemeMenu";
import { Logo } from "@/components/Logo";
import { LocaleContext, useLocale, useLocaleProvider, type Locale } from "@/lib/i18n";
import OnboardingModal from "@/features/onboarding/OnboardingModal";
import { useOnboarding } from "@/features/onboarding/useOnboarding";
import type { User } from "@supabase/supabase-js";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-xl px-3 py-2 text-sm transition",
          "hover:bg-elevated/70",
          isActive ? "bg-elevated shadow-soft" : "text-muted",
        )
      }
    >
      {label}
    </NavLink>
  );
}

function UserMenu({ user }: { user: User | null }) {
  const { t } = useLocale();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  if (!user) {
    return (
      <NavLink
        to="/login"
        className="rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-elevated/70"
      >
        {t("nav.login")}
      </NavLink>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[120px] truncate text-xs text-muted sm:block">
        {user.email?.split("@")[0]}
      </span>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-elevated/70"
      >
        {t("nav.logout")}
      </button>
    </div>
  );
}

function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="flex gap-0.5 rounded-xl border border-border/35 bg-bg/60 p-0.5">
      {(["en", "fr", "it"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-semibold uppercase transition",
            locale === l ? "bg-elevated text-text shadow-soft" : "text-muted hover:text-text",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function userRole(user: User | null): string {
  if (!user) return "";
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role = appMeta.role ?? userMeta.role;
  return String(role ?? "").toUpperCase();
}

function useAuthUser() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    // INITIAL_SESSION fires immediately from localStorage — do NOT trust it blindly.
    // A stale/revoked JWT passes INITIAL_SESSION but fails getUser() server-side.
    // We skip INITIAL_SESSION and let init() do the authoritative check first.
    // Subsequent events (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT) update state immediately.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return; // handled by init() — avoids stale-JWT race
      setUser(session?.user ?? null);
      setLoading(false);
    });

    async function init() {
      // Server-side JWT validation — authoritative check before rendering protected UI.
      // Keeps loading=true until we know whether the stored session is genuinely valid.
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !data.user) {
        // Stale/revoked JWT — wipe it so the UI shows logged-out state immediately.
        await supabase.auth.signOut({ scope: "local" });
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { loading, user, isAdmin: userRole(user) === "ADMIN" };
}

function InboxAccessGate({
  user,
  isAdmin,
  children,
}: {
  user: User | null;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (ENV.DEV || isAdmin) {
        if (!mounted) return;
        setAllowed(true);
        setLoading(false);
        return;
      }

      if (!user?.id) {
        if (!mounted) return;
        setAllowed(false);
        setLoading(false);
        return;
      }

      const nowIso = new Date().toISOString();

      // Check for active subscription OR trial status
      const { data } = await supabase
        .from("subscriptions")
        .select("id,status,current_period_end")
        .eq("user_id", user.id)
        .in("status", ["active", "trial"])
        .gte("current_period_end", nowIso)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;
      setAllowed(Boolean(data?.id));
      setLoading(false);
    }

    check();
    return () => {
      mounted = false;
    };
  }, [user?.id, isAdmin]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
        <div className="text-sm text-muted">{t("app.checkingSubscription")}</div>
      </div>
    );
  }

  if (!allowed) return <Navigate to="/abbonamento" replace />;
  return <>{children}</>;
}

function AppShell({
  children,
  canSeeDevApp,
  user,
}: {
  children: React.ReactNode;
  canSeeDevApp: boolean;
  user: User | null;
}) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo size={24} />
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <NavItem to="/inbox" label={t("nav.inbox")} />
            <NavItem to="/settings" label={t("nav.settings")} />
          </div>

          <div className="flex items-center gap-2">
            {canSeeDevApp ? (
              <NavLink
                to="/inbox"
                className="inline-flex items-center rounded-xl border border-border/40 bg-surface/75 px-3 py-2 text-xs font-semibold text-muted transition hover:bg-elevated/80"
              >
                Dev
              </NavLink>
            ) : null}
            <LocaleSwitcher />
            <ThemeMenu className="hidden sm:inline-flex" />
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-3 py-2 text-sm transition",
                  "hover:bg-elevated/70",
                  isActive ? "bg-elevated shadow-soft" : "text-muted",
                )
              }
            >
              {t("nav.home")}
            </NavLink>
            <UserMenu user={user} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20">{children}</div>
    </div>
  );
}

function Shell({ children, canSeeDevApp, user }: { children: React.ReactNode; canSeeDevApp: boolean; user: User | null }) {
  const loc = useLocation();

  const isMarketing = useMemo(() => {
    const p = loc.pathname || "/";
    return p === "/" || p.startsWith("/login") || p.startsWith("/auth/callback") || p.startsWith("/reset-password") || p.startsWith("/request-access") || p.startsWith("/italie") || p.startsWith("/guides");
  }, [loc.pathname]);

  if (isMarketing) return <>{children}</>;

  return <AppShell canSeeDevApp={canSeeDevApp} user={user}>{children}</AppShell>;
}

export default function App() {
  const { loading: authLoading, user, isAdmin } = useAuthUser();
  const localeCtx = useLocaleProvider();
  const { t } = localeCtx;
  const canSeeDevApp = ENV.DEV || isAdmin;
  const { needsOnboarding, checking: checkingOnboarding, saving: savingOnboarding, complete: completeOnboarding } = useOnboarding(user);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8 text-text">
        <div className="mx-auto max-w-6xl rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
          <div className="text-sm text-muted">{t("app.loading")}</div>
        </div>
      </div>
    );
  }

  return (
    <LocaleContext.Provider value={localeCtx}>
      <Shell canSeeDevApp={canSeeDevApp} user={user}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/request-access" element={<RequestAccessPage />} />
          <Route path="/abbonamento" element={<SubscribePage />} />
          <Route path="/subscribe" element={<Navigate to="/abbonamento" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/italie" element={<ItalyIndexPage />} />
          <Route path="/italie/regioni/:regionSlug" element={<ItalyRegionPage />} />
          <Route path="/italie/categorie/:categorySlug" element={<ItalyCategoryPage />} />
          <Route path="/italie/enti/:buyerSlug" element={<ItalyBuyerPage />} />

          <Route path="/guides" element={<GuidesIndexPage />} />
          <Route path="/guides/:slug" element={<GuidePage />} />

          <Route
            path="/inbox"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : (
                <InboxAccessGate user={user} isAdmin={isAdmin}>
                  <InboxPage />
                </InboxAccessGate>
              )
            }
          />
          <Route
            path="/settings"
            element={!user ? <Navigate to="/login" replace /> : <SettingsPage />}
          />
          <Route
            path="/workspace/:id"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : (
                <InboxAccessGate user={user} isAdmin={isAdmin}>
                  <WorkspacePage />
                </InboxAccessGate>
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster position="top-right" />

        {!checkingOnboarding && needsOnboarding && user ? (
          <OnboardingModal
            user={user}
            saving={savingOnboarding}
            onComplete={(state) => void completeOnboarding(state)}
          />
        ) : null}
      </Shell>
    </LocaleContext.Provider>
  );
}
