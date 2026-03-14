import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type OnboardingProfile = {
  full_name: string;
  organization: string;
  country_focus: string;
};

export type OnboardingNotifications = {
  email_digest_enabled: boolean;
  email_digest_frequency: "immediate" | "daily" | "weekly" | "off";
};

export type OnboardingState = OnboardingProfile & OnboardingNotifications;

export function useOnboarding(user: User | null) {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setChecking(false);
      return;
    }

    void supabase
      .from("user_profiles")
      .select("onboarding_complete_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNeedsOnboarding(!data?.onboarding_complete_at);
        setChecking(false);
      });
  }, [user?.id]);

  const complete = useCallback(
    async (state: OnboardingState) => {
      if (!user?.id) return;
      setSaving(true);

      try {
        const now = new Date().toISOString();

        await supabase.from("user_profiles").upsert(
          {
            user_id: user.id,
            full_name: state.full_name.trim() || null,
            organization: state.organization.trim() || null,
            country_focus: state.country_focus || "GLOBAL",
            onboarding_complete_at: now,
            updated_at: now,
          },
          { onConflict: "user_id" },
        );

        await supabase.from("notification_preferences").upsert(
          {
            user_id: user.id,
            email_digest_enabled: state.email_digest_enabled,
            email_digest_frequency: state.email_digest_frequency,
            updated_at: now,
          },
          { onConflict: "user_id" },
        );

        setNeedsOnboarding(false);
      } finally {
        setSaving(false);
      }
    },
    [user?.id],
  );

  return { needsOnboarding, checking, saving, complete };
}
