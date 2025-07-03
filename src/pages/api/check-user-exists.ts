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

  // Log presence of env vars (not values)
  console.log('[DEBUG] SUPABASE_URL present:', !!supabaseUrl);
  console.log('[DEBUG] SERVICE_ROLE_KEY present:', !!serviceRoleKey);
  console.log('[DEBUG] Checking email:', email);

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[DEBUG] Missing Supabase env vars');
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

    console.log('[DEBUG] Supabase query result:', { data, error });

    if (error) {
      const errorMsg = typeof error === 'object' && error && 'message' in error ? error.message : String(error);
      console.error('[DEBUG] Supabase error:', errorMsg);
      return res.status(500).json({ message: 'Database error', error: errorMsg });
    }

    if (data) {
      // User exists
      return res.status(200).json({ exists: true, verified: !!data.email_confirmed_at });
    } else {
      // User does not exist
      return res.status(200).json({ exists: false, verified: false });
    }
  } catch (err) {
    const errMsg = typeof err === 'object' && err && 'message' in err ? err.message : String(err);
    console.error('[DEBUG] API error:', errMsg);
    return res.status(500).json({ message: 'Internal server error', error: errMsg });
  }
} 