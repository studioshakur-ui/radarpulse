// src/_shared/defaults.ts

export type InboxFilters = {
  showNoGo: boolean;
  deadline: "any" | "today" | "week" | "overdue";
  // Si tu as d'autres filtres, ajoute-les ici, mais garde des defaults
  // stricts et immuables.
};

export const DEFAULT_INBOX_FILTERS: InboxFilters = Object.freeze({
  showNoGo: false,
  deadline: "any",
});

export type WorkspaceLike = {
  id?: string;
  name?: string;
  // Point critique: onlyPublic doit exister partout avec une valeur bool.
  onlyPublic?: boolean;
};

export function normalizeWorkspace<T extends WorkspaceLike>(ws: T | null | undefined): T & { onlyPublic: boolean } {
  // Normalisation “source of truth”: garantit un booléen
  // même si le backend/DB renvoie undefined/null.
  return {
    ...(ws as T),
    onlyPublic: Boolean(ws?.onlyPublic),
  };
}

export function safeOnlyPublic(ws: WorkspaceLike | null | undefined): boolean {
  return Boolean(ws?.onlyPublic);
}
