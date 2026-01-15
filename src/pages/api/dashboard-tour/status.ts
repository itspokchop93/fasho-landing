import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TourStatusResponse {
  success: boolean;
  hasSeenTour?: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TourStatusResponse>
) {
  // GET: Check if user has seen the tour
  // POST: Mark tour as completed
  
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get the user from the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = user.id;

    if (req.method === 'GET') {
      // Check tour status
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('user_profiles')
        .select('has_seen_dashboard_tour')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        // Profile doesn't exist yet, return false (hasn't seen tour)
        if (fetchError.code === 'PGRST116') {
          return res.status(200).json({ success: true, hasSeenTour: false });
        }
        console.error('Error fetching tour status:', fetchError);
        return res.status(500).json({ success: false, error: 'Failed to fetch tour status' });
      }

      return res.status(200).json({ 
        success: true, 
        hasSeenTour: profile?.has_seen_dashboard_tour ?? false 
      });
    }

    if (req.method === 'POST') {
      // Mark tour as completed
      // First, try to update existing profile
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile:', checkError);
        return res.status(500).json({ success: false, error: 'Failed to check profile' });
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ 
            has_seen_dashboard_tour: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating tour status:', updateError);
          return res.status(500).json({ success: false, error: 'Failed to update tour status' });
        }
      } else {
        // Create new profile with tour completed
        const { error: insertError } = await supabaseAdmin
          .from('user_profiles')
          .insert({ 
            user_id: userId,
            has_seen_dashboard_tour: true
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          return res.status(500).json({ success: false, error: 'Failed to create profile' });
        }
      }

      return res.status(200).json({ success: true, hasSeenTour: true });
    }

  } catch (error) {
    console.error('Dashboard tour status API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
