import { NextApiRequest, NextApiResponse } from 'next';
import { clearAdminSessionCookie, getAdminTokenFromRequest, verifyAdminToken } from '../../../../utils/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔐 ADMIN-LOGOUT-API: Processing logout request');
    
    // Get current session info for logging
    const token = getAdminTokenFromRequest(req);
    if (token) {
      const adminUser = verifyAdminToken(token);
      if (adminUser) {
        console.log('🔐 ADMIN-LOGOUT-API: Logging out admin:', adminUser.email);
      }
    }

    // Clear session cookies
    clearAdminSessionCookie(res);
    
    console.log('🔐 ADMIN-LOGOUT-API: Session cleared successfully');

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('🔐 ADMIN-LOGOUT-API: Logout error:', error);
    
    // Still clear cookies even if there's an error
    clearAdminSessionCookie(res);
    
    return res.status(500).json({ error: 'Internal server error' });
  }
} 