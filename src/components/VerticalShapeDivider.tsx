import React from "react";

export default function VerticalShapeDivider() {
  return (
    <div className="absolute top-0 right-0 w-20 h-full overflow-hidden z-30">
      {/* Base layer - solid black to match form background */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 80 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M0,0 C20,100 40,50 60,150 C80,250 60,300 40,400 C20,500 60,550 80,650 C60,750 40,700 20,800 C40,900 60,950 80,1000 L0,1000 Z"
          fill="#000000"
        />
      </svg>

      {/* Marble overlay layer to match form background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        viewBox="0 0 80 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <pattern id="marblePattern" x="0" y="0" width="80" height="200" patternUnits="userSpaceOnUse">
            <image href="/marble-bg.jpg" x="0" y="0" width="80" height="200" />
          </pattern>
        </defs>
        <path
          d="M0,0 C25,120 45,30 65,180 C85,280 55,320 35,420 C15,520 75,570 80,670 C55,770 35,720 15,820 C45,920 65,970 80,1000 L0,1000 Z"
          fill="url(#marblePattern)"
        />
      </svg>

      {/* Additional wave layer for depth */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 80 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M0,0 C30,80 50,120 70,220 C90,320 50,380 30,480 C10,580 70,620 80,720 C50,820 30,780 10,880 C50,980 70,1020 80,1000 L0,1000 Z"
          fill="#000000"
          opacity="0.8"
        />
      </svg>

      {/* Subtle accent layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 80 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M0,0 C35,60 55,160 75,260 C95,360 45,400 25,500 C5,600 85,640 80,740 C45,840 25,800 5,900 C55,1000 75,1040 80,1000 L0,1000 Z"
          fill="#000000"
          opacity="0.6"
        />
      </svg>
    </div>
  );
} 