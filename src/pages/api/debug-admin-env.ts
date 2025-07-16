import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development or with specific debug key
  const debugKey = req.query.debug_key;
  if (process.env.NODE_ENV === 'production' && debugKey !== 'fasho-debug-2025') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const jwtSecret = process.env.JWT_SECRET;

    return res.status(200).json({
      environment: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      admin_email_exists: !!adminEmail,
      admin_email_value: adminEmail,
      admin_hash_exists: !!adminPasswordHash,
      admin_hash_length: adminPasswordHash?.length,
      admin_hash_starts_with: adminPasswordHash?.substring(0, 10),
      admin_hash_full: adminPasswordHash, // REMOVE THIS AFTER DEBUGGING
      jwt_secret_exists: !!jwtSecret,
      jwt_secret_length: jwtSecret?.length,
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 