import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

// Global storage for development (replace with database in production)
declare global {
  var checkoutSessions: Map<string, any> | undefined;
}

if (!(globalThis as any).checkoutSessions) {
  (globalThis as any).checkoutSessions = new Map();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tracks, selectedPackages, userId } = req.body;

    console.log('Creating checkout session with data:', {
      tracksCount: tracks?.length,
      selectedPackages: Object.keys(selectedPackages || {}).length,
      userId
    });

    if (!tracks || !selectedPackages) {
      console.error('Missing required data:', { tracks: !!tracks, selectedPackages: !!selectedPackages });
      return res.status(400).json({ error: 'Missing required data' });
    }

    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Store session data globally for development
    (globalThis as any).checkoutSessions!.set(sessionId, {
      tracks,
      selectedPackages,
      userId,
      createdAt: new Date(),
      status: 'active',
      isUsed: false
    });

    console.log('Successfully created checkout session:', sessionId);

    res.status(200).json({ sessionId });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 