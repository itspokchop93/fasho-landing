import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let firstName = null;
    let source = 'email'; // Default source

    // FIRST PRIORITY: Get first name from user_profiles table (settings)
    console.log('🔐 GET-USER-FIRST-NAME: Checking user_profiles table for user:', user.id);
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('first_name')
      .eq('user_id', user.id)
      .single();

    console.log('🔐 GET-USER-FIRST-NAME: Profile query result:', { userProfile, profileError });

    if (!profileError && userProfile?.first_name) {
      firstName = userProfile.first_name;
      source = 'profile';
      console.log('🔐 GET-USER-FIRST-NAME: ✅ Found first_name in user_profiles:', firstName);
      
      // If we have a first name from user_profiles, use it exclusively - don't check other sources
      return res.status(200).json({ 
        firstName: firstName,
        source: source,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        }
      });
    }

    console.log('🔐 GET-USER-FIRST-NAME: No first_name in user_profiles, checking other sources...');

    // SECOND PRIORITY: Try to get first name from user metadata (signup)
    if (!firstName && user.user_metadata?.full_name) {
      const fullName = user.user_metadata.full_name;
      // Extract first name from full name
      const nameParts = fullName.trim().split(' ');
      if (nameParts.length > 0) {
        firstName = nameParts[0];
        source = 'signup';
      }
    }

    // THIRD PRIORITY: Try to get from most recent order
    if (!firstName) {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('billing_info')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!ordersError && orders && orders.length > 0) {
        const billingInfo = orders[0].billing_info;
        if (billingInfo?.firstName) {
          firstName = billingInfo.firstName;
          source = 'checkout';
        }
      }
    }

    // If still no first name, fall back to email-based extraction
    if (!firstName) {
      const emailPart = user.email?.split('@')[0];
      if (emailPart) {
        const cleanName = emailPart.replace(/[0-9]/g, '').replace(/[._]/g, '');
        firstName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    }

    return res.status(200).json({ 
      firstName: firstName || 'User',
      source: source,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    });

  } catch (error) {
    console.error('Error getting user first name:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 