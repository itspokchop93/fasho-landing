interface FreshdeskTicketRequest {
  name: string
  email: string
  subject: string
  description: string
  priority?: number
  status?: number
  type?: string
  source?: number
}

interface FreshdeskTicketResponse {
  success: boolean
  ticketId?: number
  error?: string
  details?: any
}

export class FreshdeskService {
  private static instance: FreshdeskService
  private readonly apiKey: string
  private readonly domain: string
  private readonly baseUrl: string

  private constructor() {
    this.apiKey = process.env.FRESHDESK_API_KEY || ''
    this.domain = process.env.FRESHDESK_DOMAIN || ''
    this.baseUrl = `https://${this.domain}.freshdesk.com`
    
    if (!this.apiKey || !this.domain) {
      console.error('🚨 FRESHDESK: Missing required environment variables')
      console.error('🚨 FRESHDESK: FRESHDESK_API_KEY:', !!this.apiKey)
      console.error('🚨 FRESHDESK: FRESHDESK_DOMAIN:', !!this.domain)
    }
  }

  public static getInstance(): FreshdeskService {
    if (!FreshdeskService.instance) {
      FreshdeskService.instance = new FreshdeskService()
    }
    return FreshdeskService.instance
  }

  /**
   * Create a new support ticket in FreshDesk
   */
  public async createTicket(ticketData: FreshdeskTicketRequest): Promise<FreshdeskTicketResponse> {
    try {
      console.log('🎫 FRESHDESK: Creating new ticket:', {
        name: ticketData.name,
        email: ticketData.email,
        subject: ticketData.subject,
        descriptionLength: ticketData.description.length
      })

      if (!this.apiKey || !this.domain) {
        throw new Error('FreshDesk configuration missing')
      }

      // Prepare the ticket payload according to FreshDesk API
      const payload = {
        name: ticketData.name,
        email: ticketData.email,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority || 1, // 1=Low, 2=Medium, 3=High, 4=Urgent
        status: ticketData.status || 2, // 2=Open, 3=Pending, 4=Resolved, 5=Closed
        type: ticketData.type || 'Question', // Question, Incident, Problem, Feature Request
        source: ticketData.source || 2, // 1=Email, 2=Portal, 3=Phone, 7=Chat, 9=Feedback Widget, 10=Outbound Email
      }

      console.log('🎫 FRESHDESK: API payload:', payload)

      // Create Authorization header (API Key + 'X' as password, base64 encoded)
      const auth = Buffer.from(`${this.apiKey}:X`).toString('base64')

      const response = await fetch(`${this.baseUrl}/api/v2/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      console.log('🎫 FRESHDESK: API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🚨 FRESHDESK: API error response:', errorText)
        
        let errorMessage = 'Failed to create support ticket'
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map((err: any) => err.message || err.code).join(', ')
          } else if (errorData.description) {
            errorMessage = errorData.description
          }
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${errorText}`
        }

        return {
          success: false,
          error: errorMessage,
          details: errorText
        }
      }

      const responseData = await response.json()
      console.log('✅ FRESHDESK: Ticket created successfully:', {
        id: responseData.id,
        subject: responseData.subject,
        status: responseData.status
      })

      return {
        success: true,
        ticketId: responseData.id,
        details: responseData
      }

    } catch (error) {
      console.error('🚨 FRESHDESK: Service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      }
    }
  }

  /**
   * Test the FreshDesk API connection
   */
  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.apiKey || !this.domain) {
        return { success: false, error: 'FreshDesk configuration missing' }
      }

      const auth = Buffer.from(`${this.apiKey}:X`).toString('base64')
      
      // Test with a simple API call to get account info
      const response = await fetch(`${this.baseUrl}/api/v2/account`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        console.log('✅ FRESHDESK: Connection test successful')
        return { success: true }
      } else {
        const errorText = await response.text()
        console.error('🚨 FRESHDESK: Connection test failed:', errorText)
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }

    } catch (error) {
      console.error('🚨 FRESHDESK: Connection test error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      }
    }
  }
}

export const freshdeskService = FreshdeskService.getInstance() 