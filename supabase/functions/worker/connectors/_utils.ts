import { normalizeText } from "../../_shared/text.ts";

export function safeStr(v: unknown): string {
  return String(v ?? "");
}

export function parseDateToIso(v: unknown): string | null {
  const s = safeStr(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Stable, cheap fingerprint used as opportunity identity key.
 *
 * - Prefer external IDs when available.
 * - Fallback to (normalized title + normalized url) when no external ID.
 */
export function makeFingerprint(sourceKey: string, externalId: string | null | undefined, title: string, link: string) {
  const ext = safeStr(externalId).trim();
  const base = ext
    ? `${sourceKey}::${ext}`
    : `${sourceKey}::${normalizeText(title)}::${normalizeText(link)}`;

  // FNV-1a 32-bit, hex
  let h = 2166136261;
  for (let i = 0; i < base.length; i++) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${sourceKey}::${(h >>> 0).toString(16).padStart(8, "0")}`;
}
