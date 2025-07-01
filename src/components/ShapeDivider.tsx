import React from "react";

export default function ShapeDivider() {
  return (
    <div className="relative w-full h-40 overflow-hidden">
      {/* Base layer - darkest */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 400"
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
          d="M-100,50 C120,200 360,20 600,150 C840,280 1080,60 1320,180 C1440,220 1540,100 1540,100 L1540,300 C1440,350 1320,250 1080,320 C840,250 600,380 360,300 C120,220 -100,350 -100,350 Z"
          fill="url(#shapeGradient1)"
        />
      </svg>

      {/* Middle layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 400"
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
          d="M-100,80 C200,250 480,40 720,200 C960,360 1200,80 1440,220 C1540,280 1540,280 1540,280 L1540,320 C1440,260 1200,380 960,280 C720,180 480,340 200,240 C-100,140 -100,380 -100,380 Z"
          fill="url(#shapeGradient2)"
        />
      </svg>

      {/* Top layer - brightest */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 400"
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
          d="M-100,120 C240,300 480,60 720,240 C960,420 1200,100 1440,260 C1540,320 1540,320 1540,320 L1540,280 C1440,220 1200,380 960,280 C720,180 480,340 240,240 C-100,140 -100,140 -100,140 Z"
          fill="url(#shapeGradient3)"
        />
      </svg>

      {/* Additional accent layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 400"
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
          d="M-100,100 C180,10 360,280 540,120 C720,20 900,300 1080,140 C1260,40 1380,200 1540,160 L1540,360 C1380,320 1260,380 1080,320 C900,260 720,400 540,340 C360,280 180,410 -100,360 Z"
          fill="url(#shapeGradient4)"
        />
      </svg>
    </div>
  );
} 