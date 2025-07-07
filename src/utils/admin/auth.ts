import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../supabase/server';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'sub_admin';
  is_active: boolean;
  last_login_at: string | null;
}

export interface AdminSession {
  id: string;
  admin_user_id: string;
  session_token: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Environment-based admin authentication
 * Validates admin credentials against environment variables
 */
export async function validateAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  try {
    console.log('🔐 ADMIN-AUTH: Validating credentials for:', email);
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    if (!adminEmail || !adminPasswordHash) {
      console.error('🔐 ADMIN-AUTH: Missing admin environment variables');
      return null;
    }
    
    // Check email match
    if (email !== adminEmail) {
      console.log('🔐 ADMIN-AUTH: Email does not match admin email');
      return null;
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminPasswordHash);
    if (!isValidPassword) {
      console.log('🔐 ADMIN-AUTH: Invalid password');
      return null;
    }
    
    console.log('🔐 ADMIN-AUTH: Credentials validated successfully');
    
    // Return admin user object
    return {
      id: 'env-admin-001', // Static ID for environment-based admin
      email: adminEmail,
      role: 'admin', // Environment admin is always full admin
      is_active: true,
      last_login_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('🔐 ADMIN-AUTH: Error validating credentials:', error);
    return null;
  }
}

/**
 * Generate JWT token for admin session
 */
export function generateAdminToken(adminUser: AdminUser): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const payload = {
    adminId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    type: 'admin_session'
  };
  
  // Token expires in 24 hours
  return jwt.sign(payload, jwtSecret, { 
    expiresIn: '24h',
    issuer: 'fasho-admin',
    audience: 'fasho-admin-dashboard'
  });
}

/**
 * Verify and decode admin JWT token
 */
export function verifyAdminToken(token: string): AdminUser | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('🔐 ADMIN-AUTH: JWT_SECRET not configured');
      return null;
    }
    
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'fasho-admin',
      audience: 'fasho-admin-dashboard'
    }) as any;
    
    if (decoded.type !== 'admin_session') {
      console.log('🔐 ADMIN-AUTH: Invalid token type');
      return null;
    }
    
    return {
      id: decoded.adminId,
      email: decoded.email,
      role: decoded.role,
      is_active: true,
      last_login_at: null
    };
    
  } catch (error) {
    console.log('🔐 ADMIN-AUTH: Token verification failed:', error.message);
    return null;
  }
}

/**
 * Extract admin token from request
 */
export function getAdminTokenFromRequest(req: NextApiRequest): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies
  const cookieToken = req.cookies['admin_session'];
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

/**
 * Middleware to authenticate admin requests
 */
export function requireAdminAuth(handler: (req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      console.log('🔐 ADMIN-MIDDLEWARE: Checking admin authentication...');
      
      const token = getAdminTokenFromRequest(req);
      if (!token) {
        console.log('🔐 ADMIN-MIDDLEWARE: No token found');
        return res.status(401).json({ error: 'Admin authentication required' });
      }
      
      const adminUser = verifyAdminToken(token);
      if (!adminUser) {
        console.log('🔐 ADMIN-MIDDLEWARE: Invalid token');
        return res.status(401).json({ error: 'Invalid admin session' });
      }
      
      if (!adminUser.is_active) {
        console.log('🔐 ADMIN-MIDDLEWARE: Admin account is inactive');
        return res.status(403).json({ error: 'Admin account is inactive' });
      }
      
      console.log('🔐 ADMIN-MIDDLEWARE: Admin authenticated:', adminUser.email);
      
      // Call the handler with the authenticated admin user
      await handler(req, res, adminUser);
      
    } catch (error) {
      console.error('🔐 ADMIN-MIDDLEWARE: Authentication error:', error);
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}

/**
 * Check if admin has required role
 */
export function requireAdminRole(requiredRole: 'admin' | 'sub_admin' = 'admin') {
  return (handler: (req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) => Promise<void>) => {
    return requireAdminAuth(async (req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) => {
      // Check role hierarchy: admin can access everything, sub_admin has limited access
      if (requiredRole === 'admin' && adminUser.role !== 'admin') {
        console.log('🔐 ADMIN-MIDDLEWARE: Insufficient permissions for:', adminUser.email);
        return res.status(403).json({ error: 'Admin privileges required' });
      }
      
      console.log('🔐 ADMIN-MIDDLEWARE: Role check passed for:', adminUser.email, 'role:', adminUser.role);
      
      await handler(req, res, adminUser);
    });
  };
}

/**
 * Rate limiting for admin login attempts
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(email);
  
  if (!attempts) {
    loginAttempts.set(email, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset attempts after 15 minutes
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.set(email, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Allow max 5 attempts per 15 minutes
  if (attempts.count >= 5) {
    console.log('🔐 ADMIN-AUTH: Rate limit exceeded for:', email);
    return false;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

/**
 * Clear rate limit for successful login
 */
export function clearRateLimit(email: string): void {
  loginAttempts.delete(email);
}

/**
 * Get client IP address
 */
export function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0] 
    : req.connection?.remoteAddress || 'unknown';
  return ip;
}

/**
 * Set secure admin session cookie
 */
export function setAdminSessionCookie(res: NextApiResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.setHeader('Set-Cookie', [
    `admin_session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict${isProduction ? '; Secure' : ''}`,
    `admin_logged_in=true; Path=/; Max-Age=86400; SameSite=Strict${isProduction ? '; Secure' : ''}`
  ]);
}

/**
 * Clear admin session cookie
 */
export function clearAdminSessionCookie(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', [
    'admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict',
    'admin_logged_in=; Path=/; Max-Age=0; SameSite=Strict'
  ]);
} 