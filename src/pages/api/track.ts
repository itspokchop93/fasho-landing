import type { NextApiRequest, NextApiResponse } from "next";
import { getTrackById, getArtistById } from '../../utils/spotify-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Spotify URL" });
  }

  try {
    const idMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)(?:[?&]|$)/);
    if (!idMatch) {
      console.error('TRACK-API: Could not extract track ID from URL:', url);
      return res.status(400).json({ success: false, message: 'Could not extract track ID from URL' });
    }
    const trackId = idMatch[1];
    console.log(`🎵 TRACK-API: Fetching track details for track ID: ${trackId}`);
    
    const trackData = await getTrackById(trackId);
    
    if (!trackData) {
      return res.status(404).json({ success: false, message: 'Track not found' });
    }

    let artistInsights = null;
    if (trackData.artists && trackData.artists.length > 0) {
      const primaryArtist = trackData.artists[0];
      try {
        console.log(`🎵 TRACK-API: Fetching artist insights for: ${primaryArtist.name} (${primaryArtist.id})`);
        
        const artistData = await getArtistById(primaryArtist.id);

        if (artistData) {
          artistInsights = {
            name: artistData.name,
            imageUrl: artistData.imageUrl || '',
            followersCount: artistData.followersCount,
            genres: artistData.genres,
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
      title: trackData.title,
      artist: trackData.artist,
      imageUrl: trackData.imageUrl,
      url: trackData.url,
      artistProfileUrl: trackData.artistProfileUrl,
      artistInsights: artistInsights
    };

    return res.status(200).json({ success: true, track });
  } catch (error: any) {
    console.error('TRACK-API: Error fetching track details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
