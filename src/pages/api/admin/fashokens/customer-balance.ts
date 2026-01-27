import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../../utils/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verify admin authentication
  const token = getAdminTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const adminSession = await verifyAdminToken(token);

  if (!adminSession) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const supabase = createAdminClient();

    const { data: account, error } = await supabase
      .from('loyalty_accounts')
      .select('balance, lifetime_earned, lifetime_spent')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('🪙 ADMIN-BALANCE: Error fetching balance:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch balance' });
    }

    return res.status(200).json({
      success: true,
      balance: account?.balance || 0,
      lifetime_earned: account?.lifetime_earned || 0,
      lifetime_spent: account?.lifetime_spent || 0
    });

  } catch (error) {
    console.error('🪙 ADMIN-BALANCE: Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
