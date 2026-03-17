import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";

function serializeError(err: unknown): { message: string; details?: Record<string, unknown> } {
  if (err instanceof Error) {
    return { message: err.message };
  }

  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const message = String(anyErr.message ?? anyErr.error_description ?? anyErr.error ?? "Unknown error");
    const details: Record<string, unknown> = {};

    for (const k of ["code", "details", "hint", "status", "name"]) {
      if (anyErr[k] !== undefined) details[k] = anyErr[k];
    }

    return Object.keys(details).length ? { message, details } : { message };
  }

  return { message: String(err) };
}

// A running job older than this threshold is assumed to have crashed (worker timed out
// without setting finished_at). Configurable so it can be bumped without a redeploy.
// Must be higher than the worker edge-function wall-clock limit (~400 s on Supabase).
const STALE_JOB_TIMEOUT_MS =
  Math.max(1, parseInt(Deno.env.get("DISPATCHER_STALE_MINUTES") || "25", 10)) * 60_000;

// Maximum number of jobs that may sit in the "queued" state at one time.
// Guards against flooding the queue after extended downtime when many sources become
// simultaneously due. Workers will drain the queue at their own pace.
const MAX_QUEUED_JOBS =
  Math.max(1, parseInt(Deno.env.get("DISPATCHER_MAX_QUEUED") || "20", 10));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = sbAdmin();
    const auth = req.headers.get("Authorization") ?? "";
    if (auth) {
      if (!auth.toLowerCase().startsWith("bearer ")) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid Authorization header format" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      const token = auth.slice(7).trim();
      const { data, error } = await sb.auth.getUser(token);
      if (error || !data?.user?.id) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid JWT token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    }

    const now = new Date();

    // Safety valve: if a worker crashed mid-flight, jobs can remain "running" forever.
    // Mark them as error so the scheduler can enqueue a new job.
    // (The unique open-job constraint we add in SQL relies on this to avoid deadlocks.)
    await sb
      .from("ingestion_jobs")
      .update({
        status: "error",
        finished_at: now.toISOString(),
        error: "Stale running job (auto cleanup)",
      })
      .eq("status", "running")
      .lt("started_at", new Date(now.getTime() - STALE_JOB_TIMEOUT_MS).toISOString())
      .is("finished_at", null);

    const { data: sources, error } = await sb
      .from("sources")
      .select("id, key, kind, is_active, schedule_minutes, last_run_at, country_code")
      .eq("is_active", true);

    if (error) throw error;

    // Cap: count jobs already queued; stop inserting once the limit is reached.
    const { count: queuedCount, error: countErr } = await sb
      .from("ingestion_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued");

    if (countErr) throw countErr;

    let created = 0;
    let skippedAlreadyPending = 0;
    let skippedQueueFull = 0;
    const selectedByKind: Record<string, number> = {};

    for (const s of sources ?? []) {
      const k = String((s as { kind?: unknown }).kind ?? "unknown");
      selectedByKind[k] = (selectedByKind[k] ?? 0) + 1;
    }

    for (const s of sources ?? []) {
      // Stop creating new jobs once the queue is already at capacity.
      if (created + (queuedCount ?? 0) >= MAX_QUEUED_JOBS) {
        skippedQueueFull++;
        continue;
      }

      const last = s.last_run_at ? new Date(s.last_run_at) : null;
      const due =
        !last || (now.getTime() - last.getTime()) >= (s.schedule_minutes * 60_000);

      if (!due) continue;

      const { error: insErr } = await sb.from("ingestion_jobs").insert({
        source_id: s.id,
        status: "queued",
        run_at: now.toISOString(),
        payload: {},
      });

      // If we enforce "one open job per source" (queued|running), this insert can fail
      // with a duplicate-key error. That is expected; just skip without breaking the loop.
      if (insErr) {
        const code = (insErr as any).code as string | undefined;
        const msg = String((insErr as any).message || insErr);
        if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
          skippedAlreadyPending++;
          continue;
        }
        throw insErr;
      }

      const { error: upErr } = await sb
        .from("sources")
        .update({ last_run_at: now.toISOString() })
        .eq("id", s.id);
      if (upErr) throw upErr;

      created++;
    }

    console.info(
      JSON.stringify({
        event: "dispatcher_dispatch_summary",
        selected_sources_total: (sources ?? []).length,
        selected_sources_by_kind: selectedByKind,
        scheduled_jobs_count: created,
        skipped_already_pending_count: skippedAlreadyPending,
        skipped_queue_full_count: skippedQueueFull,
        queued_before_run: queuedCount ?? 0,
        max_queued_jobs: MAX_QUEUED_JOBS,
        stale_timeout_minutes: STALE_JOB_TIMEOUT_MS / 60_000,
      }),
    );

    return new Response(JSON.stringify({ ok: true, created, skippedQueueFull }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const ser = serializeError(e);
    return new Response(JSON.stringify({ ok: false, error: ser.message, details: ser.details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
