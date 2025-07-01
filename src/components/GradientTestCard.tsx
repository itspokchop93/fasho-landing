import React from "react";

export default function GradientTestCard() {
  return (
    <div className="relative w-full max-w-xl mx-auto mt-10 rounded-xl overflow-hidden">
      {/* animated border */}
      <div
        className="pointer-events-none absolute inset-0 animate-spin-slow bg-[conic-gradient(var(--tw-gradient-stops))] from-amber-400 via-pink-500 to-amber-400 blur-lg opacity-90"
        style={{ animationDuration: "5s" }}
      />
      {/* inner container (offset by 2px to reveal border) */}
      <div className="relative z-10 m-[4px] rounded-[calc(theme(borderRadius.xl)-4px)] flex items-center justify-between bg-gray-900 text-white px-6 py-4">
        <span className="font-semibold">Add-on Apple Music Marketing</span>
        <button className="w-9 h-9 rounded-md bg-white text-black text-2xl leading-none flex items-center justify-center">
          +
        </button>
      </div>
    </div>
  );
} 