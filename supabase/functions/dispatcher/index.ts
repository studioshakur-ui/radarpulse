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
      // started_at older than 25 minutes
      .lt("started_at", new Date(now.getTime() - 25 * 60_000).toISOString())
      .is("finished_at", null);

    const { data: sources, error } = await sb
      .from("sources")
      .select("id, key, kind, is_active, schedule_minutes, last_run_at, country_code")
      .eq("is_active", true)
      .eq("country_code", "IT");

    if (error) throw error;

    let created = 0;
    let skippedAlreadyPending = 0;
    const selectedByKind: Record<string, number> = {};

    for (const s of sources ?? []) {
      const k = String((s as { kind?: unknown }).kind ?? "unknown");
      selectedByKind[k] = (selectedByKind[k] ?? 0) + 1;
    }

    for (const s of sources ?? []) {
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
      }),
    );

    return new Response(JSON.stringify({ ok: true, created }), {
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
