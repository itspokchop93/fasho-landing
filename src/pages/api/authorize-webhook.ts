import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendOrderStatusChangeEmail, sendAdminNewOrderEmail } from '../../utils/email/emailService';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log EVERY request to this endpoint for debugging
  console.log('🔔 WEBHOOK: Request received!');
  console.log('🔔 WEBHOOK: Method:', req.method);
  console.log('🔔 WEBHOOK: URL:', req.url);
  console.log('🔔 WEBHOOK: Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔔 WEBHOOK: Body:', JSON.stringify(req.body, null, 2));
  
  // Handle GET requests for testing webhook URL accessibility
  if (req.method === 'GET') {
    console.log('🔔 WEBHOOK: GET request - webhook endpoint is accessible');
    return res.status(200).json({ 
      message: 'Authorize.net webhook endpoint is active',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    console.log('🔔 WEBHOOK: Non-POST request received:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔔 WEBHOOK: Processing POST request');
    console.log('🔔 WEBHOOK: Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔔 WEBHOOK: Body:', JSON.stringify(req.body, null, 2));

    // TEMPORARILY DISABLED: Signature verification for debugging
    console.log('🔔 WEBHOOK: ⚠️ SIGNATURE VERIFICATION DISABLED FOR DEBUGGING');
    
    const signature = req.headers['x-anet-signature'] as string;
    console.log('🔔 WEBHOOK: Signature header:', signature || 'NOT PRESENT');
    
    const signatureKey = process.env.AUTHORIZE_NET_SIGNATURE_KEY;
    console.log('🔔 WEBHOOK: Signature key present:', !!signatureKey);
    
    // TODO: Re-enable signature verification after debugging
    // if (!signature) {
    //   console.error('🔔 WEBHOOK: Missing signature header');
    //   return res.status(401).json({ error: 'Missing signature' });
    // }

    const payload = req.body;
    
    // Validate webhook payload
    if (!payload || !payload.eventType || !payload.payload) {
      console.error('🔔 WEBHOOK: Invalid payload structure');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { eventType, payload: transactionData } = payload;
    
    console.log('🔔 WEBHOOK: Event type:', eventType);
    console.log('🔔 WEBHOOK: Transaction data:', JSON.stringify(transactionData, null, 2));

    // Handle payment failure events
    if (eventType === 'net.authorize.payment.fraud.declined' || 
        eventType === 'net.authorize.payment.authcapture.declined' || 
        eventType === 'net.authorize.payment.authorization.declined' ||
        transactionData.responseCode !== '1') {
      
      console.log('🔔 WEBHOOK: Payment failed, sending failure emails...');
      
      // Extract payment information
      const customerEmail = transactionData.order?.invoiceNumber ? 
        await getCustomerEmailFromInvoice(transactionData.order.invoiceNumber) : 
        transactionData.billTo?.email || transactionData.customer?.email;
        
      const customerName = transactionData.billTo ? 
        `${transactionData.billTo.firstName} ${transactionData.billTo.lastName}` : 
        'Unknown Customer';

      // Skip email sending if no customer email found
      if (!customerEmail) {
        console.error('🔔 WEBHOOK: No customer email found, skipping payment failed emails');
        return res.status(200).json({ message: 'Webhook processed successfully (no email sent)' });
      }
        
      // Get order items from invoice number if available
      let orderItems: { items: any[], addOnItems: any[] } = { items: [], addOnItems: [] };
      if (transactionData.order?.invoiceNumber) {
        orderItems = await getOrderItemsFromInvoice(transactionData.order.invoiceNumber);
      }

      // Prepare payment failure data with proper structure
      const paymentFailureData = {
        customer_email: customerEmail,
        customer_name: customerName,
        items: orderItems.items.length > 0 ? orderItems.items : [{
          track: { title: 'Unknown Track', artist: 'Unknown Artist' },
          package: { name: 'Marketing Package' }
        }],
        addOnItems: orderItems.addOnItems || [],
        total: parseFloat(transactionData.authAmount || transactionData.settleAmount || '0') * 100,
        reason: transactionData.responseReasonText || 'Payment declined by processor'
      };

      console.log('🔔 WEBHOOK: Payment failure data:', paymentFailureData);

      // Send payment failed emails
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      try {
        // Send customer notification (using invoice number as order number if available)
        const orderNumber = transactionData.order?.invoiceNumber || 'PAYMENT-FAILED';
        const customerEmailSent = await sendOrderStatusChangeEmail(orderNumber, 'cancelled', supabase);
        console.log('🔔 WEBHOOK: Customer payment failed email sent:', customerEmailSent);
        
        // Send admin notification (construct proper order data structure)
        const adminOrderData = {
          id: 'payment-failed-' + Date.now(),
          order_number: orderNumber,
          customer_email: paymentFailureData.customer_email,
          customer_name: paymentFailureData.customer_name,
          total: paymentFailureData.total,
          created_at: new Date().toISOString()
        };
        const adminEmailSent = await sendAdminNewOrderEmail(adminOrderData, supabase);
        console.log('🔔 WEBHOOK: Admin payment failed email sent:', adminEmailSent);
        
      } catch (emailError) {
        console.error('🔔 WEBHOOK: Error sending payment failed emails:', emailError);
      }
    }

    // Respond to Authorize.net
    return res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('🔔 WEBHOOK: Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to get customer email from invoice number
async function getCustomerEmailFromInvoice(invoiceNumber: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Extract session ID from invoice number (format: INV{sessionId})
    const sessionId = invoiceNumber.replace('INV', '');
    
    // Look up the checkout session
    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .select('customer_email')
      .eq('session_id', sessionId)
      .single();
      
    if (error) {
      console.error('🔔 WEBHOOK: Error looking up customer email:', error);
      return null;
    }
    
    return session?.customer_email || null;
  } catch (error) {
    console.error('🔔 WEBHOOK: Error in getCustomerEmailFromInvoice:', error);
    return null;
  }
}

// Helper function to get order items from invoice number
async function getOrderItemsFromInvoice(invoiceNumber: string): Promise<{ items: any[], addOnItems: any[] }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Extract session ID from invoice number
    const sessionId = invoiceNumber.replace('INV', '');
    
    // Look up the checkout session
    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .select('order_items, add_on_items')
      .eq('session_id', sessionId)
      .single();
      
    if (error) {
      console.error('🔔 WEBHOOK: Error looking up order items:', error);
      return { items: [], addOnItems: [] };
    }
    
    return {
      items: session?.order_items || [],
      addOnItems: session?.add_on_items || []
    };
  } catch (error) {
    console.error('🔔 WEBHOOK: Error in getOrderItemsFromInvoice:', error);
    return { items: [], addOnItems: [] };
  }
} 