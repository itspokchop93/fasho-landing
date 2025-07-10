import React from "react";

export default function ShapeDivider() {
  return (
    <div className="relative w-full h-60 overflow-hidden">
      {/* Background foundation */}
      <div className="absolute inset-0 z-30" style={{ background: 'transparent' }}></div>
      
      {/* Base layer - darkest */}
      <svg
        className="absolute inset-0 w-full h-full z-40"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(0 4px 20px rgba(20, 192, 255, 0.4))' }}
      >
        <defs>
          <linearGradient id="shapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M-200,80 C200,350 400,10 600,200 C800,390 1000,50 1200,240 C1400,430 1600,90 1640,200 L1640,600 L0,600 Z"
          fill="url(#shapeGradient1)"
        />
      </svg>

      {/* Middle layer */}
      <svg
        className="absolute inset-0 w-full h-full z-40"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(0 4px 16px rgba(89, 227, 165, 0.4))' }}
      >
        <defs>
          <linearGradient id="shapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M-200,120 C250,380 450,30 650,220 C850,410 1050,70 1250,260 C1450,450 1650,110 1640,220 L1640,600 L0,600 Z"
          fill="url(#shapeGradient2)"
        />
      </svg>

      {/* Top layer - brightest */}
      <svg
        className="absolute inset-0 w-full h-full z-40"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(0 2px 12px rgba(139, 92, 246, 0.5))' }}
      >
        <defs>
          <linearGradient id="shapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path
          d="M-200,140 C300,400 500,50 700,240 C900,430 1100,90 1300,280 C1500,470 1700,130 1640,240 L1640,600 L0,600 Z"
          fill="url(#shapeGradient3)"
        />
      </svg>

      {/* Additional accent layer */}
      <svg
        className="absolute inset-0 w-full h-full z-40"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(0 1px 8px rgba(89, 227, 165, 0.3))' }}
      >
        <defs>
          <linearGradient id="shapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M-200,100 C180,60 360,420 520,180 C680,80 840,460 1000,220 C1160,80 1320,400 1480,240 C1600,160 1640,320 1640,320 L1640,600 L0,600 Z"
          fill="url(#shapeGradient4)"
        />
      </svg>
    </div>
  );
} 