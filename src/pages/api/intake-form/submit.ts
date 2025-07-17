import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 INTAKE-FORM-SUBMIT: Submitting intake form...');
    
    const supabase = createClient(req, res);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ INTAKE-FORM-SUBMIT: User not authenticated:', userError);
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { responses } = req.body;

    if (!responses || typeof responses !== 'object') {
      console.log('❌ INTAKE-FORM-SUBMIT: Invalid responses data');
      return res.status(400).json({ error: 'Invalid responses data' });
    }

    console.log('🔍 INTAKE-FORM-SUBMIT: Processing for user:', user.email);
    console.log('🔍 INTAKE-FORM-SUBMIT: Responses:', responses);

    // Store the responses in the database
    const { data: responseData, error: responseError } = await supabase
      .from('intake_form_responses')
      .insert([
        {
          user_id: user.id,
          responses: responses
        }
      ])
      .select()
      .single();

    if (responseError) {
      console.error('❌ INTAKE-FORM-SUBMIT: Failed to store responses:', responseError);
      return res.status(500).json({ error: 'Failed to store responses' });
    }

    console.log('✅ INTAKE-FORM-SUBMIT: Responses stored:', responseData.id);

    // Mark intake form as completed
    const { data: markCompleteData, error: markCompleteError } = await supabase.rpc('mark_intake_form_completed', {
      user_id: user.id
    });

    if (markCompleteError) {
      console.error('❌ INTAKE-FORM-SUBMIT: Failed to mark as completed:', markCompleteError);
      return res.status(500).json({ error: 'Failed to mark form as completed' });
    }

    console.log('✅ INTAKE-FORM-SUBMIT: Form marked as completed for user:', user.email);

    // TODO: Send to Zapier webhook (placeholder for future integration)
    console.log('🔗 INTAKE-FORM-SUBMIT: Zapier webhook integration - PLACEHOLDER');
    console.log('🔗 INTAKE-FORM-SUBMIT: Responses to send to Zapier:', responses);
    console.log('🔗 INTAKE-FORM-SUBMIT: User email for Zapier:', user.email);
    
    // Future Zapier integration would go here:
    // const zapierResponse = await fetch('ZAPIER_WEBHOOK_URL', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     user_email: user.email,
    //     user_id: user.id,
    //     responses: responses,
    //     submitted_at: new Date().toISOString()
    //   })
    // });

    return res.status(200).json({
      success: true,
      message: 'Intake form submitted successfully',
      responseId: responseData.id
    });

  } catch (error) {
    console.error('❌ INTAKE-FORM-SUBMIT: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 