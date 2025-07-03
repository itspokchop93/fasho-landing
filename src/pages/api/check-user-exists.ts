import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const supabase = createClient(req, res);
    
    // Try to sign in with a fake password to check if user exists
    // This is a reliable way to check user existence in Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'fake-password-check-12345-not-real'
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        // User exists but password is wrong (which is expected)
        return res.status(200).json({ exists: true, verified: true });
      } else if (error.message.includes('Email not confirmed')) {
        // User exists but email not confirmed
        return res.status(200).json({ exists: true, verified: false });
      } else if (error.message.includes('User not found') || error.message.includes('Invalid email')) {
        // User doesn't exist
        return res.status(200).json({ exists: false, verified: false });
      } else {
        // Other errors (rate limiting, etc.)
        return res.status(200).json({ exists: false, verified: false, rateLimited: true });
      }
    }

    // This shouldn't happen with a fake password, but just in case
    return res.status(200).json({ exists: false, verified: false });
    
  } catch (error) {
    console.error('Error checking user existence:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 