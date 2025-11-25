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

// Default settings to use while loading or on error
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
  const [settings, setSettings] = useState<AllBannerSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch banner settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/sales-banner-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            setSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sales banner settings:', error);
        // Keep default settings on error
      } finally {
        setIsLoaded(true);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div 
      className={`fixed w-full top-0 sm:top-0 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-2 px-4 shadow-lg z-[9999] ${className}`} 
      style={{ top: '-2px' }}
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
