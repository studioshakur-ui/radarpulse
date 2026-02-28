import React, { useMemo, useState } from "react";
import { Building2, CalendarDays, CircleGauge, MapPin } from "lucide-react";
import { useInboxData } from "./useInboxData";

function formatDate(iso: string | null): string {
  if (!iso) return "Data non disponibile";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Data non disponibile";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBudget(value: number | null, currency: string | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Budget non disponibile";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuality(score: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "Qualita n/d";
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return `Qualita ${percent}%`;
}

export default function InboxPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [minQualityInput, setMinQualityInput] = useState("");

  const minQuality = useMemo(() => {
    const parsed = Number(minQualityInput);
    if (!minQualityInput.trim() || !Number.isFinite(parsed)) return undefined;
    return Math.max(0, Math.min(1, parsed));
  }, [minQualityInput]);

  const { items, loading, loadingMore, error, hasMore, loadMore } = useInboxData({
    q,
    status,
    minQuality,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-border/35 bg-surface/75 p-6 shadow-soft">
        <h1 className="text-xl font-semibold tracking-tight">Inbox opportunita Italia</h1>
        <p className="mt-1 text-sm text-muted">Ricerca su titolo e stazione appaltante, con caricamento progressivo.</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Ricerca</span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Titolo o ente"
              className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Stato</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
            >
              <option value="all">Tutti</option>
              <option value="active">Attivi</option>
              <option value="closed">Chiusi</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Qualita minima (0-1)</span>
            <input
              value={minQualityInput}
              onChange={(event) => setMinQualityInput(event.target.value)}
              placeholder="es. 0.7"
              inputMode="decimal"
              className="w-full rounded-xl border border-border/35 bg-bg/60 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm text-bad">{error}</div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-2xl border border-border/35 bg-surface/70 p-4 text-sm text-muted">Caricamento in corso...</div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-border/35 bg-surface/70 p-6 text-sm text-muted">
          Nessuna opportunita trovata con i filtri selezionati.
        </div>
      ) : null}

      {!loading ? (
        <section className="mt-5 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border/35 bg-surface/70 p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text">{item.title}</h2>
                  <div className="mt-1 text-sm text-muted">{item.buyer_name || "Ente non disponibile"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-line/40 bg-bg/60 px-2 py-0.5 text-[11px] font-semibold text-subtext">
                    {formatQuality(item.quality_score)}
                  </span>
                  {item.origin_type ? (
                    <span className="inline-flex items-center rounded-full border border-line/40 bg-bg/60 px-2 py-0.5 text-[11px] font-semibold uppercase text-subtext">
                      {item.origin_type}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
                <div className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{item.region || "Italia"}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>Pubblicazione: {formatDate(item.published_at)}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{formatBudget(item.budget_amount, item.budget_currency)}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <CircleGauge className="h-4 w-4" />
                  <span>Scadenza: {formatDate(item.deadline_at)}</span>
                </div>
              </div>
            </article>
          ))}

          {hasMore ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex items-center rounded-xl border border-border/35 bg-surface/80 px-4 py-2 text-sm font-semibold text-text transition hover:bg-elevated/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingMore ? "Caricamento..." : "Carica altro"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
