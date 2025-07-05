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
import Header from "../components/Header";
import { createClient } from '../utils/supabase/client';

export default function AddSongsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { title, artist, imageUrl, id, url } = router.query;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [focused, setFocused] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  // init first track from query (once router is ready)
  useEffect(() => {
    if (!router.isReady) return;

    // If tracks already initialized, skip
    if (tracks.length > 0) return;

    // Check if we're coming back from checkout with remaining tracks
    if (typeof window !== "undefined") {
      const checkoutCart = localStorage.getItem("checkoutCart");
      if (checkoutCart) {
        try {
          const cartData = JSON.parse(checkoutCart);
          const parsedTracks = JSON.parse(cartData.tracks) as Track[];
          setTracks(parsedTracks);
          return;
        } catch {}
      }
    }

    // Check if we're coming back from "Change Songs" with remaining tracks
    if (typeof window !== "undefined") {
      const remainingTracks = sessionStorage.getItem("remainingTracks");
      if (remainingTracks) {
        try {
          const parsedTracks = JSON.parse(remainingTracks) as Track[];
          setTracks(parsedTracks);
          sessionStorage.removeItem("remainingTracks");
          sessionStorage.removeItem("replacingSongIndex");
          return;
        } catch {}
      }
    }

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

  // Validate Spotify URL format
  const validateSpotifyUrl = (url: string): string | null => {
    if (!url.trim()) return null;

    // Check if it contains "spotify"
    if (!url.toLowerCase().includes('spotify')) {
      return "Uh Oh! This is not a Spotify link. Please provide a Spotify track link.";
    }

    // Check if it's an album link
    if (url.toLowerCase().includes('album')) {
      return 'Uh Oh! This is a Spotify "Album" link. We need a direct link to the Track that you want to promote. (open.spotify.com/track/...)';
    }

    // Check if it's a playlist link
    if (url.toLowerCase().includes('playlist')) {
      return 'Uh Oh! This is a Spotify "Playlist" link. We need a direct link to the Track that you want to promote. (open.spotify.com/track/...)';
    }

    return null; // Valid
  };

  // debounce search when input changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchTimeout) clearTimeout(searchTimeout);

    // Clear all previous states when input changes (this enables auto-restart)
    setError(null);
    setValidationError(null);
    setPreviewTrack(null);

    if (!input) {
      setLoading(false);
      return;
    }

    // First validate the URL format
    const validationErr = validateSpotifyUrl(input);
    if (validationErr) {
      setValidationError(validationErr);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      let isRequestActive = true;

      // Set a timeout for search results
      const timeout = setTimeout(() => {
        if (isRequestActive && loading) {
          setError("We can't find your song! Make sure you entered the Spotify track link correctly.");
          setLoading(false);
          isRequestActive = false;
        }
      }, 8000); // 8 second timeout

      setSearchTimeout(timeout);

      try {
        const res = await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: input }),
        });
        const data = await res.json();
        
        // Clear the timeout since we got a response
        clearTimeout(timeout);
        
        if (!isRequestActive) return; // Request was cancelled by timeout
        
        if (!data.success) {
          // Transform API errors into user-friendly messages
          setError("Sorry! We can't find this song on Spotify. Make sure you entered the link correctly and try again.");
          setPreviewTrack(null);
        } else {
          setPreviewTrack(data.track as Track);
        }
      } catch (err: any) {
        clearTimeout(timeout);
        
        if (!isRequestActive) return; // Request was cancelled by timeout
        
        // Transform any API/network errors into user-friendly messages
        setError("Sorry! We can't find this song on Spotify. Make sure you entered the link correctly and try again.");
        setPreviewTrack(null);
      } finally {
        if (isRequestActive) {
          setLoading(false);
        }
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [input]);

  const confirmPreview = () => {
    if (!previewTrack) return;
    
    const newTracks = [...tracks, previewTrack];
    setTracks(newTracks);
    setPreviewTrack(null);
    setInput("");

    // Check if we were replacing a song and should return to packages
    if (typeof window !== "undefined") {
      const wasReplacing = sessionStorage.getItem("replacingSongIndex");
      if (wasReplacing) {
        sessionStorage.removeItem("replacingSongIndex");
        // Go back to packages page with updated tracks
        setTimeout(() => {
          router.push({
            pathname: "/packages",
            query: {
              tracks: JSON.stringify(newTracks),
            },
          });
        }, 100);
      }
    }
  };

  // Remove a track from the lineup
  const removeTrack = (indexToRemove: number) => {
    const newTracks = tracks.filter((_, index) => index !== indexToRemove);
    setTracks(newTracks);
    
    // If no tracks left, redirect to home page
    if (newTracks.length === 0) {
      router.push('/');
    }
  };

  const promote = async () => {
    // Don't proceed if auth is still loading
    if (isAuthLoading) {
      console.log('🔐 ADD: Auth still loading, waiting...');
      alert("Please wait while we verify your account...");
      return;
    }

    console.log('🔐 ADD: promote called - currentUser:', currentUser);
    console.log('🔐 ADD: currentUser?.id:', currentUser?.id);
    console.log('🔐 ADD: isAuthLoading:', isAuthLoading);

    // Check if we're coming back from checkout with remaining cart data
    if (typeof window !== "undefined") {
      const checkoutCart = localStorage.getItem("checkoutCart");
      if (checkoutCart) {
        try {
          const cartData = JSON.parse(checkoutCart);
          const selectedPackages = JSON.parse(cartData.selectedPackages);
          
          // Clear the checkout cart since we're moving forward
          localStorage.removeItem("checkoutCart");
          
          // Create new session and go to checkout with user ID if logged in
          const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tracks,
              selectedPackages,
              userId: currentUser?.id || null // Include user ID if logged in
            }),
          });

          if (response.ok) {
            const { sessionId } = await response.json();
            console.log('🔐 ADD: Created checkout session with user:', currentUser?.email || 'anonymous');
            router.push({
              pathname: "/checkout",
              query: { sessionId }
            });
            return;
          } else {
            console.error('Failed to create checkout session');
            // Fall back to normal packages flow
          }
        } catch (error) {
          console.error('Failed to create checkout session:', error);
          // Fall back to normal packages flow
        }
      }
    }

    // Normal flow - go to packages page
    router.push({
      pathname: "/packages",
      query: {
        tracks: JSON.stringify(tracks),
      },
    });
  };

  // Check for authentication state
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔐 ADD: Auth check:', user?.email || 'No user');
      setCurrentUser(user);
      setIsAuthLoading(false);
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 ADD: Auth state changed:', event, session?.user?.email);
        setCurrentUser(session?.user ?? null);
        setIsAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Head>
        <title>Add another song – Fasho.co</title>
      </Head>
      <main className="min-h-screen bg-black text-white py-24 px-4 flex flex-col items-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-center mb-12">
          Add another song now for <span className="text-[#59e3a5]">25% OFF!</span>
        </h1>

        {/* cards */}
        <div className="flex gap-6 mb-10 flex-wrap justify-center items-center">
          {tracks.map((t, idx) => (
            <React.Fragment key={idx}>
              <SelectedTrackCard 
                track={t} 
                showDiscount={idx > 0} 
                onRemove={() => removeTrack(idx)}
              />
              <span className="text-5xl text-white/50 mx-4 flex items-center w-full sm:w-auto justify-center basis-full sm:basis-auto">+</span>
            </React.Fragment>
          ))}
          {/* empty slot at end */}
          <EmptySlotCard onClick={() => inputRef.current?.focus()} />
        </div>

        {/* search input */}
        <div className="w-full max-w-xl relative mb-8">
          <label className="block text-white/80 text-sm font-medium mb-2">
            Enter a Spotify track link:
          </label>
          <input
            ref={inputRef}
            type="url"
            placeholder="https://open.spotify.com/track/0FIDCN..."
            value={input}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-md px-4 py-3 text-gray-900 focus:outline-none"
          />
          {(focused || previewTrack || loading || validationError || error) && (
            <div className="absolute left-0 right-0 mt-2 z-50 w-full border border-white/20 rounded-lg bg-gray-900">
              {previewTrack ? (
                <TrackCard track={previewTrack} onConfirm={confirmPreview} dark />
              ) : validationError ? (
                <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 font-medium">{validationError}</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 font-medium">{error}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 gap-3">
                  <svg className="animate-spin h-6 w-6 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span className="text-white/70 font-semibold">
                    {loading ? "Searching..." : "Waiting For Song Link..."}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          disabled={tracks.length === 0}
          onClick={promote}
          className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 mb-20"
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
            <div className="absolute inset-0 border-container">
              <div className="absolute -inset-[100px] animate-spin-slow border-highlight"></div>
            </div>
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
        
        .border-container {
          background: rgba(22, 163, 74, 0.45);
          border-radius: 1rem;
        }
        
        .border-highlight {
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            #22c55e 30deg,
            #84cc16 45deg,
            #22c55e 60deg,
            transparent 90deg,
            transparent 180deg,
            #22c55e 210deg,
            #84cc16 225deg,
            #22c55e 240deg,
            transparent 270deg,
            transparent 360deg
          );
          border-radius: 1rem;
        }
      `}</style>
    </>
  );
} 