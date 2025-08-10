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

    // Hide the item for 24 hours
    const hideUntil = new Date();
    hideUntil.setHours(hideUntil.getHours() + 24);

    const { error } = await supabase
      .from('marketing_campaigns')
      .update({ 
        hidden_until: hideUntil.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error hiding action item:', error);
      return res.status(500).json({ error: 'Failed to hide action item' });
    }

    res.status(200).json({ success: true, message: 'Action item hidden for 24 hours' });
  } catch (error) {
    console.error('Error in hide-action-item API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
