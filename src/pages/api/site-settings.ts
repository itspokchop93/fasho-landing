import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const supabase = createClient(req, res)

  try {
    console.log('🌐 SITE-SETTINGS: Fetching site settings...')
    
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['site_title', 'site_description'])

    if (error) {
      console.error('🌐 SITE-SETTINGS: Database query failed:', error)
      // Return defaults if database fails
      return res.status(200).json({
        success: true,
        settings: {
          site_title: 'FASHO.co – Promotion for Artists, Labels & Podcasters',
          site_description: 'Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career.'
        }
      })
    }

    // Convert array to object
    const settingsObj: { [key: string]: string } = {}
    settings?.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value
    })

    // Provide defaults if settings don't exist
    const siteSettings = {
      site_title: settingsObj.site_title || 'FASHO.co – Promotion for Artists, Labels & Podcasters',
      site_description: settingsObj.site_description || 'Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career.'
    }

    console.log('🌐 SITE-SETTINGS: Settings retrieved successfully')
    
    return res.status(200).json({
      success: true,
      settings: siteSettings
    })

  } catch (error: any) {
    console.error('🌐 SITE-SETTINGS: Unexpected error:', error)
    
    // Return defaults on error
    return res.status(200).json({
      success: true,
      settings: {
        site_title: 'FASHO.co – Promotion for Artists, Labels & Podcasters',
        site_description: 'Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career.'
      }
    })
  }
} 