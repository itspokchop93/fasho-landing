import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SelectedTrackCard from "../components/SelectedTrackCard";
import EmptySlotCard from "../components/EmptySlotCard";
import TrackCard from "../components/TrackCard";
import { Track } from "../types/track";
import React from "react";
import GradientTestCard from "../components/GradientTestCard";

export default function AddSongsPage() {
  const router = useRouter();
  const { title, artist, imageUrl, id, url } = router.query;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
              <SelectedTrackCard track={t} />
              <span className="text-5xl text-white/50 mx-4 flex items-center">+</span>
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
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-md px-4 py-3 text-gray-900 focus:outline-none"
          />
          {previewTrack && !error && (
            <div className="absolute left-0 right-0 mt-2 z-10 w-full border border-white/20 rounded-lg bg-gray-900">
              <TrackCard track={previewTrack} onConfirm={confirmPreview} dark />
            </div>
          )}
        </div>

        {loading && <p className="mb-4">Searching…</p>}
        {error && <p className="text-red-400 mb-4">{error}</p>}

        <button
          disabled={tracks.length === 0}
          onClick={promote}
          className="bg-gradient-to-r from-amber-400 to-pink-500 text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50"
        >
          Promote selected songs →
        </button>

        {/* temporary test container for animated border */}
        <GradientTestCard />
      </main>
    </>
  );
} 