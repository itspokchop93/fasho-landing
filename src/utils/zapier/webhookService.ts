interface WebhookPayload {
  event_type: 'checkout_success' | 'user_signup' | 'intake_form_thank_you' | 'intake_form_dashboard';
  timestamp: string;
  customer_data: {
    first_name?: string;
    last_name?: string;
    email: string;
    billing_address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  order_data?: {
    packages_ordered: string[];
    order_date: string;
    order_total?: string;
    order_number?: string;
  };
  intake_form_data?: Record<string, string>;
}

export async function sendZapierWebhook(payload: WebhookPayload): Promise<boolean> {
  try {
    console.log('🔗 ZAPIER-WEBHOOK: Preparing to send webhook for event:', payload.event_type);

    // Get webhook URL from admin settings
    const response = await fetch('/api/admin/admin-settings');
    if (!response.ok) {
      console.error('🔗 ZAPIER-WEBHOOK: Failed to fetch admin settings');
      return false;
    }

    const data = await response.json();
    const webhookUrl = data.settings?.zapier_webhook_url;

    if (!webhookUrl) {
      console.log('🔗 ZAPIER-WEBHOOK: No webhook URL configured, skipping webhook');
      return false;
    }

    console.log('🔗 ZAPIER-WEBHOOK: Sending webhook to Zapier...');
    
    // Send the webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FASHO.co-Webhook/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!webhookResponse.ok) {
      console.error('🔗 ZAPIER-WEBHOOK: Webhook request failed:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        event_type: payload.event_type
      });
      return false;
    }

    console.log('🔗 ZAPIER-WEBHOOK: Webhook sent successfully for event:', payload.event_type);
    return true;

  } catch (error) {
    console.error('🔗 ZAPIER-WEBHOOK: Error sending webhook:', error);
    return false;
  }
}

// Server-side version for API routes that have access to Supabase admin client
export async function sendZapierWebhookServer(payload: WebhookPayload, supabase: any): Promise<boolean> {
  try {
    console.log('🔗 ZAPIER-WEBHOOK-SERVER: Preparing to send webhook for event:', payload.event_type);

    // Get webhook URL from admin settings using server-side Supabase client
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'zapier_webhook_url')
      .single();

    if (error || !settings?.setting_value) {
      console.log('🔗 ZAPIER-WEBHOOK-SERVER: No webhook URL configured, skipping webhook');
      return false;
    }

    const webhookUrl = settings.setting_value;
    console.log('🔗 ZAPIER-WEBHOOK-SERVER: Sending webhook to Zapier...');
    
    // Send the webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FASHO.co-Webhook/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!webhookResponse.ok) {
      console.error('🔗 ZAPIER-WEBHOOK-SERVER: Webhook request failed:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        event_type: payload.event_type
      });
      return false;
    }

    console.log('🔗 ZAPIER-WEBHOOK-SERVER: Webhook sent successfully for event:', payload.event_type);
    return true;

  } catch (error) {
    console.error('🔗 ZAPIER-WEBHOOK-SERVER: Error sending webhook:', error);
    return false;
  }
}

// Helper function to format customer name
export function formatCustomerName(customerName: string): { first_name: string; last_name: string } {
  const nameParts = customerName.trim().split(' ');
  const first_name = nameParts[0] || '';
  const last_name = nameParts.slice(1).join(' ') || '';
  
  return { first_name, last_name };
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
} 