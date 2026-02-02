import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '../../utils/supabase-server';
import { sendZapierWebhookServer } from '../../utils/zapier/webhookService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event_type, customer_data, order_data, intake_form_data } = req.body;

    if (!event_type || !customer_data?.email) {
      return res.status(400).json({ error: 'event_type and customer_data.email are required' });
    }

    // Validate event_type
    const validEventTypes = ['checkout_success', 'user_signup', 'intake_form_thank_you', 'intake_form_dashboard'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({ error: 'Invalid event_type' });
    }

    console.log('🔗 SEND-ZAPIER-WEBHOOK-API: Processing webhook request for event:', event_type);

    // Create server-side Supabase client
    const supabase = createServerClient(req, res);

    // Prepare the webhook payload
    const payload = {
      event_type: event_type as 'checkout_success' | 'user_signup' | 'intake_form_thank_you' | 'intake_form_dashboard',
      timestamp: new Date().toISOString(),
      customer_data,
      order_data,
      intake_form_data
    };

    // Send the webhook using the server-side function
    const success = await sendZapierWebhookServer(payload, supabase);

    if (success) {
      console.log('🔗 SEND-ZAPIER-WEBHOOK-API: ✅ Webhook sent successfully');
      return res.status(200).json({ success: true, message: 'Webhook sent successfully' });
    } else {
      console.log('🔗 SEND-ZAPIER-WEBHOOK-API: ❌ Webhook failed or not configured');
      return res.status(200).json({ success: false, message: 'Webhook not sent (may not be configured)' });
    }

  } catch (error) {
    console.error('🔗 SEND-ZAPIER-WEBHOOK-API: ❌ Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
