// supabase/functions/_shared/rp_score_v1.ts
// RadarPulse — Heuristic scoring V1
//
// Computes a per-user relevance score for an opportunity immediately after
// AI extraction completes. No LLM call: pure rule-based heuristic.
//
// Score = (extraction quality + completeness) × country factor + deadline bonus
// Result stored in opportunity_scores (append-only, is_current flag).

const SCORE_AGENT_VERSION = "score.heuristic.v1";
const SCORE_VERSION = "v1.heuristic";

type SupabaseClientLike = {
  from: (table: string) => any;
};

export type ScoreExtractionInput = {
  country_code: string | null;
  deadline_at: string | null;
  budget_value: number | null;
  extraction_quality: "high" | "med" | "low";
  needs_review: boolean;
  missing_fields: string[];
  quality_score: number;
  completeness_score: number;
  sector: string | null;
  summary_10s: string;
};

type HeuristicResult = {
  value: number;
  band: "high" | "med" | "low";
  rationale: string;
  breakdown: Record<string, unknown>;
};

type UserProfile = {
  user_id: string;
  country_focus: string | null;
  organization: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function computeHeuristicScore(
  extraction: ScoreExtractionInput,
  profile: UserProfile,
): HeuristicResult {
  const breakdown: Record<string, unknown> = {};

  // 1. Quality base (50%): combined quality + completeness weighted by AI quality tier
  const qualityMultiplier =
    extraction.extraction_quality === "high" ? 1.0
    : extraction.extraction_quality === "med" ? 0.7
    : 0.4;

  const baseScore =
    extraction.quality_score * 0.5 + extraction.completeness_score * 0.3;
  const qualityBase = Math.min(1.0, baseScore * qualityMultiplier);
  breakdown.quality_base = qualityBase;
  breakdown.extraction_quality = extraction.extraction_quality;

  // 2. Country factor (multiplier): profile match boosts relevance
  let countryFactor = 1.0;
  const focus = profile.country_focus?.trim().toUpperCase() ?? null;
  const oppCountry = extraction.country_code?.trim().toUpperCase() ?? null;

  if (!focus || focus === "GLOBAL") {
    countryFactor = 0.9; // slight neutral penalty for unfocused profiles
  } else if (oppCountry && focus === oppCountry) {
    countryFactor = 1.3; // explicit country match
  } else {
    countryFactor = 0.6; // mismatch
  }
  breakdown.country_factor = countryFactor;
  breakdown.country_match = focus && oppCountry ? focus === oppCountry : null;

  // 3. Deadline bonus (up to +0.15): urgency signal
  let deadlineBonus = 0;
  if (extraction.deadline_at) {
    try {
      const daysUntil =
        (new Date(extraction.deadline_at).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);
      if (daysUntil > 0 && daysUntil <= 90) {
        deadlineBonus =
          daysUntil <= 14 ? 0.15
          : daysUntil <= 30 ? 0.10
          : 0.05;
      }
      breakdown.days_until_deadline = Math.round(daysUntil);
    } catch {
      // malformed date: ignore bonus
    }
  }
  breakdown.deadline_bonus = deadlineBonus;

  // 4. Penalize needs_review
  const reviewPenalty = extraction.needs_review ? 0.05 : 0;
  breakdown.review_penalty = reviewPenalty;

  const raw = qualityBase * countryFactor + deadlineBonus - reviewPenalty;
  const value = Math.min(1.0, Math.max(0.0, raw));

  const band: "high" | "med" | "low" =
    value >= 0.65 ? "high" : value >= 0.35 ? "med" : "low";

  const countryLabel =
    !focus || focus === "GLOBAL" ? "global"
    : oppCountry && focus === oppCountry ? `${oppCountry} match`
    : `no match (${focus}/${oppCountry ?? "?"})`;

  const rationale = [
    `Quality: ${extraction.extraction_quality} (${(qualityBase * 100).toFixed(0)}%)`,
    `Country: ${countryLabel}`,
    extraction.deadline_at
      ? `Deadline bonus: +${(deadlineBonus * 100).toFixed(0)}%`
      : "No deadline",
    `Score: ${(value * 100).toFixed(0)}% → ${band}`,
  ].join(" | ");

  return { value, band, rationale, breakdown };
}

async function insertScoreAgentRun(
  supabase: SupabaseClientLike,
  args: {
    opportunityId: string;
    userId: string;
    extractionId: string;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      agent_type: "score",
      status: "running",
      trigger_type: "worker",
      opportunity_id: args.opportunityId,
      user_id: args.userId,
      agent_version: SCORE_AGENT_VERSION,
      started_at: nowIso(),
      input_ref: { extraction_id: args.extractionId },
      meta: { score_version: SCORE_VERSION },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error(
      "[rp_score_v1] failed to insert agent_run:",
      error?.message ?? "no id returned",
    );
    return null;
  }

  return String(data.id);
}

export async function scoreOpportunityForProfiles(
  supabase: SupabaseClientLike,
  args: {
    opportunityId: string;
    extractionId: string;
    extraction: ScoreExtractionInput;
  },
): Promise<void> {
  const { opportunityId, extractionId, extraction } = args;

  // Only score for users who have completed onboarding
  const { data: profiles, error: profilesErr } = await supabase
    .from("user_profiles")
    .select("user_id, country_focus, organization")
    .not("onboarding_complete_at", "is", null);

  if (profilesErr) {
    console.error("[rp_score_v1] failed to load user_profiles:", profilesErr.message);
    return;
  }

  if (!profiles?.length) return;

  for (const profile of profiles as UserProfile[]) {
    const agentRunId = await insertScoreAgentRun(supabase, {
      opportunityId,
      userId: profile.user_id,
      extractionId,
    });

    if (!agentRunId) continue;

    const started = Date.now();

    try {
      const score = computeHeuristicScore(extraction, profile);

      // Mark previous current score as not current
      await supabase
        .from("opportunity_scores")
        .update({ is_current: false })
        .eq("opportunity_id", opportunityId)
        .eq("user_id", profile.user_id)
        .eq("is_current", true);

      // Insert new current score
      const { error: insertErr } = await supabase
        .from("opportunity_scores")
        .insert({
          opportunity_id: opportunityId,
          agent_run_id: agentRunId,
          user_id: profile.user_id,
          subject_type: "user",
          is_current: true,
          is_backfilled: false,
          score_version: SCORE_VERSION,
          model: null,
          score_value: score.value,
          score_band: score.band,
          rationale_summary: score.rationale,
          rationale_json: score.breakdown,
          input_profile_snapshot: {
            country_focus: profile.country_focus,
            organization: profile.organization,
          },
          input_extraction_id: extractionId,
        });

      if (insertErr) throw new Error(insertErr.message);

      await supabase
        .from("agent_runs")
        .update({
          status: "success",
          finished_at: nowIso(),
          duration_ms: Date.now() - started,
          output_ref: {
            score_value: score.value,
            score_band: score.band,
            opportunity_id: opportunityId,
          },
        })
        .eq("id", agentRunId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[rp_score_v1] score insert failed for user", profile.user_id, ":", msg);
      await supabase
        .from("agent_runs")
        .update({
          status: "error",
          finished_at: nowIso(),
          duration_ms: Date.now() - started,
          error_message: msg.slice(0, 2000),
        })
        .eq("id", agentRunId);
    }
  }
}
