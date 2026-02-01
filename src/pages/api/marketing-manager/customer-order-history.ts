import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const supabase = createAdminClient();

    // Fetch all orders for this user
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        total,
        status,
        order_items(track_title, package_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching customer order history:', error);
      return res.status(500).json({ error: 'Failed to fetch order history' });
    }

    // Format the response
    const orderHistory = (orders || []).map(order => {
      const items = (order.order_items as any[]) || [];
      // Get unique package names
      const packageNames = [...new Set(items.map(item => item.package_name).filter(Boolean))];
      
      return {
        id: order.id,
        orderNumber: order.order_number,
        date: order.created_at,
        total: order.total,
        status: order.status,
        trackCount: items.length,
        packages: packageNames.join(', ') || 'Unknown'
      };
    });

    res.status(200).json(orderHistory);
  } catch (error) {
    console.error('Error in customer order history API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
