import posthog from "posthog-js";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProps = Record<string, AnalyticsValue | AnalyticsValue[]>;

export type AnalyticsEventName =
  | "home_viewed"
  | "home_search_submitted"
  | "song_selected"
  | "add_page_viewed"
  | "add_song_clicked"
  | "remove_song_clicked"
  | "add_step_completed"
  | "packages_page_viewed"
  | "package_viewed"
  | "package_selected"
  | "package_selection_changed"
  | "packages_step_completed"
  | "checkout_viewed"
  | "payment_method_selected"
  | "checkout_submitted"
  | "checkout_payment_succeeded"
  | "checkout_payment_failed"
  | "thank_you_viewed"
  | "survey_started"
  | "survey_completed"
  | "dashboard_viewed"
  | "orders_list_viewed"
  | "order_details_viewed"
  | "campaign_status_viewed"
  | "curator_connect_viewed"
  | "curator_search_used"
  | "curator_filter_changed"
  | "curator_sort_changed"
  | "curator_contact_clicked"
  | "validation_error_shown"
  | "spotify_api_error";

const SENSITIVE_KEYWORDS = [
  "password",
  "token",
  "authorization",
  "auth",
  "secret",
  "api_key",
  "access",
  "refresh",
  "card",
  "cvv",
  "cvc",
  "ssn",
  "billing",
  "address",
  "phone",
  "email",
];

const looksLikeEmail = (value: string) => value.includes("@");

const getEmailDomain = (email: string) => {
  const parts = email.split("@");
  return parts.length > 1 ? parts[1] : null;
};

const sanitizeProps = (props: AnalyticsProps = {}) => {
  const sanitized: AnalyticsProps = {};

  Object.entries(props).forEach(([key, value]) => {
    if (value === undefined) return;

    const loweredKey = key.toLowerCase();
    const isSensitiveKey = SENSITIVE_KEYWORDS.some((keyword) => loweredKey.includes(keyword));

    if (isSensitiveKey) {
      if (loweredKey.includes("email") && typeof value === "string" && looksLikeEmail(value)) {
        const domain = getEmailDomain(value);
        if (domain) {
          sanitized.email_domain = domain;
        }
      }
      return;
    }

    if (typeof value === "string" && looksLikeEmail(value)) {
      const domain = getEmailDomain(value);
      if (domain) {
        sanitized.email_domain = domain;
      }
      return;
    }

    if (typeof value === "string" && value.length > 200) {
      return;
    }

    sanitized[key] = value;
  });

  return sanitized;
};

const getCommonProps = () => {
  if (typeof window === "undefined") return {};

  const searchParams = new URLSearchParams(window.location.search);
  const utmParams = {
    utm_source: searchParams.get("utm_source") || undefined,
    utm_medium: searchParams.get("utm_medium") || undefined,
    utm_campaign: searchParams.get("utm_campaign") || undefined,
    utm_term: searchParams.get("utm_term") || undefined,
    utm_content: searchParams.get("utm_content") || undefined,
  };

  return {
    page_path: window.location.pathname,
    referrer: document.referrer || undefined,
    ...utmParams,
  };
};

const track = (eventName: AnalyticsEventName, props: AnalyticsProps = {}) => {
  if (typeof window === "undefined") return;

  try {
    const commonProps = getCommonProps();
    const sanitized = sanitizeProps({ ...commonProps, ...props });
    posthog.capture(eventName, sanitized);
  } catch (error) {
    console.error("PostHog capture failed:", error);
  }
};

const identify = (userId: string, props: AnalyticsProps = {}) => {
  if (typeof window === "undefined") return;
  if (!userId) return;

  const distinctId = posthog.get_distinct_id?.();
  const aliasKey = `posthog_alias_${userId}`;

  try {
    if (distinctId && distinctId !== userId && !localStorage.getItem(aliasKey)) {
      posthog.alias(userId, distinctId);
      localStorage.setItem(aliasKey, "true");
    }

    posthog.identify(userId, sanitizeProps(props));
  } catch (error) {
    console.error("PostHog identify failed:", error);
  }
};

const reset = () => {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch (error) {
    console.error("PostHog reset failed:", error);
  }
};

export const analytics = {
  track,
  identify,
  reset,
};
