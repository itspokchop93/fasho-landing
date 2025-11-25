import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../utils/supabase/server';

// Default banner settings
const DEFAULT_SETTINGS = {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const supabase = createAdminClient();

    // Fetch sales banner settings from admin_settings table
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'sales_banner_desktop_before_text',
        'sales_banner_desktop_after_text',
        'sales_banner_desktop_coupon_code',
        'sales_banner_mobile_before_text',
        'sales_banner_mobile_after_text',
        'sales_banner_mobile_coupon_code'
      ]);

    if (error) {
      console.error('🎫 SALES-BANNER-API: Error fetching settings:', error);
      // Return default settings on error
      return res.status(200).json({
        success: true,
        settings: DEFAULT_SETTINGS
      });
    }

    // Convert array to object
    const settingsMap = (settings || []).reduce((acc: Record<string, string>, item: any) => {
      acc[item.setting_key] = item.setting_value;
      return acc;
    }, {});

    // Build response with defaults for any missing values
    const bannerSettings = {
      desktop: {
        beforeCouponText: settingsMap['sales_banner_desktop_before_text'] || DEFAULT_SETTINGS.desktop.beforeCouponText,
        afterCouponText: settingsMap['sales_banner_desktop_after_text'] || DEFAULT_SETTINGS.desktop.afterCouponText,
        couponCode: settingsMap['sales_banner_desktop_coupon_code'] || DEFAULT_SETTINGS.desktop.couponCode
      },
      mobile: {
        beforeCouponText: settingsMap['sales_banner_mobile_before_text'] || DEFAULT_SETTINGS.mobile.beforeCouponText,
        afterCouponText: settingsMap['sales_banner_mobile_after_text'] || DEFAULT_SETTINGS.mobile.afterCouponText,
        couponCode: settingsMap['sales_banner_mobile_coupon_code'] || DEFAULT_SETTINGS.mobile.couponCode
      }
    };

    // Cache for 60 seconds
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    return res.status(200).json({
      success: true,
      settings: bannerSettings
    });

  } catch (error: any) {
    console.error('🎫 SALES-BANNER-API: Unexpected error:', error);
    // Return default settings on error
    return res.status(200).json({
      success: true,
      settings: DEFAULT_SETTINGS
    });
  }
}

