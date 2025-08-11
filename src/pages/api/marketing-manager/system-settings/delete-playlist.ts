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

    console.log(`🗑️ DELETE: Attempting to delete playlist ${playlistId}`);

    // Check if playlist is currently being used in any active campaigns
    // We need to check if the playlist ID appears anywhere in the JSONB array
    const { data: activeCampaigns, error: campaignCheckError } = await supabase
      .from('marketing_campaigns')
      .select('id, order_number, playlist_assignments')
      .neq('campaign_status', 'Completed');

    console.log(`🗑️ DELETE: Found ${activeCampaigns?.length || 0} active campaigns to check`);

    // Filter campaigns that contain this playlist ID
    const campaignsUsingPlaylist = activeCampaigns?.filter(campaign => {
      const assignments = Array.isArray(campaign.playlist_assignments) ? campaign.playlist_assignments : [];
      return assignments.some((assignment: any) => assignment.id === playlistId);
    }) || [];

    if (campaignCheckError) {
      console.error('Error checking active campaigns:', campaignCheckError);
      return res.status(500).json({ error: 'Failed to check playlist usage' });
    }

    console.log(`🗑️ DELETE: Found ${campaignsUsingPlaylist.length} campaigns using this playlist`);

    if (campaignsUsingPlaylist && campaignsUsingPlaylist.length > 0) {
      console.log(`🗑️ DELETE: Cannot delete - playlist in use by campaigns:`, campaignsUsingPlaylist.map(c => c.order_number));
      return res.status(409).json({ 
        error: `Cannot delete playlist. It is currently being used in ${campaignsUsingPlaylist.length} active campaign(s).`,
        activeCampaigns: campaignsUsingPlaylist.map(c => c.order_number)
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

    console.log(`🗑️ DELETE: Successfully deleted playlist "${playlistInfo.playlist_name}" (ID: ${playlistId})`);

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
