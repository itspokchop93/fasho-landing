import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../utils/supabase/server'
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth'

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const supabase = createAdminClient()

  try {
    console.log('🔍 EMAIL-TABLES-CHECK: Starting diagnostic check...')

    const results: any = {
      email_templates: { exists: false, count: 0, error: null },
      email_notification_settings: { exists: false, count: 0, error: null },
      admin_settings: { exists: false, count: 0, error: null }
    }

    // Check email_templates table
    try {
      const { data: templates, error: templatesError } = await supabase
        .from('email_templates')
        .select('id')
        .limit(1)

      if (templatesError) {
        results.email_templates.error = templatesError.message
        console.log('🔍 EMAIL-TABLES-CHECK: email_templates error:', templatesError)
      } else {
        results.email_templates.exists = true
        
        // Get count
        const { count, error: countError } = await supabase
          .from('email_templates')
          .select('*', { count: 'exact', head: true })
        
        if (!countError) {
          results.email_templates.count = count || 0
        }
      }
    } catch (err) {
      results.email_templates.error = (err as Error).message
    }

    // Check email_notification_settings table
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('email_notification_settings')
        .select('id')
        .limit(1)

      if (settingsError) {
        results.email_notification_settings.error = settingsError.message
        console.log('🔍 EMAIL-TABLES-CHECK: email_notification_settings error:', settingsError)
      } else {
        results.email_notification_settings.exists = true
        
        // Get count
        const { count, error: countError } = await supabase
          .from('email_notification_settings')
          .select('*', { count: 'exact', head: true })
        
        if (!countError) {
          results.email_notification_settings.count = count || 0
        }
      }
    } catch (err) {
      results.email_notification_settings.error = (err as Error).message
    }

    // Check admin_settings table
    try {
      const { data: adminSettings, error: adminError } = await supabase
        .from('admin_settings')
        .select('id')
        .limit(1)

      if (adminError) {
        results.admin_settings.error = adminError.message
        console.log('🔍 EMAIL-TABLES-CHECK: admin_settings error:', adminError)
      } else {
        results.admin_settings.exists = true
        
        // Get count
        const { count, error: countError } = await supabase
          .from('admin_settings')
          .select('*', { count: 'exact', head: true })
        
        if (!countError) {
          results.admin_settings.count = count || 0
        }
      }
    } catch (err) {
      results.admin_settings.error = (err as Error).message
    }

    console.log('🔍 EMAIL-TABLES-CHECK: Diagnostic results:', results)

    res.status(200).json({ 
      success: true,
      tables: results,
      summary: {
        all_tables_exist: results.email_templates.exists && 
                         results.email_notification_settings.exists && 
                         results.admin_settings.exists,
        missing_tables: Object.keys(results).filter(table => !results[table].exists)
      }
    })

  } catch (error: any) {
    console.error('🔍 EMAIL-TABLES-CHECK: Unexpected error:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    })
  }
}

export default requireAdminAuth(handler) 