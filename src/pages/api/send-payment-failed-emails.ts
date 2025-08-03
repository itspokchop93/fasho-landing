import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentFailedEmail, sendAdminPaymentFailedEmail } from '../../utils/email/emailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📧 API: Payment failed email request received');
    console.log('📧 API: Request body:', JSON.stringify(req.body, null, 2));

    const { 
      customer_email,
      customer_name,
      items,
      addOnItems,
      total,
      reason
    } = req.body;

    // Validate required fields
    if (!customer_email || !customer_name) {
      console.error('📧 API: Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: customer_email and customer_name' });
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Prepare payment failure data in the format expected by email service
    const paymentFailureData = {
      customer_email,
      customer_name,
      items: items || [{
        track: { title: 'Unknown Track', artist: 'Unknown Artist' },
        package: { name: 'Marketing Package' }
      }],
      addOnItems: addOnItems || [],
      total: total || 0,
      reason: reason || 'Payment declined'
    };

    console.log('📧 API: Sending payment failed emails with data:', paymentFailureData);

    let customerEmailSent = false;
    let adminEmailSent = false;
    let errors = [];

    // Send customer payment failed email
    try {
      customerEmailSent = await sendPaymentFailedEmail(paymentFailureData, supabase);
      console.log('📧 API: Customer payment failed email sent:', customerEmailSent);
    } catch (error) {
      console.error('📧 API: Error sending customer payment failed email:', error);
      errors.push(`Customer email error: ${error}`);
    }

    // Send admin payment failed email
    try {
      adminEmailSent = await sendAdminPaymentFailedEmail(paymentFailureData, supabase);
      console.log('📧 API: Admin payment failed email sent:', adminEmailSent);
    } catch (error) {
      console.error('📧 API: Error sending admin payment failed email:', error);
      errors.push(`Admin email error: ${error}`);
    }

    // Return response
    const response = {
      success: customerEmailSent || adminEmailSent,
      customerEmailSent,
      adminEmailSent,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('📧 API: Final response:', response);

    return res.status(200).json(response);

  } catch (error) {
    console.error('📧 API: Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 