import { NextApiRequest, NextApiResponse } from 'next'
import { freshdeskService } from '@/utils/freshdesk/freshdeskService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    console.log('🧪 FRESHDESK-TEST: Starting FreshDesk integration test')

    // Test connection first
    const connectionTest = await freshdeskService.testConnection()
    
    if (!connectionTest.success) {
      return res.status(500).json({
        success: false,
        error: 'FreshDesk connection failed',
        details: connectionTest.error
      })
    }

    console.log('✅ FRESHDESK-TEST: Connection test passed')

    // Create a test ticket
    const testTicketData = {
      name: 'FASHO Test User',
      email: 'test@fasho.co',
      subject: '[TEST] FreshDesk Integration Test',
      description: `
<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h3>🧪 FreshDesk Integration Test</h3>
  
  <p>This is an automated test ticket to verify the FreshDesk API integration is working correctly.</p>
  
  <p><strong>Test Details:</strong></p>
  <ul>
    <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
    <li><strong>Source:</strong> FASHO Dashboard Test API</li>
    <li><strong>Integration Status:</strong> ✅ Active</li>
  </ul>
  
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
  
  <p style="color: #666; font-size: 12px;">
    This ticket can be safely closed. It was created automatically to test the integration.
  </p>
</div>
      `.trim(),
      priority: 1, // Low priority for test
      type: 'Question'
    }

    const result = await freshdeskService.createTicket(testTicketData)

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create test ticket',
        details: result.error
      })
    }

    console.log('✅ FRESHDESK-TEST: Test ticket created successfully:', result.ticketId)

    return res.status(200).json({
      success: true,
      message: 'FreshDesk integration test completed successfully',
      connectionTest: connectionTest,
      testTicket: {
        id: result.ticketId,
        created: true
      }
    })

  } catch (error) {
    console.error('🚨 FRESHDESK-TEST: Test failed:', error)
    return res.status(500).json({
      success: false,
      error: 'FreshDesk integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 