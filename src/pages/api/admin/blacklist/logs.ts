import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth } from '../../../../utils/admin/auth';
import type { AdminUser } from '../../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, _adminUser: AdminUser) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const supabase = createAdminClient();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const blacklistId = req.query.blacklist_id as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('blacklist_check_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Per-entry mode vs global activity feed
    if (blacklistId) {
      query = query.eq('blacklist_id', blacklistId);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Blacklist logs GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch blacklist logs' });
    }

    // Enrich logs with blacklist customer info
    const blacklistIds = [...new Set((logs || []).map((l: any) => l.blacklist_id).filter(Boolean))];
    let customerMap: Record<string, any> = {};

    if (blacklistIds.length > 0) {
      const { data: customers } = await supabase
        .from('blacklist_customers')
        .select('id, customer_name, customer_email')
        .in('id', blacklistIds);

      if (customers) {
        for (const c of customers) {
          customerMap[c.id] = c;
        }
      }
    }

    const enrichedLogs = (logs || []).map((log: any) => ({
      ...log,
      blacklisted_customer_name: customerMap[log.blacklist_id]?.customer_name || 'Unknown',
      blacklisted_customer_email: customerMap[log.blacklist_id]?.customer_email || 'Unknown',
    }));

    return res.status(200).json({
      success: true,
      logs: enrichedLogs,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Blacklist logs unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
