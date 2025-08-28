-- Blog System Database Schema
-- This migration creates all necessary tables for the blogging system
-- Safe for production: uses CREATE TABLE IF NOT EXISTS and proper namespacing

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_article_id UUID UNIQUE,      -- Original article ID from Article Chef
    title TEXT NOT NULL,
    content TEXT NOT NULL,               -- Plain text content
    html_content TEXT NOT NULL,          -- Full HTML content with images
    excerpt TEXT,
    meta_description TEXT,
    tags TEXT[],                         -- Array of tags
    featured_image_url TEXT,
    target_keyword TEXT,
    article_type TEXT,
    slug TEXT UNIQUE NOT NULL,           -- URL-friendly slug
    status TEXT DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'scheduled', 'archived')),
    scheduled_at TIMESTAMPTZ,            -- For scheduled publishing
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- SEO fields
    meta_title TEXT,
    open_graph_title TEXT,
    open_graph_description TEXT,
    open_graph_image TEXT,
    twitter_title TEXT,
    twitter_description TEXT,
    twitter_image TEXT,
    
    -- Analytics fields
    view_count INTEGER DEFAULT 0,
    read_time INTEGER, -- in minutes
    
    -- Author info (for future multi-author support)
    author_name TEXT DEFAULT 'Admin',
    author_email TEXT
);

-- Website sources table (for Article Chef integration)
CREATE TABLE IF NOT EXISTS blog_website_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_website_id UUID UNIQUE,      -- Source website ID from Article Chef
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook logs table (for debugging and monitoring)
CREATE TABLE IF NOT EXISTS blog_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_article_id UUID,
    payload JSONB NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog categories table
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog post categories junction table
CREATE TABLE IF NOT EXISTS blog_post_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, category_id)
);

-- Blog analytics table (for tracking post performance)
CREATE TABLE IF NOT EXISTS blog_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    time_on_page INTEGER DEFAULT 0, -- in seconds
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, date)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_at ON blog_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_view_count ON blog_posts(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_blog_website_sources_source_id ON blog_website_sources(source_website_id);

CREATE INDEX IF NOT EXISTS idx_blog_webhook_logs_created_at ON blog_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_webhook_logs_success ON blog_webhook_logs(success);
CREATE INDEX IF NOT EXISTS idx_blog_webhook_logs_source_article ON blog_webhook_logs(source_article_id);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);

CREATE INDEX IF NOT EXISTS idx_blog_post_categories_post_id ON blog_post_categories(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_categories_category_id ON blog_post_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_blog_analytics_post_date ON blog_analytics(post_id, date);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_date ON blog_analytics(date DESC);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_posts_updated_at();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_blog_slug(input_title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base slug
    base_slug := lower(regexp_replace(input_title, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    base_slug := substring(base_slug, 1, 100);
    
    final_slug := base_slug;
    
    -- Check if slug exists and increment counter if needed
    WHILE EXISTS (SELECT 1 FROM blog_posts WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-publish scheduled posts
CREATE OR REPLACE FUNCTION auto_publish_scheduled_posts()
RETURNS INTEGER AS $$
DECLARE
    published_count INTEGER := 0;
BEGIN
    UPDATE blog_posts 
    SET 
        status = 'published',
        published_at = NOW()
    WHERE 
        status = 'scheduled' 
        AND scheduled_at <= NOW()
        AND scheduled_at IS NOT NULL;
    
    GET DIAGNOSTICS published_count = ROW_COUNT;
    RETURN published_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default categories
INSERT INTO blog_categories (name, slug, description) 
VALUES 
    ('General', 'general', 'General blog posts'),
    ('News', 'news', 'News and updates'),
    ('Tips', 'tips', 'Tips and tutorials'),
    ('Industry', 'industry', 'Industry insights')
ON CONFLICT (slug) DO NOTHING;

-- Enable Row Level Security (RLS) for public access control
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access
CREATE POLICY "Public can read published blog posts" ON blog_posts
    FOR SELECT USING (status = 'published' AND published_at <= NOW());

CREATE POLICY "Public can read blog categories" ON blog_categories
    FOR SELECT USING (true);

CREATE POLICY "Public can read blog post categories" ON blog_post_categories
    FOR SELECT USING (true);

-- Admin policies (service role has full access)
CREATE POLICY "Service role can manage blog posts" ON blog_posts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage blog categories" ON blog_categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage blog post categories" ON blog_post_categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage blog analytics" ON blog_analytics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tables that don't need public access (admin only)
ALTER TABLE blog_website_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage website sources" ON blog_website_sources
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage webhook logs" ON blog_webhook_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

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

-- Insert default blog settings
INSERT INTO blog_settings (setting_key, setting_value) VALUES
('general', '{"site_title": "Blog", "site_description": "A professional blog powered by our CMS", "posts_per_page": 10, "default_status": "draft", "allow_comments": false}'),
('seo', '{"seo_title_template": "{title} | {site_title}", "seo_description_template": "{excerpt}", "sitemap_enabled": true, "rss_enabled": true}'),
('social', '{"social_twitter": "", "social_facebook": ""}'),
('analytics', '{"google_analytics_id": ""}')
ON CONFLICT (setting_key) DO NOTHING;