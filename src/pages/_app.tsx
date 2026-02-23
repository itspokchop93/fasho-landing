import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { AuthProvider } from "../utils/authContext";
import PostHogInit from "../components/posthog-init";



export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = async (url: string) => {
      try {
        const [{ pageview }, { getPostHogClient }] = await Promise.all([
          import("../utils/gtag"),
          import("../utils/posthog-client"),
        ]);

        pageview(url);

        if (!url.startsWith("/admin")) {
          const posthogClient = getPostHogClient();
          posthogClient.capture("$pageview", {
            $current_url: window.location.origin + url,
          });
        }
      } catch (error) {
        console.error("Route analytics tracking failed:", error);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    let isCancelled = false;

    const initializeLeadTracking = async () => {
      if (typeof window === 'undefined') return;

      try {
        const { default: LeadTracker } = await import("../utils/leadTracking");
        if (!isCancelled) {
          LeadTracker.captureLeadData();
        }
      } catch (error) {
        console.error("Lead tracking initialization failed:", error);
      }
    };

    initializeLeadTracking();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <AuthProvider>
      <PostHogInit>
        <Component {...pageProps} />
      </PostHogInit>
    </AuthProvider>
  );
}
