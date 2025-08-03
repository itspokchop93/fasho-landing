import type { NextApiRequest, NextApiResponse } from "next";

// Spotify Web API integration for getting artist profile URL
const getSpotifyAccessToken = async (): Promise<string> => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials');
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

const fetchSpotifyTrackDetails = async (trackId: string, accessToken: string) => {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch track details: ${response.status}`);
  }

  return response.json();
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Spotify URL" });
  }

  try {
    // Replace the track ID extraction with a more robust regex:
    const idMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)(?:[?&]|$)/);
    if (!idMatch) {
      console.error('TRACK-API: Could not extract track ID from URL:', url);
      return res.status(400).json({ success: false, message: 'Could not extract track ID from URL' });
    }
    const trackId = idMatch[1];
    console.log(`🎵 TRACK-API: Fetching track details for track ID: ${trackId}`);
    
    const accessToken = await getSpotifyAccessToken();
    const trackData = await fetchSpotifyTrackDetails(trackId, accessToken);
    
    // After fetching trackData from Spotify Web API:
    if (!trackData) {
      return res.status(404).json({ success: false, message: 'Track not found' });
    }

    const imageUrl = trackData.album?.images?.[0]?.url || '';

    // Fetch artist insights for the primary artist
    let artistInsights = null;
    if (trackData.artists && trackData.artists.length > 0) {
      const primaryArtist = trackData.artists[0];
      try {
        console.log(`🎵 TRACK-API: Fetching artist insights for: ${primaryArtist.name} (${primaryArtist.id})`);
        
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${primaryArtist.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          artistInsights = {
            name: artistData.name,
            imageUrl: artistData.images?.[0]?.url || '',
            followersCount: artistData.followers?.total || 0,
            genres: artistData.genres || [],
            popularity: artistData.popularity || 0,
          };
          console.log(`🎵 TRACK-API: Artist insights fetched - Followers: ${artistInsights.followersCount}, Genres: ${artistInsights.genres.join(', ')}`);
        } else {
          console.warn(`🎵 TRACK-API: Failed to fetch artist insights for ${primaryArtist.name}`);
        }
      } catch (error) {
        console.error(`🎵 TRACK-API: Error fetching artist insights:`, error);
      }
    }

    const track = {
      id: trackData.id,
      title: trackData.name,
      artist: trackData.artists.map((a: any) => a.name).join(', '),
      imageUrl,
      url: `https://open.spotify.com/track/${trackData.id}`,
      artistProfileUrl: trackData.artists?.[0]?.external_urls?.spotify || '',
      artistInsights: artistInsights
    };

    return res.status(200).json({ success: true, track });
  } catch (error: any) {
    console.error('TRACK-API: Error fetching track details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
} 