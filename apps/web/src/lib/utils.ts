import { formatDistanceToNowStrict, format, parseISO, isValid } from "date-fns";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function safeISO(v: string | null | undefined): string | null {
  if (!v) return null;
  try {
    const d = parseISO(v);
    if (!isValid(d)) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    const d = parseISO(v);
    if (!isValid(d)) return "—";
    return format(d, "yyyy-MM-dd HH:mm");
  } catch {
    return "—";
  }
}

export function fmtRelative(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    const d = parseISO(v);
    if (!isValid(d)) return "—";
    return formatDistanceToNowStrict(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

export function daysLeft(deadlineIso: string | null | undefined): number | null {
  if (!deadlineIso) return null;
  try {
    const d = parseISO(deadlineIso);
    if (!isValid(d)) return null;
    const ms = d.getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
