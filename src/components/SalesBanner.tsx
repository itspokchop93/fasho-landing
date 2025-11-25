import { useState, useEffect } from 'react';
import SalesBannerDesktop from './SalesBannerDesktop';
import SalesBannerMobile from './SalesBannerMobile';

interface SalesBannerProps {
  className?: string;
}

interface BannerSettings {
  beforeCouponText: string;
  afterCouponText: string;
  couponCode: string;
}

interface AllBannerSettings {
  desktop: BannerSettings;
  mobile: BannerSettings;
}

// Default settings - only used as fallback if API fails
const DEFAULT_SETTINGS: AllBannerSettings = {
  desktop: {
    beforeCouponText: '🔥 {month} SALE! Use code',
    afterCouponText: 'for 15% off your first campaign!',
    couponCode: 'FASHO'
  },
  mobile: {
    beforeCouponText: '🔥 {month} SALE! Use code',
    afterCouponText: 'for 15% off',
    couponCode: 'FASHO'
  }
};

export default function SalesBanner({ className = '' }: SalesBannerProps) {
  const [settings, setSettings] = useState<AllBannerSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Fetch banner settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/sales-banner-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            setSettings(data.settings);
          } else {
            // Use defaults if API returns invalid data
            setSettings(DEFAULT_SETTINGS);
          }
        } else {
          // Use defaults if API request fails
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('Failed to fetch sales banner settings:', error);
        // Use defaults on error
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoaded(true);
        // Trigger animation after a tiny delay to ensure DOM is ready
        setTimeout(() => setShouldAnimate(true), 50);
      }
    };

    fetchSettings();
  }, []);

  // Don't render anything until settings are loaded
  if (!isLoaded || !settings) {
    return null;
  }

  return (
    <div 
      className={`fixed w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-2 px-4 shadow-lg z-[9999] ${className}`} 
      style={{ 
        top: '-2px',
        transform: shouldAnimate ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform'
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center relative">
        {/* Desktop Sales Banner */}
        <SalesBannerDesktop
          beforeCouponText={settings.desktop.beforeCouponText}
          afterCouponText={settings.desktop.afterCouponText}
          couponCode={settings.desktop.couponCode}
        />

        {/* Mobile Sales Banner */}
        <SalesBannerMobile
          beforeCouponText={settings.mobile.beforeCouponText}
          afterCouponText={settings.mobile.afterCouponText}
          couponCode={settings.mobile.couponCode}
        />
      </div>
    </div>
  );
}
