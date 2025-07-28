export interface PowerTool {
  productName: string
  productImage: string
  description: string
  affiliateLink: string
  stars: number
  category: string
  featured: string
  weight: number
}

export class GoogleSheetsService {
  private static SHEET_ID = '13-A9D32we7Ij3WJjzVBMFvGeue02I_0ia5UuTdqaTcM'
  private static CSV_URL = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/export?format=csv&gid=0`

  static async fetchPowerTools(): Promise<PowerTool[]> {
    try {
      const response = await fetch(this.CSV_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`)
      }
      
      const csvText = await response.text()
      return this.parseCSV(csvText)
    } catch (error) {
      console.error('Error fetching power tools:', error)
      throw error
    }
  }

  private static parseCSV(csvText: string): PowerTool[] {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    // Skip header row
    const dataLines = lines.slice(1)
    
    return dataLines.map(line => {
      const columns = this.parseCSVLine(line)
      return {
        productName: columns[0] || '',
        productImage: columns[1] || '',
        description: columns[2] || '',
        affiliateLink: columns[3] || '',
        stars: parseFloat(columns[4]) || 0,
        category: columns[5] || '',
        featured: columns[6] || 'N',
        weight: parseFloat(columns[7]) || 0
      }
    }).filter(tool => tool.productName.trim() !== '')
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  static getUniqueCategories(tools: PowerTool[]): string[] {
    const categories = tools
      .map(tool => tool.category)
      .filter(category => category.trim() !== '')
    
    return Array.from(new Set(categories)).sort()
  }

  static filterTools(tools: PowerTool[], options: {
    featured?: boolean
    categories?: string[]
  }): PowerTool[] {
    let filtered = tools

    if (options.featured !== undefined) {
      filtered = filtered.filter(tool => 
        options.featured ? tool.featured === 'Y' : tool.featured === 'N'
      )
    }

    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(tool => 
        options.categories!.includes(tool.category)
      )
    }

    return this.sortByWeight(filtered)
  }

  static sortByWeight(tools: PowerTool[]): PowerTool[] {
    return tools.sort((a, b) => {
      // Higher weight comes first
      if (b.weight !== a.weight) {
        return b.weight - a.weight
      }
      // If same weight, sort alphabetically by name
      return a.productName.localeCompare(b.productName)
    })
  }
} 