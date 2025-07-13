import { NextApiRequest, NextApiResponse } from 'next'
import { freshdeskService } from '@/utils/freshdesk/freshdeskService'

interface ContactFormRequest {
  name: string
  email: string
  subject: string
  message: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    console.log('📞 CONTACT-SUPPORT: Processing contact form submission')
    
    const { name, email, subject, message }: ContactFormRequest = req.body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      console.error('📞 CONTACT-SUPPORT: Missing required fields:', {
        name: !!name,
        email: !!email,
        subject: !!subject,
        message: !!message
      })
      
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('📞 CONTACT-SUPPORT: Invalid email format:', email)
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      })
    }

    // Sanitize and prepare data for FreshDesk
    const ticketSubject = `[FASHO Support] ${subject}`
    const ticketDescription = `
<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h3>Support Request from FASHO Dashboard</h3>
  
  <p><strong>Customer Name:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Subject Category:</strong> ${subject}</p>
  
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
  
  <h4>Message:</h4>
  <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
    ${message.replace(/\n/g, '<br>')}
  </div>
  
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
  
  <p style="color: #666; font-size: 12px;">
    <strong>Source:</strong> FASHO Dashboard Contact Form<br>
    <strong>Submitted:</strong> ${new Date().toISOString()}<br>
    <strong>User Agent:</strong> ${req.headers['user-agent'] || 'Unknown'}
  </p>
</div>
    `.trim()

    console.log('📞 CONTACT-SUPPORT: Prepared ticket data:', {
      name,
      email,
      subject: ticketSubject,
      descriptionLength: ticketDescription.length
    })

    // Determine priority based on subject
    let priority = 1 // Default: Low
    if (subject.toLowerCase().includes('urgent') || subject.toLowerCase().includes('technical issue')) {
      priority = 3 // High
    } else if (subject.toLowerCase().includes('billing')) {
      priority = 2 // Medium
    }

    // Create ticket in FreshDesk
    const result = await freshdeskService.createTicket({
      name,
      email,
      subject: ticketSubject,
      description: ticketDescription,
      priority,
      type: 'Question',
      source: 2 // Portal
    })

    if (!result.success) {
      console.error('📞 CONTACT-SUPPORT: Failed to create FreshDesk ticket:', result.error)
      return res.status(500).json({
        success: false,
        error: 'Failed to submit support request. Please try again or email support@fasho.co directly.',
        details: result.error
      })
    }

    console.log('✅ CONTACT-SUPPORT: Successfully created FreshDesk ticket:', result.ticketId)

    return res.status(200).json({
      success: true,
      message: 'Support request submitted successfully',
      ticketId: result.ticketId
    })

  } catch (error) {
    console.error('🚨 CONTACT-SUPPORT: Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 