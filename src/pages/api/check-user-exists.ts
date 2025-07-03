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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ message: 'Supabase environment variables not set' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // List users (up to 1000) and filter by email
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return res.status(500).json({ message: 'Database error', error: error.message });
    }

    const user = data?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      return res.status(200).json({ exists: true, verified: !!user.email_confirmed_at });
    } else {
      return res.status(200).json({ exists: false, verified: false });
    }
  } catch (err) {
    const errMsg = typeof err === 'object' && err && 'message' in err ? err.message : String(err);
    return res.status(500).json({ message: 'Internal server error', error: errMsg });
  }
} 