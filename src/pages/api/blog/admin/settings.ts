// Blog Admin Settings API
// Manages global blog settings and configuration

import { NextApiRequest, NextApiResponse } from 'next';
import { getBlogSupabaseClient } from '../../../../../plugins/blog/utils/supabase';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  // GET /api/blog/admin/settings - Get blog settings
  if (req.method === 'GET') {
    try {
      console.log('🔍 SETTINGS-API: Fetching blog settings from database...');
      const supabase = getBlogSupabaseClient();

      // Fetch all settings from the database
      const { data: settingsRows, error } = await supabase
        .from('blog_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('🚨 SETTINGS-API: Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch settings from database'
        });
      }

      // Combine all settings into a single object
      const combinedSettings: BlogSettingsData = {
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
      };

      // Merge database settings with defaults
      settingsRows?.forEach(row => {
        const settings = row.setting_value as any;
        Object.assign(combinedSettings, settings);
      });

      console.log('✅ SETTINGS-API: Successfully fetched settings:', combinedSettings);
      return res.status(200).json({
        success: true,
        data: combinedSettings
      });

    } catch (error) {
      console.error('🚨 SETTINGS-API: Error fetching blog settings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch settings'
      });
    }
  }

  // POST /api/blog/admin/settings - Update blog settings
  if (req.method === 'POST') {
    try {
      console.log('💾 SETTINGS-API: Updating blog settings:', JSON.stringify(req.body, null, 2));
      const newSettings = req.body as BlogSettingsData;
      const supabase = getBlogSupabaseClient();

      // Group settings by category
      const settingsGroups = {
        general: {
          site_title: newSettings.site_title,
          site_description: newSettings.site_description,
          posts_per_page: newSettings.posts_per_page,
          default_status: newSettings.default_status,
          allow_comments: newSettings.allow_comments
        },
        seo: {
          seo_title_template: newSettings.seo_title_template,
          seo_description_template: newSettings.seo_description_template,
          sitemap_enabled: newSettings.sitemap_enabled,
          rss_enabled: newSettings.rss_enabled
        },
        social: {
          social_twitter: newSettings.social_twitter,
          social_facebook: newSettings.social_facebook
        },
        analytics: {
          google_analytics_id: newSettings.google_analytics_id
        }
      };

      // Update each settings group in the database
      const updatePromises = Object.entries(settingsGroups).map(async ([key, value]) => {
        const { error } = await supabase
          .from('blog_settings')
          .upsert({
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });

        if (error) {
          console.error(`🚨 SETTINGS-API: Error updating ${key} settings:`, error);
          throw error;
        }
        
        console.log(`✅ SETTINGS-API: Successfully updated ${key} settings`);
      });

      await Promise.all(updatePromises);

      console.log('🎉 SETTINGS-API: All settings updated successfully!');
      return res.status(200).json({
        success: true,
        data: newSettings,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      console.error('🚨 SETTINGS-API: Error updating blog settings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
