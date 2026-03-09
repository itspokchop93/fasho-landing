import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import {
  formatPlaylistGenres,
  parsePlaylistGenres,
} from '../../../../utils/playlist-genres';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    genres,
    genre, 
    accountEmail, 
    playlistLink, 
    spotifyPlaylistId, 
    maxSongs 
  } = req.body;
  const parsedGenres = parsePlaylistGenres(Array.isArray(genres) ? genres : genre);
  const trimmedPlaylistLink = typeof playlistLink === 'string' ? playlistLink.trim() : '';
  const trimmedAccountEmail = typeof accountEmail === 'string' ? accountEmail.trim().toLowerCase() : '';
  const sanitizedMaxSongs = Math.max(1, Number(maxSongs) || 35);

  // Validate required fields (playlist name will be fetched automatically)
  if (parsedGenres.length === 0 || !trimmedAccountEmail || !trimmedPlaylistLink) {
    return res.status(400).json({ 
      error: 'At least one genre, account email, and playlist link are required' 
    });
  }

  const extractedId = spotifyPlaylistId || extractSpotifyPlaylistId(trimmedPlaylistLink);
  
  if (!extractedId) {
    return res.status(400).json({ 
      error: 'Invalid Spotify playlist link format' 
    });
  }

  try {
    const supabase = createAdminClient();

    // Check if playlist already exists by Spotify playlist ID
    const { data: existingBySpotifyId, error: spotifyIdCheckError } = await supabase
      .from('playlist_network')
      .select('id, playlist_name')
      .eq('spotify_playlist_id', extractedId)
      .maybeSingle();

    if (spotifyIdCheckError) {
      console.error('Error checking existing playlist by Spotify ID:', spotifyIdCheckError);
      return res.status(500).json({ error: 'Failed to check for existing playlist' });
    }

    if (existingBySpotifyId) {
      return res.status(409).json({ 
        error: `Playlist already exists: ${existingBySpotifyId.playlist_name}` 
      });
    }

    // Check if playlist already exists by exact link
    const { data: existingByLink, error: playlistLinkCheckError } = await supabase
      .from('playlist_network')
      .select('id, playlist_name')
      .eq('playlist_link', trimmedPlaylistLink)
      .maybeSingle();

    if (playlistLinkCheckError) {
      console.error('Error checking existing playlist by link:', playlistLinkCheckError);
      return res.status(500).json({ error: 'Failed to check for existing playlist' });
    }

    if (existingByLink) {
      return res.status(409).json({ 
        error: `Playlist already exists: ${existingByLink.playlist_name}` 
      });
    }

    // Fetch playlist data from Spotify API (including name)
    let playlistName = '';
    let initialSongCount = 0;
    let initialImageUrl = '';
    let initialSaves = 0;
    
    try {
      console.log('🎵 FETCH: Getting playlist data from Spotify...');
      const { getSpotifyPlaylistData } = await import('../../../../utils/spotify-api');
      const playlistData = await getSpotifyPlaylistData(trimmedPlaylistLink);
      if (playlistData) {
        playlistName = playlistData.name;
        initialSongCount = playlistData.trackCount;
        initialImageUrl = playlistData.imageUrl;
        initialSaves = playlistData.followers || 0;
        console.log(`✅ FETCHED: ${playlistName} - Songs: ${initialSongCount}, Image: ${initialImageUrl ? 'Yes' : 'No'}, Saves: ${initialSaves}`);

        // Apify fallback for saves/trackCount if Spotify returns 0
        if (initialSaves === 0 || initialSongCount === 0) {
          try {
            console.log(`🔮 APIFY-FALLBACK: Trying Apify for missing data...`);
            const { scrapeSpotifyPlaylistData } = await import('../../../../utils/apify-spotify-playlist');
            const apifyData = await scrapeSpotifyPlaylistData(trimmedPlaylistLink, false);
            if (apifyData) {
              if (initialSaves === 0 && apifyData.followers > 0) initialSaves = apifyData.followers;
              if (initialSongCount === 0 && apifyData.trackCount > 0) initialSongCount = apifyData.trackCount;
              if (!initialImageUrl && apifyData.imageUrl) initialImageUrl = apifyData.imageUrl;
            }
          } catch (apifyErr) {
            console.error('🔮 APIFY-FALLBACK: Failed:', apifyErr);
          }
        }
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
          genre: formatPlaylistGenres(parsedGenres),
          account_email: trimmedAccountEmail,
          playlist_link: trimmedPlaylistLink,
          spotify_playlist_id: extractedId,
          max_songs: sanitizedMaxSongs,
          cached_song_count: initialSongCount,
          cached_image_url: initialImageUrl,
          cached_saves: initialSaves,
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
