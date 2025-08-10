import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

import { scrapeSpotifyPlaylistData, extractSpotifyPlaylistId } from '../../../../utils/apify-spotify-playlist';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if this is a refresh request (bypass cache)
    const forceRefresh = req.query.refresh === 'true';
    const supabase = createAdminClient();

    // Fetch all playlists
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
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (playlistsError) {
      console.error('Error fetching playlists:', playlistsError);
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    // Get playlist data (use database cache unless refresh is requested)
    const playlistsWithData = await Promise.all(
      (playlistsData || []).map(async (playlist) => {
        let songCount = playlist.cached_song_count || 0;
        let imageUrl = playlist.cached_image_url || '';
        
        // Only call Apify if refresh is explicitly requested
        if (forceRefresh) {
          try {
            console.log(`🔄 REFRESH: Fetching fresh data for ${playlist.playlist_name}`);
            const playlistData = await scrapeSpotifyPlaylistData(playlist.playlist_link, false);
            if (playlistData) {
              songCount = playlistData.trackCount;
              imageUrl = playlistData.imageUrl;
              
              // Update database with fresh data
              await supabase
                .from('playlist_network')
                .update({
                  cached_song_count: songCount,
                  cached_image_url: imageUrl,
                  last_scraped_at: new Date().toISOString()
                })
                .eq('id', playlist.id);
              
              console.log(`✅ UPDATED: ${playlist.playlist_name} - Songs: ${songCount}, Image: ${imageUrl ? 'Yes' : 'No'}`);
            }
          } catch (error) {
            console.error(`Error fetching fresh data for playlist ${playlist.playlist_name}:`, error);
            // Keep existing cached values on error
          }
        } else {
          console.log(`📋 CACHE: Using cached data for ${playlist.playlist_name} - Songs: ${songCount}, Image: ${imageUrl ? 'Yes' : 'No'}`);
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
