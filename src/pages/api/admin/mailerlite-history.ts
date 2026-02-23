import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 30;
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    const { count } = await supabase
      .from('mailerlite_sync_history')
      .select('*', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('mailerlite_sync_history')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('mailerlite-history fetch error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      history: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error('Admin mailerlite-history error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
