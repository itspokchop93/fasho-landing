import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res)

  try {
    console.log('📧 EMAIL-SETTINGS-API: Starting request processing...')
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('📧 EMAIL-SETTINGS-API: Auth check result:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      authError: authError?.message 
    })
    
    if (authError || !user) {
      console.log('📧 EMAIL-SETTINGS-API: Authentication failed')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('📧 EMAIL-SETTINGS-API: Processing', req.method, 'request')

    switch (req.method) {
      case 'GET':
        return await getEmailSettings(supabase, res)
      case 'PUT':
        return await updateEmailSettings(supabase, req, res)
      default:
        console.log('📧 EMAIL-SETTINGS-API: Method not allowed:', req.method)
        res.setHeader('Allow', ['GET', 'PUT'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error: any) {
    console.error('📧 EMAIL-SETTINGS-API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getEmailSettings(supabase: any, res: NextApiResponse) {
  try {
    console.log('📧 EMAIL-SETTINGS-GET: Fetching email notification settings...')
    
    const { data: settings, error } = await supabase
      .from('email_notification_settings')
      .select('*')
      .order('trigger_type', { ascending: true })

    if (error) {
      console.error('📧 EMAIL-SETTINGS-GET: Database query failed:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      if (error.code === '42P01') {
        return res.status(500).json({ 
          error: 'Email notification settings table does not exist',
          details: 'Please run the email system migration SQL in your Supabase database',
          code: 'TABLE_NOT_EXISTS'
        })
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch email settings',
        details: error.message,
        code: error.code
      })
    }

    console.log('📧 EMAIL-SETTINGS-GET: Successfully fetched settings:', {
      count: settings?.length || 0,
      settings: settings?.map((s: any) => ({ 
        trigger_type: s.trigger_type, 
        is_active: s.is_active,
        template_id: s.template_id
      })) || []
    })

    res.status(200).json({ settings: settings || [] })
  } catch (error: any) {
    console.error('📧 EMAIL-SETTINGS-GET: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function updateEmailSettings(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('📧 EMAIL-SETTINGS-UPDATE: Starting update process...')
    const { trigger_type, is_active, template_id } = req.body

    console.log('📧 EMAIL-SETTINGS-UPDATE: Request data:', {
      triggerType: trigger_type,
      isActive: is_active,
      templateId: template_id
    })

    if (!trigger_type) {
      return res.status(400).json({ error: 'trigger_type is required' })
    }

    // Check if setting exists
    const { data: existingSetting, error: checkError } = await supabase
      .from('email_notification_settings')
      .select('id, trigger_type')
      .eq('trigger_type', trigger_type)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('📧 EMAIL-SETTINGS-UPDATE: Error checking existing setting:', checkError)
      return res.status(500).json({ error: 'Failed to check existing setting' })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (is_active !== undefined) updateData.is_active = is_active
    if (template_id !== undefined) updateData.template_id = template_id

    if (existingSetting) {
      // Update existing setting
      console.log('📧 EMAIL-SETTINGS-UPDATE: Updating existing setting:', existingSetting.id)
      
      const { data, error } = await supabase
        .from('email_notification_settings')
        .update(updateData)
        .eq('id', existingSetting.id)
        .select()
        .single()

      if (error) {
        console.error('📧 EMAIL-SETTINGS-UPDATE: Update failed:', error)
        return res.status(500).json({ 
          error: 'Failed to update email setting',
          details: error.message,
          code: error.code
        })
      }

      console.log('📧 EMAIL-SETTINGS-UPDATE: Successfully updated setting:', data.id)
      res.status(200).json({ setting: data })
    } else {
      // Create new setting
      console.log('📧 EMAIL-SETTINGS-UPDATE: Creating new setting for:', trigger_type)
      
      const { data, error } = await supabase
        .from('email_notification_settings')
        .insert({
          trigger_type,
          is_active: is_active || false,
          template_id: template_id || null,
          total_sent: 0
        })
        .select()
        .single()

      if (error) {
        console.error('📧 EMAIL-SETTINGS-UPDATE: Create failed:', error)
        return res.status(500).json({ 
          error: 'Failed to create email setting',
          details: error.message,
          code: error.code
        })
      }

      console.log('📧 EMAIL-SETTINGS-UPDATE: Successfully created setting:', data.id)
      res.status(201).json({ setting: data })
    }
  } catch (error: any) {
    console.error('📧 EMAIL-SETTINGS-UPDATE: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 