import { NextApiRequest, NextApiResponse } from 'next';
import { getArtistStats } from '../../../utils/apify-artist-stats';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { artistUrl, artistId } = req.body;

  if (!artistUrl && !artistId) {
    return res.status(400).json({ error: 'Either artistUrl or artistId is required' });
  }

  try {
    const input = artistUrl || artistId;
    console.log(`🔮 APIFY-ROUTE: Fetching artist stats for: ${input}`);

    const stats = await getArtistStats(input);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Could not fetch artist statistics',
      });
    }

    return res.status(200).json({
      success: true,
      artistStats: stats,
    });

  } catch (error) {
    console.error('🔮 APIFY-ROUTE: Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch artist statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
