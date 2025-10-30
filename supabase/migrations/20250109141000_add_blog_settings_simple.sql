-- Add Blog Settings Table (Simple Version)
-- This migration adds the blog_settings table for storing global blog configuration

-- Blog settings table for storing global blog configuration
CREATE TABLE IF NOT EXISTS blog_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_settings_key ON blog_settings(setting_key);

-- Enable RLS for blog settings
ALTER TABLE blog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage blog settings" ON blog_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert default blog settings using dollar quoting to avoid escaping issues
INSERT INTO blog_settings (setting_key, setting_value) VALUES
('general', $json${"site_title": "Blog", "site_description": "A professional blog powered by our CMS", "posts_per_page": 10, "default_status": "draft", "allow_comments": false}$json$),
('seo', $json${"seo_title_template": "{title} | {site_title}", "seo_description_template": "{excerpt}", "sitemap_enabled": true, "rss_enabled": true}$json$),
('social', $json${"social_twitter": "", "social_facebook": ""}$json$),
('analytics', $json${"google_analytics_id": ""}$json$)
ON CONFLICT (setting_key) DO NOTHING;















