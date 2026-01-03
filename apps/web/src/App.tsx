import React from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import InboxPage from "@/features/inbox/InboxPage";
import WorkspacesPage from "@/features/workspaces/WorkspacesPage";
import WorkspacePage from "@/features/workspaces/WorkspacePage";
import { ENV } from "@/lib/env";
import { cx } from "@/lib/utils";
import { Toaster } from "sonner";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-elevated shadow-glow" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">{ENV.APP_NAME}</div>
              <div className="text-xs text-muted">Go/No-Go + Workspace</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <TopLink to="/inbox" label="Inbox" />
            <TopLink to="/workspaces" label="Workspaces" />
            <TopLink to="/settings" label="Settings" />
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-20">{children}</div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

function TopLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
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
      <div className="mt-2 text-sm text-muted">
        V1 : configuration via <code>.env.local</code>.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/workspace/:id" element={<WorkspacePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </Shell>
  );
}
