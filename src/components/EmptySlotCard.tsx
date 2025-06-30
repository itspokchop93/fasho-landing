interface EmptySlotCardProps {
  onClick?: () => void;
}

export default function EmptySlotCard({ onClick }: EmptySlotCardProps) {
  return (
    <div onClick={onClick} className="relative w-60 h-[262px] flex-shrink-0 cursor-pointer">
      {/* animated gradient border */}
      <div className="absolute inset-0 before:content-[''] before:absolute before:inset-0 before:rounded-xl before:bg-[conic-gradient(var(--tw-gradient-stops))] before:from-amber-400 before:via-pink-500 before:to-amber-400 before:animate-spin-slow p-0.5 rounded-xl">
        <div className="relative w-full h-full rounded-[calc(theme(borderRadius.xl)-2px)] bg-transparent border-2 border-dashed border-white/20 flex items-center justify-center">
          {/* 20% flag */}
          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-pink-500 text-black text-xs font-semibold px-2 py-1 rounded-md">
            +20% OFF
          </div>
          <p className="text-center text-sm text-white/60 leading-tight px-3">
            Add a second song<br/> below <span>👇</span>
          </p>
        </div>
      </div>
    </div>
  );
} 