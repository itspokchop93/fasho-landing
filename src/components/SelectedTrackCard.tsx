import Image from "next/image";
import { Track } from "../types/track";

interface Props {
  track: Track;
  onRemove?: () => void;
}

export default function SelectedTrackCard({ track, onRemove }: Props) {
  return (
    <div className="relative bg-white/5 border border-white/10 rounded-xl p-4 w-60 flex-shrink-0 text-center">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 text-white/80 hover:text-red-400"
        >
          ✕
        </button>
      )}
      <Image
        src={track.imageUrl}
        alt={track.title}
        width={180}
        height={180}
        className="rounded-lg mx-auto"
      />
      <h3 className="mt-3 font-semibold text-white truncate" title={track.title}>
        {track.title}
      </h3>
      <p className="text-sm text-white/70 truncate" title={track.artist}>
        {track.artist}
      </p>
    </div>
  );
} 