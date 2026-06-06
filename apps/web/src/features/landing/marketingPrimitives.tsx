import React from "react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeMenu } from "@/components/ThemeMenu";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ActiveMarket = "uk" | "eu";

type MarketingShellProps = {
  locale: Locale;
  activeMarket: ActiveMarket;
  banner: {
    text: string;
    linkLabel: string;
    linkTo: string;
  };
  children: React.ReactNode;
};

const COPY: Record<
  Locale,
  {
    uk: string;
    europe: string;
    global: string;
    signIn: string;
    request: string;
    markets: string;
    access: string;
    guides: string;
    summary: string;
    status: string;
  }
> = {
  en: {
    uk: "UK",
    europe: "Europe",
    global: "Global",
    signIn: "Sign in",
    request: "Request access",
    markets: "Markets",
    access: "Access",
    guides: "Guides",
    summary: "Qualification discipline for public opportunity teams.",
    status: "Built market by market in Europe.",
  },
  fr: {
    uk: "UK",
    europe: "Europe",
    global: "Global",
    signIn: "Connexion",
    request: "Demander l'acces",
    markets: "Marches",
    access: "Acces",
    guides: "Guides",
    summary: "Discipline de qualification pour equipes opportunites publiques.",
    status: "Construit marche par marche en Europe.",
  },
  it: {
    uk: "UK",
    europe: "Europa",
    global: "Global",
    signIn: "Accedi",
    request: "Richiedi accesso",
    markets: "Mercati",
    access: "Accesso",
    guides: "Guide",
    summary: "Disciplina di qualifica per team che operano su opportunita pubbliche.",
    status: "Costruito mercato per mercato in Europa.",
  },
};

function NavChip({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        active ? "bg-elevated text-text shadow-soft" : "text-text/72 hover:bg-elevated/70 hover:text-text",
      )}
    >
      {children}
    </Link>
  );
}

function PrimaryCta({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:opacity-95"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function MarketingShell({
  locale,
  activeMarket,
  banner,
  children,
}: MarketingShellProps) {
  const copy = COPY[locale] ?? COPY.en;
  const location = useLocation();
  const ukActive = activeMarket === "uk" || location.pathname === "/" || location.pathname === "/uk";
  const euActive = activeMarket === "eu" || location.pathname.startsWith("/eu");

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="border-b border-brand/60 bg-brand px-4 py-2 text-center text-xs text-white/90">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>{banner.text}</span>
          <Link to={banner.linkTo} className="font-semibold text-white hover:underline">
            {banner.linkLabel}
          </Link>
        </span>
      </div>

      <header className="sticky top-0 z-30 border-b border-border/25 bg-bg/84 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" aria-label="RadarPulse">
            <Logo size={24} />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavChip to="/uk" active={ukActive}>
              {copy.uk}
            </NavChip>
            <NavChip to="/eu" active={euActive}>
              {copy.europe}
            </NavChip>
            <NavChip to="/global" active={location.pathname.startsWith("/global")}>
              {copy.global}
            </NavChip>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeMenu />
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-line/20 bg-surface/78 px-4 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated"
            >
              {copy.signIn}
            </Link>
            <PrimaryCta to="/request-access">{copy.request}</PrimaryCta>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/20 bg-bg">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <Logo size={24} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-subtext">{copy.summary}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-brand/75">
              {copy.status}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/55">
              {copy.markets}
            </p>
            <div className="mt-4 space-y-3 text-sm text-subtext/82">
              <Link to="/uk" className="block transition hover:text-text">
                {copy.uk}
              </Link>
              <Link to="/eu" className="block transition hover:text-text">
                {copy.europe}
              </Link>
              <Link to="/global" className="block transition hover:text-text">
                {copy.global}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/55">
              {copy.access}
            </p>
            <div className="mt-4 space-y-3 text-sm text-subtext/82">
              <Link to="/request-access" className="block transition hover:text-text">
                {copy.request}
              </Link>
              <Link to="/login" className="block transition hover:text-text">
                {copy.signIn}
              </Link>
              <Link to="/guides" className="block transition hover:text-text">
                {copy.guides}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
