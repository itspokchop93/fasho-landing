import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();
    
    const { data: settings, error } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('🪙 LOYALTY: Error fetching settings:', error);
      // Return default settings if table doesn't exist yet
      // 100 tokens earned per $1 spent, 1000 tokens = $1 discount (100 tokens = $0.10)
      return res.status(200).json({
        success: true,
        settings: {
          tokens_per_dollar: 100,
          redemption_tokens_per_dollar: 1000,
          is_program_active: true,
          minimum_order_total: 1.00
        }
      });
    }

    return res.status(200).json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('🪙 LOYALTY: Error in settings API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
