import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../../utils/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = getAdminTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const adminSession = await verifyAdminToken(token);

  if (!adminSession) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const supabase = createAdminClient();

  if (req.method === 'GET') {
    try {
      // Fetch settings without trying to join on updated_by
      const { data: settings, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('🪙 ADMIN-SETTINGS: Error fetching settings:', error);
        // Return default settings if not found
        // 100 tokens earned per $1 spent, 1000 tokens = $1 discount (100 tokens = $0.10)
        return res.status(200).json({
          success: true,
          settings: {
            id: 1,
            tokens_per_dollar: 100,
            redemption_tokens_per_dollar: 1000,
            is_program_active: true,
            minimum_order_total: 1.00,
            updated_at: null,
            updated_by_email: null
          }
        });
      }

      // If we have an updated_by, fetch the admin email separately
      let updatedByEmail = null;
      if (settings.updated_by) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('email')
          .eq('id', settings.updated_by)
          .single();
        
        updatedByEmail = adminUser?.email || null;
      }

      return res.status(200).json({
        success: true,
        settings: {
          ...settings,
          updated_by_email: updatedByEmail
        }
      });

    } catch (error) {
      console.error('🪙 ADMIN-SETTINGS: Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { tokens_per_dollar, redemption_tokens_per_dollar, is_program_active, minimum_order_total } = req.body;

      // Get admin user id
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', adminSession.email)
        .single();

      const { data: settings, error } = await supabase
        .from('loyalty_settings')
        .update({
          tokens_per_dollar: parseInt(tokens_per_dollar) || 100,
          redemption_tokens_per_dollar: parseInt(redemption_tokens_per_dollar) || 1000,
          is_program_active: Boolean(is_program_active),
          minimum_order_total: parseFloat(minimum_order_total) || 1.00,
          updated_by: adminUser?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single();

      if (error) {
        console.error('🪙 ADMIN-SETTINGS: Error updating settings:', error);
        return res.status(500).json({ success: false, message: 'Failed to update settings' });
      }

      console.log('🪙 ADMIN-SETTINGS: Settings updated by', adminSession.email);

      return res.status(200).json({
        success: true,
        settings: {
          ...settings,
          updated_by_email: adminSession.email
        }
      });

    } catch (error) {
      console.error('🪙 ADMIN-SETTINGS: Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
