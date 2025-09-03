// Blog Settings Component
// Global blog configuration and settings

import React, { useState, useEffect } from 'react';

interface BlogSettingsData {
  site_title: string;
  site_description: string;
  posts_per_page: number;
  default_status: 'published' | 'draft';
  allow_comments: boolean;
  seo_title_template: string;
  seo_description_template: string;
  social_twitter: string;
  social_facebook: string;
  google_analytics_id: string;
  sitemap_enabled: boolean;
  rss_enabled: boolean;
}

const BlogSettings: React.FC = () => {
  const [settings, setSettings] = useState<BlogSettingsData>({
    site_title: 'Blog',
    site_description: 'A professional blog powered by our CMS',
    posts_per_page: 10,
    default_status: 'draft',
    allow_comments: false,
    seo_title_template: '{title} | {site_title}',
    seo_description_template: '{excerpt}',
    social_twitter: '',
    social_facebook: '',
    google_analytics_id: '',
    sitemap_enabled: true,
    rss_enabled: true,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/blog/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings({ ...settings, ...data.data });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('Saving...');
      
      const response = await fetch('/api/blog/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveStatus('Settings saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('Failed to save settings');
      }
    } catch (error) {
      setSaveStatus('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" style={{ zIndex: 10 }}>
      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Blog Title
            </label>
            <input
              type="text"
              value={settings.site_title}
              onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              style={{ zIndex: 12 }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Posts Per Page
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={settings.posts_per_page}
              onChange={(e) => setSettings({ ...settings, posts_per_page: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              style={{ zIndex: 12 }}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blog Description
          </label>
          <textarea
            value={settings.site_description}
            onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 resize-none"
            style={{ zIndex: 12 }}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Post Status
          </label>
          <select
            value={settings.default_status}
            onChange={(e) => setSettings({ ...settings, default_status: e.target.value as 'published' | 'draft' })}
            className="border border-gray-300 rounded-md px-3 py-2"
            style={{ zIndex: 12 }}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title Template
            </label>
            <input
              type="text"
              value={settings.seo_title_template}
              onChange={(e) => setSettings({ ...settings, seo_title_template: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="{title} | {site_title}"
              style={{ zIndex: 12 }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Available variables: {'{title}'}, {'{site_title}'}, {'{category}'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description Template
            </label>
            <input
              type="text"
              value={settings.seo_description_template}
              onChange={(e) => setSettings({ ...settings, seo_description_template: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="{excerpt}"
              style={{ zIndex: 12 }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.sitemap_enabled}
                onChange={(e) => setSettings({ ...settings, sitemap_enabled: e.target.checked })}
                className="rounded"
                style={{ zIndex: 12 }}
              />
              <span className="text-sm text-gray-700">Enable XML Sitemap</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.rss_enabled}
                onChange={(e) => setSettings({ ...settings, rss_enabled: e.target.checked })}
                className="rounded"
                style={{ zIndex: 12 }}
              />
              <span className="text-sm text-gray-700">Enable RSS Feed</span>
            </label>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Twitter Username
            </label>
            <input
              type="text"
              value={settings.social_twitter}
              onChange={(e) => setSettings({ ...settings, social_twitter: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="@username"
              style={{ zIndex: 12 }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facebook Page URL
            </label>
            <input
              type="url"
              value={settings.social_facebook}
              onChange={(e) => setSettings({ ...settings, social_facebook: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="https://facebook.com/page"
              style={{ zIndex: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google Analytics ID
          </label>
          <input
            type="text"
            value={settings.google_analytics_id}
            onChange={(e) => setSettings({ ...settings, google_analytics_id: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="GA4-XXXXXXXXX"
            style={{ zIndex: 12 }}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ zIndex: 11 }}>
        <div>
          {saveStatus && (
            <p className={`text-sm ${saveStatus.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {saveStatus}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          style={{ zIndex: 12 }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default BlogSettings;


