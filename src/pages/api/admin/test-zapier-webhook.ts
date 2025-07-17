import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../utils/supabase/server'
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth'

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createAdminClient()

  try {
    console.log('🔗 TEST-WEBHOOK: Starting test webhook process...')
    console.log('🔗 TEST-WEBHOOK: Admin user:', adminUser.email)

    // Get the webhook URL from admin settings
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'zapier_webhook_url')
      .single()

    if (settingsError || !settings?.setting_value) {
      console.log('🔗 TEST-WEBHOOK: No webhook URL configured')
      return res.status(400).json({ error: 'No webhook URL configured. Please save a webhook URL first.' })
    }

    const webhookUrl = settings.setting_value
    console.log('🔗 TEST-WEBHOOK: Webhook URL found, sending test payload...')

    // Create a test payload
    const testPayload = {
      event_type: 'test_webhook',
      timestamp: new Date().toISOString(),
      test_data: {
        message: 'This is a test webhook from FASHO.co admin panel',
        admin_email: adminUser.email,
        test_id: Math.random().toString(36).substring(7)
      },
      sample_checkout_data: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        billing_address: {
          line1: '123 Main St',
          line2: 'Apt 4B',
          city: 'Los Angeles',
          state: 'CA',
          postal_code: '90210',
          country: 'US'
        },
        packages_ordered: [
          'Premium Package - 50K Plays',
          'Standard Package - 20K Plays'
        ],
        order_date: new Date().toISOString(),
        order_total: '$299.00'
      }
    }

    // Send the webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FASHO.co-Webhook/1.0'
      },
      body: JSON.stringify(testPayload)
    })

    if (!webhookResponse.ok) {
      console.error('🔗 TEST-WEBHOOK: Webhook request failed:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText
      })
      return res.status(500).json({ 
        error: `Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}` 
      })
    }

    console.log('🔗 TEST-WEBHOOK: Test webhook sent successfully')
    
    return res.status(200).json({
      success: true,
      message: 'Test webhook sent successfully',
      webhook_url: webhookUrl,
      payload_sent: testPayload
    })

  } catch (error: any) {
    console.error('🔗 TEST-WEBHOOK: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Failed to send test webhook',
      details: error.message 
    })
  }
}

export default requireAdminAuth(handler) 