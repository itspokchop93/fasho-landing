import React, { useState, useEffect } from 'react';

interface AdminSettings {
  webhook_url: string;
  site_title: string;
  site_description: string;
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

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

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
    </div>
  );
};

export default AdminSettingsManagement; 