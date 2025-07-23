import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../utils/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 TEST-CURATOR-TABLE: Testing table access')
    
    const supabase = createClient(req, res)

    // Test 1: Check if table exists by trying to select from it
    const { data: tableTest, error: tableError } = await supabase
      .from('curator_contacts')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('🧪 TEST-CURATOR-TABLE: Table access error:', tableError)
      return res.status(500).json({ 
        success: false,
        error: 'Table access failed',
        details: tableError.message,
        code: tableError.code
      })
    }

    console.log('🧪 TEST-CURATOR-TABLE: Table exists, found', tableTest?.length || 0, 'records')

    // Test 2: Try to insert a test record
    const testRecord = {
      user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      curator_id: 999999, // Test curator ID
      contacted_at: new Date().toISOString(),
      contact_count: 1
    }

    const { data: insertTest, error: insertError } = await supabase
      .from('curator_contacts')
      .insert(testRecord)
      .select()

    if (insertError) {
      console.error('🧪 TEST-CURATOR-TABLE: Insert test error:', insertError)
      return res.status(500).json({ 
        success: false,
        error: 'Insert test failed',
        details: insertError.message,
        code: insertError.code
      })
    }

    console.log('🧪 TEST-CURATOR-TABLE: Insert test successful')

    // Test 3: Try to delete the test record
    const { error: deleteError } = await supabase
      .from('curator_contacts')
      .delete()
      .eq('user_id', '00000000-0000-0000-0000-000000000000')
      .eq('curator_id', 999999)

    if (deleteError) {
      console.error('🧪 TEST-CURATOR-TABLE: Delete test error:', deleteError)
      return res.status(500).json({ 
        success: false,
        error: 'Delete test failed',
        details: deleteError.message,
        code: deleteError.code
      })
    }

    console.log('🧪 TEST-CURATOR-TABLE: Delete test successful')

    res.status(200).json({ 
      success: true,
      message: 'All table operations successful',
      tableExists: true,
      canInsert: true,
      canDelete: true
    })

  } catch (error) {
    console.error('🧪 TEST-CURATOR-TABLE: Unexpected error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 