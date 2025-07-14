import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
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

  return <Component {...pageProps} />;
} 