import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create server-side client with request context
    const supabase = createClient(req, res)
    
    // Sign out the user
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Server-side sign out error:', error)
      return res.status(500).json({ error: 'Failed to sign out' })
    }

    // Clear all auth-related cookies
    // Supabase typically uses cookies with project-specific names
    const cookiesToClear = [
      'supabase-auth-token',
      'supabase.auth.token',
      'sb-auth-token',
      'sb-refresh-token'
    ]

    // Also clear any cookies that start with 'sb-' (Supabase project-specific cookies)
    const allCookies = req.headers.cookie ? req.headers.cookie.split(';') : []
    const supabaseCookies = allCookies
      .map(cookie => cookie.trim().split('=')[0])
      .filter(name => name.startsWith('sb-') || name.includes('supabase'))

    const allCookiesToClear = [...cookiesToClear, ...supabaseCookies]

    // Clear each cookie with multiple variations to ensure complete removal
    allCookiesToClear.forEach(cookieName => {
      res.setHeader('Set-Cookie', [
        `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`,
        `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`,
        `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`,
        `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`,
        `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure`,
        `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure`
      ])
    })

    console.log('🔐 SERVER-SIGNOUT: Cleared cookies:', allCookiesToClear)

    console.log('🔐 SERVER-SIGNOUT: User signed out successfully')
    return res.status(200).json({ success: true })
    
  } catch (error) {
    console.error('Server-side sign out error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 