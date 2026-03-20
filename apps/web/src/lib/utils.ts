import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDateTime(value: string | number | Date | null | undefined, locale = "fr-FR") {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function daysLeft(deadline: string | number | Date | null | undefined) {
  if (!deadline) return null;
  const d = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  // Normaliser à minuit pour éviter les effets d’heure
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diff = b - a;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function fmtRelative(value: string | number | Date | null | undefined, locale = "fr-FR") {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date().getTime();
  const diffSec = Math.round((d.getTime() - now) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");

  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");

  const diffHr = Math.round(diffSec / 3600);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");

  const diffDay = Math.round(diffSec / 86400);
  return rtf.format(diffDay, "day");
}

const ORIGIN_TYPE_LABELS: Record<string, Record<string, string>> = {
  WORKS:    { en: "Works",    fr: "Travaux",     it: "Lavori" },
  SERVICES: { en: "Services", fr: "Services",    it: "Servizi" },
  SUPPLIES: { en: "Supplies", fr: "Fournitures", it: "Forniture" },
  OTHER:    { en: "Other",    fr: "Non classé",  it: "Altro" },
};

export function formatOriginType(value: string | null, lang = "en"): string | null {
  if (!value) return null;
  const key = value.toUpperCase();
  return ORIGIN_TYPE_LABELS[key]?.[lang] ?? ORIGIN_TYPE_LABELS[key]?.["en"] ?? value;
}
