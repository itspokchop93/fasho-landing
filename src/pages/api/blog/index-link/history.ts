import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Fetch submission history
      const { data: submissions, error } = await supabase
        .from('blog_index_submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(50); // Limit to latest 50 submissions

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch submission history',
          details: error.message 
        });
      }

      res.status(200).json({
        success: true,
        data: submissions || []
      });

    } catch (error) {
      console.error('History fetch error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Valid submission ID is required' });
      }

      // Delete submission
      const { error } = await supabase
        .from('blog_index_submissions')
        .delete()
        .eq('id', parseInt(id));

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          error: 'Failed to delete submission',
          details: error.message 
        });
      }

      res.status(200).json({
        success: true,
        message: 'Submission deleted successfully'
      });

    } catch (error) {
      console.error('History delete error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
