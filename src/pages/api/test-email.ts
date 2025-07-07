import { NextApiRequest, NextApiResponse } from 'next';
import { sendOrderStatusChangeEmail } from '../../utils/email/emailService';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 TEST-EMAIL: Starting email test...');

    // Mock order data for testing
    const mockOrderData = {
      id: 'test-order-id',
      order_number: 'FASHO-TEST-001',
      customer_email: 'test@example.com', // Replace with your email for testing
      customer_name: 'Test Customer',
      total: 2999, // cents for consistency with orderTotal formatting
      created_at: new Date().toISOString(),
      status: 'processing'
    };

    const supabase = createClient(req, res);
    // Test sending a "completed" status email
    const emailSent = await sendOrderStatusChangeEmail(mockOrderData, 'completed', supabase);

    if (emailSent) {
      console.log('🧪 TEST-EMAIL: Email sent successfully');
      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        details: {
          to: mockOrderData.customer_email,
          orderNumber: mockOrderData.order_number,
          newStatus: 'completed'
        }
      });
    } else {
      console.log('🧪 TEST-EMAIL: Email failed to send');
      return res.status(500).json({
        success: false,
        message: 'Email failed to send - check logs for details'
      });
    }
  } catch (error) {
    console.error('🧪 TEST-EMAIL: Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 