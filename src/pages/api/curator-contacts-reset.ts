import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required field: userId' 
      })
    }

    console.log('🎵 CURATOR-CONTACTS-RESET-API: Resetting contacted curators for user:', userId)

    const supabase = createAdminClient()

    // First, check if the table exists and has data
    const { data: existingData, error: checkError } = await supabase
      .from('curator_contacts')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (checkError) {
      console.error('🚨 CURATOR-CONTACTS-RESET-API: Error checking table:', checkError)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to check contacted curators',
        details: checkError.message
      })
    }

    console.log('🎵 CURATOR-CONTACTS-RESET-API: Found existing data:', existingData?.length || 0, 'records')

    // If no data exists, return success
    if (!existingData || existingData.length === 0) {
      console.log('🎵 CURATOR-CONTACTS-RESET-API: No data to reset')
      return res.status(200).json({ 
        success: true,
        message: 'No contacted curators to reset'
      })
    }

    // Delete all contacted curators for this user
    const { error } = await supabase
      .from('curator_contacts')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('🚨 CURATOR-CONTACTS-RESET-API: Database error:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to reset contacted curators',
        details: error.message
      })
    }

    console.log('✅ CURATOR-CONTACTS-RESET-API: Successfully reset contacted curators')

    res.status(200).json({ 
      success: true,
      message: 'Contacted curators reset successfully'
    })

  } catch (error) {
    console.error('🚨 CURATOR-CONTACTS-RESET-API: Error resetting contacted curators:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to reset contacted curators',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 