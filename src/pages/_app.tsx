import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import * as gtag from "../utils/gtag";
import LeadTracker from "../utils/leadTracking";
import { AuthProvider } from "../utils/authContext";
import { useActivityTracking } from "../utils/useActivityTracking";
import clarityService from "../utils/clarity";

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
    // Google Analytics and Clarity page view tracking
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
      
      // Call Clarity identify for each page to ensure optimal tracking
      try {
        clarityService.identify(`user-${Date.now()}`, undefined, url);
      } catch (error) {
        console.error('Clarity identify failed:', error);
      }
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
    // Initialize Microsoft Clarity
    const initClarity = async () => {
      try {
        await clarityService.init();
        console.log('Microsoft Clarity initialized successfully');
      } catch (error) {
        console.error('Microsoft Clarity initialization failed:', error);
      }
    };

    if (typeof window !== 'undefined') {
      initClarity();
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