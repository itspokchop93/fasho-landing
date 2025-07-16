import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../utils/supabase/server'
import { requireAdminAuth } from '../../../utils/admin/auth'

export default requireAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser: any) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧹 CLEANUP-API: Manual cleanup triggered by admin:', adminUser.email)
    
    const supabase = createClient(req, res)
    
    // Get count of users before cleanup
    const { count: beforeCount, error: beforeError } = await supabase
      .from('active_users')
      .select('*', { count: 'exact', head: true })
    
    if (beforeError) {
      console.warn('🧹 CLEANUP-API: Error getting before count:', beforeError)
    }
    
    // Run cleanup function
    const { error: cleanupError } = await supabase.rpc('cleanup_inactive_users')
    
    if (cleanupError) {
      console.error('🧹 CLEANUP-API: Error during cleanup:', cleanupError)
      return res.status(500).json({ error: 'Failed to cleanup inactive users' })
    }
    
    // Get count of users after cleanup
    const { count: afterCount, error: afterError } = await supabase
      .from('active_users')
      .select('*', { count: 'exact', head: true })
    
    if (afterError) {
      console.warn('🧹 CLEANUP-API: Error getting after count:', afterError)
    }
    
    const removedCount = (beforeCount || 0) - (afterCount || 0)
    
    console.log('🧹 CLEANUP-API: Cleanup completed. Removed', removedCount, 'inactive users')
    
    return res.status(200).json({
      success: true,
      message: 'Cleanup completed successfully',
      removed: removedCount,
      beforeCount: beforeCount || 0,
      afterCount: afterCount || 0
    })
    
  } catch (error) {
    console.error('🧹 CLEANUP-API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) 