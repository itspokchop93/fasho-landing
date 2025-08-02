import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Use server-side fetch to avoid CORS issues
    const oEmbedResponse = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    );

    if (!oEmbedResponse.ok) {
      throw new Error(`oEmbed API returned ${oEmbedResponse.status}`);
    }

    const oEmbedData = await oEmbedResponse.json();
    
    return res.status(200).json(oEmbedData);
  } catch (error: any) {
    console.error('oEmbed API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch oEmbed data',
      details: error.message 
    });
  }
}