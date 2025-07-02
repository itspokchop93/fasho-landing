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
          d="M160,0 C130,80 110,40 90,120 C70,200 110,160 130,240 C150,320 90,360 70,440 C50,520 130,480 150,560 C170,640 50,680 30,760 C10,840 130,800 150,880 C170,960 30,980 10,1000 L0,1000 L0,0 Z"
          fill="#0f0f0f"
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
          d="M160,0 C120,100 100,60 80,140 C60,220 120,180 140,260 C160,340 80,380 60,460 C40,540 140,500 160,580 C180,660 40,700 20,780 C0,860 140,820 160,900 C180,980 20,1000 0,1000 L0,0 Z"
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
          d="M160,0 C140,60 120,100 100,180 C80,260 120,300 140,380 C160,460 100,500 80,580 C60,660 140,620 160,700 C180,780 60,820 40,900 C20,980 140,940 160,1000 L0,1000 L0,0 Z"
          fill="#0f0f0f"
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
          d="M160,0 C125,120 105,80 85,160 C65,240 105,200 125,280 C145,360 85,400 65,480 C45,560 125,520 145,600 C165,680 45,720 25,800 C5,880 125,840 145,920 C165,1000 25,1020 5,1000 L0,1000 L0,0 Z"
          fill="#0f0f0f"
          opacity="0.6"
        />
      </svg>
    </div>
  );
} 