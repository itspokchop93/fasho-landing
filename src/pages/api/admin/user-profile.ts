import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  billing_phone?: string;
  music_genre?: string;
  intake_form_completed: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  console.log('🔐 ADMIN-USER-PROFILE: Request method:', req.method);

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { user_id } = req.query;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ success: false, error: 'user_id parameter is required' });
  }

  const supabase = createAdminClient();

  try {
    console.log('🔐 ADMIN-USER-PROFILE: Fetching profile for user:', user_id);

    // Fetch user profile with all fields including music_genre
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('🔐 ADMIN-USER-PROFILE: Database error:', profileError);
      return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    }

    if (!profile) {
      console.log('🔐 ADMIN-USER-PROFILE: No profile found for user:', user_id);
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    console.log('🔐 ADMIN-USER-PROFILE: ✅ Profile fetched successfully');
    console.log('🔐 ADMIN-USER-PROFILE: Genre found:', profile.music_genre || 'None');
    
    return res.status(200).json({ 
      success: true, 
      profile: profile as UserProfile 
    });
    
  } catch (error) {
    console.error('🔐 ADMIN-USER-PROFILE: ❌ Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);