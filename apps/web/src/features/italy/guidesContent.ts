export type GuideSection = {
  heading: string;
  paragraphs: string[];
};

export type GuideDoc = {
  slug: string;
  title: string;
  subtitle: string;
  sections: GuideSection[];
};

export const GUIDES: GuideDoc[] = [
  {
    slug: "come-funziona-il-mercato",
    title: "Italie — comment fonctionne le marché des appalti",
    subtitle:
      "Repères factuels: volumes, digitalisation (CIG via PAD), et ce que cela implique pour les fournisseurs.",
    sections: [
      {
        heading: "Repères 2024",
        paragraphs: [
          "En Italie, l’ANAC publie des analyses annuelles sur la valeur et le volume des procédures d’appalti pubblici.",
          "Pour une réponse opérationnelle, la lecture la plus utile pour un fournisseur est: (1) où les avis apparaissent, (2) comment suivre les modifications, et (3) comment verrouiller la conformité documentaire.",
        ],
      },
      {
        heading: "Digitalisation depuis 2024",
        paragraphs: [
          "À partir du 1er janvier 2024, le CIG est acquis via des plateformes d’approvvigionamento digitale (PAD) certifiées, interfacées avec les services ANAC.",
          "Dans la pratique, cela renforce la fragmentation des points de publication: plusieurs plateformes, portails et profils acheteurs coexistent.",
        ],
      },
      {
        heading: "Conséquences pour les fournisseurs",
        paragraphs: [
          "Le coût principal n’est pas la découverte des avis, mais le temps perdu sur le bruit, la déduplication, et les changements (addenda/pièces/dates).",
          "Une exécution disciplinée nécessite: une surveillance continue des modifications, un brief structuré, et une checklist de conformité.",
        ],
      },
    ],
  },
  {
    slug: "checklist-documents",
    title: "Checklist: documents et pièces (approche pratique)",
    subtitle:
      "Une structure de dossier réutilisable. À adapter selon la procédure et les exigences officielles.",
    sections: [
      {
        heading: "Dossier entreprise (réutilisable)",
        paragraphs: [
          "Centralisez les pièces stables: identité, attestations récurrentes, certificats, références, polices d’assurance, certifications.",
          "Versionnez chaque pièce et gardez la date d’expiration visible (alertes avant échéance).",
        ],
      },
      {
        heading: "Dossier offre (par AO)",
        paragraphs: [
          "Créez un espace unique par AO: exigences, pièces demandées, questions/réponses, addenda, et rétroplanning.",
          "Séparez systématiquement: administratif, technique, économique.",
        ],
      },
      {
        heading: "Contrôle qualité",
        paragraphs: [
          "Avant dépôt: vérification des signatures, formats, délais, et cohérence des montants.",
          "Après dépôt: archive du dossier final et journal des décisions (qui, quand, pourquoi).",
        ],
      },
    ],
  },
  {
    slug: "go-no-go-90-secondes",
    title: "GO / NO-GO en 90 secondes",
    subtitle:
      "Une méthode simple: éligibilité, capacité, délai, et risque documentaire — avant de mobiliser l’équipe.",
    sections: [
      {
        heading: "1) Éligibilité",
        paragraphs: [
          "Vérifiez immédiatement les prérequis (certifications, seuils, exigences minimales).",
          "Si un prérequis est manquant, la décision NO-GO doit être rapide et documentée.",
        ],
      },
      {
        heading: "2) Capacité et délai",
        paragraphs: [
          "Comparez le délai disponible avec la charge de production de l’offre.",
          "Si le calendrier est irréaliste, préférez une décision HOLD/NO-GO plutôt que de produire une offre fragile.",
        ],
      },
      {
        heading: "3) Risque documentaire",
        paragraphs: [
          "Le risque principal est souvent un détail: une pièce ajoutée par addendum, une date changée, une visite obligatoire.",
          "Un système de change-tracking et d’alertes ‘rouges’ réduit ce risque.",
        ],
      },
    ],
  },
  {
    slug: "suivre-addenda",
    title: "Suivre addenda, Q&A, et changements",
    subtitle:
      "Pourquoi la surveillance des modifications est la fonctionnalité la plus rentable côté fournisseurs.",
    sections: [
      {
        heading: "Pourquoi c’est critique",
        paragraphs: [
          "Une offre peut être rejetée si une exigence change et n’est pas prise en compte.",
          "Dans les procédures digitales, les modifications peuvent être publiées en continu: pièces, dates, clarifications.",
        ],
      },
      {
        heading: "Ce qu’il faut suivre",
        paragraphs: [
          "Dates clés, nouvelles pièces, versions de documents, et réponses officielles aux questions.",
          "Conservez un historique et un ‘diff’ lisible pour chaque changement.",
        ],
      },
    ],
  },
  {
    slug: "travailler-par-region",
    title: "Travailler par région: approche de veille",
    subtitle:
      "Comment structurer la veille quand les points de publication sont multiples.",
    sections: [
      {
        heading: "Normaliser avant de filtrer",
        paragraphs: [
          "Unifiez les champs: acheteur, territoire, catégorie, dates.",
          "Dédupliquez les avis similaires avant d’appliquer des règles métiers.",
        ],
      },
      {
        heading: "Règles simples",
        paragraphs: [
          "Filtrez par territoire d’exécution, ticket minimum, et catégorie.",
          "Ajoutez une watchlist d’acheteurs récurrents et des alertes sur leurs changements.",
        ],
      },
    ],
  },
];

export function getGuideBySlug(slug: string): GuideDoc | undefined {
  const s = (slug || "").trim().toLowerCase();
  return GUIDES.find((g) => g.slug === s);
}
