import React from "react";

export default function GradientTestCard() {
  return (
    <div className="relative w-full max-w-xl mx-auto mt-10 rounded-xl overflow-hidden group">
      {/* animated border */}
      <div
        className="pointer-events-none absolute inset-0 animate-spin-slow bg-[conic-gradient(var(--tw-gradient-stops))] from-amber-400 via-pink-500 to-amber-400 blur-sm opacity-80"
        style={{ animationDuration: "8s" }}
      />
      {/* inner container */}
      <div className="relative z-10 flex items-center justify-between bg-gray-900 text-white rounded-lg px-6 py-4">
        <span className="font-semibold">Add-on Apple Music Marketing</span>
        <button className="w-9 h-9 rounded-md bg-white text-black text-2xl leading-none flex items-center justify-center">
          +
        </button>
      </div>
    </div>
  );
} 