import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../utils/supabase/server'
import { requireAdminRole, AdminUser } from '../../../utils/admin/auth'

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  const supabase = createAdminClient()

  try {
    console.log('📧 EMAIL-TEMPLATES-API: Starting request processing...')
    console.log('📧 EMAIL-TEMPLATES-API: Admin user:', adminUser.email)

    console.log('📧 EMAIL-TEMPLATES-API: Processing', req.method, 'request')

    switch (req.method) {
      case 'GET':
        return await getEmailTemplates(supabase, req, res)
      case 'POST':
        return await createEmailTemplate(supabase, req, res)
      case 'PUT':
        return await updateEmailTemplate(supabase, req, res)
      case 'DELETE':
        return await deleteEmailTemplate(supabase, req, res)
      default:
        console.log('📧 EMAIL-TEMPLATES-API: Method not allowed:', req.method)
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error: any) {
    console.error('📧 EMAIL-TEMPLATES-API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getEmailTemplates(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('📧 EMAIL-TEMPLATES-GET: Fetching all email templates')
    
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('📧 EMAIL-TEMPLATES-GET: Database query failed:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      if (error.code === '42P01') {
        return res.status(500).json({ 
          error: 'Email templates table does not exist',
          details: 'Please run the email system migration SQL in your Supabase database',
          code: 'TABLE_NOT_EXISTS'
        })
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch email templates',
        details: error.message,
        code: error.code
      })
    }

    console.log('📧 EMAIL-TEMPLATES-GET: Successfully fetched templates:', {
      count: templates?.length || 0,
      templates: templates?.map((t: any) => ({ 
        id: t.id, 
        name: t.name, 
        trigger_type: t.trigger_type, 
        is_active: t.is_active 
      })) || []
    })

    res.status(200).json({ templates: templates || [] })
  } catch (error: any) {
    console.error('📧 EMAIL-TEMPLATES-GET: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function createEmailTemplate(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('📧 EMAIL-TEMPLATE-CREATE: Starting create process...')
    const { name, subject, html_content, trigger_type, is_active } = req.body

    console.log('📧 EMAIL-TEMPLATE-CREATE: Request data:', {
      name: name,
      subject: subject?.substring(0, 50) + '...',
      htmlContentLength: html_content?.length || 0,
      triggerType: trigger_type,
      isActive: is_active
    })

    if (!name || !subject || !html_content || !trigger_type) {
      console.log('📧 EMAIL-TEMPLATE-CREATE: Missing required fields')
      return res.status(400).json({ error: 'Missing required fields: name, subject, html_content, trigger_type' })
    }

    // Check if template with this trigger_type already exists
    const { data: existingTemplate, error: checkError } = await supabase
      .from('email_templates')
      .select('id, trigger_type')
      .eq('trigger_type', trigger_type)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('📧 EMAIL-TEMPLATE-CREATE: Error checking existing template:', checkError)
      return res.status(500).json({ error: 'Failed to check existing template' })
    }

    if (existingTemplate) {
      console.log('📧 EMAIL-TEMPLATE-CREATE: Template already exists, updating instead...')
      // Update existing template
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          name,
          subject,
          html_content,
          is_active: is_active || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTemplate.id)
        .select()
        .single()

      if (error) {
        console.error('📧 EMAIL-TEMPLATE-CREATE: Update failed:', error)
        return res.status(500).json({ error: 'Failed to update existing template' })
      }

      console.log('📧 EMAIL-TEMPLATE-CREATE: Successfully updated existing template:', data.id)
      return res.status(200).json({ template: data })
    }

    // Create new template
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name,
        subject,
        html_content,
        trigger_type,
        is_active: is_active || false
      })
      .select()
      .single()

    if (error) {
      console.error('📧 EMAIL-TEMPLATE-CREATE: Database insert failed:', error)
      return res.status(500).json({ 
        error: 'Failed to create email template',
        details: error.message,
        code: error.code
      })
    }

    console.log('📧 EMAIL-TEMPLATE-CREATE: Successfully created template:', data.id)
    res.status(201).json({ template: data })
  } catch (error: any) {
    console.error('📧 EMAIL-TEMPLATE-CREATE: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function updateEmailTemplate(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('📧 EMAIL-TEMPLATE-UPDATE: Starting update process...')
    const { id, name, subject, html_content, trigger_type, is_active } = req.body

    console.log('📧 EMAIL-TEMPLATE-UPDATE: Request data:', {
      hasId: !!id,
      id: id,
      name: name,
      subject: subject?.substring(0, 50) + '...',
      htmlContentLength: html_content?.length || 0,
      triggerType: trigger_type,
      isActive: is_active
    })

    // Determine how to identify the template
    let templateId = id;
    
    if (!templateId && trigger_type) {
      console.log('📧 EMAIL-TEMPLATE-UPDATE: No ID provided, searching by trigger_type:', trigger_type)
      
      const { data: existingTemplate, error: searchError } = await supabase
        .from('email_templates')
        .select('id')
        .eq('trigger_type', trigger_type)
        .maybeSingle()

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('📧 EMAIL-TEMPLATE-UPDATE: Error searching for template:', searchError)
        return res.status(500).json({ error: 'Failed to search for existing template' })
      }

      if (existingTemplate) {
        templateId = existingTemplate.id
        console.log('📧 EMAIL-TEMPLATE-UPDATE: Found existing template:', templateId)
      } else {
        console.log('📧 EMAIL-TEMPLATE-UPDATE: No existing template found, creating new one...')
        return await createEmailTemplate(supabase, req, res)
      }
    }

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID or trigger_type is required' })
    }

    // Build update data
    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (subject !== undefined) updateData.subject = subject
    if (html_content !== undefined) updateData.html_content = html_content
    if (trigger_type !== undefined) updateData.trigger_type = trigger_type
    if (is_active !== undefined) updateData.is_active = is_active

    console.log('📧 EMAIL-TEMPLATE-UPDATE: Updating template:', templateId)

    const { data, error } = await supabase
      .from('email_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('📧 EMAIL-TEMPLATE-UPDATE: Database update failed:', error)
      return res.status(500).json({ 
        error: 'Failed to update email template',
        details: error.message,
        code: error.code
      })
    }

    console.log('📧 EMAIL-TEMPLATE-UPDATE: Successfully updated template:', data.id)
    res.status(200).json({ template: data })
  } catch (error: any) {
    console.error('📧 EMAIL-TEMPLATE-UPDATE: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function deleteEmailTemplate(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('📧 EMAIL-TEMPLATE-DELETE: Starting delete process...')
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' })
    }

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('📧 EMAIL-TEMPLATE-DELETE: Database delete failed:', error)
      return res.status(500).json({ 
        error: 'Failed to delete email template',
        details: error.message
      })
    }

    console.log('📧 EMAIL-TEMPLATE-DELETE: Successfully deleted template:', id)
    res.status(200).json({ message: 'Template deleted successfully' })
  } catch (error: any) {
    console.error('📧 EMAIL-TEMPLATE-DELETE: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default requireAdminRole('admin')(handler);