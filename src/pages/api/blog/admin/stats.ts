// Blog Admin Statistics API
// Provides dashboard statistics for blog management

import { NextApiRequest, NextApiResponse } from 'next';
import { getBlogSupabaseClient } from '../../../../../plugins/blog/utils/supabase';
import { BlogDashboardStats } from '../../../../../plugins/blog/types/blog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getBlogSupabaseClient();

    // Get total posts count by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('blog_posts')
      .select('status')
      .then(result => {
        if (result.error) throw result.error;
        
        const counts = {
          total: result.data?.length || 0,
          published: result.data?.filter(p => p.status === 'published').length || 0,
          draft: result.data?.filter(p => p.status === 'draft').length || 0,
          scheduled: result.data?.filter(p => p.status === 'scheduled').length || 0,
        };
        
        return { data: counts, error: null };
      });

    if (statusError) throw statusError;

    // Get total views
    const { data: viewsData, error: viewsError } = await supabase
      .from('blog_posts')
      .select('view_count')
      .then(result => {
        if (result.error) throw result.error;
        
        const totalViews = result.data?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;
        return { data: totalViews, error: null };
      });

    if (viewsError) throw viewsError;

    // Get monthly views (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyData, error: monthlyError } = await supabase
      .from('blog_analytics')
      .select('views')
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .then(result => {
        if (result.error && result.error.code !== 'PGRST116') throw result.error; // Ignore table not found
        
        const monthlyViews = result.data?.reduce((sum, day) => sum + (day.views || 0), 0) || 0;
        return { data: monthlyViews, error: null };
      });

    // Get recent posts
    const { data: recentPosts, error: recentError } = await supabase
      .from('blog_posts')
      .select('id, title, content, html_content, tags, slug, status, view_count, created_at, updated_at, author_name')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    const stats: BlogDashboardStats = {
      total_posts: statusCounts?.total || 0,
      published_posts: statusCounts?.published || 0,
      draft_posts: statusCounts?.draft || 0,
      scheduled_posts: statusCounts?.scheduled || 0,
      total_views: viewsData || 0,
      monthly_views: monthlyData || 0,
      recent_posts: recentPosts || []
    };

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching blog stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
}
