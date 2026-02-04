// Main Sitemap Index Generator
// Combines core website pages with blog sitemap
// 
// This serves as the primary sitemap entry point at /sitemap.xml
// It includes:
// - Core website pages (homepage, about, pricing, etc.)
// - Blog posts (fetched dynamically from Sanity + legacy)
//
// Auto-updates when Sanity webhook triggers revalidation

import { NextApiRequest, NextApiResponse } from 'next';
import { getCachedSitemap, getSitemapCacheInfo, forceSitemapUpdate } from '../../../plugins/blog/utils/sitemap-cache';

// Core website pages with their priorities and change frequencies
const CORE_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
  { path: '/packages', priority: '0.9', changefreq: 'weekly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/authenticity-guarantee', priority: '0.6', changefreq: 'monthly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/refund-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/disclaimer', priority: '0.3', changefreq: 'yearly' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🗺️ SITEMAP INDEX: Request received');
    
    // Check if force refresh is requested
    const forceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
    
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://fasho.co' 
      : 'http://localhost:3000';
    const currentDate = new Date().toISOString();
    
    // Start building the sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Add core pages
    for (const page of CORE_PAGES) {
      sitemap += `
  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Get blog sitemap content and extract the URL entries
    // We'll merge them into this single sitemap for simplicity
    const blogSitemapXml = forceRefresh ? await forceSitemapUpdate() : await getCachedSitemap();
    const cacheInfo = getSitemapCacheInfo();
    
    // Extract URL entries from blog sitemap (everything between <urlset> and </urlset>)
    const urlsetMatch = blogSitemapXml.match(/<urlset[^>]*>([\s\S]*)<\/urlset>/);
    if (urlsetMatch && urlsetMatch[1]) {
      // Extract individual <url> blocks
      const urlBlocks = urlsetMatch[1].match(/<url>[\s\S]*?<\/url>/g);
      if (urlBlocks) {
        for (const urlBlock of urlBlocks) {
          sitemap += urlBlock;
        }
      }
    }

    sitemap += `
</urlset>`;

    console.log(`🗺️ SITEMAP INDEX: Serving combined sitemap (core pages: ${CORE_PAGES.length}, blog posts: ${cacheInfo.postCount}, blog cache age: ${cacheInfo.age}s)`);

    // Set headers for XML response with caching
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600'); // 5min cache, 1hr stale
    res.setHeader('X-Sitemap-Core-Pages', CORE_PAGES.length.toString());
    res.setHeader('X-Sitemap-Blog-Posts', cacheInfo.postCount.toString());
    res.setHeader('X-Sitemap-Blog-Cache', cacheInfo.cached ? 'HIT' : 'MISS');
    res.setHeader('X-Sitemap-Blog-Age', cacheInfo.age.toString());
    
    return res.status(200).send(sitemap);

  } catch (error) {
    console.error('💥 SITEMAP INDEX: Generation failed:', error);
    
    // Return minimal sitemap on error with just core pages
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://fasho.co' 
      : 'http://localhost:3000';
    const currentDate = new Date().toISOString();
    
    let fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    for (const page of CORE_PAGES) {
      fallbackSitemap += `
  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    fallbackSitemap += `
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Sitemap-Cache', 'ERROR');
    
    return res.status(200).send(fallbackSitemap);
  }
}
