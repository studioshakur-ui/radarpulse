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
 * Safe JSON fetch:
 * - fetch + read body text
 * - parse JSON if possible
 * - throws on non-2xx with a helpful message (so the job becomes error with reason)
 */
export async function safeJsonFetch<T>(
  url: string,
  init: (RequestInit & { timeout_ms?: number }) = {},
): Promise<{ data: T; status: number; headers: Headers }> {
  const timeoutMs = typeof init.timeout_ms === "number" ? init.timeout_ms : 30_000;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { timeout_ms: _timeout_ms, ...reqInit } = init;

    const res = await fetch(url, {
      ...reqInit,
      signal: controller.signal,
    });

    const text = await res.text();
    let json: unknown = null;

    if (text && text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        // not JSON
        json = null;
      }
    }

    if (!res.ok) {
      const snippet = text ? text.slice(0, 500) : "";
      throw new Error(`HTTP ${res.status} from ${url}. Body: ${snippet}`);
    }

    // If response is empty but ok, return empty object to avoid crash
    const data = (json ?? ({} as unknown)) as T;

    return { data, status: res.status, headers: res.headers };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Stable, cheap fingerprint used as opportunity identity key.
 *
 * - Prefer external IDs when available.
 * - Fallback to (normalized title + normalized url) when no external ID.
 */
export function makeFingerprint(
  sourceKey: string,
  externalId: string | null | undefined,
  title: string,
  link: string,
) {
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
