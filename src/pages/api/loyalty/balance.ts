import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient, createClient } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get authenticated user from request
    const userClient = createClient(req, res);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const supabase = createAdminClient();
    
    // Get or create loyalty account
    const { data: account, error: accountError } = await supabase
      .rpc('get_or_create_loyalty_account', { p_user_id: user.id });

    if (accountError) {
      console.error('🪙 LOYALTY: Error getting account:', accountError);
      // Return zero balance if function doesn't exist yet
      return res.status(200).json({
        success: true,
        account: {
          user_id: user.id,
          balance: 0,
          lifetime_earned: 0,
          lifetime_spent: 0
        }
      });
    }

    return res.status(200).json({
      success: true,
      account
    });

  } catch (error) {
    console.error('🪙 LOYALTY: Error in balance API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
