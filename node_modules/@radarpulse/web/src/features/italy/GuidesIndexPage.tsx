import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { ItalyMarketingShell, MarketingSection } from "@/features/italy/ItalyMarketingShell";
import { GUIDES } from "@/features/italy/guidesContent";

export default function GuidesIndexPage() {
  return (
    <ItalyMarketingShell
      title="Guides — Italie"
      subtitle="Pages pratiques: méthode, checklist, et discipline de décision GO/NO-GO."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketingSection title="Guides disponibles" subtitle="Sélection de guides courts (structure v1).">
          <div className="grid gap-2">
            {GUIDES.map((g) => (
              <Link
                key={g.slug}
                to={`/guides/${g.slug}`}
                className="flex items-start justify-between gap-4 rounded-[22px] border border-border/25 bg-bg/40 px-4 py-4 text-left shadow-soft hover:bg-bg/60"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text">{g.title}</div>
                  <div className="mt-1 text-sm text-muted">{g.subtitle}</div>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 flex-none text-muted" />
              </Link>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection title="Pourquoi ces guides" subtitle="Objectif: réduire l’incertitude et standardiser l’exécution.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-border/25 bg-white/45 p-5 shadow-soft backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-accent" />
                Discipline
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Un process répétable (GO/NO-GO, checklist, suivi des changements) limite les erreurs et accélère la réponse.
              </p>
            </div>
            <div className="rounded-[22px] border border-border/25 bg-white/45 p-5 shadow-soft backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-accent" />
                Traçabilité
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Le journal des décisions et l’archivage des pièces facilitent l’audit interne et la qualité.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              to="/italie"
              className="inline-flex items-center gap-2 rounded-xl border border-border/25 bg-bg/40 px-3 py-2 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
            >
              Hub Italie <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/request-access"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-veil shadow-glow hover:opacity-90"
            >
              Request access <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </MarketingSection>
      </div>
    </ItalyMarketingShell>
  );
}
