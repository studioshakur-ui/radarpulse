import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = sbAdmin();
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
      .select("id, is_active, schedule_minutes, last_run_at, country_code")
      .eq("is_active", true)
      .eq("country_code", "IT");

    if (error) throw error;

    let created = 0;

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

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
