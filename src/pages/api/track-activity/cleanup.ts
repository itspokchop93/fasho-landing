import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let sessionId: string

    // Handle both regular POST requests and sendBeacon requests
    if (req.headers['content-type']?.includes('application/json')) {
      // Regular JSON request
      const { sessionId: bodySessionId } = req.body
      sessionId = bodySessionId
    } else {
      // sendBeacon request (Blob data)
      const text = await new Promise<string>((resolve) => {
        let data = ''
        req.on('data', chunk => {
          data += chunk.toString()
        })
        req.on('end', () => {
          resolve(data)
        })
      })
      
      try {
        const parsed = JSON.parse(text)
        sessionId = parsed.sessionId
      } catch (error) {
        console.error('👥 CLEANUP: Error parsing sendBeacon data:', error)
        return res.status(400).json({ error: 'Invalid request data' })
      }
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()
    
    // Remove the user from active_users table
    const { error: deleteError } = await supabase
      .from('active_users')
      .delete()
      .eq('session_id', sessionId)
    
    if (deleteError) {
      console.error('👥 CLEANUP: Error removing user from active users:', deleteError)
      return res.status(500).json({ error: 'Failed to cleanup user' })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('👥 CLEANUP: User removed from active users:', sessionId)
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'User cleanup completed',
      sessionId
    })
    
  } catch (error) {
    console.error('👥 CLEANUP: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 