import { NextApiRequest, NextApiResponse } from 'next'
import { getGoogleServiceAccountCredentials } from '../../utils/google/serviceAccount'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 COMPARE-PRIVATE-KEY: Analyzing private key format')
    
    const serviceAccount = getGoogleServiceAccountCredentials()
    const privateKey = serviceAccount.private_key
    
    if (!privateKey) {
      return res.status(500).json({ error: 'Private key not found' })
    }
    
    // Check if the private key matches expected format
    const expectedStart = '-----BEGIN PRIVATE KEY-----'
    const expectedEnd = '-----END PRIVATE KEY-----'
    
    const analysis = {
      startsCorrectly: privateKey.startsWith(expectedStart),
      endsCorrectly: privateKey.endsWith(expectedEnd),
      hasCorrectLength: privateKey.length > 1000 && privateKey.length < 2000,
      hasCorrectNewlines: privateKey.includes('\n'),
      newlineCount: (privateKey.match(/\n/g) || []).length,
      // Check if it's a valid base64 format (should be 64 characters per line)
      lines: privateKey.split('\n'),
      firstLine: privateKey.split('\n')[0],
      lastLine: privateKey.split('\n').slice(-1)[0],
      // Check for common corruption patterns
      hasExtraSpaces: privateKey.includes('  '),
      hasExtraQuotes: privateKey.includes('"'),
      hasExtraBackslashes: privateKey.includes('\\'),
      // Show the structure
      structure: {
        header: privateKey.split('\n')[0],
        bodyLines: privateKey.split('\n').slice(1, -1).length,
        footer: privateKey.split('\n').slice(-1)[0]
      }
    }
    
    console.log('🔍 COMPARE-PRIVATE-KEY: Analysis:', analysis)
    
    res.status(200).json({ 
      success: true,
      analysis,
      // Show a sample of the key structure
      sample: {
        firstLine: privateKey.split('\n')[0],
        middleLine: privateKey.split('\n')[Math.floor(privateKey.split('\n').length / 2)],
        lastLine: privateKey.split('\n').slice(-1)[0]
      }
    })
    
  } catch (error) {
    console.error('🔍 COMPARE-PRIVATE-KEY: Error:', error)
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 