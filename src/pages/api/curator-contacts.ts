import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

    console.log('🎵 CURATOR-CONTACTS-API: Fetching contacted curators for user:', userId)

    const supabase = createClient(req, res)

    // Get user's contacted curators
    const { data, error } = await supabase
      .from('curator_contacts')
      .select('curator_id, contacted_at, contact_count')
      .eq('user_id', userId)

    if (error) {
      console.error('🚨 CURATOR-CONTACTS-API: Database error:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch contacted curators' 
      })
    }

    // Create a map of curator_id to contact info
    const contactedCurators = data.reduce((acc: Record<number, any>, contact: any) => {
      acc[contact.curator_id] = {
        contacted: true,
        contactedAt: contact.contacted_at,
        contactCount: contact.contact_count
      }
      return acc
    }, {} as Record<number, any>)

    console.log(`✅ CURATOR-CONTACTS-API: Successfully fetched ${data.length} contacted curators`)

    res.status(200).json({ 
      success: true,
      data: contactedCurators
    })

  } catch (error) {
    console.error('🚨 CURATOR-CONTACTS-API: Error fetching contacted curators:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch contacted curators',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 