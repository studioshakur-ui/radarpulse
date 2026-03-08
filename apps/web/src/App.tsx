import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import InboxPage from "@/features/inbox/InboxPage";
import { LandingPage } from "@/features/landing/LandingPage";
import RequestAccessPage from "@/features/landing/RequestAccessPage";
import ItalyIndexPage from "@/features/italy/ItalyIndexPage";
import ItalyRegionPage from "@/features/italy/ItalyRegionPage";
import ItalyCategoryPage from "@/features/italy/ItalyCategoryPage";
import ItalyBuyerPage from "@/features/italy/ItalyBuyerPage";
import GuidesIndexPage from "@/features/italy/GuidesIndexPage";
import GuidePage from "@/features/italy/GuidePage";
import SubscribePage from "@/features/billing/SubscribePage";
import { ENV } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { ThemeMenu } from "@/components/ThemeMenu";
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

function userRole(user: User | null): string {
  if (!user) return "";
  const role = (user.app_metadata as any)?.role ?? (user.user_metadata as any)?.role;
  return String(role ?? "").toUpperCase();
}

function useAuthUser() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Check for magic link token in URL
      const params = new URLSearchParams(window.location.search);
      const magicToken = params.get("token");

      if (magicToken) {
        // Verify magic link and set session
        try {
          const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/verify-magic-link`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: ENV.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ token: magicToken }),
          });

          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.accessToken) {
            // Set session — supabase.auth.setSession takes access_token + refresh_token only
            await supabase.auth.setSession({
              access_token: data.accessToken,
              refresh_token: data.refreshToken ?? "",
            });

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Redirect to inbox
            window.location.href = "/inbox";
            return;
          }
        } catch (e) {
          console.error("[App] magic link verification failed:", e);
        }
      }

      // Normal auth flow
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
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
        <div className="text-sm text-muted">Verifica abbonamento in corso...</div>
      </div>
    );
  }

  if (!allowed) return <Navigate to="/abbonamento" replace />;
  return <>{children}</>;
}

function SettingsPage() {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
      <div className="text-sm font-semibold">Impostazioni</div>
      <div className="mt-1 text-sm text-muted">Ambiente: {ENV.MODE}</div>
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/25 bg-bg/40 p-4">
        <div>
          <div className="text-sm font-semibold">Tema</div>
          <div className="text-xs text-muted">Segue automaticamente il dispositivo.</div>
        </div>
        <ThemeMenu />
      </div>
    </div>
  );
}

function AppShell({
  children,
  canSeeDevApp,
}: {
  children: React.ReactNode;
  canSeeDevApp: boolean;
}) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-elevated shadow-glow" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">RadarPulse</div>
              <div className="text-[11px] text-muted">Bandi Italia</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <NavItem to="/inbox" label="Inbox" />
            <NavItem to="/settings" label="Impostazioni" />
          </div>

          <div className="flex items-center gap-2">
            {canSeeDevApp ? (
              <NavLink
                to="/inbox"
                className="inline-flex items-center rounded-xl border border-border/40 bg-surface/75 px-3 py-2 text-xs font-semibold text-muted transition hover:bg-elevated/80"
              >
                App dev
              </NavLink>
            ) : null}
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
              Home
            </NavLink>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20">{children}</div>
    </div>
  );
}

function Shell({ children, canSeeDevApp }: { children: React.ReactNode; canSeeDevApp: boolean }) {
  const loc = useLocation();

  const isMarketing = useMemo(() => {
    const p = loc.pathname || "/";
    return p === "/" || p.startsWith("/request-access") || p.startsWith("/italie") || p.startsWith("/guides");
  }, [loc.pathname]);

  if (isMarketing) return <>{children}</>;

  return <AppShell canSeeDevApp={canSeeDevApp}>{children}</AppShell>;
}

export default function App() {
  const { loading: authLoading, user, isAdmin } = useAuthUser();
  const canSeeDevApp = ENV.DEV || isAdmin;

  if (authLoading && !ENV.DEV) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8 text-text">
        <div className="mx-auto max-w-6xl rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
          <div className="text-sm text-muted">Caricamento sessione...</div>
        </div>
      </div>
    );
  }

  return (
    <Shell canSeeDevApp={canSeeDevApp}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/request-access" element={<RequestAccessPage />} />
        <Route path="/abbonamento" element={<SubscribePage />} />
        <Route path="/subscribe" element={<Navigate to="/abbonamento" replace />} />
        <Route path="/login" element={<Navigate to="/request-access" replace />} />

        <Route path="/italie" element={<ItalyIndexPage />} />
        <Route path="/italie/regioni/:regionSlug" element={<ItalyRegionPage />} />
        <Route path="/italie/categorie/:categorySlug" element={<ItalyCategoryPage />} />
        <Route path="/italie/enti/:buyerSlug" element={<ItalyBuyerPage />} />

        <Route path="/guides" element={<GuidesIndexPage />} />
        <Route path="/guides/:slug" element={<GuidePage />} />

        <Route
          path="/inbox"
          element={
            <InboxAccessGate user={user} isAdmin={isAdmin}>
              <InboxPage />
            </InboxAccessGate>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-right" />
    </Shell>
  );
}
