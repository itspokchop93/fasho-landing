import React from "react";

export default function ShapeDivider() {
  return (
    <svg
      className="w-full h-20"
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="shapeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        d="M0,30 C360,90 720,0 1080,60 C1260,90 1440,60 1440,60 L1440,100 L0,100 Z"
        fill="url(#shapeGradient)"
      />
    </svg>
  );
} 