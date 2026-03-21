import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ENV } from "@/lib/env";
import { AuthTokenError, getValidAccessToken, recoverInvalidSession } from "@/lib/authToken";
import { useLocale } from "@/lib/i18n";

export type OpportunityScore = {
  score_value: number;
  score_band: "high" | "med" | "low";
  recommendation: "GO" | "HOLD" | "NO_GO" | null;
  rationale_summary: string;
  rationale_json: Record<string, unknown> | null;
};

function toScoreBand(value: number): "high" | "med" | "low" {
  if (value >= 0.65) return "high";
  if (value >= 0.4) return "med";
  return "low";
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

function applyDeadlineAdjustment(
  score: OpportunityScore | null,
  deadlineAt: string | null | undefined,
  locale: string,
): OpportunityScore | null {
  if (!score) return null;
  const daysLeft = daysUntilDeadline(deadlineAt);
  const adjustedValue = Math.round(
    Math.min(1, Math.max(0, score.score_value * deadlineScoreMultiplier(daysLeft))) * 1000,
  ) / 1000;
  const adjustedBand = toScoreBand(adjustedValue);
  const adjustedSummary = (() => {
    if (daysLeft === null) return score.rationale_summary;
    if (daysLeft < 0) {
      if (locale === "fr") return "La date limite est dépassée. Cette opportunité devient automatiquement NO-GO.";
      if (locale === "it") return "La scadenza è superata. Questa opportunità diventa automaticamente NO-GO.";
      return "The deadline has passed. This opportunity is automatically NO-GO.";
    }
    if (daysLeft <= 3) {
      const days = Math.max(0, Math.ceil(daysLeft));
      if (locale === "fr") return `Échéance imminente (${days} j). Le score est abaissé pour refléter la pression temporelle.`;
      if (locale === "it") return `Scadenza imminente (${days} g). Lo score è ridotto per riflettere la pressione temporale.`;
      return `Deadline is imminent (${days}d). The score is reduced to reflect time pressure.`;
    }
    return score.rationale_summary;
  })();

  return {
    ...score,
    score_value: adjustedValue,
    score_band: adjustedBand,
    rationale_summary: adjustedSummary,
    recommendation: daysLeft !== null && daysLeft < 0 ? "NO_GO" : score.recommendation,
  };
}

export function useOpportunityScore(opportunityId: string | null, deadlineAt?: string | null) {
  const { locale } = useLocale();
  const [score, setScore] = useState<OpportunityScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current score from DB
  useEffect(() => {
    if (!opportunityId) {
      setScore(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId || cancelled) return;

        const { data } = await supabase
          .from("opportunity_scores")
          .select("score_value, score_band, recommendation, rationale_summary, rationale_json")
          .eq("opportunity_id", opportunityId)
          .eq("user_id", userId)
          .eq("is_current", true)
          .eq("output_locale", locale)
          .maybeSingle();

        if (!cancelled) setScore(applyDeadlineAdjustment(data ?? null, deadlineAt, locale));
      } catch {
        // silent — score is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deadlineAt, locale, opportunityId]);

  // Call edge function to generate a score
  const generate = useCallback(async (id: string) => {
    if (generating) return;
    setGenerating(true);
    setError(null);

    try {
      const jwt = await getValidAccessToken();

      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/opportunity-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          apikey: ENV.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ id, locale }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !data.score) {
        const errorCode = typeof data.error === "string" ? data.error : "Request failed";
        const details = typeof data.details === "string" ? data.details : null;
        throw new Error(details ? `${errorCode}: ${details}` : errorCode);
      }

      setScore(applyDeadlineAdjustment(data.score as OpportunityScore, deadlineAt, locale));
    } catch (e) {
      if (e instanceof AuthTokenError) {
        void recoverInvalidSession();
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "Error");
      }
    } finally {
      setGenerating(false);
    }
  }, [deadlineAt, generating, locale]);

  return { score, loading, generating, error, generate };
}
