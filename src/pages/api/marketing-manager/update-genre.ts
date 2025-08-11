import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId, newGenre } = req.body;

    if (!campaignId || !newGenre) {
      return res.status(400).json({ error: 'Campaign ID and new genre are required' });
    }

    const supabase = createAdminClient();

    // First, get the campaign to find the order_id
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('order_id, order_number')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Update the genre in the orders table billing_info
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('billing_info')
      .eq('id', campaign.order_id)
      .single();

    if (orderFetchError || !order) {
      console.error('Error fetching order:', orderFetchError);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update the musicGenre in billing_info
    const updatedBillingInfo = {
      ...order.billing_info,
      musicGenre: newGenre
    };

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        billing_info: updatedBillingInfo,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign.order_id);

    if (orderUpdateError) {
      console.error('Error updating order genre:', orderUpdateError);
      return res.status(500).json({ error: 'Failed to update order genre' });
    }

    // Clear the playlist assignments to trigger regeneration
    const { error: campaignUpdateError } = await supabase
      .from('marketing_campaigns')
      .update({
        playlist_assignments: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (campaignUpdateError) {
      console.error('Error clearing playlist assignments:', campaignUpdateError);
      return res.status(500).json({ error: 'Failed to clear playlist assignments' });
    }

    console.log(`🎵 GENRE-UPDATE: Updated genre to "${newGenre}" for Order #${campaign.order_number} and cleared playlist assignments`);

    res.status(200).json({
      success: true,
      message: `Updated genre to "${newGenre}" and cleared playlist assignments for regeneration`,
      campaignId,
      newGenre,
      orderNumber: campaign.order_number
    });
  } catch (error) {
    console.error('Error in update-genre API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
