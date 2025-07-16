import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../utils/supabase/server'
import { requireAdminAuth } from '../../../utils/admin/auth'

export default requireAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser: any) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('📊 DAILY-STATS-API: Fetching daily statistics for admin:', adminUser.email)
    
    const supabase = createClient(req, res)
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    // Use the database function to get visit statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_daily_visit_stats', { target_date: today })
    
    if (statsError) {
      console.error('📊 DAILY-STATS-API: Error fetching daily stats:', statsError)
      return res.status(500).json({ error: 'Failed to fetch daily statistics' })
    }
    
    // Extract the data (the function returns an array with one row)
    const dailyStats = stats && stats.length > 0 ? stats[0] : {
      total_visits_today: 0,
      unique_visitors_today: 0
    }
    
    console.log('📊 DAILY-STATS-API: Retrieved stats:', dailyStats)
    
    return res.status(200).json({
      success: true,
      stats: {
        totalVisitsToday: parseInt(dailyStats.total_visits_today) || 0,
        uniqueVisitorsToday: parseInt(dailyStats.unique_visitors_today) || 0,
        date: today
      }
    })
    
  } catch (error) {
    console.error('📊 DAILY-STATS-API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) 