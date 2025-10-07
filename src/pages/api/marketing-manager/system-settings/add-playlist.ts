import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    genre, 
    accountEmail, 
    playlistLink, 
    spotifyPlaylistId, 
    maxSongs 
  } = req.body;

  // Validate required fields (playlist name will be fetched automatically)
  if (!genre || !accountEmail || !playlistLink) {
    return res.status(400).json({ 
      error: 'Genre, account email, and playlist link are required' 
    });
  }

  // Validate playlist link format
  const spotifyUrlPattern = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/playlist\/([a-zA-Z0-9]+)|spotify:playlist:([a-zA-Z0-9]+)/;
  const extractedId = spotifyPlaylistId || extractSpotifyPlaylistId(playlistLink);
  
  if (!extractedId) {
    return res.status(400).json({ 
      error: 'Invalid Spotify playlist link format' 
    });
  }

  try {
    const supabase = createAdminClient();

    // Check if playlist already exists (by Spotify ID or link)
    const { data: existingPlaylist, error: checkError } = await supabase
      .from('playlist_network')
      .select('id, playlist_name')
      .or(`spotify_playlist_id.eq.${extractedId},playlist_link.eq.${playlistLink}`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing playlist:', checkError);
      return res.status(500).json({ error: 'Failed to check for existing playlist' });
    }

    if (existingPlaylist) {
      return res.status(409).json({ 
        error: `Playlist already exists: ${existingPlaylist.playlist_name}` 
      });
    }

    // Fetch playlist data from Spotify API (including name)
    let playlistName = '';
    let initialSongCount = 0;
    let initialImageUrl = '';
    
    try {
      console.log('🎵 FETCH: Getting playlist data from Spotify...');
      const { getSpotifyPlaylistData } = await import('../../../../utils/spotify-api');
      const playlistData = await getSpotifyPlaylistData(playlistLink.trim());
      if (playlistData) {
        playlistName = playlistData.name;
        initialSongCount = playlistData.trackCount;
        initialImageUrl = playlistData.imageUrl;
        console.log(`✅ FETCHED: ${playlistName} - Songs: ${initialSongCount}, Image: ${initialImageUrl ? 'Yes' : 'No'}`);
      } else {
        return res.status(400).json({ 
          error: 'Could not fetch playlist information from Spotify. Please check the URL and try again.' 
        });
      }
    } catch (error) {
      console.error('Error fetching playlist data:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch playlist information from Spotify. Please try again.' 
      });
    }

    // Insert new playlist with initial cached data
    const { data: newPlaylist, error: insertError } = await supabase
      .from('playlist_network')
      .insert([
        {
          playlist_name: playlistName.trim(),
          genre: genre.trim(),
          account_email: accountEmail.trim().toLowerCase(),
          playlist_link: playlistLink.trim(),
          spotify_playlist_id: extractedId,
          max_songs: maxSongs || 25,
          cached_song_count: initialSongCount,
          cached_image_url: initialImageUrl,
          last_scraped_at: new Date().toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting playlist:', insertError);
      return res.status(500).json({ error: 'Failed to add playlist' });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Playlist added successfully',
      playlist: newPlaylist
    });
  } catch (error) {
    console.error('Error in add-playlist API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function extractSpotifyPlaylistId(url: string): string | null {
  // Extract Spotify playlist ID from various URL formats
  const patterns = [
    /spotify:playlist:([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export default requireAdminAuth(handler);
