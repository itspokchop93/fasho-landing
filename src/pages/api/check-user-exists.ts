import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Use the service role key for admin access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ message: 'Supabase environment variables not set' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Query the auth.users table directly
    const { data, error } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, email_confirmed_at')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    if (data) {
      // User exists
      return res.status(200).json({ exists: true, verified: !!data.email_confirmed_at });
    } else {
      // User does not exist
      return res.status(200).json({ exists: false, verified: false });
    }
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 