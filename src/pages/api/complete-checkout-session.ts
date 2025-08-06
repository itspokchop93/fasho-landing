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

    console.log('Completing checkout session:', sessionId);

    // Update session in database using service role to access all sessions
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: sessionData, error: updateError } = await serviceClient
      .from('checkout_sessions')
      .update({ 
        is_used: true, 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    if (updateError || !sessionData) {
      console.error('Error updating session or session not found:', updateError);
      return res.status(400).json({ 
        error: 'Session not found',
        reason: 'session_not_found'
      });
    }
    
    console.log('Successfully marked session as completed:', sessionId);
    
    res.status(200).json({ 
      success: true,
      message: 'Session completed successfully'
    });

  } catch (error) {
    console.error('Error completing checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 