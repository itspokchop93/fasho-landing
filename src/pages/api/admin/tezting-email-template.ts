import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../utils/supabase/server'
import { requireAdminRole, AdminUser } from '../../../utils/admin/auth'
import { EmailService } from '../../../utils/email/emailService'

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const supabase = createAdminClient()
  const emailService = new EmailService()

  try {
    console.log('📧 TEZTING-EMAIL-API: Starting test email request...')
    console.log('📧 TEZTING-EMAIL-API: Admin user:', adminUser.email)

    const { trigger_type } = req.body

    if (!trigger_type) {
      console.log('📧 TEZTING-EMAIL-API: Missing trigger_type parameter')
      return res.status(400).json({ 
        error: 'Missing required parameter: trigger_type',
        details: 'Please provide the email template trigger type to test'
      })
    }

    console.log('📧 TEZTING-EMAIL-API: Testing trigger type:', trigger_type)

    // Get admin email from settings
    const { data: adminEmailSetting, error: adminEmailError } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notification_email')
      .single()

    if (adminEmailError) {
      console.error('📧 TEZTING-EMAIL-API: Error fetching admin email:', adminEmailError)
      return res.status(400).json({ 
        error: 'Admin email not configured',
        details: 'Please configure the admin notification email in settings before sending test emails'
      })
    }

    const adminEmail = adminEmailSetting?.setting_value?.trim()
    if (!adminEmail) {
      console.log('📧 TEZTING-EMAIL-API: No admin email configured')
      return res.status(400).json({ 
        error: 'Admin email not configured',
        details: 'Please configure the admin notification email in settings before sending test emails'
      })
    }
    console.log('📧 TEZTING-EMAIL-API: Admin email found:', adminEmail)

    // Check if template exists and is active
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('trigger_type', trigger_type)
      .maybeSingle()

    if (templateError) {
      console.error('📧 TEZTING-EMAIL-API: Error fetching template:', templateError)
      return res.status(500).json({ 
        error: 'Failed to fetch email template',
        details: templateError.message 
      })
    }

    if (!template) {
      console.log('📧 TEZTING-EMAIL-API: Template not found for trigger:', trigger_type)
      return res.status(404).json({ 
        error: 'Email template not found',
        details: `No template exists for trigger type: ${trigger_type}`
      })
    }

    console.log('📧 TEZTING-EMAIL-API: Template found:', {
      id: template.id,
      name: template.name,
      trigger_type: template.trigger_type,
      is_active: template.is_active
    })

    // Create sample email data for testing
    const sampleEmailData = {
      to: adminEmail,
      customerName: 'Test Customer',
      orderNumber: 'FASHO-TEST-001',
      orderTotal: '$99.99',
      orderDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    console.log('📧 TEZTING-EMAIL-API: Sending test email with sample data:', sampleEmailData)

    // Send test email using the existing email service
    const emailSent = await emailService.sendNotification(trigger_type, sampleEmailData, supabase)

    if (!emailSent) {
      console.error('📧 TEZTING-EMAIL-API: Failed to send test email')
      return res.status(500).json({ 
        error: 'Failed to send test email',
        details: 'The email service was unable to send the test email. Check server logs for details.'
      })
    }

    console.log('📧 TEZTING-EMAIL-API: ✅ Test email sent successfully')
    
    return res.status(200).json({ 
      success: true,
      message: `Test email sent successfully to ${adminEmail}`,
      details: {
        trigger_type,
        template_name: template.name,
        recipient: adminEmail,
        sample_data: sampleEmailData
      }
    })

  } catch (error: any) {
    console.error('📧 TEZTING-EMAIL-API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

export default requireAdminRole('admin')(handler)