import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    
    // Check authentication
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth test error:', error);
      return res.status(200).json({
        authenticated: false,
        error: error.message,
        user: null
      });
    }

    return res.status(200).json({
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      error: null
    });

  } catch (error) {
    console.error('Auth test exception:', error);
    return res.status(500).json({
      authenticated: false,
      error: 'Internal server error',
      user: null
    });
  }
} 