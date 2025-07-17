import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../utils/supabase/server'
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth'

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const supabase = createAdminClient()

  try {
    console.log('🧪 TEST-EMAIL-TEMPLATE: Starting test email process...')
    console.log('🧪 TEST-EMAIL-TEMPLATE: Admin user:', adminUser.email)

    const { trigger_type } = req.body

    if (!trigger_type) {
      return res.status(400).json({ error: 'trigger_type is required' })
    }

    console.log('🧪 TEST-EMAIL-TEMPLATE: Testing template for trigger:', trigger_type)

    // Get admin email from settings
    const { data: adminSettings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('setting_key', 'admin_notification_email')
      .maybeSingle()

    if (settingsError) {
      console.error('🧪 TEST-EMAIL-TEMPLATE: Error fetching admin settings:', settingsError)
      return res.status(500).json({ error: 'Failed to fetch admin email setting' })
    }

    const adminEmail = adminSettings?.setting_value
    if (!adminEmail) {
      return res.status(400).json({ 
        error: 'Admin notification email not configured',
        details: 'Please set an admin email in the admin settings first'
      })
    }

    console.log('🧪 TEST-EMAIL-TEMPLATE: Admin email found:', adminEmail)

    // Get the email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('trigger_type', trigger_type)
      .maybeSingle()

    if (templateError) {
      console.error('🧪 TEST-EMAIL-TEMPLATE: Error fetching template:', templateError)
      return res.status(500).json({ error: 'Failed to fetch email template' })
    }

    if (!template) {
      return res.status(404).json({ error: 'Email template not found for this trigger type' })
    }

    console.log('🧪 TEST-EMAIL-TEMPLATE: Template found:', {
      id: template.id,
      name: template.name,
      subject: template.subject,
      is_active: template.is_active
    })

    // Replace template variables with test data
    const testData = {
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      order_number: 'TEST-123456',
      order_total: '$99.99',
      order_date: new Date().toLocaleDateString(),
      order_items: 'Test Song Promotion Package',
      admin_order_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin#orders`
    }

    let subject = template.subject
    let htmlContent = template.html_content

    // Replace all template variables
    Object.entries(testData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value)
    })

    // Add test email header
    const testSubject = `[TEST EMAIL] ${subject}`
    const testHtmlContent = `
      <div style="background-color: #FEF3C7; border: 2px solid #F59E0B; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
        <h3 style="color: #92400E; margin: 0 0 10px 0;">🧪 TEST EMAIL</h3>
        <p style="color: #92400E; margin: 0; font-size: 14px;">
          This is a test email for the "${template.name}" template (${trigger_type}).
          <br>Template variables have been replaced with sample data.
        </p>
      </div>
      ${htmlContent}
    `

    console.log('🧪 TEST-EMAIL-TEMPLATE: Sending test email to:', adminEmail)

    // Send the test email using MailJet (same as EmailService)
    const result = await sendMailJetEmail(adminEmail, testSubject, testHtmlContent)

    if (!result.success) {
      console.error('🧪 TEST-EMAIL-TEMPLATE: Failed to send email:', result.error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send test email',
        details: result.error 
      })
    }

    console.log('🧪 TEST-EMAIL-TEMPLATE: Test email sent successfully')

    res.status(200).json({ 
      success: true, 
      message: `Test email sent successfully to ${adminEmail}`,
      template: {
        name: template.name,
        trigger_type: trigger_type,
        sent_to: adminEmail
      },
      details: result.result 
    })

  } catch (error: any) {
    console.error('🧪 TEST-EMAIL-TEMPLATE: Unexpected error:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    })
  }
}

// MailJet email sending function (copied from EmailService)
async function sendMailJetEmail(to: string, subject: string, htmlContent: string): Promise<{ success: boolean; messageId?: string; status?: string; error?: any }> {
  try {
    const apiKey = process.env.MAILJET_API_KEY;
    const secretKey = process.env.MAILJET_SECRET_KEY;
    const fromEmail = process.env.MAILJET_FROM_EMAIL || 'support@fasho.pro';

    console.log('🔧 TEST-MAILJET: Environment check:', {
      hasApiKey: !!apiKey,
      hasSecretKey: !!secretKey,
      fromEmail,
      apiKeyLength: apiKey?.length,
      secretKeyLength: secretKey?.length
    });

    if (!apiKey || !secretKey) {
      throw new Error('MailJet API credentials not configured');
    }

    // Create the MailJet payload
    const payload = {
      Messages: [
        {
          From: {
            Email: fromEmail,
            Name: "FASHO"
          },
          To: [
            {
              Email: to,
              Name: to
            }
          ],
          Subject: subject,
          HTMLPart: htmlContent,
          CustomID: `test-email-${Date.now()}`
        }
      ]
    };

    console.log('🔧 TEST-MAILJET: Payload created:', {
      to,
      subject,
      from: fromEmail,
      hasContent: !!htmlContent
    });

    console.log('🔧 TEST-MAILJET: Full payload:', JSON.stringify(payload, null, 2));

    // Make the API call
    console.log('🔧 TEST-MAILJET: Making API call to https://api.mailjet.com/v3.1/send');
    
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`
      },
      body: JSON.stringify(payload)
    });

    console.log('🔧 TEST-MAILJET: Response status:', response.status);
    console.log('🔧 TEST-MAILJET: Response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log('🔧 TEST-MAILJET: Response body:', responseData);

    if (!response.ok) {
      throw new Error(`MailJet API error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    if (responseData.Messages && responseData.Messages[0]) {
      const message = responseData.Messages[0];
      
      if (message.Status === 'success') {
        console.log('✅ TEST-MAILJET: Email sent successfully');
        console.log('📧 TEST-MAILJET: Message ID:', message.To[0]?.MessageID || 'Unknown');
        console.log('📧 TEST-MAILJET: Status:', message.Status);
        
        return {
          success: true,
          messageId: message.To[0]?.MessageID || message.CustomID,
          status: message.Status
        };
      } else {
        throw new Error(`MailJet send failed: ${message.Status}`);
      }
    } else {
      throw new Error('Invalid MailJet response format');
    }

  } catch (error) {
    console.error('❌ TEST-MAILJET: Send failed:', error);
    return {
      success: false,
      error
    };
  }
}

export default requireAdminAuth(handler) 