import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ItalyMarketingShell, MarketingSection } from "@/features/italy/ItalyMarketingShell";
import { getGuideBySlug } from "@/features/italy/guidesContent";
import { normalizeSlugParam } from "@/features/italy/italyUtils";

export default function GuidePage() {
  const params = useParams();
  const slug = normalizeSlugParam(params.slug);
  const guide = slug ? getGuideBySlug(slug) : undefined;

  if (!guide) {
    return (
      <ItalyMarketingShell title="Guide introuvable" subtitle="Le guide demandé n’existe pas (ou le slug est invalide).">
        <MarketingSection title="Retour" subtitle="Choisissez un guide depuis l’index.">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/guides"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-veil shadow-glow hover:opacity-90"
            >
              Index guides <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/italie"
              className="inline-flex items-center gap-2 rounded-xl border border-border/25 bg-bg/40 px-4 py-2 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
            >
              Hub Italie <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </MarketingSection>
      </ItalyMarketingShell>
    );
  }

  return (
    <ItalyMarketingShell title={guide.title} subtitle={guide.subtitle}>
      <div className="grid gap-6">
        {guide.sections.map((s) => (
          <MarketingSection key={s.heading} title={s.heading}>
            <div className="space-y-3 text-sm leading-relaxed text-muted">
              {s.paragraphs.map((p, i) => (
                <p key={`${s.heading}-${i}`}>{p}</p>
              ))}
            </div>
          </MarketingSection>
        ))}

        <MarketingSection title="Prochaine étape" subtitle="Passez du guide à l’exécution.">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/55 px-4 py-2 text-sm font-semibold text-text shadow-soft transition hover:bg-surface/80"
            >
              Explore <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/request-access"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-veil shadow-glow hover:opacity-90"
            >
              Request access <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/guides"
              className="inline-flex items-center gap-2 rounded-xl border border-border/25 bg-bg/40 px-4 py-2 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
            >
              Autres guides <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </MarketingSection>
      </div>
    </ItalyMarketingShell>
  );
}
