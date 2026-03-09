import { NextApiRequest, NextApiResponse } from 'next';
import { searchTracks } from '../../../utils/spotify-api';

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

    const result = await searchTracks(query, limit || 10);
    console.log(`🎵 SPOTIFY-SEARCH: Found ${result.tracks.length} tracks`);

    return res.status(200).json({
      success: true,
      tracks: result.tracks,
      total: result.total
    });

  } catch (error) {
    console.error('🎵 SPOTIFY-SEARCH: Error:', error);
    return res.status(500).json({ 
      error: 'Failed to search Spotify tracks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
