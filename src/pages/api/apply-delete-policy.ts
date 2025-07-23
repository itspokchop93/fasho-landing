import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔧 APPLY-DELETE-POLICY: Applying DELETE policy to curator_contacts table')
    
    const supabase = createAdminClient()

    // Apply the DELETE policy
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can delete their own curator contacts" ON curator_contacts
        FOR DELETE USING (auth.uid() = user_id);
      `
    })

    if (error) {
      console.error('🔧 APPLY-DELETE-POLICY: Error applying policy:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to apply DELETE policy',
        details: error.message
      })
    }

    console.log('✅ APPLY-DELETE-POLICY: Successfully applied DELETE policy')

    res.status(200).json({ 
      success: true,
      message: 'DELETE policy applied successfully'
    })

  } catch (error) {
    console.error('🔧 APPLY-DELETE-POLICY: Unexpected error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 