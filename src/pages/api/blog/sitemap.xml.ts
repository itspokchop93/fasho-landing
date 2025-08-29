// Blog XML Sitemap Generator
// Lightning-fast cached sitemap for SEO optimization

import { NextApiRequest, NextApiResponse } from 'next';
import { getCachedSitemap, getSitemapCacheInfo, forceSitemapUpdate } from '../../../../plugins/blog/utils/sitemap-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🗺️ SITEMAP: Request received');
    
    // Check if force refresh is requested
    const forceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
    
    // Get cached or fresh sitemap
    const sitemap = forceRefresh ? await forceSitemapUpdate() : await getCachedSitemap();
    const cacheInfo = getSitemapCacheInfo();
    
    console.log(`🗺️ SITEMAP: Serving sitemap (cached: ${cacheInfo.cached}, posts: ${cacheInfo.postCount}, age: ${cacheInfo.age}s)`);

    // Set headers for XML response with aggressive caching
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600'); // 5min cache, 1hr stale
    res.setHeader('X-Sitemap-Cache', cacheInfo.cached ? 'HIT' : 'MISS');
    res.setHeader('X-Sitemap-Posts', cacheInfo.postCount.toString());
    res.setHeader('X-Sitemap-Age', cacheInfo.age.toString());
    
    return res.status(200).send(sitemap);

  } catch (error) {
    console.error('💥 SITEMAP: Generation failed:', error);
    
    // Return minimal sitemap on error
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://fasho.co' 
      : 'http://localhost:3000';
    
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Sitemap-Cache', 'ERROR');
    
    return res.status(200).send(fallbackSitemap);
  }
}
