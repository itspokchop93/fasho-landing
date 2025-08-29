// Blog Admin Single Post API
// CRUD operations for individual blog posts

import { NextApiRequest, NextApiResponse } from 'next';
import { BlogPostService } from '../../../../../../plugins/blog/utils/supabase';
import { triggerSitemapUpdate, forceSitemapUpdate } from '../../../../../../plugins/blog/utils/sitemap-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Post ID is required'
    });
  }

  const blogPostService = new BlogPostService();

  // GET /api/blog/admin/posts/[id] - Get single post
  if (req.method === 'GET') {
    try {
      const response = await blogPostService.getPostById(id);
      
      if (!response.success) {
        return res.status(404).json(response);
      }

      return res.status(200).json({
        success: true,
        data: response.data
      });

    } catch (error) {
      console.error('Error fetching post:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch post'
      });
    }
  }

  // PATCH /api/blog/admin/posts/[id] - Update post
  if (req.method === 'PATCH') {
    try {
      const updateData = req.body;
      
      // If slug is being updated, ensure it's unique
      if (updateData.slug) {
        const uniqueSlug = await blogPostService.generateUniqueSlug(updateData.slug, id);
        updateData.slug = uniqueSlug;
      }

      const response = await blogPostService.updatePost(id, updateData);
      
      if (!response.success) {
        return res.status(400).json(response);
      }

      // Trigger sitemap update if status affects visibility
      if (updateData.status === 'published' || updateData.slug || response.data?.status === 'published') {
        console.log('🗺️ BLOG-API: Triggering sitemap update for post changes');
        triggerSitemapUpdate();
      }

      return res.status(200).json({
        success: true,
        data: response.data,
        message: 'Post updated successfully'
      });

    } catch (error) {
      console.error('Error updating post:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update post'
      });
    }
  }

  // DELETE /api/blog/admin/posts/[id] - Delete post
  if (req.method === 'DELETE') {
    try {
      const supabase = blogPostService['supabase'];
      
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Force immediate sitemap update when deleting posts
      console.log('🗺️ BLOG-API: FORCE updating sitemap for post deletion');
      forceSitemapUpdate().catch((error) => {
        console.error('💥 BLOG-API: Force sitemap update failed:', error);
      });

      return res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting post:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete post'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
