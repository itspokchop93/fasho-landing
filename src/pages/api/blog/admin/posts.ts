// Blog Admin Posts API
// CRUD operations for blog posts in admin dashboard

import { NextApiRequest, NextApiResponse } from 'next';
import { BlogPostService } from '../../../../../plugins/blog/utils/supabase';
import { BlogPost, BlogFilters, BlogListResponse } from '../../../../../plugins/blog/types/blog';
import { triggerSitemapUpdate } from '../../../../../plugins/blog/utils/sitemap-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const blogPostService = new BlogPostService();

  // GET /api/blog/admin/posts - List posts with filters and pagination
  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        limit = '10',
        status,
        search,
        author,
        tag,
        category,
        date_from,
        date_to
      } = req.query;

      const filters: BlogFilters = {};
      if (status && typeof status === 'string') filters.status = status as BlogPost['status'];
      if (search && typeof search === 'string') filters.search = search;
      if (author && typeof author === 'string') filters.author = author;
      if (tag && typeof tag === 'string') filters.tag = tag;
      if (category && typeof category === 'string') filters.category = category;
      if (date_from && typeof date_from === 'string') filters.date_from = date_from;
      if (date_to && typeof date_to === 'string') filters.date_to = date_to;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.max(1, Math.min(50, parseInt(limit as string)));

      const supabase = blogPostService['supabase'];
      
      // Build query
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          categories:blog_post_categories(
            category:blog_categories(*)
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }
      
      if (filters.author) {
        query = query.eq('author_name', filters.author);
      }
      
      if (filters.tag) {
        query = query.contains('tags', [filters.tag]);
      }
      
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply pagination and ordering
      const offset = (pageNum - 1) * limitNum;
      query = query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      const { data: posts, error, count } = await query;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limitNum);

      const response: BlogListResponse = {
        posts: posts || [],
        total: count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages
      };

      return res.status(200).json(response);

    } catch (error) {
      console.error('Error fetching posts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch posts'
      });
    }
  }

  // POST /api/blog/admin/posts - Create new post
  if (req.method === 'POST') {
    try {
      const postData = req.body;
      console.log('📝 BLOG-API: Received POST data:', JSON.stringify(postData, null, 2));
      
      // Generate unique slug if needed
      const baseSlug = postData.slug || generateSlug(postData.title);
      const uniqueSlug = await blogPostService.generateUniqueSlug(baseSlug);
      
      const createResponse = await blogPostService.createPost({
        ...postData,
        slug: uniqueSlug,
        author_name: postData.author_name || 'Admin'
      });

      if (!createResponse.success) {
        console.log('❌ BLOG-API: Create failed:', createResponse.error);
        return res.status(400).json(createResponse);
      }

      console.log('✅ BLOG-API: Post created successfully:', createResponse.data?.id);

      // Trigger sitemap update for published posts
      if (postData.status === 'published') {
        console.log('🗺️ BLOG-API: Triggering sitemap update for published post');
        triggerSitemapUpdate();
      }

      return res.status(201).json({
        success: true,
        data: createResponse.data,
        message: 'Post created successfully'
      });

    } catch (error) {
      console.error('Error creating post:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create post'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}
