export default function EmptySlotCard() {
  return (
    <div className="relative bg-transparent border-2 border-dashed border-white/20 rounded-xl w-60 h-[262px] flex items-center justify-center flex-shrink-0">
      {/* 20% off flag */}
      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-pink-500 text-black text-xs font-semibold px-2 py-1 rounded-md">
        +20% OFF
      </div>
      <span className="text-5xl text-white/40">+</span>
    </div>
  );
} 