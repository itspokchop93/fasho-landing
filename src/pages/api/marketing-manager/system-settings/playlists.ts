import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

// This endpoint now ONLY serves cached database data (instant).
// Refresh is handled by the SSE endpoint: playlists-refresh-stream.ts

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    const { data: playlistsData, error: playlistsError } = await supabase
      .from('playlist_network')
      .select(`
        id, playlist_name, genre, account_email, playlist_link,
        spotify_playlist_id, max_songs, cached_song_count, cached_image_url,
        cached_saves, last_scraped_at, is_active, health_status,
        health_last_checked, health_error_message, last_known_public,
        created_at, updated_at
      `)
      .order('created_at', { ascending: false });

    if (playlistsError) {
      console.error('Error fetching playlists:', playlistsError);
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    const results = (playlistsData || []).map((playlist) => ({
      id: playlist.id,
      playlistName: playlist.playlist_name,
      genre: playlist.genre,
      accountEmail: playlist.account_email,
      playlistLink: playlist.playlist_link,
      spotifyPlaylistId: playlist.spotify_playlist_id,
      maxSongs: playlist.max_songs,
      songCount: playlist.cached_song_count || 0,
      imageUrl: playlist.cached_image_url || '',
      saves: playlist.cached_saves || 0,
      isActive: playlist.is_active,
      healthStatus: playlist.health_status || 'unknown',
      healthLastChecked: playlist.health_last_checked,
      healthErrorMessage: playlist.health_error_message,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error('Error in system-settings/playlists API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
