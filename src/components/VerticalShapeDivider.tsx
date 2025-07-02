import React from "react";

export default function VerticalShapeDivider() {
  return (
    <div className="absolute top-0 left-0 w-40 h-full overflow-visible z-30" style={{ transform: 'translateX(-30%)' }}>
      {/* Base layer - solid dark grey to match form background */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 160 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M160,0 C120,150 80,50 40,250 C20,400 100,350 140,500 C160,650 60,700 20,850 C40,950 120,900 160,1000 L0,1000 L0,0 Z"
          fill="#000000"
        />
      </svg>

      {/* Marble overlay layer to match form background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        viewBox="0 0 160 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <pattern id="marblePattern" x="0" y="0" width="160" height="200" patternUnits="userSpaceOnUse">
            <image href="/marble-bg.jpg" x="0" y="0" width="160" height="200" />
          </pattern>
        </defs>
        <path
          d="M160,0 C110,180 70,80 30,300 C10,450 120,400 150,550 C170,700 50,750 10,900 C30,980 110,950 160,1000 L0,1000 L0,0 Z"
          fill="url(#marblePattern)"
        />
      </svg>

      {/* Additional wave layer for depth */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 160 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M160,0 C130,120 90,80 50,220 C30,350 110,320 150,450 C170,580 70,620 30,750 C50,880 130,850 160,1000 L0,1000 L0,0 Z"
          fill="#000000"
          opacity="0.8"
        />
      </svg>

      {/* Subtle accent layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 160 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M160,0 C140,100 100,120 60,200 C40,300 120,280 160,380 C180,480 80,520 40,620 C60,720 140,680 160,780 C180,880 60,920 20,1000 L0,1000 L0,0 Z"
          fill="#000000"
          opacity="0.6"
        />
      </svg>
    </div>
  );
} 