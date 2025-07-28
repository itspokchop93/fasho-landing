import React from 'react'
import { PowerTool } from '../utils/googleSheets'

interface PowerToolCardProps {
  tool: PowerTool
  className?: string
}

export default function PowerToolCard({ tool, className = '' }: PowerToolCardProps) {
  // Generate unique IDs for this card instance to avoid conflicts
  const cardId = React.useMemo(() => Math.random().toString(36).substr(2, 9), [])
  
  // Format rating to show decimals only when needed
  const formatRating = (rating: number) => {
    return rating % 1 === 0 ? rating.toString() : rating.toFixed(1)
  }
  
  const renderStarRating = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasPartialStar = rating % 1 !== 0
    const partialFill = rating % 1

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      const gradientId = `starGradient-${cardId}-${i}`
      stars.push(
        <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#${gradientId})`} />
        </svg>
      )
    }

    // Partial star
    if (hasPartialStar) {
      const partialGradientId = `partialStarGradient-${cardId}`
      stars.push(
        <div key="partial" className="relative w-3.5 h-3.5">
          {/* Background star */}
          <svg className="absolute inset-0 w-3.5 h-3.5 text-gray-300 fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {/* Filled portion */}
          <div 
            className="absolute inset-0 overflow-hidden" 
            style={{ width: `${partialFill * 100}%` }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <defs>
                <linearGradient id={partialGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#${partialGradientId})`} />
            </svg>
          </div>
        </div>
      )
    }

    // Empty stars
    const remainingStars = 5 - Math.ceil(rating)
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-3.5 h-3.5 text-gray-300 fill-current" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    }

    return stars
  }

  const handleGetThis = () => {
    window.open(tool.affiliateLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.15] shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform md:hover:scale-105 md:hover:-translate-y-1 relative ${className}`} style={{ zIndex: 50, filter: 'drop-shadow(0 12px 48px rgba(89, 227, 165, 0.15))' }}>
      {/* Product Image - 3:1.8 Aspect Ratio */}
      <div className="relative w-full aspect-[3/1.8] overflow-hidden bg-black/20">
        <img
          src={tool.productImage}
          alt={tool.productName}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/default-tool.png' // fallback image
          }}
        />
        
        {/* Category Tag */}
        <div className="absolute top-3 left-3 z-20">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-white text-xs font-semibold border border-white/20">
            {tool.category}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 h-[270px] md:h-[230px] flex flex-col">
        {/* Product Name */}
        <h3 className="text-white font-bold text-base leading-tight mb-3">
          {tool.productName}
        </h3>
        
        {/* Star Rating */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex items-center space-x-0.5">
            {renderStarRating(tool.stars)}
          </div>
          <span className="text-gray-400 text-xs font-medium">
            ({formatRating(tool.stars)}/5)
          </span>
        </div>

        {/* Description - Fills remaining space */}
        <div className="flex-grow mb-4 overflow-hidden">
          <p className="text-gray-300 leading-relaxed" style={{ fontSize: 'calc(0.875rem - 0.13rem)' }}>
            {tool.description}
          </p>
        </div>

        {/* Get This Button - ALWAYS at bottom */}
        <button
          onClick={handleGetThis}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2.5 px-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm"
          style={{ zIndex: 20 }}
        >
          <span>Get This</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  )
} 