import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignId, action } = req.body;

  if (!campaignId || !action) {
    return res.status(400).json({ error: 'Campaign ID and action are required' });
  }

  if (!['direct-streams', 'playlists-added', 'de-playlisted'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action type' });
  }

  try {
    const supabase = createAdminClient();

    // First, get the current campaign data
    const { data: campaignData, error: fetchError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_id,
        direct_streams,
        playlist_streams,
        playlist_assignments,
        direct_streams_confirmed,
        playlists_added_confirmed,
        removed_from_playlists,
        time_on_playlists
      `)
      .eq('id', campaignId)
      .single();

    if (fetchError || !campaignData) {
      console.error('Error fetching campaign:', fetchError);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'direct-streams':
        updateData.direct_streams_confirmed = true;
        updateData.direct_streams_progress = campaignData.direct_streams;
        break;

      case 'playlists-added':
        updateData.playlists_added_confirmed = true;
        // Set removal date based on time_on_playlists from campaign configuration
        if (campaignData.time_on_playlists) {
          const removalDate = new Date();
          removalDate.setDate(removalDate.getDate() + campaignData.time_on_playlists);
          updateData.removal_date = removalDate.toISOString().split('T')[0];
        }
        break;

      case 'de-playlisted':
        updateData.removed_from_playlists = true;
        updateData.campaign_status = 'Completed';
        updateData.playlist_streams_progress = campaignData.playlist_streams;
        break;
    }

    // Determine new campaign status
    if (action !== 'de-playlisted') {
      const directConfirmed = action === 'direct-streams' ? true : campaignData.direct_streams_confirmed;
      const playlistsConfirmed = action === 'playlists-added' ? true : campaignData.playlists_added_confirmed;
      
      if (directConfirmed && playlistsConfirmed) {
        updateData.campaign_status = 'Running';
      } else {
        updateData.campaign_status = 'Action Needed';
      }
    }

    // Update the campaign
    const { error: updateError } = await supabase
      .from('marketing_campaigns')
      .update(updateData)
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating campaign:', updateError);
      return res.status(500).json({ error: 'Failed to update campaign' });
    }

    // If both actions are now confirmed, update the order status to "Marketing Campaign Running"
    if ((action === 'direct-streams' && campaignData.playlists_added_confirmed) ||
        (action === 'playlists-added' && campaignData.direct_streams_confirmed)) {
      
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ 
          status: 'Marketing Campaign Running',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignData.order_id)
        .neq('status', 'Marketing Campaign Running'); // Only update if not already set

      if (orderUpdateError) {
        console.error('Error updating order status:', orderUpdateError);
        // Don't fail the request for this, just log the error
      }
    }

    // If de-playlisted, mark order as completed
    if (action === 'de-playlisted') {
      const { error: orderCompleteError } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignData.order_id);

      if (orderCompleteError) {
        console.error('Error completing order:', orderCompleteError);
        // Don't fail the request for this, just log the error
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Action ${action} confirmed successfully`,
      updatedData: updateData
    });
  } catch (error) {
    console.error('Error in confirm-action API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
