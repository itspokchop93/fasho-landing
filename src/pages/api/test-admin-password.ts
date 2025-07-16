import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development or with specific debug key
  const debugKey = req.query.debug_key;
  if (process.env.NODE_ENV === 'production' && debugKey !== 'fasho-debug-2025') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    // Test email match
    const emailMatch = email === adminEmail;

    // Test password hash
    let passwordMatch = false;
    let bcryptError = null;
    
    try {
      if (adminPasswordHash) {
        passwordMatch = await bcrypt.compare(password, adminPasswordHash);
      }
    } catch (error) {
      bcryptError = error instanceof Error ? error.message : 'Unknown bcrypt error';
    }

    return res.status(200).json({
      test_email: email,
      admin_email: adminEmail,
      email_match: emailMatch,
      password_provided: !!password,
      password_length: password?.length,
      hash_exists: !!adminPasswordHash,
      hash_length: adminPasswordHash?.length,
      hash_format_check: adminPasswordHash?.startsWith('$2b$12$'),
      password_match: passwordMatch,
      bcrypt_error: bcryptError,
      full_hash: adminPasswordHash, // REMOVE AFTER DEBUGGING
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 