import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

interface SyncUserProfileRequest {
  user_id?: string;
  email?: string;
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
  source?: 'signup' | 'checkout' | 'manual';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    const {
      user_id,
      email,
      first_name,
      last_name,
      full_name,
      billing_address_line1,
      billing_address_line2,
      billing_city,
      billing_state,
      billing_zip,
      billing_country,
      billing_phone,
      music_genre,
      source = 'manual'
    }: SyncUserProfileRequest = req.body;

    console.log('🔄 SYNC-USER-PROFILE: Request received:', {
      user_id,
      email,
      first_name,
      last_name,
      full_name,
      source
    });

    // Get user_id if not provided but email is
    let targetUserId = user_id;
    if (!targetUserId && email) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user && user.email === email) {
        targetUserId = user.id;
      } else {
        // Query auth.users table to find user by email
        const { data: users } = await supabase.auth.admin.listUsers();
        const foundUser = users.users.find((u: any) => u.email === email);
        if (foundUser) {
          targetUserId = foundUser.id;
        }
      }
    }

    if (!targetUserId) {
      console.log('🔄 SYNC-USER-PROFILE: ❌ No user_id found');
      return res.status(400).json({ error: 'User ID required' });
    }

    // Parse full_name into first_name and last_name if needed
    let derivedFirstName = first_name;
    let derivedLastName = last_name;
    
    if (full_name && !first_name && !last_name) {
      const nameParts = full_name.trim().split(' ');
      derivedFirstName = nameParts[0] || '';
      derivedLastName = nameParts.slice(1).join(' ') || '';
    }

    // Check if user_profiles record exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    console.log('🔄 SYNC-USER-PROFILE: Existing profile:', existingProfile);

    // Prepare update data - only include fields that have values
    const updateData: any = {
      user_id: targetUserId,
      updated_at: new Date().toISOString()
    };

    // Only update fields that have actual values (don't overwrite with null/empty)
    if (derivedFirstName) updateData.first_name = derivedFirstName;
    if (derivedLastName) updateData.last_name = derivedLastName;
    if (full_name) updateData.full_name = full_name;
    if (billing_address_line1) updateData.billing_address_line1 = billing_address_line1;
    if (billing_address_line2) updateData.billing_address_line2 = billing_address_line2;
    if (billing_city) updateData.billing_city = billing_city;
    if (billing_state) updateData.billing_state = billing_state;
    if (billing_zip) updateData.billing_zip = billing_zip;
    if (billing_country) updateData.billing_country = billing_country;
    if (billing_phone) updateData.billing_phone = billing_phone;
    if (music_genre) updateData.music_genre = music_genre;

    let result;
    if (existingProfile) {
      // Update existing profile - merge data, don't overwrite existing values with empty ones
      const mergedData = { ...updateData };
      
      // Keep existing values if new values are empty
      Object.keys(existingProfile).forEach(key => {
        if (existingProfile[key] && !mergedData[key]) {
          mergedData[key] = existingProfile[key];
        }
      });

      console.log('🔄 SYNC-USER-PROFILE: Updating existing profile with:', mergedData);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update(mergedData)
        .eq('user_id', targetUserId)
        .select()
        .single();

      result = { data, error };
    } else {
      // Create new profile
      console.log('🔄 SYNC-USER-PROFILE: Creating new profile with:', updateData);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(updateData)
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('🔄 SYNC-USER-PROFILE: ❌ Database error:', result.error);
      
      // Check if the error is due to missing music_genre column
      if (result.error.message && result.error.message.includes('music_genre')) {
        console.log('🔄 SYNC-USER-PROFILE: ⚠️ music_genre column not found, retrying without it...');
        
        // Retry without the music_genre field
        const updateDataWithoutGenre = { ...updateData };
        delete updateDataWithoutGenre.music_genre;
        
        let retryResult;
        if (existingProfile) {
          const { data, error } = await supabase
            .from('user_profiles')
            .update(updateDataWithoutGenre)
            .eq('user_id', targetUserId)
            .select()
            .single();
          retryResult = { data, error };
        } else {
          const { data, error } = await supabase
            .from('user_profiles')
            .insert(updateDataWithoutGenre)
            .select()
            .single();
          retryResult = { data, error };
        }
        
        if (retryResult.error) {
          return res.status(500).json({ error: 'Failed to sync user profile', details: retryResult.error });
        }
        
        return res.status(200).json({
          success: true,
          profile: retryResult.data,
          warning: 'Profile synced successfully, but music_genre field needs database migration',
          migrationRequired: true,
          source: source
        });
      }
      
      return res.status(500).json({ error: 'Failed to sync user profile', details: result.error });
    }

    console.log('🔄 SYNC-USER-PROFILE: ✅ Profile synced successfully');
    return res.status(200).json({
      success: true,
      profile: result.data,
      source: source
    });

  } catch (error) {
    console.error('🔄 SYNC-USER-PROFILE: ❌ Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 