// apps/web/src/pages/InboxPage.tsx
import React, { useState } from "react";
import { useInboxData } from "@/hooks/useInboxData";

export default function InboxPage() {
  const {
    data,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  } = useInboxData({});

  const [q, setQ] = useState(filters.q ?? "");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Inbox Opportunités 🇮🇹</h1>

      {/* 🔎 Search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Recherche titre ou acheteur"
          className="border p-2 flex-1"
        />
        <button
          onClick={() =>
            setFilters((f) => ({ ...f, q: q.trim() || undefined }))
          }
          className="btn btn-primary"
        >
          Rechercher
        </button>
      </div>

      {/* 📊 Mini filtres */}
      <div className="grid grid-cols-auto gap-2 mb-4">
        <select
          value={filters.region ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              region: e.target.value || undefined,
            }))
          }
          className="border p-2"
        >
          <option value="">Toutes Régions</option>
          <option value="Lombardia">Lombardia</option>
          <option value="Lazio">Lazio</option>
          <option value="Toscana">Toscana</option>
          {/* ← ajouter dynamiquement plus tard */}
        </select>

        <input
          type="number"
          placeholder="Budget min"
          value={filters.budgetMin ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              budgetMin: e.target.value
                ? Number(e.target.value)
                : undefined,
            }))
          }
          className="border p-2"
        />

        <input
          type="number"
          placeholder="Budget max"
          value={filters.budgetMax ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              budgetMax: e.target.value
                ? Number(e.target.value)
                : undefined,
            }))
          }
          className="border p-2"
        />

        <input
          type="date"
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              deadlineBefore: e.target.value || undefined,
            }))
          }
          className="border p-2"
        />
      </div>

      {/* 🔁 Refresh */}
      <button
        onClick={() => void refetch()}
        disabled={loading}
        className="btn btn-secondary mb-4"
      >
        {loading ? "Chargement…" : "Actualiser"}
      </button>

      {/* ❌ Error */}
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* 📋 Liste */}
      <table className="table w-full">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Acheteur</th>
            <th>Région</th>
            <th>Budget</th>
            <th>Deadline</th>
          </tr>
        </thead>
        <tbody>
          {data.map((o) => (
            <tr key={o.id}>
              <td>{o.title}</td>
              <td>{o.buyer_name}</td>
              <td>{o.region}</td>
              <td>
                {o.budget_amount
                  ? `${o.budget_amount} ${o.budget_currency}`
                  : "-"}
              </td>
              <td>
                {o.deadline_at
                  ? new Date(o.deadline_at).toLocaleDateString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!loading && data.length === 0 && (
        <div className="text-gray-600 mt-4">Aucune opportunité trouvée</div>
      )}
    </div>
  );
}