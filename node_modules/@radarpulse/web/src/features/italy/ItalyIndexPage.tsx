import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Building2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItalyMarketingShell, MarketingSection } from "@/features/italy/ItalyMarketingShell";
import { ITALY_REGIONS, ITALY_CATEGORIES } from "@/features/italy/italyUtils";

function Card({
  title,
  desc,
  icon,
  children,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-border/25 bg-white/45 p-6 shadow-soft backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-muted">{desc}</div>
        </div>
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

export default function ItalyIndexPage() {
  return (
    <ItalyMarketingShell
      title="Italie — hub appalti pubblici"
      subtitle="Pages dédiées (informational): repères 2024, navigation par régions, catégories et profils acheteurs."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Repères 2024"
          desc="Valeur totale: 271,8 Md€ · Procédures: ~267 000 (ANAC)."
          icon={<Layers className="h-5 w-5" />}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[{ k: "Valeur", v: "271,8 Md€" }, { k: "Procédures", v: "~267 000" }].map((x) => (
              <div
                key={x.k}
                className="rounded-2xl border border-border/25 bg-bg/40 p-4 text-sm shadow-soft"
              >
                <div className="text-xs font-semibold text-muted">{x.k}</div>
                <div className="mt-1 text-base font-semibold">{x.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted">
            Sources officielles à consulter: ANAC (analyses), et plateformes de publication/participation.
          </div>
        </Card>

        <Card
          title="Digitalisation (depuis 2024)"
          desc="CIG via plateformes PAD certifiées (procédures digitalisées)."
          icon={<Building2 className="h-5 w-5" />}
        >
          <ul className="space-y-2 text-sm text-muted">
            <li>• Points de publication multiples (plateformes, portails, profils acheteurs).</li>
            <li>• Changements continus (pièces, dates, Q&A) → nécessité d’un suivi d’addenda.</li>
            <li>• Dossier de réponse: structure, versioning, audit interne.</li>
          </ul>
          <div className="mt-5">
            <Link
              to="/guides/suivre-addenda"
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border/25 bg-white/55 px-3 py-2 text-sm font-semibold text-text shadow-soft backdrop-blur",
                "hover:bg-white/65"
              )}
            >
              Guide: suivre les changements <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <Card
          title="Démarrer avec RadarPulse"
          desc="Demandez l’accès et structurez votre processus de qualification."
          icon={<ArrowRight className="h-5 w-5" />}
        >
          <div className="flex flex-col gap-2">
            <Link
              to="/request-access"
              className="inline-flex items-center justify-between rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-veil shadow-glow hover:opacity-90"
            >
              Request access <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 text-xs text-muted">
            Objectif: réduire le bruit, suivre les addenda, et produire une décision GO/NO-GO reproductible.
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <MarketingSection
          title="Régions"
          subtitle="Navigation par territoire (pages dédiées)."
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ITALY_REGIONS.map((r) => (
              <Link
                key={r.slug}
                to={`/italie/regioni/${r.slug}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/25 bg-bg/40 px-3 py-2 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
              >
                <MapPin className="h-4 w-4 text-muted" />
                <span className="truncate">{r.name}</span>
              </Link>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection
          title="Catégories"
          subtitle="Wedges typiques côté fournisseurs (pages dédiées)."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ITALY_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to={`/italie/categorie/${c.slug}`}
                className="inline-flex items-center justify-between rounded-2xl border border-border/25 bg-bg/40 px-3 py-2 text-sm font-semibold text-text shadow-soft hover:bg-bg/60"
              >
                <span className="truncate">{c.name}</span>
                <ArrowRight className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted">
            Ces pages servent de structure d’information. La donnée live proviendra des sources ingérées dans l’app.
          </div>
        </MarketingSection>
      </div>

      <div className="mt-6">
        <MarketingSection
          title="Profils acheteurs"
          subtitle="Pages dédiées par entité (slug)."
        >
          <div className="text-sm text-muted">
            Les pages acheteurs existent en structure: <span className="font-semibold text-text">/italie/enti/:buyerSlug</span>.
            Elles seront alimentées automatiquement quand l’ingestion et la normalisation des acheteurs seront activées.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { slug: "comune-di-milano", label: "Comune di Milano" },
              { slug: "regione-lombardia", label: "Regione Lombardia" },
              { slug: "asst", label: "ASST (exemple)" },
            ].map((x) => (
              <Link
                key={x.slug}
                to={`/italie/enti/${x.slug}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border/25 bg-white/55 px-3 py-2 text-sm font-semibold text-text shadow-soft backdrop-blur hover:bg-white/65"
              >
                {x.label} <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </MarketingSection>
      </div>
    </ItalyMarketingShell>
  );
}
