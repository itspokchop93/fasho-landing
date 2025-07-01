import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SelectedTrackCard from "../components/SelectedTrackCard";
import EmptySlotCard from "../components/EmptySlotCard";
import TrackCard from "../components/TrackCard";
import { Track } from "../types/track";
import React from "react";
import GradientTestCard from "../components/GradientTestCard";
import ShapeDivider from "../components/ShapeDivider";

export default function AddSongsPage() {
  const router = useRouter();
  const { title, artist, imageUrl, id, url } = router.query;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [focused, setFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // init first track from query (once router is ready)
  useEffect(() => {
    if (!router.isReady) return;

    // If tracks already initialized, skip
    if (tracks.length > 0) return;

    if (title && artist && imageUrl && id && url) {
      const first: Track = {
        title: title as string,
        artist: artist as string,
        imageUrl: imageUrl as string,
        id: id as string,
        url: url as string,
      };
      setTracks([first]);
    } else if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("selectedTrack");
      if (stored) {
        try {
          const t = JSON.parse(stored) as Track;
          setTracks([t]);
        } catch {}
      }
    }
  }, [router.isReady, title, artist, imageUrl, id, url]);

  // debounce search when input changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!input) {
      setPreviewTrack(null);
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
          body: JSON.stringify({ url: input }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setPreviewTrack(data.track as Track);
      } catch (err: any) {
        setError(err.message);
        setPreviewTrack(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  const confirmPreview = () => {
    if (!previewTrack) return;
    setTracks((prev) => [...prev, previewTrack]);
    setPreviewTrack(null);
    setInput("");
  };

  const promote = () => {
    router.push({
      pathname: "/checkout",
      query: {
        tracks: JSON.stringify(tracks),
      },
    });
  };

  return (
    <>
      <Head>
        <title>Add another song – Fasho.co</title>
      </Head>
      <main className="min-h-screen bg-black text-white py-24 px-4 flex flex-col items-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-center mb-12">
          Add another song now for <span className="text-amber-400">20% OFF!</span>
        </h1>

        {/* cards */}
        <div className="flex gap-6 mb-10 flex-wrap justify-center items-center">
          {tracks.map((t, idx) => (
            <React.Fragment key={idx}>
              <SelectedTrackCard track={t} showDiscount={idx > 0} />
              <span className="text-5xl text-white/50 mx-4 flex items-center w-full sm:w-auto justify-center basis-full sm:basis-auto">+</span>
            </React.Fragment>
          ))}
          {/* empty slot at end */}
          <EmptySlotCard onClick={() => inputRef.current?.focus()} />
        </div>

        {/* search input */}
        <div className="w-full max-w-xl relative mb-8">
          <input
            ref={inputRef}
            type="url"
            placeholder="Paste another Spotify link..."
            value={input}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-md px-4 py-3 text-gray-900 focus:outline-none"
          />
          {(focused || previewTrack) && (
            <div className="absolute left-0 right-0 mt-2 z-50 w-full border border-white/20 rounded-lg bg-gray-900">
              {previewTrack && !error ? (
                <TrackCard track={previewTrack} onConfirm={confirmPreview} dark />
              ) : (
                <div className="flex items-center justify-center py-6">
                  <svg className="animate-spin h-6 w-6 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {loading && <p className="mb-4">Searching…</p>}
        {error && <p className="text-red-400 mb-4">{error}</p>}

        <button
          disabled={tracks.length === 0}
          onClick={promote}
          className="bg-gradient-to-r from-amber-400 to-pink-500 text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 mb-20"
        >
          Promote selected songs →
        </button>

        {/* shape divider */}
        <div className="w-full mb-20">
          <ShapeDivider />
        </div>

        {/* YouTube Marketing container with animated gradient border */}
        <div className="relative w-full max-w-md mb-16">
          {/* Outer glow layer (lower z-index) */}
          <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
          
          {/* Animated border layer */}
          <div className="absolute -inset-0.5 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-500 via-green-600 via-lime-400 to-green-400 animate-spin-slow"></div>
          </div>
          
          {/* Content container */}
          <div className="relative bg-gray-900 rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-4">Add-On YouTube Marketing</h3>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-lg">✓</span>
                <span className="text-sm">YouTube Shorts promotion</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-lg">✓</span>
                <span className="text-sm">Algorithm optimization</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-lg">✓</span>
                <span className="text-sm">Viral content strategy</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-400 line-through text-sm">$199</span>
                <span className="text-white font-bold text-lg ml-2">$89</span>
              </div>
              <button className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors">
                +
              </button>
            </div>
          </div>
        </div>

        {/* temporary test container for animated border */}
        <GradientTestCard />
      </main>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </>
  );
} 