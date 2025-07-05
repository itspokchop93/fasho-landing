import { NextApiRequest, NextApiResponse } from 'next';

// Access the same global storage
declare global {
  var checkoutSessions: Map<string, any> | undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log('Validating session:', sessionId);

    // Get session data from global storage
    const sessionData = global.checkoutSessions?.get(sessionId);
    
    if (sessionData) {
      // Check if session has already been used
      if (sessionData.isUsed) {
        return res.status(400).json({ 
          error: 'This checkout session has already been completed.',
          reason: 'already_used'
        });
      }

      // Check if session is still active
      if (sessionData.status !== 'active') {
        return res.status(400).json({ 
          error: 'This checkout session is no longer valid.',
          reason: 'expired'
        });
      }

      res.status(200).json({ 
        isValid: true, 
        sessionData: {
          tracks: sessionData.tracks,
          selectedPackages: sessionData.selectedPackages,
          userId: sessionData.userId
        }
      });
    } else {
      res.status(400).json({ 
        error: 'Session not found',
        reason: 'session_not_found'
      });
    }

  } catch (error) {
    console.error('Error validating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 