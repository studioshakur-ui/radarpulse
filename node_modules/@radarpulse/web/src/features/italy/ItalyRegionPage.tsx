import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, MapPin, Search, ShieldCheck } from "lucide-react";
import { ItalyMarketingShell, MarketingSection } from "@/features/italy/ItalyMarketingShell";
import { ITALY_REGIONS, normalizeSlugParam, titleFromSlug } from "@/features/italy/italyUtils";

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="rounded-[28px] border border-border/25 bg-white/45 p-6 shadow-soft backdrop-blur">
      <div className="text-base font-semibold">Région introuvable</div>
      <div className="mt-2 text-sm text-muted">
        Slug reçu: <span className="font-semibold text-text">{slug || "(vide)"}</span>
      </div>
      <div className="mt-4 text-sm text-muted">Choisissez une région valide depuis le hub Italie.</div>
      <div className="mt-5">
        <Link
          to="/italie"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-veil shadow-glow hover:opacity-90"
        >
          Retour hub Italie <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function ItalyRegionPage() {
  const params = useParams();
  const regionSlug = normalizeSlugParam(params.regionSlug);

  const region = useMemo(() => {
    if (!regionSlug) return undefined;
    return ITALY_REGIONS.find((r) => r.slug === regionSlug);
  }, [regionSlug]);

  if (!region) {
    return (
      <ItalyMarketingShell title="Italie — région" subtitle="Page dédiée par territoire (structure).">
        <NotFound slug={regionSlug} />
      </ItalyMarketingShell>
    );
  }

  const regionName = region.name;

  return (
    <ItalyMarketingShell
      title={`Italie — ${regionName}`}
      subtitle="Page dédiée région: structure d’information, filtres et checklists."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketingSection
          title="Objectif"
          subtitle="Ce que cette page doit vous permettre de faire (côté fournisseur)."
        >
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted" />
              <span>Centraliser les opportunités dont le territoire d’exécution est {regionName}.</span>
            </li>
            <li className="flex items-start gap-2">
              <Search className="mt-0.5 h-4 w-4 text-muted" />
              <span>Réduire le bruit via dédup + catégories pertinentes (BTP, maintenance, services).</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-muted" />
              <span>Suivre addenda/dates/pièces et conserver un journal de décision (audit interne).</span>
            </li>
          </ul>
        </MarketingSection>

        <MarketingSection title="Raccourcis" subtitle="Navigation vers les vues adjacentes.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to="/guides/go-no-go-90-secondes"
              className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-bg/40 px-4 py-3 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
            >
              GO / NO-GO en 90s <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              to="/guides/suivre-addenda"
              className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-bg/40 px-4 py-3 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
            >
              Suivre les changements <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              to="/italie"
              className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-white/55 px-4 py-3 text-sm font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
            >
              Hub Italie <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              to={`/italie/categorie/${"manutenzione"}`}
              className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-white/55 px-4 py-3 text-sm font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
            >
              Catégorie: {titleFromSlug("manutenzione")} <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
          </div>
          <div className="mt-4 text-xs text-muted">
            Données live (opportunités, acheteurs, stats) seront affichées ici une fois l’ingestion activée.
          </div>
        </MarketingSection>
      </div>

      <div className="mt-6">
        <MarketingSection
          title="Structure de page (données à afficher quand disponibles)"
          subtitle="Contrat d’interface pour l’étape suivante."
        >
          <div className="grid gap-3 text-sm text-muted sm:grid-cols-2">
            {[
              "Top opportunités (dédupliquées) · tri par deadline",
              "Watchlist acheteurs de la région",
              "Alertes rouges: addenda/dates/pièces",
              "Catégories dominantes (distribution)",
              "Historique: awards/attributions (si disponibles)",
              "Exports: dossier + audit log",
            ].map((x) => (
              <div key={x} className="rounded-2xl border border-border/25 bg-bg/40 p-4 shadow-soft">
                {x}
              </div>
            ))}
          </div>
        </MarketingSection>
      </div>
    </ItalyMarketingShell>
  );
}
