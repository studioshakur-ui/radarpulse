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
  recommendation: "GO" | "HOLD" | "NO_GO";
  rationale: string;
  breakdown: Record<string, unknown>;
};

type UserProfile = {
  user_id: string;
  country_focus: string | null;
  organization: string | null;
};

type Recommendation = "GO" | "HOLD" | "NO_GO";

function nowIso(): string {
  return new Date().toISOString();
}

function daysUntilDeadline(deadlineAt: string | null | undefined): number | null {
  if (!deadlineAt) return null;
  const ts = new Date(deadlineAt).getTime();
  if (!Number.isFinite(ts)) return null;
  return (ts - Date.now()) / (1000 * 60 * 60 * 24);
}

function deadlineScoreMultiplier(daysLeft: number | null): number {
  if (daysLeft === null) return 1;
  if (daysLeft < 0) return 0;
  if (daysLeft <= 1) return 0.15;
  if (daysLeft <= 3) return 0.35;
  if (daysLeft <= 7) return 0.55;
  if (daysLeft <= 14) return 0.75;
  if (daysLeft <= 30) return 0.9;
  return 1;
}

function deriveRecommendation(args: {
  scoreValue: number;
  scoreBand: "high" | "med" | "low";
  deadlineAt: string | null;
  needsReview: boolean;
  countryMatch: boolean | null;
}): Recommendation {
  const daysLeft = daysUntilDeadline(args.deadlineAt);

  if (daysLeft !== null && daysLeft < 0) return "NO_GO";
  if (args.scoreValue < 0.35) return "NO_GO";
  if (args.scoreBand === "low" && args.scoreValue < 0.45) return "NO_GO";
  if (args.countryMatch === false && args.scoreValue < 0.5) return "NO_GO";

  if (args.needsReview && args.scoreValue < 0.6) return "HOLD";
  if (daysLeft !== null && daysLeft <= 3 && args.scoreValue < 0.6) return "HOLD";

  if (args.scoreValue >= 0.68 && args.scoreBand === "high" && !args.needsReview) return "GO";
  if (args.scoreValue >= 0.62 && args.countryMatch !== false && !args.needsReview) return "GO";
  return "HOLD";
}

function isRecommendation(value: unknown): value is Recommendation {
  return value === "GO" || value === "HOLD" || value === "NO_GO";
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
  let deadlineDays: number | null = null;
  if (extraction.deadline_at) {
    try {
      const daysUntil =
        (new Date(extraction.deadline_at).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);
      deadlineDays = daysUntil;
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
  const rawValue = Math.min(1.0, Math.max(0.0, raw));
  const deadlineMultiplier = deadlineScoreMultiplier(deadlineDays);
  breakdown.deadline_multiplier = deadlineMultiplier;
  const value = Math.min(1.0, Math.max(0.0, rawValue * deadlineMultiplier));

  const band: "high" | "med" | "low" =
    value >= 0.65 ? "high" : value >= 0.35 ? "med" : "low";
  const countryMatch = focus && oppCountry ? focus === oppCountry : null;
  const recommendation = deriveRecommendation({
    scoreValue: value,
    scoreBand: band,
    deadlineAt: extraction.deadline_at,
    needsReview: extraction.needs_review,
    countryMatch,
  });

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
    `Recommendation: ${recommendation === "NO_GO" ? "NO-GO" : recommendation}`,
  ].join(" | ");

  return { value, band, recommendation, rationale, breakdown };
}

async function insertScoreAgentRun(
  supabase: SupabaseClientLike,
  args: {
    opportunityId: string;
    userId: string;
    extractionId: string;
    triggerType: string;
    scoringPath: string;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      agent_type: "score",
      status: "running",
      trigger_type: args.triggerType,
      opportunity_id: args.opportunityId,
      user_id: args.userId,
      agent_version: SCORE_AGENT_VERSION,
      started_at: nowIso(),
      input_ref: { extraction_id: args.extractionId },
      meta: {
        score_version: SCORE_VERSION,
        extraction_id: args.extractionId,
        scoring_path: args.scoringPath,
      },
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
    triggerType?: string;
    scoringPath?: string;
  },
): Promise<void> {
  const { opportunityId, extractionId, extraction } = args;
  const triggerType = args.triggerType ?? "system";
  const scoringPath = args.scoringPath ?? "rp_score_v1";

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
      triggerType,
      scoringPath,
    });

    if (!agentRunId) continue;

    const started = Date.now();

    try {
      const score = computeHeuristicScore(extraction, profile);
      const countryMatch = profile.country_focus?.trim().toUpperCase() && extraction.country_code?.trim().toUpperCase()
        ? profile.country_focus.trim().toUpperCase() === extraction.country_code.trim().toUpperCase()
        : null;
      const recommendation = isRecommendation(score.recommendation)
        ? score.recommendation
        : deriveRecommendation({
            scoreValue: score.value,
            scoreBand: score.band,
            deadlineAt: extraction.deadline_at,
            needsReview: extraction.needs_review,
            countryMatch,
          });

      if (!isRecommendation(score.recommendation)) {
        console.error("[rp_score_v1] invalid heuristic recommendation, falling back", {
          user_id: profile.user_id,
          opportunity_id: opportunityId,
          raw_recommendation: score.recommendation ?? null,
          derived_recommendation: recommendation,
        });
      }

      // Mark previous current score as not current
      await supabase
        .from("opportunity_scores")
        .update({ is_current: false })
        .eq("opportunity_id", opportunityId)
        .eq("user_id", profile.user_id)
        .eq("is_current", true);

      // Insert new current score
      const { data: insertedScore, error: insertErr } = await supabase
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
          recommendation,
          rationale_summary: score.rationale,
          rationale_json: score.breakdown,
          input_profile_snapshot: {
            country_focus: profile.country_focus,
            organization: profile.organization,
          },
          input_extraction_id: extractionId,
        })
        .select("id, recommendation")
        .single();

      if (insertErr) throw new Error(insertErr.message);
      if (!isRecommendation(insertedScore?.recommendation)) {
        throw new Error("heuristic recommendation persisted as null/invalid");
      }

      await supabase
        .from("agent_runs")
        .update({
          status: "success",
          finished_at: nowIso(),
          duration_ms: Date.now() - started,
          output_ref: {
            score_value: score.value,
            score_band: score.band,
            recommendation,
            opportunity_id: opportunityId,
            score_id: insertedScore.id,
          },
          meta: {
            score_version: SCORE_VERSION,
            extraction_id: extractionId,
            scoring_path: scoringPath,
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
          meta: {
            score_version: SCORE_VERSION,
            extraction_id: extractionId,
            scoring_path: scoringPath,
          },
        })
        .eq("id", agentRunId);
    }
  }
}
