import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { userId, page = '1', limit = '20' } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const supabase = createAdminClient();
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Fetch or create loyalty account
    const { data: account, error: accountError } = await supabase
      .from('loyalty_accounts')
      .select('balance, lifetime_earned, lifetime_spent')
      .eq('user_id', userId)
      .single();

    // If no account exists, return zeros
    const balance = account?.balance || 0;
    const lifetimeEarned = account?.lifetime_earned || 0;
    const lifetimeSpent = account?.lifetime_spent || 0;

    // Fetch ledger entries for this user
    const { data: entries, error: ledgerError, count } = await supabase
      .from('loyalty_ledger')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (ledgerError) {
      console.error('🪙 USER-FASHOKENS: Error fetching ledger:', ledgerError);
    }

    // Get order numbers for entries that have order_id
    const orderIds = entries?.map(e => e.order_id).filter(Boolean) || [];
    let orders: any[] = [];
    if (orderIds.length > 0) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, order_number')
        .in('id', orderIds);
      orders = orderData || [];
    }

    // Format entries with order numbers
    const formattedEntries = (entries || []).map(entry => {
      const order = orders.find(o => o.id === entry.order_id);
      return {
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        reason: entry.reason,
        order_number: order?.order_number || null,
        balance_before: entry.balance_before,
        balance_after: entry.balance_after,
        created_at: entry.created_at
      };
    });

    const totalPages = Math.ceil((count || 0) / limitNum);

    return res.status(200).json({
      success: true,
      balance,
      lifetimeEarned,
      lifetimeSpent,
      entries: formattedEntries,
      totalPages,
      totalCount: count || 0,
      page: pageNum
    });

  } catch (error) {
    console.error('🪙 USER-FASHOKENS: Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
