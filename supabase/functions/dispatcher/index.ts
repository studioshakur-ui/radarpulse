import { corsHeaders } from "../_shared/cors.ts";
import { sbAdmin } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = sbAdmin();
    const now = new Date();

    const { data: sources, error } = await sb
      .from("sources")
      .select("id, is_active, schedule_minutes, last_run_at")
      .eq("is_active", true);

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
      if (insErr) throw insErr;

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
