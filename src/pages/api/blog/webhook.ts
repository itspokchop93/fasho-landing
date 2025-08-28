// Blog Webhook Endpoint
// Receives articles from Article Chef and saves them to the blog system
// Implementation follows webhookprompt.md exactly

import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingWebhookPayload } from '../../../../plugins/blog/types/blog';
import { BlogPostService, WebsiteSourceService, WebhookLogService } from '../../../../plugins/blog/utils/supabase';
import { generateSlug } from '../../../../plugins/blog/utils/slug-generator';
import { triggerSitemapUpdate } from '../../../../plugins/blog/utils/sitemap-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Get client IP and user agent for logging
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   'unknown';
  
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Initialize services
  const blogPostService = new BlogPostService();
  const websiteSourceService = new WebsiteSourceService();
  const webhookLogService = new WebhookLogService();

  try {
    // Debug: Log raw request body to check for truncation at HTTP level
    console.log('🔍 WEBHOOK: Raw request body type:', typeof req.body);
    console.log('🔍 WEBHOOK: Raw request body keys:', Object.keys(req.body || {}));
    
    // Parse incoming payload
    const payload: IncomingWebhookPayload = req.body;
    
    // Debug: Check if metaDescription exists in raw payload
    if (payload?.article?.metaDescription) {
      console.log('🔍 WEBHOOK: Raw metaDescription from payload:');
      console.log('🔍 WEBHOOK: Type:', typeof payload.article.metaDescription);
      console.log('🔍 WEBHOOK: Length:', payload.article.metaDescription.length);
      console.log('🔍 WEBHOOK: First 200 chars:', payload.article.metaDescription.substring(0, 200));
      console.log('🔍 WEBHOOK: Last 50 chars:', payload.article.metaDescription.substring(Math.max(0, payload.article.metaDescription.length - 50)));
    }
    
    // Validate request source
    if (payload.metadata?.source !== 'article-chef') {
      const error = 'Invalid source - must be from article-chef';
      
      // Log failed webhook
      await webhookLogService.logWebhook({
        source_article_id: payload?.article?.id,
        payload: payload,
        success: false,
        error_message: error,
        ip_address: Array.isArray(clientIP) ? clientIP[0] : clientIP,
        user_agent: userAgent
      });

      return res.status(400).json({
        success: false, 
        error
      });
    }

    // Validate required fields
    if (!payload.article?.title || !payload.article?.htmlContent) {
      const error = 'Missing required article fields (title and htmlContent)';
      
      await webhookLogService.logWebhook({
        source_article_id: payload?.article?.id,
        payload: payload,
        success: false,
        error_message: error,
        ip_address: Array.isArray(clientIP) ? clientIP[0] : clientIP,
        user_agent: userAgent
      });

      return res.status(400).json({
        success: false, 
        error
      });
    }

    // Generate URL-friendly slug
    const baseSlug = generateSlug(payload.article.title);
    const slug = await blogPostService.generateUniqueSlug(baseSlug);
    console.log(`🔗 WEBHOOK: Generated slug: ${baseSlug} → ${slug}`);
    
    // Check if article already exists by source_article_id
    // Note: We allow duplicates and create new versions with unique slugs (WordPress behavior)
    let isDuplicate = false;
    if (payload.article.id) {
      console.log(`🔍 WEBHOOK: Checking for duplicate article with source_article_id: ${payload.article.id}`);
      
      // Search by source_article_id instead of id
      const { data: existingPosts, error } = await blogPostService.supabase
        .from('blog_posts')
        .select('id, slug, title')
        .eq('source_article_id', payload.article.id)
        .limit(1);

      if (error) {
        console.error('🚨 WEBHOOK: Error checking for duplicates:', error);
      } else if (existingPosts && existingPosts.length > 0) {
        isDuplicate = true;
        const existingPost = existingPosts[0];
        console.log(`🔄 WEBHOOK: Duplicate article detected!`);
        console.log(`📄 WEBHOOK: Existing post: ${existingPost.title} (slug: ${existingPost.slug})`);
        console.log(`📄 WEBHOOK: New post will use slug: ${slug} with source_article_id set to null`);
      } else {
        console.log(`✅ WEBHOOK: No duplicate found, this is a new article`);
      }
    }

    // Upsert website source
    if (payload.website) {
      await websiteSourceService.upsertWebsiteSource({
        source_website_id: payload.website.id,
        name: payload.website.name,
        url: payload.website.url,
        description: payload.website.description
      });
    }

    // Calculate estimated read time (rough estimate: 200 words per minute)
    const wordCount = payload.article.content ? payload.article.content.split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Debug meta description length
    const metaDesc = payload.article.metaDescription;
    console.log(`📝 WEBHOOK: Meta description received:`);
    console.log(`📝 WEBHOOK: Length: ${metaDesc?.length || 0} characters`);
    console.log(`📝 WEBHOOK: Content: "${metaDesc}"`);
    if (metaDesc && metaDesc.length > 160) {
      console.log(`⚠️ WEBHOOK: Meta description is longer than 160 characters - this is fine, we allow unlimited`);
    }
    
    // 🧪 TEST: Let's check if our system can handle longer meta descriptions
    if (metaDesc && metaDesc.length === 155) {
      console.log(`🧪 TEST: Detected exactly 155 chars - this suggests Article Chef truncation`);
      console.log(`🧪 TEST: Article Chef may be cutting off at 155 characters before sending to us`);
      console.log(`🧪 TEST: Our system can handle longer meta descriptions - the issue is likely on Article Chef's side`);
    }

    // Insert blog post as draft for review
    // Note: For duplicates, we set source_article_id to null to avoid UNIQUE constraint violation
    console.log(`💾 WEBHOOK: Creating post with isDuplicate=${isDuplicate}, source_article_id will be: ${isDuplicate ? 'null' : payload.article.id}`);
    
    const createPostResponse = await blogPostService.createPost({
      source_article_id: isDuplicate ? null : payload.article.id,
      title: payload.article.title,
      content: payload.article.content || '',
      html_content: payload.article.htmlContent,
      excerpt: payload.article.excerpt,
      meta_description: payload.article.metaDescription,
      tags: payload.article.tags || [],
      featured_image_url: payload.article.featuredImageUrl,
      target_keyword: payload.article.targetKeyword,
      article_type: payload.article.articleType || 'blog_post',
      slug: slug,
      status: 'draft', // Save as draft for review and editing
      published_at: null, // Will be set when manually published
      read_time: readTime,
      author_name: 'Article Chef',
      view_count: 0
    });

    if (!createPostResponse.success || !createPostResponse.data) {
      throw new Error(`Database insert failed: ${createPostResponse.error}`);
    }

    // Log successful webhook
    await webhookLogService.logWebhook({
      source_article_id: payload.article.id,
      payload: payload,
      success: true,
      ip_address: Array.isArray(clientIP) ? clientIP[0] : clientIP,
      user_agent: userAgent
    });

    // Trigger sitemap update (even for drafts, as they might get published soon)
    console.log('🗺️ WEBHOOK: Triggering sitemap update for new article');
    triggerSitemapUpdate();

    // Return success response
    return res.status(200).json({
      success: true,
      message: isDuplicate 
        ? `Duplicate article saved as new draft with unique slug: ${slug}` 
        : 'Article saved as draft successfully',
      postId: createPostResponse.data.id,
      postUrl: `/blog/${slug}`, // Will be accessible once published
      slug: slug,
      status: 'draft',
      isDuplicate: isDuplicate
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log failed webhook
    try {
      await webhookLogService.logWebhook({
        source_article_id: req.body?.article?.id,
        payload: req.body,
        success: false,
        error_message: error instanceof Error ? error.message : String(error),
        ip_address: Array.isArray(clientIP) ? clientIP[0] : clientIP,
        user_agent: userAgent
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return res.status(500).json({
      success: false, 
      error: 'Failed to process article',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
