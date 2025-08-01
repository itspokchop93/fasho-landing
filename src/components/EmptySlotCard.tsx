interface EmptySlotCardProps {
  onClick?: () => void;
}

export default function EmptySlotCard({ onClick }: EmptySlotCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative w-40 sm:w-60 h-[180px] sm:h-[262px] flex-shrink-0 cursor-pointer rounded-xl group"
    >
      {/* simple inner card */}
      <div className="absolute inset-0 rounded-xl bg-gray-800 border-2 border-dashed border-white/20 flex items-center justify-center">
        {/* 20% flag */}
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-xs font-semibold px-2 py-1 rounded-md shadow-lg">
          +25% OFF
        </div>
        <p className="text-center text-xs sm:text-sm text-white/60 leading-tight px-2 sm:px-3">
          Add additional songs
          <br /> below <span>👇</span>
        </p>
      </div>
    </div>
  );
} 