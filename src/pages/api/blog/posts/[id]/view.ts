// Blog Post View Tracking API
// Increments view count for blog posts

import { NextApiRequest, NextApiResponse } from 'next';
import { getBlogSupabaseClient } from '../../../../../../plugins/blog/utils/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  try {
    const supabase = getBlogSupabaseClient();

    // Get current view count and increment it
    const { data: post } = await supabase
      .from('blog_posts')
      .select('view_count')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count
    const { error } = await supabase
      .from('blog_posts')
      .update({ 
        view_count: (post.view_count || 0) + 1 
      })
      .eq('id', id);

    if (error) {
      console.error('Error incrementing view count:', error);
      return res.status(500).json({ error: 'Failed to track view' });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error tracking blog post view:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
