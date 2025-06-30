import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import TrackCard from "./TrackCard";
import { Track } from "../types/track";

export default function HeroSection() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // auto-fetch (debounced) when url changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!url) {
      setTrack(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setTrack(data.track as Track);
      } catch (err: any) {
        setError(err.message);
        setTrack(null);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    // cleanup on unmount
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url]);

  const handleConfirm = () => {
    if (!track) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("selectedTrack", JSON.stringify(track));
    }

    router.push({ pathname: "/add" });
  };

  return (
    <section className="w-full bg-gradient-to-b from-indigo-600 to-purple-600 py-24 px-4 text-center relative">
      <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
        Boost Your Spotify Streams with Fasho
      </h1>
      <p className="text-lg md:text-2xl text-white/90 max-w-2xl mx-auto mb-10">
        Paste your Spotify track link and choose a promotion package in seconds.
      </p>

      {/* input */}
      <div className="max-w-xl mx-auto relative">
        <input
          type="url"
          placeholder="https://open.spotify.com/track/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-md px-4 py-3 text-gray-900 focus:outline-none"
        />

        {/* dropdown result */}
        {track && !error && (
          <div className="absolute left-0 right-0 mt-2 z-10 w-full border border-gray-300/50 rounded-lg bg-white">
            <TrackCard track={track} onConfirm={handleConfirm} />
          </div>
        )}
      </div>

      {loading && (
        <p className="text-white/80 mt-4">Searching…</p>
      )}

      {error && (
        <p className="text-red-200 mt-4 font-medium">{error}</p>
      )}
    </section>
  );
} 