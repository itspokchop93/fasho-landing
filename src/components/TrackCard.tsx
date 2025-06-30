import Image from "next/image";
import { Track } from "../types/track";

interface Props {
  track: Track;
  onConfirm: () => void;
}

export default function TrackCard({ track, onConfirm }: Props) {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 max-w-md mx-auto text-left">
      <div className="flex items-center gap-4">
        <Image
          src={track.imageUrl}
          alt={`${track.title} cover art`}
          width={80}
          height={80}
          className="rounded-md"
        />
        <div>
          <h3 className="font-semibold text-lg">{track.title}</h3>
          <p className="text-gray-600">{track.artist}</p>
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