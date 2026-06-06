import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation, useParams } from "react-router-dom";
import { Settings, FolderOpen, Map, Globe2, LogOut, Radar } from "lucide-react";
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
import GlobalPage from "@/features/geo/GlobalPage";
import ZonePage from "@/features/geo/ZonePage";
import CountryPage from "@/features/geo/CountryPage";
import RegionPage from "@/features/geo/RegionPage";
import LocalityPage from "@/features/geo/LocalityPage";
import SubscribePage from "@/features/billing/SubscribePage";
import SettingsPage from "@/features/settings/SettingsPage";
import WorkspacePage from "@/features/workspace/WorkspacePage";
import WorkspacesPage from "@/features/workspaces/WorkspacesPage";
import WorkspaceRecordPage from "@/features/workspaces/WorkspaceRecordPage";
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

function isNetworkIssue(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED/i.test(error.message);
}

function SideNavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "group relative flex min-h-11 items-center gap-3 rounded-2xl border px-3.5 transition-all",
          isActive
            ? "border-brand/18 bg-[linear-gradient(135deg,rgba(124,58,237,0.15),rgba(124,58,237,0.06))] text-brand shadow-soft"
            : "border-transparent text-text/58 hover:border-line/20 hover:bg-elevated/72 hover:text-text",
        )
      }
    >
      <span className="absolute left-1.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-brand/0 transition-all group-[.active]:bg-brand/85" />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line/10 bg-bg/88 text-text/55 transition group-hover:border-line/20 group-hover:text-text group-[.active]:border-brand/18 group-[.active]:bg-brand/10 group-[.active]:text-brand">
        {icon}
      </span>
      <span className="truncate text-[13px] font-semibold tracking-[-0.01em]">{label}</span>
    </NavLink>
  );
}

function SideNavSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-subtext/48">
      {children}
    </div>
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
        className="rounded-xl px-3 py-2 text-sm text-text/75 transition hover:bg-elevated/70 hover:text-text"
      >
        {t("nav.login")}
      </NavLink>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[120px] truncate text-xs text-text/70 sm:block">
        {user.email?.split("@")[0]}
      </span>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="rounded-xl px-3 py-2 text-sm text-text/75 transition hover:bg-elevated/70 hover:text-text"
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
  const [error, setError] = useState<"network" | null>(null);

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
      setError(null);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    async function init() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;

        if (isNetworkIssue(error)) {
          setError("network");
          setLoading(false);
          return;
        }

        setError(null);
        setUser(data.user ?? null);
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        if (isNetworkIssue(error)) {
          setError("network");
          setLoading(false);
          return;
        }
        setUser(null);
        setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { loading, user, isAdmin: userRole(user) === "ADMIN", error };
}

function AppAccessGate({
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

    void check();
    // Item-5 FIX: re-check subscription every 15 min so an expired subscription
    // revokes access without requiring a page reload.
    const interval = setInterval(() => { void check(); }, 15 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
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

function pageTitleForPath(pathname: string, t: (key: string) => string) {
  if (pathname === "/workspaces") return t("nav.dossiers");
  if (pathname.startsWith("/workspaces/")) return "Workspace";
  if (pathname === "/global") return t("geo.nav.global");
  if (pathname === "/countries/GB" || pathname.startsWith("/countries/GB/")) return t("geo.nav.uk");
  if (pathname === "/countries/FR" || pathname.startsWith("/countries/FR/")) return t("geo.nav.france");
  if (pathname === "/countries/IT" || pathname.startsWith("/countries/IT/")) return t("geo.nav.italy");
  if (pathname === "/settings") return t("nav.settings");
  return "RadarPulse";
}

function pageSubtitleForPath(pathname: string) {
  if (pathname === "/workspaces") return "Tracked work across your active pipeline.";
  if (pathname.startsWith("/workspaces/")) return "Decision, prep, score, and delivery in one place.";
  if (pathname === "/global") return "Macro market scan across the active sourcing perimeter.";
  if (pathname === "/countries/GB" || pathname.startsWith("/countries/GB/")) return "UK-first coverage with region-ready market navigation.";
  if (pathname === "/countries/FR" || pathname.startsWith("/countries/FR/")) return "France coverage across national and regional procurement signals.";
  if (pathname === "/countries/IT" || pathname.startsWith("/countries/IT/")) return "Italy sourcing with ANAC depth and regional market framing.";
  if (pathname === "/settings") return "Profile, language, and appearance preferences.";
  return "";
}

function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) {
  const { t } = useLocale();
  const loc = useLocation();
  const title = pageTitleForPath(loc.pathname, t);
  const subtitle = pageSubtitleForPath(loc.pathname);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition",
      isActive ? "bg-elevated text-text shadow-soft" : "text-text/65",
    );

  return (
    <div
      className="flex min-h-screen bg-bg text-text"
      style={{ ["--app-sidebar-w" as string]: "clamp(220px, 19vw, 272px)" }}
    >

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--app-sidebar-w)] flex-col border-r border-line/12 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.09),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.985),rgba(242,237,255,0.94))] shadow-[inset_-1px_0_0_rgba(17,24,39,0.04)] backdrop-blur-xl md:flex">

        {/* Brand */}
        <div className="border-b border-line/10 px-5 py-5">
          <Logo size={30} />
          <div className="mt-4 inline-flex rounded-full border border-line/15 bg-surface/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext/60">
            Command center
          </div>
          <p className="mt-3 text-sm leading-relaxed text-subtext">
            Workspace intelligence for public market pursuit.
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-7 overflow-y-auto px-3 py-5">
          <div className="space-y-1">
            <SideNavSectionLabel>Primary</SideNavSectionLabel>
            <SideNavItem to="/workspaces" icon={<FolderOpen className="h-4 w-4" />} label={t("nav.dossiers")} />
          </div>

          <div className="space-y-1">
            <SideNavSectionLabel>Markets</SideNavSectionLabel>
            <SideNavItem to="/global" icon={<Globe2 className="h-4 w-4" />} label={t("geo.nav.global")} />
            <SideNavItem to="/countries/GB" icon={<Map className="h-4 w-4" />} label={t("geo.nav.uk")} />
            <SideNavItem to="/countries/FR" icon={<Map className="h-4 w-4" />} label={t("geo.nav.france")} />
            <SideNavItem to="/countries/IT" icon={<Map className="h-4 w-4" />} label={t("geo.nav.italy")} />
          </div>

          <div className="space-y-1">
            <SideNavSectionLabel>Utility</SideNavSectionLabel>
            <SideNavItem to="/settings" icon={<Settings className="h-4 w-4" />} label={t("nav.settings")} />
          </div>
        </nav>

        {/* Footer: user row */}
        <div className="shrink-0 space-y-3 border-t border-line/10 px-3 py-4">
          <div className="rounded-2xl border border-line/15 bg-surface/92 px-3.5 py-3 shadow-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtext/48">
              Session
            </div>
            <div className="mt-2 text-sm font-medium text-text/82">
              {user ? "Authenticated workspace access" : "Sign in to activate workspaces"}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-line/10 bg-bg/76 px-3 py-2.5">
            {user ? (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand/12 text-[11px] font-bold text-brand">
                  {user.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="flex-1 truncate text-xs font-semibold text-text/58">
                  {user.email?.split("@")[0]}
                </span>
                <button
                  type="button"
                  title={t("nav.logout")}
                  onClick={() => void handleSignOut()}
                  className="rounded-xl border border-transparent p-2 text-text/40 transition hover:border-line/20 hover:bg-elevated hover:text-text/80"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <NavLink to="/login" className="text-xs text-brand hover:underline">
                {t("nav.login")}
              </NavLink>
            )}
          </div>
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="flex min-h-screen w-full flex-col md:pl-[var(--app-sidebar-w)]">

        {/* Top bar */}
        <header className="fixed inset-x-0 top-0 z-20 flex h-[74px] items-center justify-between gap-4 border-b border-border/60 bg-bg/88 px-4 backdrop-blur md:left-[var(--app-sidebar-w)] md:px-8">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-subtext/48">
              <Radar className="h-3.5 w-3.5" />
              RadarPulse workspace OS
            </div>
            <div className="mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-text md:text-[22px]">{title}</div>
            {subtitle ? <p className="hidden truncate text-sm text-subtext md:block">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-line/10 bg-surface/76 px-2.5 py-1.5 shadow-[0_1px_0_rgba(17,24,39,0.02)]">
            <ThemeMenu />
            <LocaleSwitcher />
            <UserMenu user={user} />
          </div>
        </header>

        {/* Page content */}
        <main className="w-full px-4 pb-24 pt-28 md:px-8 md:pb-8 lg:px-10">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-bg/92 px-3 py-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-2">
          <NavLink to="/workspaces" className={mobileNavClass}>
            <FolderOpen className="h-4 w-4" />
            <span>{t("nav.dossiers")}</span>
          </NavLink>
          <NavLink to="/global" className={mobileNavClass}>
            <Globe2 className="h-4 w-4" />
            <span>{t("geo.nav.global")}</span>
          </NavLink>
          <NavLink to="/countries/GB" className={mobileNavClass}>
            <Map className="h-4 w-4" />
            <span>{t("geo.nav.uk")}</span>
          </NavLink>
          <NavLink to="/settings" className={mobileNavClass}>
            <Settings className="h-4 w-4" />
            <span>{t("nav.settings")}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

function Shell({ children, user }: { children: React.ReactNode; user: User | null }) {
  const loc = useLocation();

  const isMarketing = useMemo(() => {
    const p = loc.pathname || "/";
    return p === "/" ||
      p === "/uk" ||
      p.startsWith("/eu") ||
      p.startsWith("/login") ||
      p.startsWith("/auth/callback") ||
      p.startsWith("/reset-password") ||
      p.startsWith("/request-access") ||
      p.startsWith("/italie") ||
      p.startsWith("/guides");
  }, [loc.pathname]);

  if (isMarketing) return <>{children}</>;

  return <AppShell user={user}>{children}</AppShell>;
}

function LegacyDossierRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/workspaces/${id}` : "/workspaces"} replace />;
}

export default function App() {
  const { loading: authLoading, user, isAdmin, error: authError } = useAuthUser();
  const localeCtx = useLocaleProvider();
  const { t } = localeCtx;
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

  if (authError === "network") {
    return (
      <LocaleContext.Provider value={localeCtx}>
        <div className="min-h-screen bg-bg px-4 py-8 text-text">
          <div className="mx-auto max-w-3xl rounded-3xl border border-warn/30 bg-surface p-6 shadow-soft">
            <div className="text-lg font-semibold text-text">{t("app.serviceUnavailable")}</div>
            <div className="mt-2 text-sm text-subtext">{t("app.serviceUnavailableHint")}</div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex rounded-xl border border-line/25 bg-bg px-4 py-2 text-sm font-semibold text-text transition hover:bg-elevated"
            >
              Reload
            </button>
          </div>
        </div>
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={localeCtx}>
      <Shell user={user}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/uk" element={<LandingPage />} />
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
          <Route path="/global" element={<GlobalPage />} />
          <Route path="/zones/:zoneSlug" element={<ZonePage />} />
          <Route path="/countries/:countryCode" element={<CountryPage />} />
          <Route path="/countries/:countryCode/regions/:regionSlug" element={<RegionPage />} />
          <Route path="/countries/:countryCode/regions/:regionSlug/localities/:localitySlug" element={<LocalityPage />} />

          <Route
            path="/workspaces"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : (
                <AppAccessGate user={user} isAdmin={isAdmin}>
                  <WorkspacesPage />
                </AppAccessGate>
              )
            }
          />
          <Route
            path="/workspaces/:id"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : (
                <AppAccessGate user={user} isAdmin={isAdmin}>
                  <WorkspaceRecordPage />
                </AppAccessGate>
              )
            }
          />
          <Route path="/dossiers" element={<Navigate to="/workspaces" replace />} />
          <Route path="/dossier/:id" element={<LegacyDossierRedirect />} />
          <Route path="/inbox" element={<Navigate to="/workspaces" replace />} />
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
                <AppAccessGate user={user} isAdmin={isAdmin}>
                  <WorkspacePage />
                </AppAccessGate>
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
