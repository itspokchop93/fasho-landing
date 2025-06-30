import Image from "next/image";
import { Track } from "../types/track";

interface Props {
  track: Track;
  onConfirm: () => void;
  dark?: boolean;
}

export default function TrackCard({ track, onConfirm, dark = false }: Props) {
  const container = dark
    ? "bg-gray-800 text-white"
    : "bg-white text-gray-900";
  const artistColor = dark ? "text-gray-300" : "text-gray-600";
  return (
    <div className={`${container} shadow-lg rounded-lg p-6 max-w-md mx-auto text-left`}>
      <div className="flex items-center gap-4">
        <Image
          src={track.imageUrl}
          alt={`${track.title} cover art`}
          width={80}
          height={80}
          className="rounded-md"
          unoptimized
        />
        <div>
          <h3 className="font-semibold text-lg">{track.title}</h3>
          <p className={`${artistColor}`}>{track.artist}</p>
        </div>
      </div>
      <button
        onClick={onConfirm}
        className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700 transition"
      >
        Yes, promote this track
      </button>
    </div>
  );
} 