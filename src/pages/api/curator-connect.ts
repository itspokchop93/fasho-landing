import { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import { getGoogleServiceAccount } from '../../utils/googleServiceAccount'

// Initialize Google Sheets API
const getGoogleSheetsClient = () => {
  const serviceAccount = getGoogleServiceAccount()
  
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  
  return google.sheets({ version: 'v4', auth })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🎵 CURATOR-CONNECT-API: Fetching curator data from Google Sheets...')
    
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = '1-N-PleKV-Ml38hkJB3OAfPtYU8Xc49dg-787V3DwYU0'
    const range = 'Sheet1!A:J' // Adjust range based on actual columns
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })
    
    const rows = response.data.values
    if (!rows || rows.length === 0) {
      console.log('🎵 CURATOR-CONNECT-API: No data found in spreadsheet')
      return res.status(200).json({ data: [] })
    }
    
    // Parse headers and data
    const headers = rows[0]
    const dataRows = rows.slice(1)
    
    // Map data to structured format
    const curatorData = dataRows.map((row, index) => {
      const playlistImageUrl = row[0] || ''
      const playlistName = row[1] || ''
      const playlistUrl = row[2] || ''
      const genre = row[3] || ''
      const playlistSaves = parseInt(row[4]) || 0
      const contactEmail = row[5] || ''
      
      return {
        id: index + 1,
        playlistImageUrl,
        playlistName,
        playlistUrl,
        genre,
        playlistSaves,
        contactEmail,
        contacted: false // Will be managed by user tracking
      }
    }).filter(item => item.playlistName && item.contactEmail) // Filter out empty rows
    
    console.log(`🎵 CURATOR-CONNECT-API: Successfully fetched ${curatorData.length} curator entries`)
    
    res.status(200).json({ 
      success: true,
      data: curatorData,
      total: curatorData.length
    })
    
  } catch (error) {
    console.error('🚨 CURATOR-CONNECT-API: Error fetching curator data:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch curator data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 