import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Fetch all active playlists
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
        is_active,
        created_at
      `)
      .eq('is_active', true)
      .order('playlist_name', { ascending: true });

    if (playlistsError) {
      console.error('Error fetching playlists:', playlistsError);
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    // Transform data for the frontend
    const playlists = playlistsData?.map(playlist => ({
      id: playlist.id,
      name: playlist.playlist_name,
      genre: playlist.genre,
      accountEmail: playlist.account_email,
      playlistLink: playlist.playlist_link,
      spotifyPlaylistId: playlist.spotify_playlist_id,
      maxSongs: playlist.max_songs,
      isActive: playlist.is_active,
      createdAt: playlist.created_at
    })) || [];

    res.status(200).json(playlists);
  } catch (error) {
    console.error('Error in playlists API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
