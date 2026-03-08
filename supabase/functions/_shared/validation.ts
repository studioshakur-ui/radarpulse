// _shared/validation.ts — RadarPulse
// BUG-31 FIX: centralised input validation helpers used across all Edge Functions.
// Keeps validation logic consistent and avoids duplicating regex / logic.

/** Strict email validation (allows 2+ char TLDs, standard chars only) */
export function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

/** UUID v4 format validation */
export function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** ISO 8601 datetime prefix validation (e.g. "2026-03-08T...") */
export function validateISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
