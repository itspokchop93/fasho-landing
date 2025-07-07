import { NextApiRequest, NextApiResponse } from 'next';
import { 
  validateAdminCredentials, 
  generateAdminToken, 
  setAdminSessionCookie,
  checkRateLimit,
  clearRateLimit,
  getClientIP
} from '../../../../utils/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔐 ADMIN-LOGIN-API: Processing login request');
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('🔐 ADMIN-LOGIN-API: Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check rate limiting
    if (!checkRateLimit(email)) {
      console.log('🔐 ADMIN-LOGIN-API: Rate limit exceeded for:', email);
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again in 15 minutes.' 
      });
    }

    // Get client info for logging
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log('🔐 ADMIN-LOGIN-API: Login attempt from:', {
      email,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100) // Truncate for logging
    });

    // Validate credentials
    const adminUser = await validateAdminCredentials(email, password);
    
    if (!adminUser) {
      console.log('🔐 ADMIN-LOGIN-API: Invalid credentials for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!adminUser.is_active) {
      console.log('🔐 ADMIN-LOGIN-API: Inactive admin account:', email);
      return res.status(403).json({ error: 'Admin account is inactive' });
    }

    // Clear rate limiting on successful login
    clearRateLimit(email);

    // Generate session token
    const sessionToken = generateAdminToken(adminUser);
    
    // Set secure session cookie
    setAdminSessionCookie(res, sessionToken);
    
    console.log('🔐 ADMIN-LOGIN-API: Login successful for:', email);
    console.log('🔐 ADMIN-LOGIN-API: Admin role:', adminUser.role);

    // Return success response (without sensitive data)
    return res.status(200).json({
      success: true,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('🔐 ADMIN-LOGIN-API: Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 