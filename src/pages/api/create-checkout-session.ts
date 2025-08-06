import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../../utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tracks, selectedPackages, userId, existingSessionId } = req.body;
    const supabase = createClient(req, res);

    console.log('Creating checkout session with data:', {
      tracksCount: tracks?.length,
      selectedPackages: Object.keys(selectedPackages || {}).length,
      userId,
      existingSessionId
    });

    if (!tracks || !selectedPackages) {
      console.error('Missing required data:', { tracks: !!tracks, selectedPackages: !!selectedPackages });
      return res.status(400).json({ error: 'Missing required data' });
    }

    // If we have an existing session ID, invalidate it first
    if (existingSessionId) {
      console.log('Invalidating existing session:', existingSessionId);
      await supabase
        .from('checkout_sessions')
        .update({ status: 'invalidated', updated_at: new Date().toISOString() })
        .eq('id', existingSessionId);
    }

    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Store session data in Supabase database
    const sessionData = {
      id: sessionId,
      user_id: userId,
      session_data: {
        tracks,
        selectedPackages,
        userId
      },
      status: 'active',
      is_used: false,
      created_at: new Date().toISOString()
    };

    // For unauthenticated users, use service role to bypass RLS
    let insertError;
    if (!userId) {
      // Create service role client for unauthenticated users
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const result = await serviceClient
        .from('checkout_sessions')
        .insert([sessionData]);
      insertError = result.error;
    } else {
      // Use regular client for authenticated users
      const result = await supabase
        .from('checkout_sessions')
        .insert([sessionData]);
      insertError = result.error;
    }

    if (insertError) {
      console.error('Database error creating session:', insertError);
      throw new Error('Failed to store checkout session');
    }

    console.log('Successfully created checkout session in database:', sessionId);

    res.status(200).json({ sessionId });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 