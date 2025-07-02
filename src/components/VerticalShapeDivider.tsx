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
          d="M128,0 C98,120 78,30 58,180 C38,280 78,350 98,450 C118,580 38,620 18,750 C38,850 78,800 98,900 C58,980 38,1020 0,1000 L0,0 Z"
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
          d="M128,0 C88,150 68,20 48,200 C28,320 68,380 88,480 C108,600 28,650 8,780 C28,880 68,830 88,930 C48,1000 28,1040 0,1000 L0,0 Z"
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
          d="M128,0 C83,100 63,140 43,250 C23,360 63,420 83,520 C103,640 23,680 3,800 C23,900 63,850 83,950 C43,1020 23,1060 0,1000 L0,0 Z"
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
          d="M128,0 C78,80 53,180 33,280 C13,380 53,440 73,540 C93,660 13,700 0,820 C13,920 53,870 73,970 C33,1040 13,1080 0,1000 L0,0 Z"
          fill="#000000"
          opacity="0.6"
        />
      </svg>
    </div>
  );
} 