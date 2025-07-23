// Google Service Account credentials loader
// This loads credentials from environment variables instead of a file for security

export interface GoogleServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

export function getGoogleServiceAccount(): GoogleServiceAccount {
  // Check if we're in development and the file exists
  if (process.env.NODE_ENV === 'development') {
    try {
      // Only try to load from file in development
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'googleserviceaccount.json');
      
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.warn('Could not load Google service account from file:', error);
    }
  }

  // Load from environment variables (production)
  const serviceAccount: GoogleServiceAccount = {
    type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE || 'service_account',
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID || '',
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || '',
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || '',
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID || '',
    auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL || '',
    universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || 'googleapis.com'
  };

  // Validate required fields
  const requiredFields = ['project_id', 'private_key', 'client_email'];
  for (const field of requiredFields) {
    if (!serviceAccount[field as keyof GoogleServiceAccount]) {
      throw new Error(`Missing required Google service account environment variable: ${field}`);
    }
  }

  return serviceAccount;
} 