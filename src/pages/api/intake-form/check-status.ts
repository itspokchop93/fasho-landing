import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 INTAKE-FORM-CHECK: Checking intake form status...');
    
    const supabase = createClient(req, res);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ INTAKE-FORM-CHECK: User not authenticated:', userError);
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('🔍 INTAKE-FORM-CHECK: Checking status for user:', user.email);

    // Check if user has completed intake form
    const { data, error } = await supabase.rpc('check_intake_form_status', {
      user_id: user.id
    });

    if (error) {
      console.error('❌ INTAKE-FORM-CHECK: Database error:', error);
      return res.status(500).json({ error: 'Failed to check intake form status' });
    }

    console.log('✅ INTAKE-FORM-CHECK: Status retrieved:', { completed: data });

    return res.status(200).json({
      success: true,
      completed: data || false
    });

  } catch (error) {
    console.error('❌ INTAKE-FORM-CHECK: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 