import posthog from "posthog-js";

let hasInitialized = false;

// Admin paths that should be excluded from PostHog tracking
const ADMIN_PATHS = ["/admin"];

const isAdminPath = () => {
  if (typeof window === "undefined") return false;
  return ADMIN_PATHS.some((p) => window.location.pathname.startsWith(p));
};

export const initPostHog = () => {
  if (typeof window === "undefined" || hasInitialized) {
    return posthog;
  }

  // Don't initialize PostHog on admin pages
  if (isAdminPath()) {
    return posthog;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!apiKey) {
    return posthog;
  }

  posthog.init(apiKey, {
    api_host: "/ingest", // Reverse proxy through our own domain (bypasses ad blockers)
    ui_host: "https://us.posthog.com", // PostHog UI for toolbar, surveys, etc.

    // ── Pageview & Navigation ──────────────────────────────────────────
    // Disabled on init — we fire $pageview manually on Next.js route changes
    capture_pageview: false,
    // Capture <a> link clicks, back/forward navigation, etc.
    capture_pageleave: true,

    // ── Autocapture ────────────────────────────────────────────────────
    // Captures clicks, form submissions, input changes automatically
    autocapture: true,

    // ── Web Vitals & Performance ───────────────────────────────────────
    capture_performance: true, // INP, LCP, FCP, CLS, TTFB

    // ── Heatmaps ───────────────────────────────────────────────────────
    enable_heatmaps: true,

    // ── Dead Click Detection ───────────────────────────────────────────
    capture_dead_clicks: true,

    // ── Scroll Depth Tracking ──────────────────────────────────────────
    scroll_root_selector: ["#__next"], // Next.js root element

    // ── Session Recording ──────────────────────────────────────────────
    session_recording: {
      maskAllInputs: true, // Privacy: mask form inputs in recordings
      maskTextSelector: "[data-ph-mask]", // Custom mask selector
    },

    // ── Surveys ────────────────────────────────────────────────────────
    enable_recording_console_log: true, // Capture console logs in session replays

    // ── Feature Flags ──────────────────────────────────────────────────
    // Bootstrap feature flags automatically on load
    advanced_disable_feature_flags: false,

    // ── Person Profiles ────────────────────────────────────────────────
    // Always create person profiles so Growth Accounting, cohorts, etc. work
    person_profiles: "always",

    // ── Persistence ────────────────────────────────────────────────────
    persistence: "localStorage+cookie", // Best cross-session tracking
    cross_subdomain_cookie: true, // Track across subdomains (e.g. fasho.co)

    // ── Privacy (non-admin) ────────────────────────────────────────────
    respect_dnt: false, // Track regardless of Do Not Track (for analytics accuracy)
    secure_cookie: true, // HTTPS-only cookies
  });

  hasInitialized = true;
  return posthog;
};

export const getPostHogClient = () => posthog;

// Helper to check if PostHog is loaded and not on an admin page
export const isPostHogReady = () => {
  return hasInitialized && !isAdminPath();
};
