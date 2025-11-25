import React, { useState, useEffect } from 'react';

interface AdminSettings {
  webhook_url: string;
  site_title: string;
  site_description: string;
}

interface SalesBannerSettings {
  desktop: {
    beforeCouponText: string;
    afterCouponText: string;
    couponCode: string;
  };
  mobile: {
    beforeCouponText: string;
    afterCouponText: string;
    couponCode: string;
  };
}

interface CacheStats {
  size: number;
  keys: string[];
  keyGroups?: { [key: string]: string[] };
  timestamp: string;
}

interface SongRow {
  id: string;
  spotifyUrl: string;
  packageName: string;
}

const AdminSettingsManagement: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings>({ 
    webhook_url: '',
    site_title: 'FASHO.co – Promotion for Artists, Labels & Podcasters',
    site_description: 'Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career.'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Sales Banner Settings state
  const [salesBannerSettings, setSalesBannerSettings] = useState<SalesBannerSettings>({
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
  });
  const [savingBannerSettings, setSavingBannerSettings] = useState(false);

  // Test Order state
  const [testOrderData, setTestOrderData] = useState({
    customerEmail: '',
    firstName: '',
    lastName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });
  const [songRows, setSongRows] = useState<SongRow[]>([
    { id: '1', spotifyUrl: '', packageName: 'BREAKTHROUGH' }
  ]);
  const [isCreatingTestOrder, setIsCreatingTestOrder] = useState(false);

  // Available packages
  const availablePackages = [
    { id: 'test', name: 'TEST PACKAGE', price: 0.10 },
    { id: 'legendary', name: 'LEGENDARY', price: 479 },
    { id: 'unstoppable', name: 'UNSTOPPABLE', price: 259 },
    { id: 'dominate', name: 'DOMINATE', price: 149 },
    { id: 'momentum', name: 'MOMENTUM', price: 79 },
    { id: 'breakthrough', name: 'BREAKTHROUGH', price: 39 }
  ];

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
    fetchCacheStats();
    fetchSalesBannerSettings();
  }, []);

  // Auto-refresh cache stats
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchCacheStats();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/admin-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      
      // Extract settings from data object, with default values
      const webhookUrl = data.settings?.zapier_webhook_url || 'https://hooks.zapier.com/hooks/catch/23839455/u2wp0la/';
      const siteTitle = data.settings?.site_title || 'FASHO.co – Promotion for Artists, Labels & Podcasters';
      const siteDescription = data.settings?.site_description || 'Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career.';
      
      setSettings({
        webhook_url: webhookUrl,
        site_title: siteTitle,
        site_description: siteDescription
      });
      
      // If no webhook URL was saved yet, save the default one
      if (!data.settings?.zapier_webhook_url) {
        await saveDefaultWebhookUrl();
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveDefaultWebhookUrl = async () => {
    try {
      await fetch('/api/admin/admin-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          setting_key: 'zapier_webhook_url',
          setting_value: 'https://hooks.zapier.com/hooks/catch/23839455/u2wp0la/'
        }),
      });
      console.log('Default webhook URL saved successfully');
    } catch (err) {
      console.error('Error saving default webhook URL:', err);
    }
  };

  const handleSaveWebhookUrl = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/admin-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          setting_key: 'zapier_webhook_url',
          setting_value: settings.webhook_url
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save webhook URL');
      }

      setSuccess('Webhook URL saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving webhook URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to save webhook URL');
    } finally {
      setSaving(false);
    }
  };

  const handleWebhookUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, webhook_url: e.target.value });
  };

  const handleSiteTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, site_title: e.target.value });
  };

  const handleSiteDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings({ ...settings, site_description: e.target.value });
  };

  const handleSaveSiteSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Save site title
      const titleResponse = await fetch('/api/admin/admin-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          setting_key: 'site_title',
          setting_value: settings.site_title
        }),
      });

      if (!titleResponse.ok) {
        const errorData = await titleResponse.json();
        throw new Error(errorData.error || 'Failed to save site title');
      }

      // Save site description
      const descriptionResponse = await fetch('/api/admin/admin-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          setting_key: 'site_description',
          setting_value: settings.site_description
        }),
      });

      if (!descriptionResponse.ok) {
        const errorData = await descriptionResponse.json();
        throw new Error(errorData.error || 'Failed to save site description');
      }

      setSuccess('Site settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving site settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save site settings');
    } finally {
      setSaving(false);
    }
  };

  // Sales Banner Settings Functions
  const fetchSalesBannerSettings = async () => {
    try {
      const response = await fetch('/api/admin/admin-settings');
      if (!response.ok) return;
      
      const data = await response.json();
      const s = data.settings || {};
      
      setSalesBannerSettings({
        desktop: {
          beforeCouponText: s.sales_banner_desktop_before_text || '🔥 {month} SALE! Use code',
          afterCouponText: s.sales_banner_desktop_after_text || 'for 15% off your first campaign!',
          couponCode: s.sales_banner_desktop_coupon_code || 'FASHO'
        },
        mobile: {
          beforeCouponText: s.sales_banner_mobile_before_text || '🔥 {month} SALE! Use code',
          afterCouponText: s.sales_banner_mobile_after_text || 'for 15% off',
          couponCode: s.sales_banner_mobile_coupon_code || 'FASHO'
        }
      });
    } catch (err) {
      console.error('Error fetching sales banner settings:', err);
    }
  };

  const handleSaveSalesBannerSettings = async () => {
    try {
      setSavingBannerSettings(true);
      setError(null);
      setSuccess(null);

      // Save all sales banner settings
      const settingsToSave = [
        { key: 'sales_banner_desktop_before_text', value: salesBannerSettings.desktop.beforeCouponText },
        { key: 'sales_banner_desktop_after_text', value: salesBannerSettings.desktop.afterCouponText },
        { key: 'sales_banner_desktop_coupon_code', value: salesBannerSettings.desktop.couponCode },
        { key: 'sales_banner_mobile_before_text', value: salesBannerSettings.mobile.beforeCouponText },
        { key: 'sales_banner_mobile_after_text', value: salesBannerSettings.mobile.afterCouponText },
        { key: 'sales_banner_mobile_coupon_code', value: salesBannerSettings.mobile.couponCode }
      ];

      for (const setting of settingsToSave) {
        const response = await fetch('/api/admin/admin-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            setting_key: setting.key,
            setting_value: setting.value
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to save ${setting.key}`);
        }
      }

      setSuccess('Sales banner settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving sales banner settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save sales banner settings');
    } finally {
      setSavingBannerSettings(false);
    }
  };

  const updateDesktopBannerSetting = (field: keyof SalesBannerSettings['desktop'], value: string) => {
    setSalesBannerSettings(prev => ({
      ...prev,
      desktop: { ...prev.desktop, [field]: value }
    }));
  };

  const updateMobileBannerSetting = (field: keyof SalesBannerSettings['mobile'], value: string) => {
    setSalesBannerSettings(prev => ({
      ...prev,
      mobile: { ...prev.mobile, [field]: value }
    }));
  };

  const testWebhook = async () => {
    if (!settings.webhook_url.trim()) {
      setError('Please save a webhook URL first');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/test-zapier-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test webhook');
      }

      setSuccess('Test webhook sent successfully! Check your Zapier dashboard.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error testing webhook:', err);
      setError(err instanceof Error ? err.message : 'Failed to test webhook');
    }
  };

  const fetchCacheStats = async () => {
    try {
      setCacheLoading(true);
      setError(null);
      const response = await fetch('/api/admin/cache-management');
      if (!response.ok) {
        throw new Error('Failed to fetch cache statistics');
      }
      const data = await response.json();
      setCacheStats(data.stats);
      console.log('🧹 CACHE-UI: Fetched cache stats:', data.stats);
    } catch (err) {
      console.error('Error fetching cache stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cache statistics');
    } finally {
      setCacheLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      setCacheLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/cache-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'clear_all'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear cache');
      }

      const data = await response.json();
      setSuccess(`Cache cleared successfully! ${data.cleared} entries removed.`);
      
      // Refresh cache stats
      await fetchCacheStats();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error clearing cache:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setCacheLoading(false);
    }
  };

  // Test Order Functions
  const addSongRow = () => {
    const newId = (songRows.length + 1).toString();
    setSongRows([...songRows, { id: newId, spotifyUrl: '', packageName: 'BREAKTHROUGH' }]);
  };

  const removeSongRow = (id: string) => {
    if (songRows.length > 1) {
      setSongRows(songRows.filter(row => row.id !== id));
    }
  };

  const updateSongRow = (id: string, field: 'spotifyUrl' | 'packageName', value: string) => {
    setSongRows(songRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleTestOrderSubmit = async () => {
    try {
      console.log('🧪 TEST-ORDER-UI: Starting test order submission...');
      setIsCreatingTestOrder(true);
      setError(null);
      setSuccess(null);

      // Validate form data
      if (!testOrderData.customerEmail || !testOrderData.firstName || !testOrderData.lastName) {
        throw new Error('Please fill in all required customer information');
      }

      // Validate at least one song
      const validSongs = songRows.filter(row => row.spotifyUrl.trim());
      if (validSongs.length === 0) {
        throw new Error('Please add at least one Spotify URL');
      }

      // Validate Spotify URLs
      for (const song of validSongs) {
        if (!song.spotifyUrl.includes('spotify.com/track/')) {
          throw new Error('Please enter valid Spotify track URLs');
        }
      }

      console.log('🧪 TEST-ORDER-UI: Validation passed, sending request...');
      console.log('🧪 TEST-ORDER-UI: Customer info:', testOrderData);
      console.log('🧪 TEST-ORDER-UI: Songs:', validSongs);

      const response = await fetch('/api/test/create-test-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customerInfo: testOrderData,
          songs: validSongs
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🧪 TEST-ORDER-UI: Server error:', errorData);
        throw new Error(errorData.error || `Failed to create test order (${response.status})`);
      }

      const data = await response.json();
      setSuccess(`Test order created successfully! Order #${data.orderNumber} with ${validSongs.length} song(s).`);
      
      // Reset form
      setTestOrderData({
        customerEmail: '',
        firstName: '',
        lastName: '',
        billingAddress: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        }
      });
      setSongRows([{ id: '1', spotifyUrl: '', packageName: 'BREAKTHROUGH' }]);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error creating test order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create test order');
    } finally {
      setIsCreatingTestOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure integrations and system settings for your FASHO.co admin panel.</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Zapier Integration Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900">Zapier Integration</h2>
            <p className="text-gray-600">Configure webhook URL for automatic data synchronization with Zapier.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Webhook URL Input */}
          <div>
            <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL
            </label>
            <div className="flex space-x-3">
              <input
                id="webhook-url"
                type="url"
                value={settings.webhook_url}
                onChange={handleWebhookUrlChange}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleSaveWebhookUrl}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This webhook URL will receive data for successful checkouts, user signups, and intake form submissions.
            </p>
          </div>

          {/* Test Webhook Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={testWebhook}
              disabled={!settings.webhook_url.trim()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Test Webhook
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Send a test payload to verify your webhook is configured correctly.
            </p>
          </div>

          {/* Webhook Events Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Webhook Events</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="font-medium text-indigo-600 w-32 flex-shrink-0">Checkout Success:</span>
                <span>Customer info, billing address, packages ordered, order date</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-indigo-600 w-32 flex-shrink-0">User Signup:</span>
                <span>Customer name and email address</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-indigo-600 w-32 flex-shrink-0">Intake Form:</span>
                <span>Form responses plus customer info and order details</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site Settings Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900">Site Settings</h2>
            <p className="text-gray-600">Configure global site title and description for SEO and branding.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Site Title Input */}
          <div>
            <label htmlFor="site-title" className="block text-sm font-medium text-gray-700 mb-2">
              Site Title
            </label>
            <input
              id="site-title"
              type="text"
              value={settings.site_title}
              onChange={handleSiteTitleChange}
              placeholder="Enter site title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              This appears in browser tabs, search results, and social media shares.
            </p>
          </div>

          {/* Site Description Input */}
          <div>
            <label htmlFor="site-description" className="block text-sm font-medium text-gray-700 mb-2">
              Site Description
            </label>
            <textarea
              id="site-description"
              value={settings.site_description}
              onChange={handleSiteDescriptionChange}
              placeholder="Enter site description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              This appears in search results and social media shares. Keep it under 160 characters for best SEO results.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleSaveSiteSettings}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Site Settings'}
            </button>
          </div>

          {/* Preview Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Preview</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-900">Title:</span> {settings.site_title}
              </div>
              <div>
                <span className="font-medium text-gray-900">Description:</span> {settings.site_description}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500">Note: Changes will be applied globally across the entire website.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Banners Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900">Sales Banners</h2>
            <p className="text-gray-600">Configure the promotional sales banners that appear at the top of the website.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Available Placeholders Info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-emerald-900 mb-3">📌 Available Placeholders</h3>
            <div className="space-y-2 text-sm text-emerald-800">
              <div className="flex items-start">
                <code className="bg-emerald-100 px-2 py-0.5 rounded font-mono text-emerald-700 mr-2 flex-shrink-0">{'{month}'}</code>
                <span>Shows the current month name (e.g., NOVEMBER)</span>
              </div>
              <div className="flex items-start">
                <code className="bg-emerald-100 px-2 py-0.5 rounded font-mono text-emerald-700 mr-2 flex-shrink-0">{'{day}'}</code>
                <span>Shows the current day of the month (e.g., 25)</span>
              </div>
              <div className="flex items-start">
                <code className="bg-emerald-100 px-2 py-0.5 rounded font-mono text-emerald-700 mr-2 flex-shrink-0">{'{countdown MM-DD-YY HH:MMam/pm TZ}'}</code>
                <span>Shows an animated countdown to a specific date/time</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <p className="text-xs text-emerald-700">
                <strong>Countdown Examples:</strong><br />
                <code className="bg-emerald-100 px-1 rounded">{'{countdown 12-25-25 11:59pm PST}'}</code> → Countdown to Christmas<br />
                <code className="bg-emerald-100 px-1 rounded">{'{countdown 11-30-25 9:00pm EST}'}</code> → Countdown to Nov 30 at 9pm EST<br />
                <span className="italic">Supported timezones: PST, PDT, MST, MDT, CST, CDT, EST, EDT, UTC</span>
              </p>
            </div>
          </div>

          {/* Desktop Banner Settings */}
          <div className="border border-gray-200 rounded-lg p-5">
            <div className="flex items-center mb-4">
              <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Desktop Banner</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="desktop-before-text" className="block text-sm font-medium text-gray-700 mb-2">
                  Before Coupon Code Text
                </label>
                <input
                  id="desktop-before-text"
                  type="text"
                  value={salesBannerSettings.desktop.beforeCouponText}
                  onChange={(e) => updateDesktopBannerSetting('beforeCouponText', e.target.value)}
                  placeholder="🔥 {month} SALE! Use code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">This text appears before the coupon code box</p>
              </div>

              <div>
                <label htmlFor="desktop-coupon-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code
                </label>
                <input
                  id="desktop-coupon-code"
                  type="text"
                  value={salesBannerSettings.desktop.couponCode}
                  onChange={(e) => updateDesktopBannerSetting('couponCode', e.target.value)}
                  placeholder="FASHO"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 font-mono uppercase"
                />
                <p className="mt-1 text-xs text-gray-500">The coupon code users can click to copy</p>
              </div>

              <div>
                <label htmlFor="desktop-after-text" className="block text-sm font-medium text-gray-700 mb-2">
                  After Coupon Code Text
                </label>
                <input
                  id="desktop-after-text"
                  type="text"
                  value={salesBannerSettings.desktop.afterCouponText}
                  onChange={(e) => updateDesktopBannerSetting('afterCouponText', e.target.value)}
                  placeholder="for 15% off your first campaign!"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">This text appears after the coupon code box</p>
              </div>

              {/* Desktop Preview */}
              <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-lg p-3 mt-4">
                <div className="text-xs text-black/60 mb-1">Desktop Preview:</div>
                <div className="flex items-center justify-center gap-1 text-center">
                  <span className="text-sm text-black">{salesBannerSettings.desktop.beforeCouponText.replace(/\{month\}/gi, 'NOVEMBER').replace(/\{day\}/gi, '25').replace(/\{countdown[^}]+\}/gi, '[COUNTDOWN]')}</span>
                  <div className="flex items-center gap-2 bg-black text-[#59e3a5] px-3 py-1 rounded-md font-bold ml-1">
                    <span className="font-bold text-sm">{salesBannerSettings.desktop.couponCode}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#59e3a5]">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-black ml-1">{salesBannerSettings.desktop.afterCouponText.replace(/\{month\}/gi, 'NOVEMBER').replace(/\{day\}/gi, '25').replace(/\{countdown[^}]+\}/gi, '[COUNTDOWN]')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Banner Settings */}
          <div className="border border-gray-200 rounded-lg p-5">
            <div className="flex items-center mb-4">
              <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Mobile Banner</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="mobile-before-text" className="block text-sm font-medium text-gray-700 mb-2">
                  Before Coupon Code Text
                </label>
                <input
                  id="mobile-before-text"
                  type="text"
                  value={salesBannerSettings.mobile.beforeCouponText}
                  onChange={(e) => updateMobileBannerSetting('beforeCouponText', e.target.value)}
                  placeholder="🔥 {month} SALE! Use code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">This text appears before the coupon code box (keep it shorter for mobile)</p>
              </div>

              <div>
                <label htmlFor="mobile-coupon-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code
                </label>
                <input
                  id="mobile-coupon-code"
                  type="text"
                  value={salesBannerSettings.mobile.couponCode}
                  onChange={(e) => updateMobileBannerSetting('couponCode', e.target.value)}
                  placeholder="FASHO"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 font-mono uppercase"
                />
                <p className="mt-1 text-xs text-gray-500">The coupon code users can click to copy</p>
              </div>

              <div>
                <label htmlFor="mobile-after-text" className="block text-sm font-medium text-gray-700 mb-2">
                  After Coupon Code Text
                </label>
                <input
                  id="mobile-after-text"
                  type="text"
                  value={salesBannerSettings.mobile.afterCouponText}
                  onChange={(e) => updateMobileBannerSetting('afterCouponText', e.target.value)}
                  placeholder="for 15% off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">This text appears after the coupon code box (keep it shorter for mobile)</p>
              </div>

              {/* Mobile Preview */}
              <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-lg p-3 mt-4 max-w-xs mx-auto">
                <div className="text-xs text-black/60 mb-1">Mobile Preview:</div>
                <div className="flex items-center justify-center gap-1 text-center flex-wrap">
                  <span className="text-xs text-black">{salesBannerSettings.mobile.beforeCouponText.replace(/\{month\}/gi, 'NOVEMBER').replace(/\{day\}/gi, '25').replace(/\{countdown[^}]+\}/gi, '[CD]')}</span>
                  <div className="flex items-center gap-1 bg-black text-[#59e3a5] px-2 py-1 rounded-md font-bold ml-1">
                    <span className="font-bold text-xs">{salesBannerSettings.mobile.couponCode}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#59e3a5]">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-black ml-1">{salesBannerSettings.mobile.afterCouponText.replace(/\{month\}/gi, 'NOVEMBER').replace(/\{day\}/gi, '25').replace(/\{countdown[^}]+\}/gi, '[CD]')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleSaveSalesBannerSettings}
              disabled={savingBannerSettings}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingBannerSettings ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Sales Banner Settings
                </>
              )}
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Changes will be reflected on the live website immediately after saving.
            </p>
          </div>
        </div>
      </div>

      {/* Create Test Order Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900">Create Test Order</h2>
            <p className="text-gray-600">Create test orders for development and testing purposes.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="customer-email" className="block text-sm font-medium text-gray-700 mb-2">
                Customer Email *
              </label>
              <input
                id="customer-email"
                type="email"
                value={testOrderData.customerEmail}
                onChange={(e) => setTestOrderData({ ...testOrderData, customerEmail: e.target.value })}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  id="first-name"
                  type="text"
                  value={testOrderData.firstName}
                  onChange={(e) => setTestOrderData({ ...testOrderData, firstName: e.target.value })}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  id="last-name"
                  type="text"
                  value={testOrderData.lastName}
                  onChange={(e) => setTestOrderData({ ...testOrderData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  id="street"
                  type="text"
                  value={testOrderData.billingAddress.street}
                  onChange={(e) => setTestOrderData({ 
                    ...testOrderData, 
                    billingAddress: { ...testOrderData.billingAddress, street: e.target.value }
                  })}
                  placeholder="123 Main Street"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={testOrderData.billingAddress.city}
                  onChange={(e) => setTestOrderData({ 
                    ...testOrderData, 
                    billingAddress: { ...testOrderData.billingAddress, city: e.target.value }
                  })}
                  placeholder="New York"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  value={testOrderData.billingAddress.state}
                  onChange={(e) => setTestOrderData({ 
                    ...testOrderData, 
                    billingAddress: { ...testOrderData.billingAddress, state: e.target.value }
                  })}
                  placeholder="NY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="zip-code" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  id="zip-code"
                  type="text"
                  value={testOrderData.billingAddress.zipCode}
                  onChange={(e) => setTestOrderData({ 
                    ...testOrderData, 
                    billingAddress: { ...testOrderData.billingAddress, zipCode: e.target.value }
                  })}
                  placeholder="10001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  id="country"
                  value={testOrderData.billingAddress.country}
                  onChange={(e) => setTestOrderData({ 
                    ...testOrderData, 
                    billingAddress: { ...testOrderData.billingAddress, country: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="IT">Italy</option>
                  <option value="ES">Spain</option>
                  <option value="NL">Netherlands</option>
                  <option value="SE">Sweden</option>
                  <option value="NO">Norway</option>
                  <option value="DK">Denmark</option>
                  <option value="FI">Finland</option>
                </select>
              </div>
            </div>
          </div>

          {/* Song Rows */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Songs</h3>
              <button
                onClick={addSongRow}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Song
              </button>
            </div>
            <div className="space-y-4">
              {songRows.map((song, index) => (
                <div key={song.id} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <label htmlFor={`spotify-url-${song.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                      Spotify URL *
                    </label>
                    <input
                      id={`spotify-url-${song.id}`}
                      type="url"
                      value={song.spotifyUrl}
                      onChange={(e) => updateSongRow(song.id, 'spotifyUrl', e.target.value)}
                      placeholder="https://open.spotify.com/track/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-48">
                    <label htmlFor={`package-${song.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                      Package
                    </label>
                    <select
                      id={`package-${song.id}`}
                      value={song.packageName}
                      onChange={(e) => updateSongRow(song.id, 'packageName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {availablePackages.map(pkg => (
                        <option key={pkg.id} value={pkg.name}>
                          {pkg.name} (${pkg.price})
                        </option>
                      ))}
                    </select>
                  </div>
                  {songRows.length > 1 && (
                    <button
                      onClick={() => removeSongRow(song.id)}
                      className="p-2 text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleTestOrderSubmit}
              disabled={isCreatingTestOrder}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingTestOrder ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Order...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Test Order
                </>
              )}
            </button>
            <p className="mt-2 text-sm text-gray-500">
              This will create a complete order with all the specified songs and automatically import it into the marketing manager.
            </p>
          </div>

          {/* Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Test Order Information</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start">
                <span className="font-medium text-blue-900 w-32 flex-shrink-0">Order Creation:</span>
                <span>Creates a real order in the database with status "paid"</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-blue-900 w-32 flex-shrink-0">Auto Import:</span>
                <span>Automatically imports into marketing manager for campaign tracking</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-blue-900 w-32 flex-shrink-0">Multiple Songs:</span>
                <span>Add multiple songs to test multi-track orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Management Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900">Cache Management</h2>
            <p className="text-gray-600">Manage the website's cache to improve performance and clear stale data.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Cache Statistics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Cache Statistics</h3>
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="mr-1 h-3 w-3 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  Auto-refresh
                </label>
              </div>
            </div>
            {cacheLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                <span className="text-sm text-gray-600">Loading cache statistics...</span>
              </div>
            ) : cacheStats ? (
              <div className="space-y-3 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Cache Size</div>
                    <div className="text-lg font-bold text-purple-600">{cacheStats.size}</div>
                    <div className="text-xs text-gray-500">entries</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</div>
                    <div className="text-sm font-medium">{new Date(cacheStats.timestamp).toLocaleTimeString()}</div>
                    <div className="text-xs text-gray-500">{new Date(cacheStats.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
                {cacheStats.keys.length > 0 ? (
                  <div className="space-y-3">
                    {/* Cache by Type Summary */}
                    {cacheStats.keyGroups && Object.keys(cacheStats.keyGroups).length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-2">Cache by Type:</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(cacheStats.keyGroups).map(([type, keys]) => (
                            <div key={type} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                              {type}: {keys.length}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* All Cached Keys */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">All Cached Keys ({cacheStats.keys.length})</span>
                        <span className="text-xs text-gray-500">Scroll to see all</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded bg-white">
                        {cacheStats.keys.map((key, index) => (
                          <div key={index} className="text-xs px-3 py-2 border-b border-gray-100 hover:bg-gray-50">
                            <div className="font-mono text-gray-700 break-all">{key}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <div className="text-sm">No cached items</div>
                    <div className="text-xs">Cache will populate as users access the site</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No cache statistics available</div>
            )}
          </div>

          {/* Cache Actions */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={clearCache}
                disabled={cacheLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {cacheLoading ? 'Clearing...' : 'Clear All Cache'}
              </button>
              
              <button
                onClick={fetchCacheStats}
                disabled={cacheLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Stats
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Clearing the cache will remove all cached data and may temporarily slow down the website as data is rebuilt.
            </p>
          </div>

          {/* Cache Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-3">About Caching</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start">
                <span className="font-medium text-blue-900 w-32 flex-shrink-0">Purpose:</span>
                <span>Improves website performance by storing frequently accessed data in memory</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-blue-900 w-32 flex-shrink-0">Default TTL:</span>
                <span>5 minutes (cache entries automatically expire)</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium text-blue-900 w-32 flex-shrink-0">Auto Cleanup:</span>
                <span>Expired entries are automatically removed every 5 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsManagement; 