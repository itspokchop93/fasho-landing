import React from "react";

export default function VerticalShapeDivider() {
  return (
    <div className="absolute top-0 left-0 w-32 h-full overflow-visible z-30" style={{ transform: 'translateX(-50%)' }}>
      {/* Base layer - solid black to match form background */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 128 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M0,0 C30,120 50,30 70,180 C90,280 50,350 30,450 C10,580 90,620 110,750 C90,850 50,800 30,900 C70,980 90,1020 128,1000 L128,0 Z"
          fill="#000000"
        />
      </svg>

      {/* Marble overlay layer to match form background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        viewBox="0 0 128 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <pattern id="marblePattern" x="0" y="0" width="128" height="200" patternUnits="userSpaceOnUse">
            <image href="/marble-bg.jpg" x="0" y="0" width="128" height="200" />
          </pattern>
        </defs>
        <path
          d="M0,0 C40,150 60,20 80,200 C100,320 60,380 40,480 C20,600 100,650 120,780 C100,880 60,830 40,930 C80,1000 100,1040 128,1000 L128,0 Z"
          fill="url(#marblePattern)"
        />
      </svg>

      {/* Additional wave layer for depth */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 128 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M0,0 C45,100 65,140 85,250 C105,360 65,420 45,520 C25,640 105,680 125,800 C105,900 65,850 45,950 C85,1020 105,1060 128,1000 L128,0 Z"
          fill="#000000"
          opacity="0.8"
        />
      </svg>

      {/* Subtle accent layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 128 1000"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d="M0,0 C50,80 75,180 95,280 C115,380 75,440 55,540 C35,660 115,700 128,820 C115,920 75,870 55,970 C95,1040 115,1080 128,1000 L128,0 Z"
          fill="#000000"
          opacity="0.6"
        />
      </svg>
    </div>
  );
} 