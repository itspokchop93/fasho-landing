import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../../utils/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
    const { userId, amount, isAddition, reason } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }

    // Reason is now optional - format with "Admin" prefix
    let formattedReason = 'Admin';
    if (reason && reason.trim()) {
      formattedReason = `Admin - ${reason.trim()}`;
    }

    const supabase = createAdminClient();

    // Get admin user id from their email
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', adminSession.email)
      .single();

    // Call admin_adjust_fashokens function
    const { data: result, error } = await supabase
      .rpc('admin_adjust_fashokens', {
        p_admin_id: adminUser?.id || null,
        p_user_id: userId,
        p_amount: parseInt(amount),
        p_is_addition: isAddition,
        p_reason: formattedReason
      });

    if (error) {
      console.error('🪙 ADMIN-ADJUST: Error adjusting tokens:', error);
      return res.status(500).json({ success: false, message: 'Failed to adjust tokens' });
    }

    if (result && result[0]) {
      const adjustResult = result[0];
      
      if (!adjustResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: adjustResult.error_message || 'Adjustment failed' 
        });
      }

      console.log('🪙 ADMIN-ADJUST: Successfully adjusted tokens for user', userId);
      console.log('🪙 ADMIN-ADJUST: New balance:', adjustResult.new_balance);

      return res.status(200).json({
        success: true,
        newBalance: adjustResult.new_balance,
        ledgerEntryId: adjustResult.ledger_entry_id
      });
    }

    return res.status(500).json({ success: false, message: 'Unexpected response from adjustment' });

  } catch (error) {
    console.error('🪙 ADMIN-ADJUST: Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
