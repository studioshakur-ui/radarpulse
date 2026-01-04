import React, { useMemo } from "react";
import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import InboxPage from "@/features/inbox/InboxPage";
import WorkspacesPage from "@/features/workspaces/WorkspacesPage";
import WorkspacePage from "@/features/workspaces/WorkspacePage";
import { LandingPage } from "@/features/landing/LandingPage";
import ExplorePage from "@/features/landing/ExplorePage";
import RequestAccessPage from "@/features/landing/RequestAccessPage";
import { ENV } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { ThemeMenu } from "@/components/ThemeMenu";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-xl px-3 py-2 text-sm transition",
          "hover:bg-elevated/70",
          isActive ? "bg-elevated shadow-soft" : "text-muted"
        )
      }
    >
      {label}
    </NavLink>
  );
}

function SettingsPage() {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-soft">
      <div className="text-sm font-semibold">Settings</div>
      <div className="mt-1 text-sm text-muted">Environment: {ENV.MODE}</div>
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/25 bg-bg/40 p-4">
        <div>
          <div className="text-sm font-semibold">Theme</div>
          <div className="text-xs text-muted">Auto matches your device setting.</div>
        </div>
        <ThemeMenu />
      </div>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-elevated shadow-glow" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">RadarPulse</div>
              <div className="text-[11px] text-muted">Tenders + Grants</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <NavItem to="/inbox" label="Inbox" />
            <NavItem to="/workspaces" label="Workspaces" />
            <NavItem to="/settings" label="Settings" />
          </div>

          <div className="flex items-center gap-2">
            <ThemeMenu className="hidden sm:inline-flex" />
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-3 py-2 text-sm transition",
                  "hover:bg-elevated/70",
                  isActive ? "bg-elevated shadow-soft" : "text-muted"
                )
              }
            >
              Landing
            </NavLink>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20">{children}</div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();

  const isMarketing = useMemo(() => {
    const p = loc.pathname || "/";
    return p === "/" || p.startsWith("/explore") || p.startsWith("/request-access");
  }, [loc.pathname]);

  if (isMarketing) return <>{children}</>;

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        {/* Marketing */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/request-access" element={<RequestAccessPage />} />

        {/* App */}
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/workspace/:id" element={<WorkspacePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-right" />
    </Shell>
  );
}
