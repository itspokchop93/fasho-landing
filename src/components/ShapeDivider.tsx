import React from "react";

export default function ShapeDivider() {
  return (
    <div className="relative w-full h-32 overflow-hidden">
      {/* Base layer - darkest */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="shapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M0,64 C240,120 480,40 720,80 C960,120 1200,40 1440,80 L1440,240 C1200,200 960,280 720,240 C480,200 240,280 0,240 Z"
          fill="url(#shapeGradient1)"
        />
      </svg>

      {/* Middle layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="shapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M0,96 C360,160 720,80 1080,120 C1260,160 1440,120 1440,120 L1440,200 C1260,160 1080,240 720,200 C360,160 0,240 0,200 Z"
          fill="url(#shapeGradient2)"
        />
      </svg>

      {/* Top layer - brightest */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="shapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path
          d="M0,128 C480,192 960,112 1440,152 L1440,168 C960,128 480,208 0,168 Z"
          fill="url(#shapeGradient3)"
        />
      </svg>

      {/* Additional accent layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="shapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path
          d="M0,80 C180,40 360,120 540,80 C720,40 900,120 1080,80 C1260,40 1350,60 1440,80 L1440,240 C1350,220 1260,260 1080,240 C900,220 720,260 540,240 C360,220 180,260 0,240 Z"
          fill="url(#shapeGradient4)"
        />
      </svg>
    </div>
  );
} 