import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";

type PurgeRequest = {
  // Optional: if omitted, defaults to ['test_rss','test_source'].
  source_keys?: string[];
  // Required: must match DEV_CALL_KEY.
  key?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function uniqStrings(xs: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of Array.isArray(xs) ? xs : []) {
    const s = String(v ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function selectSourceIds(sb: ReturnType<typeof sbAdmin>, keys: string[]) {
  const { data, error } = await sb.from("sources").select("id,key").in("key", keys);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ id: string; key: string }>;
  return rows;
}

async function selectOpportunityIdsBySource(sb: ReturnType<typeof sbAdmin>, sourceIds: string[]) {
  const ids: string[] = [];
  for (const batch of chunk(sourceIds, 200)) {
    const { data, error } = await sb.from("opportunities").select("id").in("source_id", batch);
    if (error) throw error;
    for (const r of (data ?? []) as any[]) {
      if (r?.id) ids.push(String(r.id));
    }
  }
  return ids;
}

async function selectRawIdsBySourceKey(sb: ReturnType<typeof sbAdmin>, sourceKeys: string[]) {
  const ids: string[] = [];
  for (const batch of chunk(sourceKeys, 200)) {
    const { data, error } = await sb.from("opportunities_raw").select("id").in("source_key", batch);
    if (error) throw error;
    for (const r of (data ?? []) as any[]) {
      if (r?.id) ids.push(String(r.id));
    }
  }
  return ids;
}

async function selectAiIdsByRawIds(sb: ReturnType<typeof sbAdmin>, rawIds: string[]) {
  const ids: string[] = [];
  for (const batch of chunk(rawIds, 200)) {
    const { data, error } = await sb.from("opportunity_ai").select("id").in("raw_id", batch);
    if (error) throw error;
    for (const r of (data ?? []) as any[]) {
      if (r?.id) ids.push(String(r.id));
    }
  }
  return ids;
}

async function deleteByIn(sb: ReturnType<typeof sbAdmin>, table: string, col: string, ids: string[]) {
  let deleted = 0;
  for (const batch of chunk(ids, 200)) {
    if (!batch.length) continue;
    const { error, count } = await sb.from(table).delete({ count: "exact" }).in(col, batch);
    if (error) throw error;
    deleted += Number(count ?? 0);
  }
  return deleted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const DEV_CALL_KEY = Deno.env.get("DEV_CALL_KEY") || "";
    if (!DEV_CALL_KEY) return json({ ok: false, error: "Missing DEV_CALL_KEY" }, 500);

    const body = (await req.json().catch(() => null)) as PurgeRequest | null;
    const key = String(body?.key ?? "");
    if (key !== DEV_CALL_KEY) return json({ ok: false, error: "Bad dev key" }, 401);

    const sourceKeys = uniqStrings(body?.source_keys ?? ["test_rss", "test_source"]);
    if (!sourceKeys.length) return json({ ok: false, error: "Missing source_keys" }, 400);

    const sb = sbAdmin();

    // 1) Resolve sources
    const sources = await selectSourceIds(sb, sourceKeys);
    const sourceIds = sources.map((s) => s.id);

    // Nothing to do
    if (!sourceIds.length) {
      return json({ ok: true, message: "no_sources", source_keys: sourceKeys, deleted: {} }, 200);
    }

    // 2) Resolve dependent IDs
    const opportunityIds = await selectOpportunityIdsBySource(sb, sourceIds);
    const rawIds = await selectRawIdsBySourceKey(sb, sourceKeys);
    const aiIds = rawIds.length ? await selectAiIdsByRawIds(sb, rawIds) : [];

    // 3) Delete in dependency order
    const deletedOpportunityEvents = opportunityIds.length
      ? await deleteByIn(sb, "opportunity_events", "opportunity_id", opportunityIds)
      : 0;

    const deletedAiEvidence = aiIds.length ? await deleteByIn(sb, "opportunity_ai_evidence", "ai_id", aiIds) : 0;

    // rp_ai_runs uses raw_id
    const deletedAiRuns = rawIds.length ? await deleteByIn(sb, "rp_ai_runs", "raw_id", rawIds) : 0;

    const deletedAiRows = rawIds.length ? await deleteByIn(sb, "opportunity_ai", "raw_id", rawIds) : 0;

    const deletedOpportunities = sourceIds.length ? await deleteByIn(sb, "opportunities", "source_id", sourceIds) : 0;

    const deletedRaws = sourceKeys.length ? await deleteByIn(sb, "opportunities_raw", "source_key", sourceKeys) : 0;

    const deletedSources = sourceIds.length ? await deleteByIn(sb, "sources", "id", sourceIds) : 0;

    return json(
      {
        ok: true,
        source_keys: sourceKeys,
        resolved: {
          sources: sources.map((s) => ({ key: s.key, id: s.id })),
          opportunity_ids: opportunityIds.length,
          raw_ids: rawIds.length,
          ai_ids: aiIds.length,
        },
        deleted: {
          opportunity_events: deletedOpportunityEvents,
          opportunity_ai_evidence: deletedAiEvidence,
          rp_ai_runs: deletedAiRuns,
          opportunity_ai: deletedAiRows,
          opportunities: deletedOpportunities,
          opportunities_raw: deletedRaws,
          sources: deletedSources,
        },
      },
      200
    );
  } catch (e) {
    const errObj =
      typeof e === "object" && e !== null
        ? {
            name: (e as any).name,
            message: (e as any).message,
            stack: (e as any).stack,
            details: (e as any).details,
            hint: (e as any).hint,
            code: (e as any).code,
          }
        : { message: String(e) };

    return json({ ok: false, error: errObj }, 500);
  }
});
