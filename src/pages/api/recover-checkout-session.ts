import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, expiredSessionId } = req.body;
    const supabase = createClient(req, res);

    console.log('Attempting to recover checkout session for user:', userId);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for session recovery' });
    }

    // First, try to get the expired session data
    let sessionData = null;
    if (expiredSessionId) {
      const { data: expiredSession } = await supabase
        .from('checkout_sessions')
        .select('session_data')
        .eq('id', expiredSessionId)
        .single();
      
      if (expiredSession) {
        sessionData = expiredSession.session_data;
      }
    }

    // If we don't have session data from expired session, look for the most recent active session for this user
    if (!sessionData) {
      const { data: recentSession } = await supabase
        .from('checkout_sessions')
        .select('session_data')
        .eq('user_id', userId)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentSession) {
        sessionData = recentSession.session_data;
      }
    }

    // If we still don't have session data, we can't recover
    if (!sessionData) {
      return res.status(404).json({ 
        error: 'No recoverable session data found',
        reason: 'no_data'
      });
    }

    // Create a new session with the recovered data
    const newSessionId = uuidv4();
    
    const newSessionData = {
      id: newSessionId,
      user_id: userId,
      session_data: sessionData,
      status: 'active',
      is_used: false,
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('checkout_sessions')
      .insert([newSessionData]);

    if (insertError) {
      console.error('Database error creating recovery session:', insertError);
      throw new Error('Failed to create recovery session');
    }

    // Mark the old session as expired if provided
    if (expiredSessionId) {
      await supabase
        .from('checkout_sessions')
        .update({ status: 'expired' })
        .eq('id', expiredSessionId);
    }

    console.log('Successfully created recovery session:', newSessionId);

    res.status(200).json({ 
      sessionId: newSessionId,
      recovered: true,
      message: 'Session recovered successfully'
    });

  } catch (error) {
    console.error('Error recovering checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}