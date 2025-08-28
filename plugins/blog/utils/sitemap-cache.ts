// Blog Sitemap Cache Manager
// Handles caching and auto-regeneration of blog sitemap for lightning-fast SEO updates

import { getBlogSupabaseClient } from './supabase';

interface SitemapCache {
  xml: string;
  lastUpdated: string;
  postCount: number;
}

// In-memory cache for sitemap
let sitemapCache: SitemapCache | null = null;
let isRegenerating = false;

// Generate fresh sitemap XML
export async function generateSitemapXML(): Promise<string> {
  console.log('🗺️ SITEMAP: Generating fresh sitemap...');
  
  try {
    const supabase = getBlogSupabaseClient();

    // Get all published blog posts
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at, created_at, title, meta_description, featured_image_url, tags')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ SITEMAP: Error fetching posts:', error);
      throw error;
    }

    // Generate sitemap XML
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://fasho.co' 
      : 'http://localhost:3000';
    const currentDate = new Date().toISOString();

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Blog index page -->
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Enhanced blog posts with SEO data
    if (posts && posts.length > 0) {
      // Get additional SEO data for enhanced sitemap
      const { data: postsWithSEO, error: seoError } = await supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at, created_at, title, meta_description, featured_image_url, tags')
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())
        .order('updated_at', { ascending: false });

      const enhancedPosts = postsWithSEO || posts;

      enhancedPosts.forEach((post) => {
        const lastmod = post.updated_at || post.published_at || currentDate;
        const publishedDate = post.published_at || post.created_at;
        const isRecent = new Date(publishedDate).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        sitemap += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${isRecent ? 'daily' : 'weekly'}</changefreq>
    <priority>${isRecent ? '0.9' : '0.7'}</priority>`;

        // Add image sitemap if featured image exists
        if (post.featured_image_url) {
          const safeTitle = (post.title || '').replace(/[<>&"']/g, '');
          const safeDescription = (post.meta_description || post.title || '').replace(/[<>&"']/g, '');
          
          sitemap += `
    <image:image>
      <image:loc>${post.featured_image_url}</image:loc>
      <image:title>${safeTitle}</image:title>
      <image:caption>${safeDescription}</image:caption>
    </image:image>`;
        }

        // Add news sitemap for recent articles (within 2 days for Google News)
        const isBrandNew = new Date(publishedDate).getTime() > Date.now() - (2 * 24 * 60 * 60 * 1000);
        if (isBrandNew && post.title) {
          const safeTitle = post.title.replace(/[<>&"']/g, '');
          const keywords = (post.tags || []).join(', ');
          
          sitemap += `
    <news:news>
      <news:publication>
        <news:name>Fasho.co Blog</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${publishedDate}</news:publication_date>
      <news:title>${safeTitle}</news:title>
      <news:keywords>${keywords}</news:keywords>
    </news:news>`;
        }

        sitemap += `
  </url>`;
      });
    }

    sitemap += `
</urlset>`;

    console.log(`✅ SITEMAP: Generated sitemap with ${posts?.length || 0} posts`);
    return sitemap;

  } catch (error) {
    console.error('💥 SITEMAP: Generation failed:', error);
    throw error;
  }
}

// Get cached sitemap or generate fresh one
export async function getCachedSitemap(): Promise<string> {
  // If cache exists and is recent (less than 5 minutes old), return it
  if (sitemapCache && isRecentCache()) {
    console.log('⚡ SITEMAP: Serving from cache');
    return sitemapCache.xml;
  }

  // If currently regenerating, wait for it
  if (isRegenerating) {
    console.log('⏳ SITEMAP: Waiting for ongoing regeneration...');
    return await waitForRegeneration();
  }

  // Generate fresh sitemap
  return await regenerateSitemap();
}

// Force regenerate sitemap and update cache
export async function regenerateSitemap(): Promise<string> {
  if (isRegenerating) {
    console.log('🔄 SITEMAP: Already regenerating, waiting...');
    return await waitForRegeneration();
  }

  isRegenerating = true;
  console.log('🔄 SITEMAP: Regenerating sitemap...');

  try {
    const xml = await generateSitemapXML();
    
    // Update cache
    sitemapCache = {
      xml,
      lastUpdated: new Date().toISOString(),
      postCount: (xml.match(/<url>/g) || []).length - 1 // Subtract 1 for blog index
    };

    console.log(`✅ SITEMAP: Cache updated with ${sitemapCache.postCount} posts`);
    return xml;

  } catch (error) {
    console.error('💥 SITEMAP: Regeneration failed:', error);
    throw error;
  } finally {
    isRegenerating = false;
  }
}

// Check if cache is recent (less than 5 minutes old)
function isRecentCache(): boolean {
  if (!sitemapCache) return false;
  
  const cacheAge = Date.now() - new Date(sitemapCache.lastUpdated).getTime();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  return cacheAge < maxAge;
}

// Wait for ongoing regeneration to complete
async function waitForRegeneration(): Promise<string> {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (!isRegenerating) {
        clearInterval(checkInterval);
        if (sitemapCache) {
          resolve(sitemapCache.xml);
        } else {
          reject(new Error('Regeneration completed but no cache available'));
        }
      }
    }, 100); // Check every 100ms

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Sitemap regeneration timeout'));
    }, 10000);
  });
}

// Trigger sitemap regeneration (called after post changes)
export async function triggerSitemapUpdate(): Promise<void> {
  console.log('🚀 SITEMAP: Triggering update...');
  
  // Don't await - let it run in background
  regenerateSitemap().catch((error) => {
    console.error('💥 SITEMAP: Background update failed:', error);
  });
}

// Get cache info for debugging
export function getSitemapCacheInfo(): { 
  cached: boolean; 
  lastUpdated: string | null; 
  postCount: number; 
  age: number; 
} {
  if (!sitemapCache) {
    return { cached: false, lastUpdated: null, postCount: 0, age: 0 };
  }

  const age = Date.now() - new Date(sitemapCache.lastUpdated).getTime();
  
  return {
    cached: true,
    lastUpdated: sitemapCache.lastUpdated,
    postCount: sitemapCache.postCount,
    age: Math.round(age / 1000) // Age in seconds
  };
}
