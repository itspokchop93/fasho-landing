import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Clarity from '@microsoft/clarity';

const ClarityTracking = () => {
  const router = useRouter();

  useEffect(() => {
    // Initialize Clarity with your project ID
    try {
      Clarity.init('songm24xjn');
      console.log('Microsoft Clarity initialized successfully with project ID: songm24xjn');
      
      // Set custom tags for better tracking
      Clarity.setTag('environment', process.env.NODE_ENV || 'production');
      Clarity.setTag('platform', 'web');
      
      // Track page view
      Clarity.event('page_view');
      
    } catch (error) {
      console.error('Failed to initialize Microsoft Clarity:', error);
    }
  }, []);

  useEffect(() => {
    // Track route changes
    const handleRouteChange = (url: string) => {
      try {
        Clarity.event('route_change');
        Clarity.setTag('current_page', url);
        console.log('Clarity: Route changed to', url);
      } catch (error) {
        console.error('Clarity route change tracking failed:', error);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return null;
};

export default ClarityTracking;
