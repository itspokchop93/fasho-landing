import React, { useState, useEffect } from 'react'
import { GoogleSheetsService, PowerTool } from '../utils/googleSheets'
import PowerToolCard from './PowerToolCard'

interface PowerToolsTabProps {
  className?: string
}

export default function PowerToolsTab({ className = '' }: PowerToolsTabProps) {
  const [powerTools, setPowerTools] = useState<PowerTool[]>([])
  const [filteredTools, setFilteredTools] = useState<PowerTool[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Fetch power tools data
  useEffect(() => {
    const fetchPowerTools = async () => {
      try {
        setLoading(true)
        const tools = await GoogleSheetsService.fetchPowerTools()
        setPowerTools(tools)
        setFilteredTools(GoogleSheetsService.sortByWeight(tools))
        
        // Get unique categories
        const uniqueCategories = GoogleSheetsService.getUniqueCategories(tools)
        setCategories(uniqueCategories)
      } catch (error) {
        console.error('Failed to fetch power tools:', error)
        setPowerTools([])
        setFilteredTools([])
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchPowerTools()
  }, [])

  // Filter tools when categories change
  useEffect(() => {
    if (selectedCategories.length === 0) {
      setFilteredTools(GoogleSheetsService.sortByWeight(powerTools))
    } else {
      const filtered = GoogleSheetsService.filterTools(powerTools, {
        categories: selectedCategories
      })
      setFilteredTools(filtered)
    }
  }, [selectedCategories, powerTools])

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleClearFilters = () => {
    setSelectedCategories([])
  }

  if (loading) {
    return (
      <div className={`space-y-6 pb-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 pb-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Power Tools</h2>
          <p className="text-gray-400 text-sm">
            Battle-tested tools that our top performing clients use to dominate every aspect of their music careers.
          </p>
        </div>
      </div>

      {/* Category Filters */}
      <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30" style={{ zIndex: 5 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Filter by Category</h3>
          {selectedCategories.length > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-red-400 hover:text-red-300 font-medium transition-colors text-sm px-3 py-1 rounded-lg hover:bg-red-500/10"
              style={{ zIndex: 10 }}
            >
              Clear Filters
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category)
            return (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  isSelected
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                    : 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] hover:text-white border border-gray-700 hover:border-gray-600'
                }`}
                style={{ zIndex: 10 }}
              >
                {category}
              </button>
            )
          })}
        </div>
        
        {selectedCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Showing {filteredTools.length} tools in {selectedCategories.length} 
              {selectedCategories.length === 1 ? ' category' : ' categories'}
            </p>
          </div>
        )}
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-12 border border-gray-800/30 text-center" style={{ zIndex: 5 }}>
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No tools found</h3>
          <p className="text-gray-400">
            {selectedCategories.length > 0 
              ? 'Try adjusting your category filters to see more tools.'
              : 'No power tools available at the moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
          {filteredTools.map((tool, index) => (
            <PowerToolCard
              key={index}
              tool={tool}
              className="transform transition-all duration-300"
            />
          ))}
        </div>
      )}

      {/* Results Summary */}
      {filteredTools.length > 0 && (
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 border border-gray-800/30" style={{ zIndex: 5 }}>
          <p className="text-gray-400 text-sm text-center">
            {selectedCategories.length > 0 ? (
              <>Showing {filteredTools.length} tools in selected categories</>
            ) : (
              <>Showing all {filteredTools.length} available power tools</>
            )}
          </p>
        </div>
      )}
    </div>
  )
} 