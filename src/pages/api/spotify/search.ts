import { NextApiRequest, NextApiResponse } from 'next';

// Spotify Web API integration
const getSpotifyAccessToken = async (): Promise<string> => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
};

const searchSpotifyTracks = async (query: string, accessToken: string, limit: number = 10) => {
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to search Spotify tracks: ${response.status}`);
  }

  return response.json();
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, limit } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  if (query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
  }

  try {
    console.log(`🎵 SPOTIFY-SEARCH: Searching for: "${query}"`);

    // Get Spotify access token
    const accessToken = await getSpotifyAccessToken();
    console.log(`🎵 SPOTIFY-SEARCH: Access token obtained successfully`);

    // Search for tracks
    const searchResults = await searchSpotifyTracks(query, accessToken, limit || 10);
    console.log(`🎵 SPOTIFY-SEARCH: Found ${searchResults.tracks.items.length} tracks`);

    // Transform results to match our Track interface
    const tracks = searchResults.tracks.items.map((track: any) => {
      // Get the primary artist (first artist) profile URL
      const primaryArtist = track.artists[0];
      const artistProfileUrl = primaryArtist?.external_urls?.spotify || '';
      
      console.log(`🎵 SPOTIFY-SEARCH: Track "${track.name}" by ${track.artists.map((a: any) => a.name).join(', ')} - Artist profile: ${artistProfileUrl}`);
      
      return {
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        imageUrl: track.album.images[0]?.url || '',
        url: track.external_urls.spotify,
        artistProfileUrl: artistProfileUrl, // Add artist profile URL
        duration: track.duration_ms,
        isPlayable: track.is_playable,
        previewUrl: track.preview_url,
        popularity: track.popularity,
        releaseDate: track.album.release_date
      };
    });

    console.log(`🎵 SPOTIFY-SEARCH: Transformed ${tracks.length} tracks for response`);

    const result = {
      success: true,
      tracks: tracks,
      total: searchResults.tracks.total
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('🎵 SPOTIFY-SEARCH: Error:', error);
    return res.status(500).json({ 
      error: 'Failed to search Spotify tracks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 