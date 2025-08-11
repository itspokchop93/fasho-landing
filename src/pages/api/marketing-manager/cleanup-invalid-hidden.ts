import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();

    // Find items with hidden_until more than 8 hours in the future (invalid)
    const maxValidHiddenTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    const { data: invalidItems, error: fetchError } = await supabase
      .from('marketing_campaigns')
      .select('id, order_number, hidden_until')
      .gt('hidden_until', maxValidHiddenTime.toISOString());

    if (fetchError) {
      console.error('Error fetching invalid hidden items:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch invalid hidden items' });
    }

    console.log(`🧹 CLEANUP: Found ${invalidItems?.length || 0} items with invalid hidden_until timestamps`);

    if (invalidItems && invalidItems.length > 0) {
      // Clear invalid hidden_until values
      const { error: updateError } = await supabase
        .from('marketing_campaigns')
        .update({ 
          hidden_until: null,
          updated_at: new Date().toISOString()
        })
        .gt('hidden_until', maxValidHiddenTime.toISOString());

      if (updateError) {
        console.error('Error clearing invalid hidden timestamps:', updateError);
        return res.status(500).json({ error: 'Failed to clear invalid hidden timestamps' });
      }

      console.log(`🧹 CLEANUP: Cleared invalid hidden_until for ${invalidItems.length} items`);
      invalidItems.forEach(item => {
        console.log(`  - Order ${item.order_number}: had hidden_until ${item.hidden_until}`);
      });
    }

    res.status(200).json({ 
      message: `Cleanup completed. Cleared ${invalidItems?.length || 0} invalid hidden timestamps.`,
      clearedItems: invalidItems?.length || 0
    });
  } catch (error) {
    console.error('Error in cleanup-invalid-hidden API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
