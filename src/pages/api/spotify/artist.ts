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

interface SpotifyAlbum {
  id: string;
  name: string;
  images: Array<{ url: string; height: number; width: number }>;
  release_date: string;
  album_type: string;
  total_tracks: number;
  external_urls: { spotify: string };
}

interface SpotifyTrack {
  id: string;
  name: string;
  album: SpotifyAlbum;
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: { spotify: string };
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
function extractArtistId(url: string): string | null {
  const match = url.match(/artist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { artistId, artistUrl, includeAlbums = 'true' } = req.query;
    
    // Extract artist ID from URL if provided
    let spotifyArtistId: string;
    if (artistId && typeof artistId === 'string') {
      spotifyArtistId = artistId;
    } else if (artistUrl && typeof artistUrl === 'string') {
      const extractedId = extractArtistId(artistUrl);
      if (!extractedId) {
        return res.status(400).json({ error: 'Invalid Spotify artist URL' });
      }
      spotifyArtistId = extractedId;
    } else {
      return res.status(400).json({ error: 'Artist ID or URL is required' });
    }

    console.log('🎵 SPOTIFY-ARTIST: Fetching artist data for:', spotifyArtistId);

    const accessToken = await getSpotifyAccessToken();
    
    // Fetch artist information
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${spotifyArtistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!artistResponse.ok) {
      console.error('🎵 SPOTIFY-ARTIST: Error fetching artist:', artistResponse.status);
      return res.status(404).json({ error: 'Artist not found' });
    }

    const artist: SpotifyArtist = await artistResponse.json();
    console.log('🎵 SPOTIFY-ARTIST: Found artist:', artist.name);

    // Prepare artist data
    const artistData = {
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url || null,
      followersCount: artist.followers?.total || 0,
      genres: artist.genres || [],
      spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
      popularity: artist.popularity || 0,
    };

    // Fetch albums if requested
    let albums: any[] = [];
    if (includeAlbums === 'true') {
      console.log('🎵 SPOTIFY-ARTIST: Fetching albums for artist');
      
      const albumsResponse = await fetch(
        `https://api.spotify.com/v1/artists/${spotifyArtistId}/albums?include_groups=album,single&market=US&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (albumsResponse.ok) {
        const albumsData = await albumsResponse.json();
        
        // Get tracks for each album
        const albumsWithTracks = await Promise.all(
          albumsData.items.slice(0, 10).map(async (album: SpotifyAlbum) => {
            try {
              const tracksResponse = await fetch(
                `https://api.spotify.com/v1/albums/${album.id}/tracks?market=US`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (tracksResponse.ok) {
                const tracksData = await tracksResponse.json();
                const tracks = tracksData.items.map((track: any) => ({
                  id: track.id,
                  name: track.name,
                  duration_ms: track.duration_ms,
                  trackNumber: track.track_number,
                  previewUrl: track.preview_url,
                  spotifyUrl: track.external_urls?.spotify,
                }));

                return {
                  id: album.id,
                  name: album.name,
                  imageUrl: album.images?.[0]?.url || null,
                  releaseDate: album.release_date,
                  albumType: album.album_type,
                  totalTracks: album.total_tracks,
                  spotifyUrl: album.external_urls?.spotify,
                  tracks: tracks,
                };
              }
              return null;
            } catch (error) {
              console.error('🎵 SPOTIFY-ARTIST: Error fetching tracks for album:', album.id, error);
              return null;
            }
          })
        );

        albums = albumsWithTracks.filter(album => album !== null);
        console.log(`🎵 SPOTIFY-ARTIST: Found ${albums.length} albums with tracks`);
      }
    }

    // Also fetch top tracks
    console.log('🎵 SPOTIFY-ARTIST: Fetching top tracks');
    const topTracksResponse = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyArtistId}/top-tracks?market=US`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    let topTracks: any[] = [];
    if (topTracksResponse.ok) {
      const topTracksData = await topTracksResponse.json();
      topTracks = topTracksData.tracks.map((track: SpotifyTrack) => ({
        id: track.id,
        name: track.name,
        imageUrl: track.album?.images?.[0]?.url || null,
        album: track.album?.name || '',
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls?.spotify,
      }));
      console.log(`🎵 SPOTIFY-ARTIST: Found ${topTracks.length} top tracks`);
    }

    const response = {
      artist: artistData,
      albums: albums,
      topTracks: topTracks,
    };

    console.log('🎵 SPOTIFY-ARTIST: Returning complete artist data');
    res.status(200).json(response);

  } catch (error) {
    console.error('🎵 SPOTIFY-ARTIST: Error:', error);
    res.status(500).json({ error: 'Failed to fetch artist data' });
  }
} 