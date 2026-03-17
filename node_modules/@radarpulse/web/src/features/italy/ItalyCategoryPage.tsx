import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, ClipboardCheck, ShieldCheck, Sparkles } from "lucide-react";
import { ItalyMarketingShell, MarketingSection } from "@/features/italy/ItalyMarketingShell";
import { ITALY_CATEGORIES, normalizeSlugParam, titleFromSlug } from "@/features/italy/italyUtils";

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="rounded-[28px] border border-border/25 bg-white/45 p-6 shadow-soft backdrop-blur">
      <div className="text-base font-semibold">Catégorie introuvable</div>
      <div className="mt-2 text-sm text-muted">
        Slug reçu: <span className="font-semibold text-text">{slug || "(vide)"}</span>
      </div>
      <div className="mt-4 text-sm text-muted">Choisissez une catégorie valide depuis le hub Italie.</div>
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

export default function ItalyCategoryPage() {
  const params = useParams();
  const categorySlug = normalizeSlugParam(params.categorySlug);

  const category = useMemo(() => {
    if (!categorySlug) return undefined;
    return ITALY_CATEGORIES.find((c) => c.slug === categorySlug);
  }, [categorySlug]);

  if (!category) {
    return (
      <ItalyMarketingShell title="Italie — catégorie" subtitle="Page dédiée par secteur (structure).">
        <NotFound slug={categorySlug} />
      </ItalyMarketingShell>
    );
  }

  const categoryName = category.name;

  return (
    <ItalyMarketingShell
      title={`Italie — ${categoryName}`}
      subtitle="Page dédiée catégorie: structure d’information, méthode GO/NO-GO et checklist."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketingSection title="Ce que RadarPulse doit optimiser ici" subtitle="Les pains les plus fréquents côté fournisseurs.">
          <div className="grid gap-3 text-sm text-muted">
            {[
              "Réduction du bruit: dédup + filtres (territoire, ticket, acheteur)",
              "Surveillance des changements: addenda, nouvelles pièces, dates",
              "Brief structuré: exigences clés + chiffres + pièces",
              "Décision GO/NO-GO: explicable et reproductible",
            ].map((x) => (
              <div key={x} className="rounded-2xl border border-border/25 bg-bg/40 p-4 shadow-soft">
                {x}
              </div>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection title="Raccourcis" subtitle="Guides et pages adjacentes.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to="/guides/checklist-documents"
              className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-white/55 px-4 py-3 text-sm font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
            >
              Checklist documents <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              to="/guides/go-no-go-90-secondes"
              className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-white/55 px-4 py-3 text-sm font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
            >
              GO/NO-GO 90s <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              to="/italie"
              className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-bg/40 px-4 py-3 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
            >
              Hub Italie <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              to={`/italie/regioni/${"lombardia"}`}
              className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-bg/40 px-4 py-3 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
            >
              Exemple région <ArrowRight className="h-4 w-4 text-muted" />
            </Link>
          </div>
          <div className="mt-4 text-xs text-muted">
            Nom de catégorie: <span className="font-semibold text-text">{titleFromSlug(categorySlug)}</span>
          </div>
        </MarketingSection>
      </div>

      <div className="mt-6">
        <MarketingSection title="Checklist (structure)" subtitle="À compléter et valider selon les exigences officielles de chaque procédure.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[22px] border border-border/25 bg-bg/40 p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardCheck className="h-4 w-4 text-accent" />
                Administratif
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>• pièces et attestations demandées</li>
                <li>• signatures / formats</li>
                <li>• délais / modalités</li>
              </ul>
            </div>
            <div className="rounded-[22px] border border-border/25 bg-bg/40 p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-accent" />
                Technique
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>• exigences clés + livrables</li>
                <li>• visites / contraintes</li>
                <li>• planning d’exécution</li>
              </ul>
            </div>
            <div className="rounded-[22px] border border-border/25 bg-bg/40 p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Risque
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>• addenda / Q&A</li>
                <li>• pièces ajoutées</li>
                <li>• incohérences et zones floues</li>
              </ul>
            </div>
          </div>
        </MarketingSection>
      </div>
    </ItalyMarketingShell>
  );
}
