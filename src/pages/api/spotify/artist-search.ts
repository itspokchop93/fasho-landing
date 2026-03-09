import { NextApiRequest, NextApiResponse } from 'next';
import { getArtistById, searchArtists } from '../../../utils/spotify-api';

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

    const artistId = extractArtistIdFromUrl(searchQuery);
    
    if (artistId) {
      console.log('🎵 SPOTIFY-ARTIST-SEARCH: Detected Spotify URL, extracting artist ID:', artistId);
      
      const artist = await getArtistById(artistId);

      if (!artist) {
        console.error('🎵 SPOTIFY-ARTIST-SEARCH: Artist fetch failed');
        return res.status(500).json({ error: 'Failed to fetch artist' });
      }

      console.log(`🎵 SPOTIFY-ARTIST-SEARCH: Found specific artist "${artist.name}" - Followers: ${artist.followersCount}`);

      return res.status(200).json({ artists: [artist] });
    }
    
    const artists = await searchArtists(searchQuery, 10);
    console.log(`🎵 SPOTIFY-ARTIST-SEARCH: Found ${artists.length} artists`);

    console.log('🎵 SPOTIFY-ARTIST-SEARCH: Returning search results');
    res.status(200).json({ artists });

  } catch (error) {
    console.error('🎵 SPOTIFY-ARTIST-SEARCH: Error:', error);
    res.status(500).json({ error: 'Failed to search artists' });
  }
}
