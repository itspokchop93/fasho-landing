import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

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
  intake_form_completed: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  billing_phone?: string;
  email_notifications?: boolean;
  marketing_emails?: boolean;
}

interface ChangeEmailRequest {
  new_email: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔐 USER-PROFILE: Request method:', req.method);

  const supabase = createClient(req, res);
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.log('❌ USER-PROFILE: User not authenticated:', userError);
    return res.status(401).json({ success: false, error: 'User not authenticated' });
  }

  console.log('🔐 USER-PROFILE: Authenticated user:', user.email);

  if (req.method === 'GET') {
    return handleGetProfile(supabase, user.id, res);
  } else if (req.method === 'PUT') {
    return handleUpdateProfile(supabase, user.id, req.body, res);
  } else if (req.method === 'POST' && req.body.action === 'change_email') {
    return handleChangeEmail(supabase, user.id, req.body, res);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

// GET - Fetch user profile
async function handleGetProfile(supabase: any, userId: string, res: NextApiResponse) {
  console.log('🔐 USER-PROFILE-GET: Fetching profile for user:', userId);

  try {
    // Try to get existing profile
    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('🔐 USER-PROFILE-GET: Database error:', profileError);
      return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    }

    // If no profile exists, create one
    if (!profile) {
      console.log('🔐 USER-PROFILE-GET: No profile found, creating new one...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([{ user_id: userId }])
        .select()
        .single();

      if (createError) {
        console.error('🔐 USER-PROFILE-GET: Error creating profile:', createError);
        return res.status(500).json({ success: false, error: 'Failed to create user profile' });
      }

      profile = newProfile;
    }

    // Try to populate missing data from user metadata and orders
    if (!profile.first_name || !profile.last_name) {
      console.log('🔐 USER-PROFILE-GET: Profile missing names, checking user metadata and orders...');
      
      // Get user metadata
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      let firstName = profile.first_name;
      let lastName = profile.last_name;
      
      // Try to get names from user metadata
      if (user?.user_metadata?.full_name && (!firstName || !lastName)) {
        const nameParts = user.user_metadata.full_name.trim().split(' ');
        if (!firstName && nameParts.length > 0) firstName = nameParts[0];
        if (!lastName && nameParts.length > 1) lastName = nameParts.slice(1).join(' ');
      }
      
      // Try to get billing info from most recent order
      if (!firstName || !lastName || !profile.billing_address_line1) {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('billing_info, customer_name')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!ordersError && orders && orders.length > 0) {
          const billingInfo = orders[0].billing_info;
          const customerName = orders[0].customer_name;
          
          // Extract names from billing info or customer name
          if (billingInfo?.firstName && !firstName) firstName = billingInfo.firstName;
          if (billingInfo?.lastName && !lastName) lastName = billingInfo.lastName;
          
          // Fallback to customer name
          if (!firstName || !lastName) {
            const nameParts = customerName?.trim().split(' ') || [];
            if (!firstName && nameParts.length > 0) firstName = nameParts[0];
            if (!lastName && nameParts.length > 1) lastName = nameParts.slice(1).join(' ');
          }
          
          // Update profile with any missing information
          const updateData: any = {};
          if (firstName && !profile.first_name) updateData.first_name = firstName;
          if (lastName && !profile.last_name) updateData.last_name = lastName;
          if (firstName && lastName && !profile.full_name) {
            updateData.full_name = `${firstName} ${lastName}`;
          }
          
          // Add billing information from order if missing
          if (billingInfo && !profile.billing_address_line1) {
            if (billingInfo.address) updateData.billing_address_line1 = billingInfo.address;
            if (billingInfo.address2) updateData.billing_address_line2 = billingInfo.address2;
            if (billingInfo.city) updateData.billing_city = billingInfo.city;
            if (billingInfo.state) updateData.billing_state = billingInfo.state;
            if (billingInfo.zip) updateData.billing_zip = billingInfo.zip;
            if (billingInfo.country) updateData.billing_country = billingInfo.country;
            if (billingInfo.countryCode && billingInfo.phoneNumber) {
              updateData.billing_phone = `${billingInfo.countryCode}${billingInfo.phoneNumber}`;
            }
          }
          
          // Update profile if we have new data
          if (Object.keys(updateData).length > 0) {
            console.log('🔐 USER-PROFILE-GET: Updating profile with missing data:', updateData);
            
            const { data: updatedProfile, error: updateError } = await supabase
              .from('user_profiles')
              .update(updateData)
              .eq('user_id', userId)
              .select()
              .single();
              
            if (!updateError) {
              profile = updatedProfile;
            }
          }
        }
      }
    }

    console.log('🔐 USER-PROFILE-GET: ✅ Profile fetched successfully');
    return res.status(200).json({ success: true, profile });
    
  } catch (error) {
    console.error('🔐 USER-PROFILE-GET: ❌ Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// PUT - Update user profile
async function handleUpdateProfile(
  supabase: any, 
  userId: string, 
  updateData: UpdateProfileRequest, 
  res: NextApiResponse
) {
  console.log('🔐 USER-PROFILE-UPDATE: Updating profile for user:', userId);
  console.log('🔐 USER-PROFILE-UPDATE: Update data:', updateData);

  try {
    // Prepare the update object
    const profileUpdate: any = {
      updated_at: new Date().toISOString()
    };

    // Add fields that are provided
    if (updateData.first_name !== undefined) profileUpdate.first_name = updateData.first_name;
    if (updateData.last_name !== undefined) profileUpdate.last_name = updateData.last_name;
    if (updateData.billing_address_line1 !== undefined) profileUpdate.billing_address_line1 = updateData.billing_address_line1;
    if (updateData.billing_address_line2 !== undefined) profileUpdate.billing_address_line2 = updateData.billing_address_line2;
    if (updateData.billing_city !== undefined) profileUpdate.billing_city = updateData.billing_city;
    if (updateData.billing_state !== undefined) profileUpdate.billing_state = updateData.billing_state;
    if (updateData.billing_zip !== undefined) profileUpdate.billing_zip = updateData.billing_zip;
    if (updateData.billing_country !== undefined) profileUpdate.billing_country = updateData.billing_country;
    if (updateData.billing_phone !== undefined) profileUpdate.billing_phone = updateData.billing_phone;
    if (updateData.email_notifications !== undefined) profileUpdate.email_notifications = updateData.email_notifications;
    if (updateData.marketing_emails !== undefined) profileUpdate.marketing_emails = updateData.marketing_emails;

    // Update full_name if both first and last names are provided
    if (updateData.first_name !== undefined || updateData.last_name !== undefined) {
      // Get current profile to merge names
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single();
        
      const firstName = updateData.first_name !== undefined ? updateData.first_name : currentProfile?.first_name;
      const lastName = updateData.last_name !== undefined ? updateData.last_name : currentProfile?.last_name;
      
      if (firstName || lastName) {
        profileUpdate.full_name = `${firstName || ''} ${lastName || ''}`.trim();
      }
    }

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(profileUpdate)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('🔐 USER-PROFILE-UPDATE: ❌ Database error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }

    console.log('🔐 USER-PROFILE-UPDATE: ✅ Profile updated successfully');
    return res.status(200).json({ success: true, profile: updatedProfile });
    
  } catch (error) {
    console.error('🔐 USER-PROFILE-UPDATE: ❌ Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// POST - Change email address
async function handleChangeEmail(
  supabase: any, 
  userId: string, 
  requestData: ChangeEmailRequest, 
  res: NextApiResponse
) {
  console.log('🔐 USER-PROFILE-EMAIL: Initiating email change for user:', userId);
  console.log('🔐 USER-PROFILE-EMAIL: New email:', requestData.new_email);

  try {
    if (!requestData.new_email || !requestData.new_email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    // Use Supabase's built-in email change functionality
    const { data, error } = await supabase.auth.updateUser({
      email: requestData.new_email
    });

    if (error) {
      console.error('🔐 USER-PROFILE-EMAIL: ❌ Supabase error:', error);
      return res.status(400).json({ 
        success: false, 
        error: error.message || 'Failed to initiate email change' 
      });
    }

    console.log('🔐 USER-PROFILE-EMAIL: ✅ Email change initiated successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'Email change confirmation sent. Please check both your current and new email addresses to confirm the change.',
      user: data.user
    });
    
  } catch (error) {
    console.error('🔐 USER-PROFILE-EMAIL: ❌ Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
} 