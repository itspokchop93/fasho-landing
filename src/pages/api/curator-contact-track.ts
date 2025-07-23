import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { curatorId, userId } = req.body

    if (!curatorId || !userId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: curatorId and userId' 
      })
    }

    console.log('🎵 CURATOR-CONTACT-TRACK-API: Tracking contact for curator:', curatorId, 'by user:', userId)

    const supabase = createClient(req, res)

    // Insert or update contact tracking
    const { data, error } = await supabase
      .from('curator_contacts')
      .upsert({
        user_id: userId,
        curator_id: curatorId,
        contacted_at: new Date().toISOString(),
        contact_count: 1
      }, {
        onConflict: 'user_id,curator_id'
      })

    if (error) {
      console.error('🚨 CURATOR-CONTACT-TRACK-API: Database error:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to track contact' 
      })
    }

    console.log('✅ CURATOR-CONTACT-TRACK-API: Successfully tracked contact')

    res.status(200).json({ 
      success: true,
      message: 'Contact tracked successfully'
    })

  } catch (error) {
    console.error('🚨 CURATOR-CONTACT-TRACK-API: Error tracking contact:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to track contact',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 