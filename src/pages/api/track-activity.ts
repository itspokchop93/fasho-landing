import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../utils/supabase/server'
import { v4 as uuidv4 } from 'uuid'

// Helper function to get client IP address with better detection
function getClientIP(req: NextApiRequest): string {
  // Check for various IP headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip', 
    'x-client-ip',
    'x-forwarded',
    'x-cluster-client-ip',
    'forwarded-for',
    'forwarded'
  ]
  
  for (const header of headers) {
    const value = req.headers[header] as string
    if (value) {
      // Handle comma-separated IPs (take the first one)
      const ip = value.split(',')[0].trim()
      if (ip && ip !== '::1' && ip !== '127.0.0.1') {
        return ip
      }
    }
  }
  
  // Fallback to socket address
  const socketIP = req.socket.remoteAddress
  if (socketIP && socketIP !== '::1' && socketIP !== '127.0.0.1') {
    return socketIP
  }
  
  // For localhost development, return a valid IP format
  if (process.env.NODE_ENV === 'development') {
    return '127.0.0.1' // Use valid IP format instead of 'localhost'
  }
  
  // Final fallback
  return '127.0.0.1' // Use valid IP format instead of 'unknown'
}

// Helper function to generate session ID from cookies or create new one
function getOrCreateSessionId(req: NextApiRequest, res: NextApiResponse): string {
  const existingSessionId = req.cookies.active_session_id
  
  if (existingSessionId) {
    return existingSessionId
  }
  
  // Generate new session ID
  const newSessionId = uuidv4()
  
  // Set cookie for future requests
  res.setHeader('Set-Cookie', `active_session_id=${newSessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`)
  
  return newSessionId
}

// Helper function to truncate page URL if it's too long
function truncatePageUrl(pageUrl: string, maxLength: number = 1000): string {
  if (pageUrl.length <= maxLength) {
    return pageUrl
  }
  
  // If it has query parameters, try to keep the base path
  if (pageUrl.includes('?')) {
    const basePath = pageUrl.split('?')[0]
    if (basePath.length <= maxLength - 3) {
      return basePath + '...'
    }
  }
  
  // Truncate and add ellipsis
  return pageUrl.substring(0, maxLength - 3) + '...'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { currentPage, userAgent } = req.body
    
    if (!currentPage) {
      return res.status(400).json({ error: 'Current page is required' })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()
    
    // Get or create session ID (this will set cookie if new)
    const sessionId = getOrCreateSessionId(req, res)
    
    // Get client IP with improved detection
    const clientIP = getClientIP(req)
    
    // Get user info if authenticated (using regular client for auth)
    const { createClient } = require('../../utils/supabase/server')
    const authClient = createClient(req, res)
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    
    if (userError && process.env.NODE_ENV === 'development') {
      console.warn('👥 TRACK-ACTIVITY: User auth error (non-critical):', userError)
    }
    
    // Truncate the page URL to prevent database errors
    const truncatedPage = truncatePageUrl(currentPage)
    
    // Prepare user data
    let userData = {
      session_id: sessionId,
      ip_address: clientIP,
      user_agent: userAgent || req.headers['user-agent'] || 'unknown',
      current_page: truncatedPage,
      last_activity: new Date().toISOString(),
      is_guest: !user,
      user_id: user?.id || null,
      first_name: null as string | null,
      last_name: null as string | null,
      email: null as string | null
    }
    
    // If user is authenticated, get user details
    if (user) {
      // Extract name from user metadata or email
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
      const nameParts = fullName.split(' ')
      
      userData.first_name = nameParts[0] || 'User'
      userData.last_name = nameParts.slice(1).join(' ') || null
      userData.email = user.email
      userData.is_guest = false
    }
    
    // Log the tracking attempt for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('👥 TRACK-ACTIVITY: Tracking page:', {
        sessionId,
        page: currentPage,
        truncatedPage,
        ip: clientIP,
        isGuest: userData.is_guest
      })
    }
    
    // Upsert active user record with better error handling
    const { error: upsertError } = await supabase
      .from('active_users')
      .upsert(userData, {
        onConflict: 'session_id',
        ignoreDuplicates: false
      })
    
    if (upsertError) {
      console.error('👥 TRACK-ACTIVITY: Error upserting active user:', upsertError)
      
      // If it's a field length error, try with a shorter URL
      if (upsertError.code === '22001') {
        console.log('👥 TRACK-ACTIVITY: Retrying with shorter URL...')
        userData.current_page = truncatePageUrl(currentPage, 500)
        
        const { error: retryError } = await supabase
          .from('active_users')
          .upsert(userData, {
            onConflict: 'session_id',
            ignoreDuplicates: false
          })
        
        if (retryError) {
          console.error('👥 TRACK-ACTIVITY: Retry also failed:', retryError)
          return res.status(500).json({ error: 'Failed to track activity' })
        }
      } else {
        return res.status(500).json({ error: 'Failed to track activity' })
      }
    }
    
    // Track daily visit (only for non-localhost IPs)
    if (clientIP !== '127.0.0.1' && clientIP !== 'localhost' && clientIP !== 'unknown') {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      const { error: visitError } = await supabase.rpc('upsert_daily_visit', {
        visit_date: today,
        visitor_ip: clientIP
      })
      
      if (visitError && process.env.NODE_ENV === 'development') {
        console.error('👥 TRACK-ACTIVITY: Error tracking daily visit:', visitError)
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      sessionId,
      tracked: true,
      ip: clientIP,
      page: truncatedPage
    })
    
  } catch (error) {
    console.error('👥 TRACK-ACTIVITY: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 