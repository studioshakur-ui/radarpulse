import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Building2, Calendar, FileSearch } from "lucide-react";
import { ItalyMarketingShell, MarketingSection } from "@/features/italy/ItalyMarketingShell";
import { normalizeSlugParam, titleFromSlug } from "@/features/italy/italyUtils";

export default function ItalyBuyerPage() {
  const params = useParams();
  const buyerSlug = normalizeSlugParam(params.buyerSlug);
  const buyerName = buyerSlug ? titleFromSlug(buyerSlug) : "Acheteur";

  return (
    <ItalyMarketingShell
      title={`Italie — Acheteur: ${buyerName}`}
      subtitle="Page dédiée acheteur (structure). Les données seront alimentées par ingestion et normalisation des entités."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketingSection title="Ce que cette page doit afficher" subtitle="Contrat minimal pour une page acheteur utile.">
          <div className="grid gap-3 text-sm text-muted">
            {[
              "Opportunités actives (dédupliquées)",
              "Historique des publications",
              "Changements/addenda (diff)",
              "Calendrier: deadlines et Q&A",
              "Documents: pièces + versions",
              "Awards/attributions (si disponibles)",
            ].map((x) => (
              <div key={x} className="rounded-2xl border border-border/25 bg-bg/40 p-4 shadow-soft">
                {x}
              </div>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection title="Pourquoi c’est stratégique" subtitle="La veille par acheteur est l’un des meilleurs filtres (faible bruit).">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-border/25 bg-white/45 p-5 shadow-soft backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileSearch className="h-4 w-4 text-accent" />
                Focus
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Suivre un acheteur récurrent réduit le bruit: procédures, formats et exigences sont souvent similaires.
              </p>
            </div>
            <div className="rounded-[22px] border border-border/25 bg-white/45 p-5 shadow-soft backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-accent" />
                Timing
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Les addenda et changements de dates sont le risque n°1: une page acheteur permet des alertes ciblées.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              to="/guides/suivre-addenda"
              className="inline-flex items-center gap-2 rounded-xl border border-border/25 bg-white/55 px-3 py-2 text-sm font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
            >
              Guide: addenda <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/italie"
              className="inline-flex items-center gap-2 rounded-xl border border-border/25 bg-bg/40 px-3 py-2 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
            >
              Hub Italie <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </MarketingSection>
      </div>

      <div className="mt-6">
        <MarketingSection
          title="État actuel"
          subtitle="Cette page est prête côté routing/UX. L’étape suivante est d’alimenter buyerSlug via la DB (buyers + normalisation)."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted">
              Slug: <span className="font-semibold text-text">{buyerSlug || "(vide)"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/55 px-3 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-surface/80"
              >
                Explore <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/request-access"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-veil shadow-glow hover:opacity-90"
              >
                Request access <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </MarketingSection>
      </div>
    </ItalyMarketingShell>
  );
}
