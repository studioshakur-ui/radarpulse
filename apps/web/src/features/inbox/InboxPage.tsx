import React, { useMemo, useState } from "react";
import { CalendarDays, Building2, MapPin, Wallet } from "lucide-react";
import { useInboxData } from "./useInboxData";
import type { OpportunityWithMeta } from "./useInboxData";

function asText(v: unknown, fallback = "Not available"): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

function formatDeadline(iso: string | null | undefined): string {
  if (!iso) return "Deadline not provided";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Deadline not provided";
  return d.toLocaleDateString("it-IT", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function extractRegion(row: OpportunityWithMeta): string {
  const raw = (row.raw ?? {}) as Record<string, unknown>;
  const direct = asText(raw.region ?? raw.nuts ?? raw.area ?? raw.location, "");
  if (direct) return direct;
  return "Italy";
}

function extractBudget(row: OpportunityWithMeta): string {
  const raw = (row.raw ?? {}) as Record<string, unknown>;
  const value = raw.budget_amount ?? raw.estimated_value ?? raw.amount ?? raw.totalValue;
  const currency = asText(raw.currency, "EUR");

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${new Intl.NumberFormat("it-IT").format(value)} ${currency}`;
  }
  if (typeof value === "string" && value.trim()) {
    return `${value.trim()} ${currency}`.trim();
  }
  return "Budget not provided";
}

function qualityBadges(row: OpportunityWithMeta): string[] {
  const raw = (row.raw ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  const originType = asText(raw.origin_type, "");
  const completeness = typeof raw.completeness_score === "number" ? raw.completeness_score : null;

  if (originType === "EU") out.push("EU Source");
  if (typeof completeness === "number" && completeness < 0.5) out.push("Low data quality");

  return out;
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-border/35 bg-surface/70 p-8 shadow-soft">
      <div className="text-lg font-semibold tracking-tight">No Italian tenders available</div>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Your inbox is connected, but no active tenders match the current filters for Italy.
      </p>
    </div>
  );
}

function TenderRow({ row }: { row: OpportunityWithMeta }) {
  const authority = asText(row.buyer?.name ?? row.buyer_name, "Authority not provided");
  const region = extractRegion(row);
  const deadline = formatDeadline(row.deadline_at);
  const budget = extractBudget(row);
  const badges = qualityBadges(row);

  return (
    <article className="rounded-2xl border border-border/35 bg-surface/65 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">{asText(row.title, "Untitled tender")}</h2>
        {badges.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-full border border-line/40 bg-surface/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtext"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
        <div className="inline-flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>{authority}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{region}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <span>{deadline}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <span>{budget}</span>
        </div>
      </div>
    </article>
  );
}

export default function InboxPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useInboxData({
    q: query,
    deadline: "any",
    hideNoGo: false,
    onlyPublic: true,
  });

  const rows = useMemo(() => {
    const all = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((row) => {
      const authority = asText(row.buyer?.name ?? row.buyer_name, "");
      const region = extractRegion(row);
      const haystack = `${row.title} ${authority} ${region}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {import.meta.env.DEV ? (
        <div className="mb-4 rounded-2xl border border-line/35 bg-surface/70 p-3 text-xs font-semibold uppercase tracking-wide text-subtext">
          DEV MODE — Origin types visible
        </div>
      ) : null}
      <section className="rounded-3xl border border-border/35 bg-surface/70 p-6 shadow-soft">
        <label htmlFor="inbox-query" className="text-xs font-semibold text-muted">
          Filter Italian tenders
        </label>
        <input
          id="inbox-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-border/35 bg-bg/55 px-4 py-2 text-sm text-text outline-none transition focus:ring-2 focus:ring-accent/40"
        />
        <p className="mt-2 text-xs text-muted">Search by title, authority, or region.</p>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-bad/30 bg-bad/10 p-4 text-sm text-bad">
          Failed to load inbox data.
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-border/35 bg-surface/70 p-4 text-sm text-muted">Loading…</div>
      ) : (
        <section className="mt-6 space-y-3">
          {rows.length ? rows.map((row) => <TenderRow key={row.id} row={row} />) : <EmptyState />}
        </section>
      )}
    </div>
  );
}
