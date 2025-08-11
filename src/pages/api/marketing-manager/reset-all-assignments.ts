import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    console.log('🔄 RESET: Starting playlist assignment reset for ALL campaigns...');

    // Reset all playlist assignments to empty arrays
    // We need to add a WHERE clause - let's update all campaigns where id is not null (all rows)
    const { data: updatedCampaigns, error: resetError } = await supabase
      .from('marketing_campaigns')
      .update({
        playlist_assignments: [],
        updated_at: new Date().toISOString()
      })
      .not('id', 'is', null)  // This matches all rows (where id is not null)
      .select('id, order_number');

    if (resetError) {
      console.error('❌ Error resetting all playlist assignments:', resetError);
      return res.status(500).json({ error: 'Failed to reset playlist assignments' });
    }

    const resetCount = updatedCampaigns?.length || 0;
    console.log(`✅ RESET: Successfully cleared playlist assignments for ${resetCount} campaigns`);

    res.status(200).json({
      success: true,
      message: `Reset playlist assignments for ${resetCount} campaigns`,
      resetCount: resetCount,
      campaigns: updatedCampaigns
    });
  } catch (error) {
    console.error('Error in reset-all-assignments API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
