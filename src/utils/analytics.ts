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
  | "spotify_api_error"
  // ── Signup & Auth lifecycle ──────────────────────────────────────────
  | "user_signed_up"
  | "user_logged_in"
  | "user_logged_out"
  // ── Revenue / purchase events ────────────────────────────────────────
  | "purchase_completed"
  // ── Error / rage tracking ────────────────────────────────────────────
  | "error_page_viewed"
  | "404_page_viewed";

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
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    ...utmParams,
  };
};

// ── Core event tracking ──────────────────────────────────────────────
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

// ── User identification (called from posthog-init.tsx) ───────────────
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

// ── Reset on logout ──────────────────────────────────────────────────
const reset = () => {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch (error) {
    console.error("PostHog reset failed:", error);
  }
};

// ── Update person properties (without a full identify) ───────────────
// Use after purchases, profile updates, etc. to enrich the person profile
const setPersonProperties = (props: AnalyticsProps) => {
  if (typeof window === "undefined") return;
  try {
    posthog.people.set(sanitizeProps(props));
  } catch (error) {
    console.error("PostHog people.set failed:", error);
  }
};

// ── Set-once person properties (never overwritten) ───────────────────
// Use for first-time properties like signup source, first purchase date
const setPersonPropertiesOnce = (props: AnalyticsProps) => {
  if (typeof window === "undefined") return;
  try {
    posthog.people.set_once(sanitizeProps(props));
  } catch (error) {
    console.error("PostHog people.set_once failed:", error);
  }
};

// ── Group analytics ──────────────────────────────────────────────────
// Associates the user with a group (e.g. "company", "team")
const setGroup = (groupType: string, groupKey: string, groupProps?: AnalyticsProps) => {
  if (typeof window === "undefined") return;
  try {
    posthog.group(groupType, groupKey, groupProps ? sanitizeProps(groupProps) : undefined);
  } catch (error) {
    console.error("PostHog group failed:", error);
  }
};

// ── Revenue tracking ─────────────────────────────────────────────────
// Tracks a purchase event with person property updates for Growth Accounting
const trackPurchase = (orderData: {
  order_id: string;
  order_number: string;
  total: number;
  subtotal: number;
  discount?: number;
  coupon_code?: string;
  package_name?: string;
  package_id?: string;
  track_title?: string;
  track_artist?: string;
  item_count: number;
  is_first_purchase?: boolean;
}) => {
  if (typeof window === "undefined") return;

  try {
    // Fire the purchase event
    track("purchase_completed", {
      order_id: orderData.order_id,
      order_number: orderData.order_number,
      revenue: orderData.total,
      subtotal: orderData.subtotal,
      discount: orderData.discount,
      coupon_code: orderData.coupon_code,
      package_name: orderData.package_name,
      package_id: orderData.package_id,
      track_title: orderData.track_title,
      track_artist: orderData.track_artist,
      item_count: orderData.item_count,
    });

    // Update person properties for Growth Accounting
    setPersonProperties({
      last_purchase_date: new Date().toISOString(),
      last_order_value: orderData.total,
      last_package: orderData.package_name,
      is_customer: true,
    });

    // First-purchase properties (only set once, never overwritten)
    setPersonPropertiesOnce({
      first_purchase_date: new Date().toISOString(),
      first_order_value: orderData.total,
      first_package: orderData.package_name,
      first_coupon_code: orderData.coupon_code,
    });

    // Increment total spend (uses PostHog's increment API internally via capture)
    posthog.capture("$set", {
      $set: { is_customer: true, last_purchase_date: new Date().toISOString() },
    });
  } catch (error) {
    console.error("PostHog trackPurchase failed:", error);
  }
};

// ── Feature flag helpers ─────────────────────────────────────────────
const isFeatureEnabled = (flagKey: string): boolean => {
  if (typeof window === "undefined") return false;
  return posthog.isFeatureEnabled(flagKey) ?? false;
};

const getFeatureFlag = (flagKey: string): string | boolean | undefined => {
  if (typeof window === "undefined") return undefined;
  return posthog.getFeatureFlag(flagKey);
};

export const analytics = {
  track,
  identify,
  reset,
  setPersonProperties,
  setPersonPropertiesOnce,
  setGroup,
  trackPurchase,
  isFeatureEnabled,
  getFeatureFlag,
};
