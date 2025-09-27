import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignId, playlistIndex, newPlaylistId } = req.body;

  if (!campaignId || typeof playlistIndex !== 'number' || !newPlaylistId) {
    return res.status(400).json({ 
      error: 'Campaign ID, playlist index, and new playlist ID are required' 
    });
  }

  try {
    const supabase = createAdminClient();

    // Get current campaign data
    const { data: campaignData, error: fetchError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        playlist_assignments
      `)
      .eq('id', campaignId)
      .single();

    if (fetchError || !campaignData) {
      console.error('Error fetching campaign:', fetchError);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Update playlist assignments
    let playlistAssignments = Array.isArray(campaignData.playlist_assignments) 
      ? [...campaignData.playlist_assignments] 
      : [];

    if (playlistIndex >= 0 && playlistIndex < playlistAssignments.length) {
      // Handle special "removed" case
      if (newPlaylistId === 'removed') {
        playlistAssignments[playlistIndex] = {
          id: 'removed',
          name: '✅ Removed',
          genre: 'removed'
        };
        console.log(`🔴 PLAYLIST-ASSIGNMENT: Campaign ${campaignId} - playlist slot ${playlistIndex} marked as REMOVED`);
      } else {
        // Get the new playlist details for normal playlist assignment
        const { data: newPlaylistData, error: playlistError } = await supabase
          .from('playlist_network')
          .select(`
            id,
            playlist_name,
            genre,
            is_active
          `)
          .eq('id', newPlaylistId)
          .eq('is_active', true)
          .single();

        if (playlistError || !newPlaylistData) {
          console.error('Error fetching new playlist:', playlistError);
          return res.status(404).json({ error: 'New playlist not found or inactive' });
        }

        // Update existing assignment with real playlist
        playlistAssignments[playlistIndex] = {
          id: newPlaylistData.id,
          name: newPlaylistData.playlist_name,
          genre: newPlaylistData.genre
        };
        console.log(`🎵 PLAYLIST-ASSIGNMENT: Campaign ${campaignId} - updated playlist slot ${playlistIndex} to ${newPlaylistData.playlist_name}`);
      }
    } else {
      return res.status(400).json({ error: 'Invalid playlist index' });
    }

    // Update the campaign with new playlist assignments
    const { error: updateError } = await supabase
      .from('marketing_campaigns')
      .update({ 
        playlist_assignments: playlistAssignments,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating playlist assignment:', updateError);
      return res.status(500).json({ error: 'Failed to update playlist assignment' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Playlist assignment updated successfully',
      updatedAssignments: playlistAssignments
    });
  } catch (error) {
    console.error('Error in update-playlist-assignment API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
