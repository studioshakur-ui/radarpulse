export function normalizeText(v: string): string {
  return (v || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function safeStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function containsAnyKeyword(haystack: string, keywords: string[]): boolean {
  const h = normalizeText(haystack);
  for (const k of keywords) {
    const kk = normalizeText(k);
    if (!kk) continue;
    if (h.includes(kk)) return true;
  }
  return false;
}
