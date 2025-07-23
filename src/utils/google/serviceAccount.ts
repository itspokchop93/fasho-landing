import { google } from 'googleapis'

/**
 * Securely load Google service account credentials from environment variables
 * This follows industry best practices used by major tech companies
 */
export function getGoogleServiceAccountCredentials() {
  // Read credentials from environment variables
  const credentials = {
    type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI,
    token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN
  }

  // Validate that all required fields are present
  const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id']
  for (const field of requiredFields) {
    if (!credentials[field as keyof typeof credentials]) {
      throw new Error(`Missing required Google service account field: ${field}`)
    }
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