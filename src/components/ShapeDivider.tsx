import React from "react";

export default function ShapeDivider() {
  return (
    <div className="relative w-full h-60 overflow-hidden">
      {/* Base layer - darkest */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="shapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M-200,80 C100,350 300,10 500,280 C700,550 900,50 1100,320 C1300,590 1500,30 1640,200 L1640,500 C1500,400 1300,550 1100,450 C900,350 700,600 500,500 C300,400 100,650 -200,550 Z"
          fill="url(#shapeGradient1)"
        />
      </svg>

      {/* Middle layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="shapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path
          d="M-200,120 C150,450 400,20 650,350 C900,680 1150,70 1400,400 C1550,530 1640,150 1640,150 L1640,450 C1550,350 1400,600 1150,400 C900,200 650,650 400,450 C150,250 -200,700 -200,700 Z"
          fill="url(#shapeGradient2)"
        />
      </svg>

      {/* Top layer - brightest */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="shapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path
          d="M-200,180 C200,520 450,30 700,380 C950,730 1200,80 1450,430 C1600,580 1640,200 1640,200 L1640,380 C1600,280 1450,630 1200,380 C950,130 700,680 450,430 C200,180 -200,180 -200,180 Z"
          fill="url(#shapeGradient3)"
        />
      </svg>

      {/* Additional accent layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="shapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          d="M-200,150 C120,5 280,500 440,180 C600,10 760,550 920,220 C1080,20 1240,480 1400,250 C1520,150 1640,350 1640,350 L1640,550 C1520,450 1400,650 1240,550 C1080,450 920,750 760,650 C600,550 440,800 280,700 C120,600 -200,850 -200,850 Z"
          fill="url(#shapeGradient4)"
        />
      </svg>
    </div>
  );
} 