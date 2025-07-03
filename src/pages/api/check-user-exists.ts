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
    
    console.log('Checking user existence for email:', email);
    
    // Try to sign in with a fake password to check if user exists
    // This is a reliable way to check user existence in Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'fake-password-check-12345-not-real'
    });

    console.log('Supabase auth response:', { data, error: error?.message });

    if (error) {
      // Check the specific error message to determine user status
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('invalid login credentials') || 
          errorMessage.includes('invalid email or password')) {
        // User exists but password is wrong (which is expected)
        console.log('User exists - got invalid credentials error');
        return res.status(200).json({ exists: true, verified: true });
      } else if (errorMessage.includes('email not confirmed') || 
                 errorMessage.includes('not confirmed')) {
        // User exists but email not confirmed
        console.log('User exists but not verified');
        return res.status(200).json({ exists: true, verified: false });
      } else if (errorMessage.includes('user not found') || 
                 errorMessage.includes('invalid email') ||
                 errorMessage.includes('user does not exist') ||
                 errorMessage.includes('no user found')) {
        // User doesn't exist
        console.log('User does not exist');
        return res.status(200).json({ exists: false, verified: false });
      } else {
        // Other errors (rate limiting, network issues, etc.)
        console.log('Other error occurred:', errorMessage);
        return res.status(200).json({ exists: false, verified: false, error: errorMessage });
      }
    }

    // This shouldn't happen with a fake password, but just in case someone has that exact password
    console.log('Unexpected success with fake password');
    return res.status(200).json({ exists: true, verified: true });
    
  } catch (error) {
    console.error('Error checking user existence:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 