import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { initPostHog, getPostHogClient } from "../utils/posthog-client";
import { useAuth } from "../utils/authContext";

interface PostHogInitProps {
  children: ReactNode;
}

const PostHogInit = ({ children }: PostHogInitProps) => {
  const { user, loading } = useAuth();
  const hasInitialized = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // ── Initialize PostHog & fire initial $pageview ────────────────────
  useEffect(() => {
    if (hasInitialized.current) return;
    const ph = initPostHog();
    hasInitialized.current = true;

    // Fire initial $pageview on first load (since capture_pageview is false)
    // Subsequent client-side route changes are tracked in _app.tsx
    ph.capture("$pageview");
  }, []);

  // ── Identify user with rich person properties for Growth Accounting ─
  useEffect(() => {
    if (loading) return;

    const userId = user?.id || null;

    if (userId && userId !== lastUserId.current) {
      const email = user?.email;
      const emailDomain = email?.split("@")[1];
      const fullName = user?.user_metadata?.full_name;
      const createdAt = user?.created_at;
      const plan = user?.user_metadata?.plan || user?.app_metadata?.plan;

      // Alias anonymous ID → user ID (once, for merging pre-auth activity)
      const distinctId = posthog.get_distinct_id?.();
      const aliasKey = `posthog_alias_${userId}`;
      if (distinctId && distinctId !== userId && typeof localStorage !== "undefined" && !localStorage.getItem(aliasKey)) {
        posthog.alias(userId, distinctId);
        localStorage.setItem(aliasKey, "true");
      }

      // Identify with person properties — these power:
      // • Growth Accounting (new / returning / resurrecting / dormant)
      // • Cohort analysis
      // • User-level analytics & filtering
      posthog.identify(userId, {
        // $set properties (overwritten on each identify)
        email: email,
        name: fullName,
        email_domain: emailDomain,
        plan: plan,
      }, {
        // $set_once properties (only set the first time, never overwritten)
        initial_referrer: document.referrer || "$direct",
        initial_landing_page: window.location.pathname,
        initial_utm_source: new URLSearchParams(window.location.search).get("utm_source") || undefined,
        initial_utm_medium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
        initial_utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
        signup_date: createdAt,
      });

      // Also set person properties via $set for any we want updated every session
      posthog.people.set({
        last_seen_at: new Date().toISOString(),
        last_page: window.location.pathname,
      });
    }

    // User logged out — reset PostHog so a new anonymous ID is assigned
    if (!userId && lastUserId.current) {
      posthog.reset();
    }

    lastUserId.current = userId;
  }, [user, loading]);

  return <PostHogProvider client={getPostHogClient()}>{children}</PostHogProvider>;
};

export default PostHogInit;
