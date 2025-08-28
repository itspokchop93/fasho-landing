// RSS Feed API Endpoint
// Generates RSS feed for blog posts to improve SEO and content distribution

import { NextApiRequest, NextApiResponse } from 'next';
import { getBlogSupabaseClient } from '../../../../plugins/blog/utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getBlogSupabaseClient();

    // Get published blog posts for RSS
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(50); // Limit to 50 most recent posts

    if (error) {
      console.error('❌ RSS: Error fetching posts:', error);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://fasho.co' 
      : 'http://localhost:3000';

    // Helper function to escape XML
    const escapeXml = (text: string): string => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    // Helper function to strip HTML and limit text
    const stripHtmlAndLimit = (html: string, limit: number = 300): string => {
      if (!html) return '';
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return text.length > limit ? text.substring(0, limit) + '...' : text;
    };

    // Generate RSS XML
    const lastBuildDate = posts && posts.length > 0 
      ? new Date(posts[0].updated_at || posts[0].published_at).toUTCString()
      : new Date().toUTCString();

    let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
     xmlns:slash="http://purl.org/rss/1.0/modules/slash/"
     xmlns:georss="http://www.georss.org/georss"
     xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Fasho.co Blog</title>
    <description>Music industry insights, playlist marketing tips, and digital promotion strategies for independent artists and music professionals.</description>
    <link>${baseUrl}/blog</link>
    <language>en-US</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <pubDate>${lastBuildDate}</pubDate>
    <ttl>60</ttl>
    <generator>Fasho.co Blog System</generator>
    <managingEditor>team@fasho.co (Fasho Team)</managingEditor>
    <webMaster>team@fasho.co (Fasho Team)</webMaster>
    <copyright>Copyright ${new Date().getFullYear()} Fasho.co. All rights reserved.</copyright>
    <category>Music Industry</category>
    <category>Digital Marketing</category>
    <category>Playlist Marketing</category>
    
    <!-- Self-referencing link for RSS discovery -->
    <atom:link href="${baseUrl}/api/blog/rss.xml" rel="self" type="application/rss+xml" />
    
    <!-- Podcast/iTunes tags (future use) -->
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    
    <!-- Channel image -->
    <image>
      <url>${baseUrl}/fasho-logo-wide.png</url>
      <title>Fasho.co Blog</title>
      <link>${baseUrl}/blog</link>
      <width>600</width>
      <height>60</height>
      <description>Fasho.co Blog Logo</description>
    </image>`;

    // Add individual posts
    if (posts && posts.length > 0) {
      posts.forEach(post => {
        const pubDate = new Date(post.published_at || post.created_at).toUTCString();
        const postUrl = `${baseUrl}/blog/${post.slug}`;
        const title = escapeXml(post.title);
        const description = escapeXml(stripHtmlAndLimit(post.meta_description || post.excerpt || post.content, 300));
        const content = escapeXml(post.content || '');
        const author = escapeXml(post.author_name || 'Fasho Team');
        const categories = post.tags || [];

        rssXml += `
    <item>
      <title>${title}</title>
      <description>${description}</description>
      <content:encoded><![CDATA[${post.content || ''}]]></content:encoded>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${author}</dc:creator>
      <dc:date>${post.published_at || post.created_at}</dc:date>`;

        // Add categories/tags
        categories.forEach(category => {
          rssXml += `
      <category>${escapeXml(category)}</category>`;
        });

        // Add featured image as media enclosure
        if (post.featured_image_url) {
          rssXml += `
      <enclosure url="${post.featured_image_url}" type="image/jpeg" />
      <media:content url="${post.featured_image_url}" type="image/jpeg" medium="image">
        <media:title>${title}</media:title>
        <media:description>${description}</media:description>
      </media:content>`;
        }

        // Add custom fields for enhanced SEO
        if (post.target_keyword) {
          rssXml += `
      <dc:subject>${escapeXml(post.target_keyword)}</dc:subject>`;
        }

        rssXml += `
    </item>`;
      });
    }

    rssXml += `
  </channel>
</rss>`;

    // Set appropriate headers for RSS
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400'); // Cache for 1 hour
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=3600');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=3600');

    console.log(`✅ RSS: Generated RSS feed with ${posts?.length || 0} posts`);
    
    return res.status(200).send(rssXml);

  } catch (error) {
    console.error('❌ RSS: Error generating RSS feed:', error);
    return res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
}