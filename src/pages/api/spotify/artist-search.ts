import { NextApiRequest, NextApiResponse } from 'next';

interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{ url: string; height: number; width: number }>;
  followers: { total: number };
  genres: string[];
  external_urls: { spotify: string };
  popularity: number;
}

// Get Spotify access token
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  
  const data = await response.json();
  return data.access_token;
}

// Extract artist ID from Spotify URL
function extractArtistIdFromUrl(url: string): string | null {
  const artistUrlPattern = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/artist\/([a-zA-Z0-9]+)/;
  const match = url.match(artistUrlPattern);
  return match ? match[1] : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = query.trim();
    console.log('🎵 SPOTIFY-ARTIST-SEARCH: Searching for artist:', searchQuery);

    const accessToken = await getSpotifyAccessToken();
    
    // Check if the query is a Spotify artist URL
    const artistId = extractArtistIdFromUrl(searchQuery);
    
    if (artistId) {
      console.log('🎵 SPOTIFY-ARTIST-SEARCH: Detected Spotify URL, extracting artist ID:', artistId);
      
      // Fetch specific artist by ID
      const artistResponse = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!artistResponse.ok) {
        console.error('🎵 SPOTIFY-ARTIST-SEARCH: Artist fetch failed:', artistResponse.status);
        return res.status(500).json({ error: 'Failed to fetch artist' });
      }

      const artist = await artistResponse.json();
      console.log(`🎵 SPOTIFY-ARTIST-SEARCH: Found specific artist "${artist.name}" - Followers: ${artist.followers?.total || 0}`);

      // Transform artist data
      const transformedArtist = {
        id: artist.id,
        name: artist.name,
        imageUrl: artist.images?.[0]?.url || null,
        followersCount: artist.followers?.total || 0,
        genres: artist.genres || [],
        spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
        popularity: artist.popularity || 0,
      };

      console.log('🎵 SPOTIFY-ARTIST-SEARCH: Returning specific artist result');
      return res.status(200).json({ artists: [transformedArtist] });
    }
    
    // Search for artists by name
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=artist&market=US&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchResponse.ok) {
      console.error('🎵 SPOTIFY-ARTIST-SEARCH: Search failed:', searchResponse.status);
      return res.status(500).json({ error: 'Failed to search artists' });
    }

    const searchData = await searchResponse.json();
    const artists = searchData.artists?.items || [];

    console.log(`🎵 SPOTIFY-ARTIST-SEARCH: Found ${artists.length} artists`);

    // Transform artist data
    const transformedArtists = artists.map((artist: SpotifyArtist) => {
      console.log(`🎵 SPOTIFY-ARTIST-SEARCH: Artist "${artist.name}" - Followers: ${artist.followers?.total || 0}`);
      
      return {
        id: artist.id,
        name: artist.name,
        imageUrl: artist.images?.[0]?.url || null,
        followersCount: artist.followers?.total || 0,
        genres: artist.genres || [],
        spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
        popularity: artist.popularity || 0,
      };
    });

    console.log('🎵 SPOTIFY-ARTIST-SEARCH: Returning search results');
    res.status(200).json({ artists: transformedArtists });

  } catch (error) {
    console.error('🎵 SPOTIFY-ARTIST-SEARCH: Error:', error);
    res.status(500).json({ error: 'Failed to search artists' });
  }
} 