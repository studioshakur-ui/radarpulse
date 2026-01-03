// src/_shared/safeState.ts

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function mergeDefaults<T extends Record<string, any>>(defaults: T, incoming: Partial<T> | null | undefined): T {
  return { ...defaults, ...(incoming || {}) };
}
