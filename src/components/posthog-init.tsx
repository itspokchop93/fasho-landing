import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { PostHogProvider } from "posthog-js/react";
import { initPostHog, getPostHogClient } from "../utils/posthog-client";
import { useAuth } from "../utils/authContext";
import { analytics } from "../utils/analytics";

interface PostHogInitProps {
  children: ReactNode;
}

const PostHogInit = ({ children }: PostHogInitProps) => {
  const { user, loading } = useAuth();
  const hasInitialized = useRef(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (hasInitialized.current) return;
    initPostHog();
    hasInitialized.current = true;
  }, []);

  useEffect(() => {
    if (loading) return;

    const userId = user?.id || null;
    if (userId && userId !== lastUserId.current) {
      const emailDomain = user?.email?.split("@")[1];
      analytics.identify(userId, {
        user_id: userId,
        email_domain: emailDomain,
        account_type: user?.user_metadata?.plan || user?.app_metadata?.plan,
      });
    }

    if (!userId && lastUserId.current) {
      analytics.reset();
    }

    lastUserId.current = userId;
  }, [user, loading]);

  return <PostHogProvider client={getPostHogClient()}>{children}</PostHogProvider>;
};

export default PostHogInit;
