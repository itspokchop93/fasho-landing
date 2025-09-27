import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

import { getSpotifyPlaylistData, getSpotifyPlaylistDataWithHealth, extractSpotifyPlaylistId } from '../../../../utils/spotify-api';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if this is a refresh request (bypass cache)
    const forceRefresh = req.query.refresh === 'true';
    const supabase = createAdminClient();

    // Fetch all playlists including health status fields
    const { data: playlistsData, error: playlistsError } = await supabase
      .from('playlist_network')
      .select(`
        id,
        playlist_name,
        genre,
        account_email,
        playlist_link,
        spotify_playlist_id,
        max_songs,
        cached_song_count,
        cached_image_url,
        last_scraped_at,
        is_active,
        health_status,
        health_last_checked,
        health_error_message,
        last_known_public,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (playlistsError) {
      console.error('Error fetching playlists:', playlistsError);
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    // Get playlist data with health checking (use database cache unless refresh is requested)
    const playlistsWithData = await Promise.all(
      (playlistsData || []).map(async (playlist) => {
        let songCount = playlist.cached_song_count || 0;
        let imageUrl = playlist.cached_image_url || '';
        let healthStatus = playlist.health_status || 'unknown';
        let healthLastChecked = playlist.health_last_checked;
        let healthErrorMessage = playlist.health_error_message;
        
        // Only call Spotify API if refresh is explicitly requested or health was never checked
        const shouldCheckHealth = forceRefresh || !playlist.health_last_checked;
        
        if (shouldCheckHealth) {
          try {
            console.log(`🔄 REFRESH: Fetching fresh data with health check for ${playlist.playlist_name}`);
            const playlistData = await getSpotifyPlaylistDataWithHealth(playlist.playlist_link);
            if (playlistData) {
              songCount = playlistData.trackCount;
              imageUrl = playlistData.imageUrl;
              
              // Extract health status information
              if (playlistData.healthStatus) {
                healthStatus = playlistData.healthStatus.status;
                healthLastChecked = playlistData.healthStatus.lastChecked;
                healthErrorMessage = playlistData.healthStatus.errorMessage || null;
              }
              
              // Update database with fresh data including health status
              await supabase
                .from('playlist_network')
                .update({
                  cached_song_count: songCount,
                  cached_image_url: imageUrl,
                  last_scraped_at: new Date().toISOString(),
                  health_status: healthStatus,
                  health_last_checked: healthLastChecked,
                  health_error_message: healthErrorMessage,
                  last_known_public: playlistData.healthStatus?.isPublic
                })
                .eq('id', playlist.id);
              
              console.log(`✅ UPDATED: ${playlist.playlist_name} - Songs: ${songCount}, Image: ${imageUrl ? 'Yes' : 'No'}, Health: ${healthStatus}`);
            }
          } catch (error) {
            console.error(`Error fetching fresh data for playlist ${playlist.playlist_name}:`, error);
            // Keep existing cached values on error, but update health status to error
            healthStatus = 'error';
            healthErrorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            healthLastChecked = new Date().toISOString();
            
            await supabase
              .from('playlist_network')
              .update({
                health_status: healthStatus,
                health_last_checked: healthLastChecked,
                health_error_message: healthErrorMessage
              })
              .eq('id', playlist.id);
          }
        } else {
          console.log(`📋 CACHE: Using cached data for ${playlist.playlist_name} - Songs: ${songCount}, Image: ${imageUrl ? 'Yes' : 'No'}, Health: ${healthStatus}`);
        }

        return {
          id: playlist.id,
          playlistName: playlist.playlist_name,
          genre: playlist.genre,
          accountEmail: playlist.account_email,
          playlistLink: playlist.playlist_link,
          spotifyPlaylistId: playlist.spotify_playlist_id,
          maxSongs: playlist.max_songs,
          songCount,
          imageUrl,
          isActive: playlist.is_active,
          healthStatus,
          healthLastChecked,
          healthErrorMessage,
          createdAt: playlist.created_at,
          updatedAt: playlist.updated_at
        };
      })
    );

    res.status(200).json(playlistsWithData);
  } catch (error) {
    console.error('Error in system-settings/playlists API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
