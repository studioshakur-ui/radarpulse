export type SlugItem = {
  slug: string;
  name: string;
};

export const ITALY_REGIONS: SlugItem[] = [
  { slug: "abruzzo", name: "Abruzzo" },
  { slug: "basilicata", name: "Basilicata" },
  { slug: "calabria", name: "Calabria" },
  { slug: "campania", name: "Campania" },
  { slug: "emilia-romagna", name: "Emilia-Romagna" },
  { slug: "friuli-venezia-giulia", name: "Friuli-Venezia Giulia" },
  { slug: "lazio", name: "Lazio" },
  { slug: "liguria", name: "Liguria" },
  { slug: "lombardia", name: "Lombardia" },
  { slug: "marche", name: "Marche" },
  { slug: "molise", name: "Molise" },
  { slug: "piemonte", name: "Piemonte" },
  { slug: "puglia", name: "Puglia" },
  { slug: "sardegna", name: "Sardegna" },
  { slug: "sicilia", name: "Sicilia" },
  { slug: "toscana", name: "Toscana" },
  { slug: "trentino-alto-adige", name: "Trentino-Alto Adige" },
  { slug: "umbria", name: "Umbria" },
  { slug: "valle-d-aosta", name: "Valle d’Aosta" },
  { slug: "veneto", name: "Veneto" },
];

export const ITALY_CATEGORIES: SlugItem[] = [
  { slug: "facility-management", name: "Facility management" },
  { slug: "manutenzione", name: "Manutenzione" },
  { slug: "impianti-elettrici", name: "Impianti elettrici" },
  { slug: "impianti-termici-hvac", name: "Impianti termici / HVAC" },
  { slug: "pulizie", name: "Pulizie" },
  { slug: "sicurezza", name: "Sicurezza" },
  { slug: "edilizia", name: "Edilizia" },
  { slug: "strade", name: "Strade / lavori pubblici" },
  { slug: "servizi-professionali", name: "Servizi professionali" },
  { slug: "it-telecom", name: "IT / Telecom" },
];

export function titleFromSlug(slug: string): string {
  const s = (slug || "").trim().toLowerCase();
  if (!s) return "";

  const candidates = [...ITALY_REGIONS, ...ITALY_CATEGORIES];
  const hit = candidates.find((x) => x.slug === s);
  if (hit) return hit.name;

  return s
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function normalizeSlugParam(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().toLowerCase();
}
