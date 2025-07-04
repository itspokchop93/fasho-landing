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

    console.log('Completing checkout session:', sessionId);

    // Get session data from global storage
    const sessionData = global.checkoutSessions?.get(sessionId);
    
    if (sessionData) {
      // Mark session as used
      sessionData.isUsed = true;
      sessionData.status = 'completed';
      sessionData.completedAt = new Date();
      
      // Update the session in global storage
      global.checkoutSessions!.set(sessionId, sessionData);
      
      console.log('Successfully marked session as completed:', sessionId);
      
      res.status(200).json({ 
        success: true,
        message: 'Session completed successfully'
      });
    } else {
      res.status(400).json({ 
        error: 'Session not found',
        reason: 'session_not_found'
      });
    }

  } catch (error) {
    console.error('Error completing checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 