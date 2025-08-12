import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemId } = req.body;

  if (!itemId) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  try {
    const supabase = createAdminClient();

    // Extract the actual campaign ID from the action item ID
    // Action item IDs are in format: ${campaign.id}-initial or ${campaign.id}-removal
    // Since campaign IDs are UUIDs (which contain dashes), we need to remove the suffix properly
    const campaignId = itemId.endsWith('-initial') 
      ? itemId.slice(0, -8) // Remove '-initial'
      : itemId.endsWith('-removal') 
      ? itemId.slice(0, -8) // Remove '-removal'  
      : itemId; // Fallback for old format

    // Hide the item for 8 hours
    const hideUntil = new Date();
    hideUntil.setHours(hideUntil.getHours() + 8);

    const { error } = await supabase
      .from('marketing_campaigns')
      .update({ 
        hidden_until: hideUntil.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (error) {
      console.error('Error hiding action item:', error);
      return res.status(500).json({ error: 'Failed to hide action item' });
    }

    console.log(`🔄 ACTION-QUEUE: Hid action item ${itemId} (campaign ${campaignId}) for 8 hours`);
    res.status(200).json({ success: true, message: 'Action item hidden for 8 hours' });
  } catch (error) {
    console.error('Error in hide-action-item API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
