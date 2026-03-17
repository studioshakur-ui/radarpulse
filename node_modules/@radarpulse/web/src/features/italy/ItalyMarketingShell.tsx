import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function NavItem({
  to,
  label,
  exact,
}: {
  to: string;
  label: string;
  exact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        cn(
          "rounded-xl px-3 py-2 text-sm font-semibold transition",
          "hover:bg-surface/70",
          isActive ? "bg-surface/70 text-text shadow-soft" : "text-subtext"
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function ItalyMarketingShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(74,211,149,0.08),transparent_36%)]"
      />

      <div className="fixed inset-x-0 top-0 z-30 border-b border-line/20 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative h-7 w-7 overflow-hidden rounded-xl border border-line/25 bg-surface/70 shadow-soft">
              <div className="absolute -left-3 -top-3 h-10 w-10 rounded-full bg-brand/20 blur-xl" />
              <div className="absolute -bottom-3 -right-3 h-10 w-10 rounded-full bg-brand2/20 blur-xl" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-text">RadarPulse</div>
              <div className="text-[11px] text-subtext">Italy tenders</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <NavItem to="/italie" label="Italie" exact />
            <NavItem to="/guides" label="Guides" />
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/request-access"
              className={cn(
                "inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-veil shadow-glow transition",
                "hover:opacity-90"
              )}
            >
              Request access <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24">
        <header className="rounded-[32px] border border-border/25 bg-white/45 p-6 shadow-soft backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted">Italy public procurement</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              {subtitle ? (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{subtitle}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/italie"
                className="inline-flex items-center gap-1 rounded-xl border border-border/25 bg-white/55 px-3 py-2 text-sm font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
              >
                Hub Italie <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/request-access"
                className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/55 px-3 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-surface/80"
              >
                Request access
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-8">{children}</div>

        <footer className="mt-14 border-t border-line/20 pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-subtext">
              RadarPulse — Italy pages are informational. For compliance, always rely on official documents and platform notices.
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link className="text-subtext hover:text-text" to="/">
                Landing
              </Link>
              <span className="text-subtext">·</span>
              <Link className="text-subtext hover:text-text" to="/guides">
                Guides
              </Link>
              <span className="text-subtext">·</span>
              <Link className="text-subtext hover:text-text" to="/request-access">
                Request access
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export function MarketingSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-border/25 bg-white/45 p-6 shadow-soft backdrop-blur sm:p-7">
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold">{title}</div>
        {subtitle ? <div className="text-sm text-muted">{subtitle}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
