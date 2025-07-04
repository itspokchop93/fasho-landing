import Image from "next/image";
import { Track } from "../types/track";

interface Props {
  track: Track;
  onRemove?: () => void;
  showDiscount?: boolean;
}

export default function SelectedTrackCard({ track, onRemove, showDiscount = false }: Props) {
  return (
    <div className="relative bg-white/5 rounded-xl p-4 w-60 h-[262px] flex-shrink-0 text-center border border-white/20">
      {showDiscount && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-xs font-semibold px-2 py-1 rounded-md z-10">
          +25% OFF
        </div>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -left-2 w-6 h-6 bg-red-500/50 hover:bg-red-600/70 text-white rounded-full flex items-center justify-center transition-colors border-2 border-white/50 shadow-lg z-20"
          title="Remove song"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className="mb-3">
        <Image
          src={track.imageUrl}
          alt={track.title}
          width={180}
          height={180}
          className="mx-auto rounded-lg"
          unoptimized
        />
      </div>
      
      <h3 className="font-semibold text-white truncate mt-3" title={track.title}>
        {track.title}
      </h3>
      <p className="text-sm text-white/70 truncate" title={track.artist}>
        {track.artist}
      </p>
    </div>
  );
} 