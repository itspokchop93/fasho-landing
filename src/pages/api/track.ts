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
    // Extract track ID from URL for artist profile lookup
    const idMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
    let artistProfileUrl = '';
    let spotifyTrackData = null;

    // If we have Spotify credentials and a track ID, get the full track data from Spotify API
    if (idMatch && process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      try {
        const trackId = idMatch[1];
        console.log(`🎵 TRACK-API: Fetching track details for track ID: ${trackId}`);
        
        const accessToken = await getSpotifyAccessToken();
        spotifyTrackData = await fetchSpotifyTrackDetails(trackId, accessToken);
        
        // Get primary artist profile URL
        const primaryArtist = spotifyTrackData.artists[0];
        artistProfileUrl = primaryArtist?.external_urls?.spotify || '';
        
        console.log(`🎵 TRACK-API: Spotify track data fetched - Title: "${spotifyTrackData.name}", Artist: "${spotifyTrackData.artists.map((a: any) => a.name).join(', ')}"`);
        console.log(`🎵 TRACK-API: Artist profile URL found: ${artistProfileUrl}`);
      } catch (spotifyError) {
        console.warn(`🎵 TRACK-API: Could not fetch Spotify track data:`, spotifyError);
        // Continue with oEmbed fallback
      }
    }

    // Get oEmbed data for image
    const oEmbedRes = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    );

    if (!oEmbedRes.ok) {
      throw new Error("Spotify oEmbed request failed");
    }

    const oEmbedData = await oEmbedRes.json();

    // Use Spotify API data if available, otherwise fall back to oEmbed parsing
    let title: string;
    let artist: string;

    if (spotifyTrackData) {
      // Use the Spotify API data for accurate title and artist
      title = spotifyTrackData.name;
      artist = spotifyTrackData.artists.map((a: any) => a.name).join(', ');
    } else {
      // Fallback to oEmbed parsing
      const rawTitle = (oEmbedData.title as string) || "";
      const splitRegex = /\s*[–-]\s*/;
      const titleParts = rawTitle.split(splitRegex);
      title = titleParts[0] || "";
      artist = titleParts[1] || "";
    }

    console.log(`🎵 TRACK-API: Final track data - Title: "${title}", Artist: "${artist}", Artist Profile: ${artistProfileUrl || 'Not available'}`);

    const result = {
      success: true,
      track: {
        id: idMatch ? idMatch[1] : url,
        title,
        artist,
        imageUrl: oEmbedData.thumbnail_url,
        url,
        artistProfileUrl: artistProfileUrl,
      },
    };

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
} 