import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient, createClient } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { cartTotal } = req.body;

    if (typeof cartTotal !== 'number' || cartTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid cart total' });
    }

    // Get authenticated user from request
    const userClient = createClient(req, res);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const supabase = createAdminClient();
    
    // Get loyalty settings
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('redemption_tokens_per_dollar, minimum_order_total, is_program_active')
      .eq('id', 1)
      .single();

    if (!settings?.is_program_active) {
      return res.status(200).json({
        success: true,
        maxTokens: 0,
        maxDiscount: 0,
        balance: 0,
        message: 'Loyalty program is not active'
      });
    }

    const redemptionRate = settings?.redemption_tokens_per_dollar || 100;
    const minimumOrder = settings?.minimum_order_total || 1.00;

    // Get user's balance
    const { data: account } = await supabase
      .from('loyalty_accounts')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const balance = account?.balance || 0;

    if (balance === 0) {
      return res.status(200).json({
        success: true,
        maxTokens: 0,
        maxDiscount: 0,
        balance: 0
      });
    }

    // Calculate max discount (cart total - minimum order)
    const maxDiscount = Math.max(0, cartTotal - minimumOrder);
    
    // Calculate max tokens for that discount
    const maxTokensForDiscount = Math.floor(maxDiscount * redemptionRate);
    
    // Return the lesser of user's balance or max tokens for discount
    const maxTokens = Math.min(balance, maxTokensForDiscount);
    const actualMaxDiscount = maxTokens / redemptionRate;

    return res.status(200).json({
      success: true,
      maxTokens,
      maxDiscount: actualMaxDiscount,
      balance,
      redemptionRate
    });

  } catch (error) {
    console.error('🪙 LOYALTY: Error in calculate-max API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
