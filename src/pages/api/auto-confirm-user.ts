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
    console.log('🔧 AUTO-CONFIRM: Attempting to confirm user:', email);
    
    // First, find the user by email
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('🔧 AUTO-CONFIRM: Error listing users:', getUserError);
      return res.status(500).json({ message: 'Failed to find user', error: getUserError.message });
    }

    const user = userData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error('🔧 AUTO-CONFIRM: User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already confirmed
    if (user.email_confirmed_at) {
      console.log('🔧 AUTO-CONFIRM: User already confirmed:', email);
      return res.status(200).json({ message: 'User already confirmed', confirmed: true });
    }

    // Auto-confirm the user
    const { data: confirmData, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        email_confirm: true
      }
    );

    if (confirmError) {
      console.error('🔧 AUTO-CONFIRM: Error confirming user:', confirmError);
      return res.status(500).json({ message: 'Failed to confirm user', error: confirmError.message });
    }

    console.log('🔧 AUTO-CONFIRM: ✅ User confirmed successfully:', email);
    return res.status(200).json({ message: 'User confirmed successfully', confirmed: true, user: confirmData.user });

  } catch (err) {
    console.error('🔧 AUTO-CONFIRM: Unexpected error:', err);
    const errMsg = typeof err === 'object' && err && 'message' in err ? err.message : String(err);
    return res.status(500).json({ message: 'Internal server error', error: errMsg });
  }
} 