import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminTokenFromRequest, verifyAdminToken } from '../../../../utils/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔐 ADMIN-VERIFY-API: Verifying admin session');
    
    const token = getAdminTokenFromRequest(req);
    
    if (!token) {
      console.log('🔐 ADMIN-VERIFY-API: No token found');
      return res.status(401).json({ 
        authenticated: false, 
        error: 'No session token' 
      });
    }

    const adminUser = verifyAdminToken(token);
    
    if (!adminUser) {
      console.log('🔐 ADMIN-VERIFY-API: Invalid token');
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Invalid session' 
      });
    }

    if (!adminUser.is_active) {
      console.log('🔐 ADMIN-VERIFY-API: Inactive admin account:', adminUser.email);
      return res.status(403).json({ 
        authenticated: false, 
        error: 'Admin account is inactive' 
      });
    }

    console.log('🔐 ADMIN-VERIFY-API: Session verified for:', adminUser.email);

    return res.status(200).json({
      authenticated: true,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      }
    });

  } catch (error) {
    console.error('🔐 ADMIN-VERIFY-API: Verification error:', error);
    return res.status(500).json({ 
      authenticated: false, 
      error: 'Internal server error' 
    });
  }
} 