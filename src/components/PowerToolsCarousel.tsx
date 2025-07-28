import React, { useRef, useState, useEffect } from 'react'
import { PowerTool } from '../utils/googleSheets'
import PowerToolCard from './PowerToolCard'

interface PowerToolsCarouselProps {
  tools: PowerTool[]
  onViewAll: () => void
  className?: string
}

export default function PowerToolsCarousel({ tools, onViewAll, className = '' }: PowerToolsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }

  useEffect(() => {
    checkScrollButtons()
    
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollButtons)
      return () => container.removeEventListener('scroll', checkScrollButtons)
    }
  }, [tools])

  const scrollLeft = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: -400, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: 400, behavior: 'smooth' })
    }
  }

  if (tools.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 ${className}`} style={{ zIndex: 5 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Power Tools</h3>
            <p className="text-gray-400 text-sm">
              These are the battle-tested tools that our top performing clients use. From beat making to social media growth, these are the essentials that help artists dominate every aspect of their music careers.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-4xl mb-4">🛠️</div>
            <p className="text-gray-400">Loading power tools...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-800/30 ${className}`} style={{ zIndex: 5 }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Power Tools
              </h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
              These are the battle-tested tools that our top performing clients use. From beat making to social media growth, these are the essentials that help artists dominate every aspect of their music careers.
            </p>
          </div>
          
          {/* View All Button */}
          <button
            onClick={onViewAll}
            className="flex-shrink-0 text-green-400 hover:text-green-300 font-semibold transition-colors text-sm flex items-center space-x-1 hover:bg-green-500/10 px-3 py-2 rounded-lg"
            style={{ zIndex: 15 }}
          >
            <span>View All</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Header Row with Title and View All Button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Power Tools
              </h3>
            </div>
            
            {/* View All Button */}
            <button
              onClick={onViewAll}
              className="text-green-400 hover:text-green-300 font-semibold transition-colors text-sm flex items-center space-x-1 hover:bg-green-500/10 px-3 py-2 rounded-lg"
              style={{ zIndex: 15 }}
            >
              <span>View All</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* Full Width Description */}
          <p className="text-gray-400 leading-relaxed" style={{ fontSize: 'calc(0.875rem - 0.08rem)' }}>
            These are the battle-tested tools that our top performing clients use. From beat making to social media growth, these are the essentials that help artists dominate every aspect of their music careers.
          </p>
        </div>
      </div>

      {/* Carousel Container - Overflow enabled */}
      <div className="relative overflow-visible" style={{ paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px' }}>
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-3 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 shadow-xl backdrop-blur-sm border border-white/10"
            style={{ zIndex: 9999 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-3 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 shadow-xl backdrop-blur-sm border border-white/10"
            style={{ zIndex: 9999 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto power-tools-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#10b981 transparent',
            scrollBehavior: 'smooth',
            paddingTop: '30px',
            paddingBottom: '20px',
            paddingLeft: '8px',
            paddingRight: '8px',
            marginTop: '-20px',
            marginBottom: '-10px',
            marginLeft: '-8px',
            marginRight: '-8px',
            overflowY: 'visible'
          }}
        >
          {tools.map((tool, index) => (
            <div key={index} className="flex-shrink-0 w-44 md:w-64 relative z-30">
              <PowerToolCard tool={tool} className="h-full" />
            </div>
          ))}
        </div>

        {/* Custom Scrollbar Styles */}
        <style jsx>{`
          .power-tools-scrollbar::-webkit-scrollbar {
            height: 6px;
          }
          .power-tools-scrollbar::-webkit-scrollbar-track {
            background: rgba(31, 41, 55, 0.5);
            border-radius: 3px;
          }
          .power-tools-scrollbar::-webkit-scrollbar-thumb {
            background: #10b981;
            border-radius: 3px;
          }
          .power-tools-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #059669;
          }
        `}</style>
      </div>
    </div>
  )
} 