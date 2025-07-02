import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@/utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, token_hash, type, next = '/' } = req.query

  if (code) {
    // Handle OAuth callback
    const supabase = createClient(req, res)
    const { error } = await supabase.auth.exchangeCodeForSession(String(code))
    
    if (!error) {
      return res.redirect(String(next))
    }
  }

  if (token_hash && type) {
    // Handle email confirmation
    const supabase = createClient(req, res)
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash: String(token_hash),
    })
    
    if (!error) {
      return res.redirect(String(next))
    }
  }

  // Redirect to error page if authentication fails
  return res.redirect('/auth/error')
} 