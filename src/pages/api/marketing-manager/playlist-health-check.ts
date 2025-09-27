import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';
import { checkPlaylistHealth } from '../../../utils/spotify-api';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playlistId } = req.body;

  if (!playlistId) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const supabase = createAdminClient();

    // Get the playlist from database
    const { data: playlist, error: playlistError } = await supabase
      .from('playlist_network')
      .select('id, playlist_name, playlist_link')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      console.error('Error fetching playlist:', playlistError);
      return res.status(404).json({ error: 'Playlist not found' });
    }

    console.log(`🏥 HEALTH CHECK API: Checking health for playlist: ${playlist.playlist_name}`);

    // Perform health check
    const healthStatus = await checkPlaylistHealth(playlist.playlist_link);

    // Update database with health status
    const { error: updateError } = await supabase
      .from('playlist_network')
      .update({
        health_status: healthStatus.status,
        health_last_checked: healthStatus.lastChecked,
        health_error_message: healthStatus.errorMessage || null,
        last_known_public: healthStatus.isPublic,
        updated_at: new Date().toISOString()
      })
      .eq('id', playlistId);

    if (updateError) {
      console.error('Error updating playlist health status:', updateError);
      return res.status(500).json({ error: 'Failed to update health status' });
    }

    console.log(`✅ HEALTH CHECK API: Updated health status for ${playlist.playlist_name}: ${healthStatus.status}`);

    res.status(200).json({
      success: true,
      playlistId,
      playlistName: playlist.playlist_name,
      healthStatus: {
        status: healthStatus.status,
        isPublic: healthStatus.isPublic,
        errorMessage: healthStatus.errorMessage,
        lastChecked: healthStatus.lastChecked
      }
    });

  } catch (error) {
    console.error('Error in playlist health check API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
