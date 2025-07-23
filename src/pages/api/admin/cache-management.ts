import { NextApiRequest, NextApiResponse } from 'next'
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth'
import cache from '../../../utils/cache'

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  try {
    console.log('🧹 CACHE-MANAGEMENT-API: Starting request processing...')
    console.log('🧹 CACHE-MANAGEMENT-API: Admin user:', adminUser.email)

    console.log('🧹 CACHE-MANAGEMENT-API: Processing', req.method, 'request')

    switch (req.method) {
      case 'GET':
        return await getCacheStats(res)
      case 'POST':
        return await clearCache(req, res)
      default:
        console.log('🧹 CACHE-MANAGEMENT-API: Method not allowed:', req.method)
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error: any) {
    console.error('🧹 CACHE-MANAGEMENT-API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getCacheStats(res: NextApiResponse) {
  try {
    console.log('🧹 CACHE-MANAGEMENT-GET: Fetching cache statistics...')
    
    const stats = cache.getStats()
    
    // Group keys by type for better organization
    const keyGroups = stats.keys.reduce((groups: any, key: string) => {
      const type = key.split(':')[0];
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(key);
      return groups;
    }, {});
    
    console.log('🧹 CACHE-MANAGEMENT-GET: Cache stats:', {
      size: stats.size,
      keys: stats.keys,
      keyGroups: Object.keys(keyGroups)
    })
    
    res.status(200).json({
      success: true,
      stats: {
        size: stats.size,
        keys: stats.keys,
        keyGroups: keyGroups,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('🧹 CACHE-MANAGEMENT-GET: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function clearCache(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🧹 CACHE-MANAGEMENT-CLEAR: Starting cache clear process...')
    
    const { action } = req.body
    
    if (action === 'clear_all') {
      const stats = cache.getStats()
      cache.clear()
      
      console.log('🧹 CACHE-MANAGEMENT-CLEAR: Cleared all cache entries. Previous size:', stats.size)
      
      res.status(200).json({
        success: true,
        message: 'Cache cleared successfully',
        cleared: stats.size,
        timestamp: new Date().toISOString()
      })
    } else {
      console.log('🧹 CACHE-MANAGEMENT-CLEAR: Invalid action:', action)
      res.status(400).json({ error: 'Invalid action. Use "clear_all" to clear cache.' })
    }
  } catch (error: any) {
    console.error('🧹 CACHE-MANAGEMENT-CLEAR: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default requireAdminAuth(handler) 