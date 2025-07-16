import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../utils/supabase/server'
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth'

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  const supabase = createAdminClient()

  try {
    console.log('🔧 ADMIN-SETTINGS-API: Starting request processing...')
    console.log('🔧 ADMIN-SETTINGS-API: Admin user:', adminUser.email)

    console.log('🔧 ADMIN-SETTINGS-API: Processing', req.method, 'request')

    switch (req.method) {
      case 'GET':
        return await getAdminSettings(supabase, res)
      case 'PUT':
        return await updateAdminSettings(supabase, req, res)
      default:
        console.log('🔧 ADMIN-SETTINGS-API: Method not allowed:', req.method)
        res.setHeader('Allow', ['GET', 'PUT'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error: any) {
    console.error('🔧 ADMIN-SETTINGS-API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getAdminSettings(supabase: any, res: NextApiResponse) {
  try {
    console.log('🔧 ADMIN-SETTINGS-GET: Fetching admin settings...')
    
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('*')
      .order('setting_key', { ascending: true })

    if (error) {
      console.error('🔧 ADMIN-SETTINGS-GET: Database query failed:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      if (error.code === '42P01') {
        return res.status(500).json({ 
          error: 'Admin settings table does not exist',
          details: 'Please run the admin settings migration SQL in your Supabase database',
          code: 'TABLE_NOT_EXISTS'
        })
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch admin settings',
        details: error.message,
        code: error.code
      })
    }

    console.log('🔧 ADMIN-SETTINGS-GET: Successfully fetched settings:', {
      count: settings?.length || 0,
      settings: settings?.map((s: any) => ({ 
        setting_key: s.setting_key, 
        setting_value: s.setting_value?.length > 0 ? '[SET]' : '[EMPTY]'
      })) || []
    })

    // Convert array to object for easier frontend usage
    const settingsObject = settings?.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {}) || {}

    res.status(200).json({ settings: settingsObject })
  } catch (error: any) {
    console.error('🔧 ADMIN-SETTINGS-GET: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function updateAdminSettings(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔧 ADMIN-SETTINGS-UPDATE: Starting update process...')
    const { setting_key, setting_value } = req.body

    console.log('🔧 ADMIN-SETTINGS-UPDATE: Request data:', {
      settingKey: setting_key,
      hasValue: !!setting_value,
      valueLength: setting_value?.length || 0
    })

    if (!setting_key) {
      return res.status(400).json({ error: 'setting_key is required' })
    }

    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({ error: 'setting_value is required' })
    }

    // Update or insert the setting
    const { data, error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key,
        setting_value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single()

    if (error) {
      console.error('🔧 ADMIN-SETTINGS-UPDATE: Upsert failed:', error)
      return res.status(500).json({ 
        error: 'Failed to update admin setting',
        details: error.message,
        code: error.code
      })
    }

    console.log('🔧 ADMIN-SETTINGS-UPDATE: Successfully updated setting:', {
      id: data.id,
      setting_key: data.setting_key,
      hasValue: !!data.setting_value
    })

    res.status(200).json({ setting: data })
  } catch (error: any) {
    console.error('🔧 ADMIN-SETTINGS-UPDATE: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default requireAdminAuth(handler);