import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;
    const supabase = createClient(req, res);

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log('Validating session:', sessionId);

    // Get session data from Supabase database using service role to access all sessions
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: sessionData, error: fetchError } = await serviceClient
      .from('checkout_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (fetchError || !sessionData) {
      console.log('Session not found:', sessionId, fetchError);
      return res.status(400).json({ 
        error: 'Session not found',
        reason: 'session_not_found'
      });
    }

    // Check if session has already been used
    if (sessionData.is_used) {
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

    // Check if session is expired (older than 24 hours)
    const createdAt = new Date(sessionData.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      // Mark as expired in database
      await serviceClient
        .from('checkout_sessions')
        .update({ status: 'expired' })
        .eq('id', sessionId);
        
      return res.status(400).json({ 
        error: 'This checkout session has expired.',
        reason: 'expired'
      });
    }

    res.status(200).json({ 
      isValid: true, 
      sessionData: {
        tracks: sessionData.session_data.tracks,
        selectedPackages: sessionData.session_data.selectedPackages,
        userId: sessionData.session_data.userId
      }
    });

  } catch (error) {
    console.error('Error validating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 