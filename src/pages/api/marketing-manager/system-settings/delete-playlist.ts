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

    // If there are campaigns using this playlist, we'll proceed with deletion but update assignments to "Removed"
    if (campaignsUsingPlaylist && campaignsUsingPlaylist.length > 0) {
      console.log(`🗑️ DELETE: Playlist in use by ${campaignsUsingPlaylist.length} campaigns - will auto-update to Removed:`, campaignsUsingPlaylist.map(c => c.order_number));
      
      // Update all campaigns that use this playlist to mark those assignments as "Removed"
      const updateResults = [];
      for (let i = 0; i < campaignsUsingPlaylist.length; i++) {
        const campaign = campaignsUsingPlaylist[i];
        const assignments = Array.isArray(campaign.playlist_assignments) ? campaign.playlist_assignments : [];
        const updatedAssignments = assignments.map((assignment: any) => {
          if (assignment.id === playlistId) {
            console.log(`🗑️ DELETE: Updating campaign ${campaign.order_number} - marking playlist assignment as Removed (${i + 1}/${campaignsUsingPlaylist.length})`);
            return {
              id: 'removed',
              name: '✅ Removed',
              genre: 'removed'
            };
          }
          return assignment;
        });

        // Update the campaign with the modified assignments
        const { error: updateError } = await supabase
          .from('marketing_campaigns')
          .update({ 
            playlist_assignments: updatedAssignments,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        if (updateError) {
          console.error(`Error updating campaign ${campaign.id}:`, updateError);
          return res.status(500).json({ error: 'Failed to update campaign assignments' });
        }

        updateResults.push({
          campaignId: campaign.id,
          orderNumber: campaign.order_number,
          updated: true
        });

        // Add a small delay to make the progress visible (optional)
        if (i < campaignsUsingPlaylist.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`🗑️ DELETE: Successfully updated ${campaignsUsingPlaylist.length} campaigns to mark playlist as Removed`);
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
      message: `Playlist "${playlistInfo.playlist_name}" deleted successfully`,
      affectedCampaigns: campaignsUsingPlaylist.length,
      campaignNumbers: campaignsUsingPlaylist.map(c => c.order_number)
    });
  } catch (error) {
    console.error('Error in delete-playlist API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
