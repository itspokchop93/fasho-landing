interface EmptySlotCardProps {
  onClick?: () => void;
}

export default function EmptySlotCard({ onClick }: EmptySlotCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative w-60 h-[262px] flex-shrink-0 cursor-pointer rounded-xl overflow-hidden group"
    >
      {/* spinning gradient border */}
      <div
        className="absolute inset-0 animate-spin-slow bg-[conic-gradient(var(--tw-gradient-stops))] from-amber-400 via-pink-500 to-amber-400"
        style={{ animationDuration: "6s" }}
      />

      {/* inner card overlays the gradient, leaving 2px border */}
      <div className="absolute inset-[2px] rounded-lg bg-black/90 border-2 border-dashed border-white/20 flex items-center justify-center">
        {/* 20% flag */}
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-pink-500 text-black text-xs font-semibold px-2 py-1 rounded-md">
          +20% OFF
        </div>
        <p className="text-center text-sm text-white/60 leading-tight px-3">
          Add a second song
          <br /> below <span>👇</span>
        </p>
      </div>
    </div>
  );
} 