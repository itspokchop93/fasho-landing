import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../utils/supabase/server'
import { requireAdminAuth } from '../../../utils/admin/auth'

interface ActiveUser {
  id: string
  session_id: string
  user_id: string | null
  ip_address: string
  user_agent: string
  current_page: string
  first_name: string | null
  last_name: string | null
  email: string | null
  is_guest: boolean
  last_activity: string
  created_at: string
}

// Helper function to parse user agent and extract browser info
function getBrowserInfo(userAgent: string): string {
  if (!userAgent || userAgent === 'unknown') {
    return 'Unknown Browser'
  }
  
  const ua = userAgent.toLowerCase()
  
  if (ua.includes('chrome') && !ua.includes('edg')) {
    return 'Chrome'
  } else if (ua.includes('firefox')) {
    return 'Firefox'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    return 'Safari'
  } else if (ua.includes('edg')) {
    return 'Edge'
  } else if (ua.includes('opera')) {
    return 'Opera'
  } else if (ua.includes('msie') || ua.includes('trident')) {
    return 'Internet Explorer'
  } else {
    return 'Other Browser'
  }
}

// Helper function to format page names for display
function formatPageName(page: string): string {
  if (!page || page === '/') {
    return 'Home'
  }
  
  // Remove leading slash and convert to title case
  const cleanPage = page.replace(/^\//, '').replace(/\/$/, '')
  
  // Handle common pages
  const pageMap: { [key: string]: string } = {
    'dashboard': 'Dashboard',
    'packages': 'Packages',
    'checkout': 'Checkout',
    'add': 'Add Track',
    'signup': 'Sign Up',
    'a-login': 'Admin Login',
    'admin': 'Admin Dashboard',
    'thank-you': 'Thank You',
    'contact': 'Contact',
    'about': 'About',
    'pricing': 'Pricing'
  }
  
  if (pageMap[cleanPage]) {
    return pageMap[cleanPage]
  }
  
  // Handle dynamic routes like /admin/order/123
  if (cleanPage.includes('/')) {
    const parts = cleanPage.split('/')
    if (parts[0] === 'admin' && parts[1] === 'order') {
      return `Admin Order #${parts[2]?.substring(0, 8) || 'unknown'}`
    }
    if (parts[0] === 'admin' && parts[1] === 'emails' && parts[2] === 'edit') {
      return `Edit ${parts[3] || 'Email'} Template`
    }
  }
  
  // Default formatting: capitalize first letter and replace dashes/underscores with spaces
  return cleanPage
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default requireAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser: any) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('👥 ACTIVE-USERS-API: Fetching active users for admin:', adminUser.email)
    
    const supabase = createClient(req, res)
    
    // Cleanup inactive users first
    const { error: cleanupError } = await supabase.rpc('cleanup_inactive_users')
    if (cleanupError) {
      console.warn('👥 ACTIVE-USERS-API: Cleanup warning:', cleanupError)
    }
    
    // Fetch active users
    const { data: activeUsers, error: fetchError } = await supabase
      .from('active_users')
      .select('*')
      .order('last_activity', { ascending: false })
    
    if (fetchError) {
      console.error('👥 ACTIVE-USERS-API: Error fetching active users:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch active users' })
    }
    
    // Format the data for frontend consumption
    const formattedUsers = (activeUsers as ActiveUser[]).map(user => ({
      id: user.id,
      sessionId: user.session_id,
      accountName: user.is_guest 
        ? 'Guest' 
        : `${user.first_name || 'User'} ${user.last_name || ''}`.trim(),
      email: user.is_guest ? 'Guest' : (user.email || 'Unknown'),
      ipAddress: user.ip_address,
      browser: getBrowserInfo(user.user_agent),
      currentPage: formatPageName(user.current_page),
      lastActivity: user.last_activity,
      isGuest: user.is_guest,
      createdAt: user.created_at
    }))
    
    console.log('👥 ACTIVE-USERS-API: Found', formattedUsers.length, 'active users')
    
    return res.status(200).json({
      success: true,
      activeUsers: formattedUsers,
      count: formattedUsers.length
    })
    
  } catch (error) {
    console.error('👥 ACTIVE-USERS-API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}) 