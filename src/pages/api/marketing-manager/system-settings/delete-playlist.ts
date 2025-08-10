import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playlistId } = req.body;

  if (!playlistId) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const supabase = createAdminClient();

    // Check if playlist is currently being used in any active campaigns
    const { data: activeCampaigns, error: campaignCheckError } = await supabase
      .from('marketing_campaigns')
      .select('id, order_number')
      .contains('playlist_assignments', [{ id: playlistId }])
      .neq('campaign_status', 'Completed');

    if (campaignCheckError) {
      console.error('Error checking active campaigns:', campaignCheckError);
      return res.status(500).json({ error: 'Failed to check playlist usage' });
    }

    if (activeCampaigns && activeCampaigns.length > 0) {
      return res.status(409).json({ 
        error: `Cannot delete playlist. It is currently being used in ${activeCampaigns.length} active campaign(s).`,
        activeCampaigns: activeCampaigns.map(c => c.order_number)
      });
    }

    // Get playlist info before deletion for response
    const { data: playlistInfo, error: fetchError } = await supabase
      .from('playlist_network')
      .select('playlist_name')
      .eq('id', playlistId)
      .single();

    if (fetchError) {
      console.error('Error fetching playlist info:', fetchError);
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Delete the playlist
    const { error: deleteError } = await supabase
      .from('playlist_network')
      .delete()
      .eq('id', playlistId);

    if (deleteError) {
      console.error('Error deleting playlist:', deleteError);
      return res.status(500).json({ error: 'Failed to delete playlist' });
    }

    res.status(200).json({ 
      success: true, 
      message: `Playlist "${playlistInfo.playlist_name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error in delete-playlist API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
