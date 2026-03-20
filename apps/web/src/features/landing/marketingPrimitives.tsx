import React from "react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
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

type SharedCopy = {
  navUk: string;
  navEurope: string;
  navGlobal: string;
  signIn: string;
  requestAccess: string;
  footerSummary: string;
  footerMarkets: string;
  footerAccess: string;
  footerGuides: string;
  footerGlobal: string;
  footerStatus: string;
};

const SHARED_COPY: Record<Locale, SharedCopy> = {
  en: {
    navUk: "UK",
    navEurope: "Europe",
    navGlobal: "Global",
    signIn: "Sign in",
    requestAccess: "Request access",
    footerSummary: "Qualification discipline for public opportunity teams.",
    footerMarkets: "Markets",
    footerAccess: "Access",
    footerGuides: "Guides",
    footerGlobal: "Global map",
    footerStatus: "Built market by market in Europe.",
  },
  fr: {
    navUk: "UK",
    navEurope: "Europe",
    navGlobal: "Global",
    signIn: "Connexion",
    requestAccess: "Demander l'acces",
    footerSummary: "Discipline de qualification pour equipes opportunites publiques.",
    footerMarkets: "Marches",
    footerAccess: "Acces",
    footerGuides: "Guides",
    footerGlobal: "Carte globale",
    footerStatus: "Construit marche par marche en Europe.",
  },
  it: {
    navUk: "UK",
    navEurope: "Europa",
    navGlobal: "Global",
    signIn: "Accedi",
    requestAccess: "Richiedi accesso",
    footerSummary: "Disciplina di qualifica per team che operano su opportunita pubbliche.",
    footerMarkets: "Mercati",
    footerAccess: "Accesso",
    footerGuides: "Guide",
    footerGlobal: "Mappa globale",
    footerStatus: "Costruito mercato per mercato in Europa.",
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

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand/82">
      <span className="h-1.5 w-1.5 rounded-full bg-brand/70" />
      {children}
    </span>
  );
}

export function PrimaryCta({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:opacity-95",
        className,
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function SecondaryCta({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-line/20 bg-surface/72 px-5 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/72",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function MarketingShell({
  locale,
  activeMarket,
  banner,
  children,
}: MarketingShellProps) {
  const copy = SHARED_COPY[locale] ?? SHARED_COPY.en;
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
              {copy.navUk}
            </NavChip>
            <NavChip to="/eu" active={euActive}>
              {copy.navEurope}
            </NavChip>
            <NavChip to="/global" active={location.pathname.startsWith("/global")}>
              {copy.navGlobal}
            </NavChip>
          </nav>

          <div className="flex items-center gap-2">
            <SecondaryCta to="/login" className="px-4 py-2">
              {copy.signIn}
            </SecondaryCta>
            <PrimaryCta to="/request-access" className="px-4 py-2">
              {copy.requestAccess}
            </PrimaryCta>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/20 bg-bg">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <Logo size={24} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-subtext">{copy.footerSummary}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-brand/75">
              {copy.footerStatus}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/55">
              {copy.footerMarkets}
            </p>
            <div className="mt-4 space-y-3 text-sm text-subtext/82">
              <Link to="/uk" className="block transition hover:text-text">
                {copy.navUk}
              </Link>
              <Link to="/eu" className="block transition hover:text-text">
                {copy.navEurope}
              </Link>
              <Link to="/global" className="block transition hover:text-text">
                {copy.footerGlobal}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtext/55">
              {copy.footerAccess}
            </p>
            <div className="mt-4 space-y-3 text-sm text-subtext/82">
              <Link to="/request-access" className="block transition hover:text-text">
                {copy.requestAccess}
              </Link>
              <Link to="/login" className="block transition hover:text-text">
                {copy.signIn}
              </Link>
              <Link to="/guides" className="block transition hover:text-text">
                {copy.footerGuides}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
