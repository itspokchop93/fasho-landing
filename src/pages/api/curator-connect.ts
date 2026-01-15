import { NextApiRequest, NextApiResponse } from 'next'

// Spreadsheet configuration
const SPREADSHEET_ID = '1-N-PleKV-Ml38hkJB3OAfPtYU8Xc49dg-787V3DwYU0'
const RANGE = 'Sheet1!A:J'

/**
 * Fetch data from a PUBLIC Google Sheet using the Google Sheets API v4
 * No authentication needed for public sheets - just use an API key or direct CSV export
 */
async function fetchPublicSheetData(): Promise<any[][]> {
  // Method 1: Try using Google Sheets API with API key (if available)
  const apiKey = process.env.GOOGLE_API_KEY
  
  if (apiKey) {
    console.log('🎵 CURATOR-CONNECT-API: Fetching with API key...')
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${apiKey}`
    const response = await fetch(url)
    
    if (response.ok) {
      const data = await response.json()
      return data.values || []
    }
    console.warn('🎵 CURATOR-CONNECT-API: API key method failed, trying CSV export...')
  }
  
  // Method 2: Fetch as CSV (works for public sheets without any API key)
  console.log('🎵 CURATOR-CONNECT-API: Fetching as CSV export...')
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`
  const csvResponse = await fetch(csvUrl)
  
  if (!csvResponse.ok) {
    throw new Error(`Failed to fetch spreadsheet: ${csvResponse.status} ${csvResponse.statusText}`)
  }
  
  const csvText = await csvResponse.text()
  
  // Parse CSV to array
  const rows = parseCSV(csvText)
  return rows
}

/**
 * Simple CSV parser that handles quoted fields
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []
  const lines = csvText.split('\n')
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    const row: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    row.push(current.trim())
    rows.push(row)
  }
  
  return rows
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🎵 CURATOR-CONNECT-API: Fetching curator data from Google Sheets...')
    
    const rows = await fetchPublicSheetData()
    
    if (!rows || rows.length === 0) {
      console.log('🎵 CURATOR-CONNECT-API: No data found in spreadsheet')
      return res.status(200).json({ data: [] })
    }
    
    // Skip header row
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