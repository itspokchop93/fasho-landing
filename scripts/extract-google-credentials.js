#!/usr/bin/env node

/**
 * Script to extract Google service account credentials from JSON file
 * and format them for environment variables
 * 
 * Usage: node scripts/extract-google-credentials.js
 */

const fs = require('fs')
const path = require('path')

try {
  // Read the service account JSON file
  const serviceAccountPath = path.join(process.cwd(), 'googleserviceaccount.json')
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  
  console.log('🔐 GOOGLE-CREDENTIALS: Extracting credentials from googleserviceaccount.json...\n')
  
  // Format the credentials for environment variables
  const envVars = [
    `GOOGLE_SERVICE_ACCOUNT_TYPE="${serviceAccount.type}"`,
    `GOOGLE_SERVICE_ACCOUNT_PROJECT_ID="${serviceAccount.project_id}"`,
    `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID="${serviceAccount.private_key_id}"`,
    `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="${serviceAccount.private_key.replace(/\n/g, '\\n')}"`,
    `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL="${serviceAccount.client_email}"`,
    `GOOGLE_SERVICE_ACCOUNT_CLIENT_ID="${serviceAccount.client_id}"`,
    `GOOGLE_SERVICE_ACCOUNT_AUTH_URI="${serviceAccount.auth_uri}"`,
    `GOOGLE_SERVICE_ACCOUNT_TOKEN_URI="${serviceAccount.token_uri}"`,
    `GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL="${serviceAccount.auth_provider_x509_cert_url}"`,
    `GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL="${serviceAccount.client_x509_cert_url}"`,
    `GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN="${serviceAccount.universe_domain}"`
  ]
  
  console.log('📋 GOOGLE-CREDENTIALS: Add these environment variables to your .env.local file:\n')
  console.log('# Google Service Account Credentials')
  console.log(envVars.join('\n'))
  console.log('\n✅ GOOGLE-CREDENTIALS: Credentials extracted successfully!')
  console.log('📝 GOOGLE-CREDENTIALS: Copy the above variables to your .env.local file')
  console.log('🔒 GOOGLE-CREDENTIALS: After adding to .env.local, you can safely delete googleserviceaccount.json')
  
} catch (error) {
  console.error('❌ GOOGLE-CREDENTIALS: Error extracting credentials:', error.message)
  process.exit(1)
} 