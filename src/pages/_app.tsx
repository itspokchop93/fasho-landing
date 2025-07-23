import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import * as gtag from "../utils/gtag";
import LeadTracker from "../utils/leadTracking";
import { AuthProvider } from "../utils/authContext";
import { useActivityTracking } from "../utils/useActivityTracking";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Initialize activity tracking for all users
  useActivityTracking({
    enabled: true,
    trackInterval: 30, // Track every 30 seconds
    trackPageChanges: true,
    trackUserInteraction: true
  });

  useEffect(() => {
    // Google Analytics page view tracking
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    // Initialize lead tracking on first page load
    if (typeof window !== 'undefined') {
      try {
        LeadTracker.captureLeadData();
      } catch (error) {
        console.error('Lead tracking initialization failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Only load stagewise in development and on client side
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const loadStagewise = async () => {
        try {
          const { initToolbar } = await import('@stagewise/toolbar');
          
          initToolbar({
            plugins: [],
          });
        } catch (error) {
          console.log('Stagewise toolbar failed to load:', error);
        }
      };

      // Add a small delay to ensure the page is fully loaded
      setTimeout(loadStagewise, 1000);
    }
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
} 