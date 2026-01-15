import posthog from "posthog-js";

let hasInitialized = false;

export const initPostHog = () => {
  if (typeof window === "undefined" || hasInitialized) {
    return posthog;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !apiHost) {
    return posthog;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: false,
    session_recording: {
      maskAllInputs: true,
      maskAllText: true,
    },
  });

  hasInitialized = true;
  return posthog;
};

export const getPostHogClient = () => posthog;
