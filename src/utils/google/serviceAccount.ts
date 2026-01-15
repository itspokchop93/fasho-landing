import { google } from 'googleapis'

/**
 * Securely load Google service account credentials from environment variables
 * This follows industry best practices used by major tech companies
 */
export function getGoogleServiceAccountCredentials() {
  // Read credentials from environment variables
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  
  // Handle private key formatting - it might be stored with escaped newlines or quotes
  let privateKey = rawPrivateKey
  if (privateKey) {
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n')
    // Remove surrounding quotes if present
    privateKey = privateKey.replace(/^["']|["']$/g, '')
    // Ensure it starts with -----BEGIN PRIVATE KEY-----
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      console.warn('⚠️ GOOGLE-CREDENTIALS: Private key format may be incorrect')
    }
  }
  
  const credentials = {
    type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || 'googleapis.com'
  }

  // Validate that all required fields are present with better error messages
  const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id']
  const missingFields: string[] = []
  
  for (const field of requiredFields) {
    const value = credentials[field as keyof typeof credentials]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field)
    }
  }
  
  if (missingFields.length > 0) {
    console.error('🚨 GOOGLE-CREDENTIALS: Missing required fields:', missingFields.join(', '))
    console.error('🚨 GOOGLE-CREDENTIALS: Available env vars:', {
      hasType: !!process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
      hasProjectId: !!process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
      hasPrivateKeyId: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
      hasPrivateKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
      hasClientId: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    })
    throw new Error(`Missing required Google service account field(s): ${missingFields.join(', ')}`)
  }

  return credentials
}

/**
 * Create a Google Sheets client using service account credentials
 */
export function createGoogleSheetsClient() {
  const credentials = getGoogleServiceAccountCredentials()
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  
  return google.sheets({ version: 'v4', auth })
} 