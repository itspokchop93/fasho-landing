import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../../utils/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verify admin authentication
  const token = getAdminTokenFromRequest(req);
  const adminSession = await verifyAdminToken(token);

  if (!adminSession) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const supabase = createAdminClient();
    const { page = '1', limit = '50', type, search, dateFrom, dateTo, user } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;

    // Build base query for ledger entries
    let query = supabase
      .from('loyalty_ledger')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Apply filters
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (user) {
      query = query.eq('user_id', user);
    }

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    const { data: entries, error, count } = await query;

    if (error) {
      console.error('🪙 ADMIN-LEDGER: Error fetching ledger:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch ledger', error: error.message });
    }

    // If no entries, return empty
    if (!entries || entries.length === 0) {
      return res.status(200).json({
        success: true,
        entries: [],
        totalPages: 0,
        totalCount: 0,
        page: pageNum
      });
    }

    // Get unique user IDs, order IDs, and admin IDs
    const userIds = [...new Set(entries.map(e => e.user_id).filter(Boolean))];
    const orderIds = [...new Set(entries.map(e => e.order_id).filter(Boolean))];
    const adminIds = [...new Set(entries.map(e => e.created_by).filter(Boolean))];

    // Build a map of user_id -> customer info from orders table
    // This is more reliable because orders always have customer_email and customer_name
    const userInfoMap = new Map<string, { email: string; name: string }>();
    
    if (userIds.length > 0) {
      // Get customer info from orders - get the most recent order for each user_id
      const { data: orderUsers } = await supabase
        .from('orders')
        .select('user_id, customer_email, customer_name')
        .in('user_id', userIds)
        .not('user_id', 'is', null);

      if (orderUsers) {
        orderUsers.forEach(order => {
          if (order.user_id && !userInfoMap.has(order.user_id)) {
            userInfoMap.set(order.user_id, {
              email: order.customer_email || 'Unknown',
              name: order.customer_name || order.customer_email?.split('@')[0] || 'Unknown'
            });
          }
        });
      }

      // Fallback: Also try user_profiles for any users not found in orders
      const missingUserIds = userIds.filter(id => !userInfoMap.has(id));
      if (missingUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, first_name, last_name')
          .in('user_id', missingUserIds);

        if (profiles) {
          profiles.forEach(profile => {
            if (profile.user_id && !userInfoMap.has(profile.user_id)) {
              const name = profile.full_name || 
                           `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                           'Unknown';
              userInfoMap.set(profile.user_id, {
                email: 'Unknown',
                name: name
              });
            }
          });
        }
      }
    }

    // Fetch orders for order numbers
    let orders: any[] = [];
    if (orderIds.length > 0) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, order_number')
        .in('id', orderIds);
      orders = orderData || [];
    }

    // Fetch admin users for admin emails
    let adminUsers: any[] = [];
    if (adminIds.length > 0) {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id, email')
        .in('id', adminIds);
      adminUsers = adminData || [];
    }

    // Format entries with joined data
    const formattedEntries = entries.map(entry => {
      const userInfo = userInfoMap.get(entry.user_id);
      const order = orders.find(o => o.id === entry.order_id);
      const admin = adminUsers.find(a => a.id === entry.created_by);

      return {
        id: entry.id,
        user_id: entry.user_id,
        type: entry.type,
        amount: entry.amount,
        reason: entry.reason,
        order_id: entry.order_id,
        order_total: entry.order_total,
        balance_before: entry.balance_before,
        balance_after: entry.balance_after,
        created_by: entry.created_by,
        created_at: entry.created_at,
        user_email: userInfo?.email || 'Unknown',
        user_name: userInfo?.name || 'Unknown',
        order_number: order?.order_number || null,
        admin_email: admin?.email || null
      };
    });

    // Filter by search if provided (after fetching, for simplicity)
    let filteredEntries = formattedEntries;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredEntries = formattedEntries.filter(entry =>
        entry.user_email?.toLowerCase().includes(searchLower) ||
        entry.user_name?.toLowerCase().includes(searchLower) ||
        entry.order_number?.toLowerCase().includes(searchLower)
      );
    }

    const totalPages = Math.ceil((count || 0) / limitNum);

    return res.status(200).json({
      success: true,
      entries: filteredEntries,
      totalPages,
      totalCount: count,
      page: pageNum
    });

  } catch (error) {
    console.error('🪙 ADMIN-LEDGER: Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
