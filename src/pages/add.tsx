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
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSpotifyUrl, setIsSpotifyUrl] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);

  // Function to scroll to newly added track on mobile
  const scrollToNewTrack = (trackIndex: number) => {
    // Only scroll on mobile devices
    if (window.innerWidth <= 768 && tracksContainerRef.current) {
      setTimeout(() => {
        const container = tracksContainerRef.current;
        if (container) {
          // Get all track cards in the container
          const trackCards = container.querySelectorAll('[data-track-card]');
          const targetCard = trackCards[trackIndex];
          
          if (targetCard) {
            // Calculate the position to scroll to
            const containerTop = container.offsetTop;
            const cardTop = (targetCard as HTMLElement).offsetTop;
            const scrollPosition = containerTop + cardTop - 100; // 100px offset from top
            
            // Smooth scroll to the new track card
            window.scrollTo({
              top: scrollPosition,
              behavior: 'smooth'
            });
          }
        }
      }, 100); // Small delay to ensure DOM is updated
    }
  };

  // init first track from query (once router is ready)
  useEffect(() => {
    if (!router.isReady) return;

    // If tracks already initialized, skip
    if (tracks.length > 0) return;

    // 1. NEW: Check for selectedTrack param from homepage
    const { selectedTrack, tracks: tracksParam } = router.query;
    if (selectedTrack && typeof selectedTrack === 'string') {
      try {
        const track = JSON.parse(decodeURIComponent(selectedTrack));
        if (track && track.id) {
          // Clear all previous session/localStorage
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('selectedTracks');
            sessionStorage.removeItem('remainingTracks');
            sessionStorage.removeItem('replacingSongIndex');
            localStorage.removeItem('checkoutCart');
          }
          setTracks([track]);
          return;
        }
      } catch (error) {
        console.error('🎵 ADD-PAGE: Failed to parse selectedTrack from URL:', error);
      }
    }

    // 2. Check for track data from URL parameters (from promote button)
    if (tracksParam && typeof tracksParam === 'string') {
      try {
        const trackData = JSON.parse(tracksParam);
        if (Array.isArray(trackData) && trackData.length > 0) {
          setTracks(trackData);
          return;
        }
      } catch (error) {
        console.error('🎵 ADD-PAGE: Failed to parse track data from URL:', error);
      }
    }

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
  }, [router.isReady, title, artist, imageUrl, id, url, router.query.tracks]);

  // Check if input is a Spotify URL
  const isSpotifyUrlCheck = (url: string): boolean => {
    return url.toLowerCase().includes('spotify.com/track/');
  };

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

  // Search Spotify tracks
  const searchSpotifyTracks = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/spotify/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim(), limit: 8 }),
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.tracks);
        setShowSearchResults(true);
        setHasSearched(true);
      } else {
        setError(data.error || 'Failed to search tracks');
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (err) {
      setError('Failed to search tracks. Please try again.');
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle track selection from search results
  const selectTrackFromSearch = (track: Track) => {
    // Log artist profile URL for testing
    console.log(`🎵 TRACK-SELECTED: "${track.title}" by ${track.artist}`);
    console.log(`🎵 TRACK-URL: ${track.url}`);
    console.log(`🎵 ARTIST-PROFILE-URL: ${track.artistProfileUrl || 'Not available'}`);
    
    // Show success message with artist profile URL for testing
    if (track.artistProfileUrl) {
      console.log(`✅ ARTIST-PROFILE-CAPTURED: Successfully captured artist profile URL for ${track.artist}`);
      // You can uncomment the line below to show an alert for testing
      // alert(`✅ Artist profile captured! ${track.artist}: ${track.artistProfileUrl}`);
    } else {
      console.warn(`⚠️ ARTIST-PROFILE-MISSING: No artist profile URL found for ${track.artist}`);
    }
    
    const newTracks = [...tracks, track];
    setTracks(newTracks);
    setInput("");
    setSearchResults([]);
    setShowSearchResults(false);
    setPreviewTrack(null);
    setHasSearched(false);
    scrollToNewTrack(newTracks.length - 1);
  };

  // debounce search when input changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchTimeout) clearTimeout(searchTimeout);

    // Clear all previous states when input changes
    setError(null);
    setValidationError(null);
    setPreviewTrack(null);

    if (!input) {
      setLoading(false);
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSpotifyUrl(false);
      return;
    }

    // Check if input is a Spotify URL
    const isUrl = isSpotifyUrlCheck(input);
    setIsSpotifyUrl(isUrl);

    if (isUrl) {
      // Handle Spotify URL input (existing logic)
      const validationErr = validateSpotifyUrl(input);
      if (validationErr) {
        setValidationError(validationErr);
        setLoading(false);
        setShowSearchResults(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);
        let isRequestActive = true;

        const timeout = setTimeout(() => {
          if (isRequestActive && loading) {
            setError("We can't find your song! Make sure you entered the Spotify track link correctly.");
            setLoading(false);
            isRequestActive = false;
          }
        }, 8000);

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
          
          clearTimeout(timeout);
          
          if (!isRequestActive) return;
          
          if (!data.success) {
            setError("Sorry! We can't find this song on Spotify. Make sure you entered the link correctly and try again.");
            setPreviewTrack(null);
          } else {
            setPreviewTrack(data.track as Track);
          }
        } catch (err: any) {
          clearTimeout(timeout);
          
          if (!isRequestActive) return;
          
          setError("Sorry! We can't find this song on Spotify. Make sure you entered the link correctly and try again.");
          setPreviewTrack(null);
        } finally {
          if (isRequestActive) {
            setLoading(false);
          }
        }
      }, 500);
    } else {
      // Handle search input (new logic)
      setShowSearchResults(false);
      debounceRef.current = setTimeout(() => {
        searchSpotifyTracks(input);
      }, 300);
    }

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
    setHasSearched(false);
    scrollToNewTrack(newTracks.length - 1);
  };

  const removeTrack = (indexToRemove: number) => {
    const newTracks = tracks.filter((_, index) => index !== indexToRemove);
    setTracks(newTracks);
    
    // If no tracks left, redirect to home page
    if (newTracks.length === 0) {
      router.push('/');
    }
  };

  const promote = async () => {
    if (tracks.length === 0) return;
    
    // Save tracks to session storage for potential return
    sessionStorage.setItem("selectedTracks", JSON.stringify(tracks));

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
        <div className="flex gap-6 mb-10 flex-wrap justify-center items-center" ref={tracksContainerRef}>
          {tracks.map((t, idx) => (
            <React.Fragment key={idx}>
              <div data-track-card>
                <SelectedTrackCard 
                  track={t} 
                  showDiscount={idx > 0} 
                  onRemove={() => removeTrack(idx)}
                />
              </div>
              <span className="text-5xl text-white/50 mx-4 flex items-center w-full sm:w-auto justify-center basis-full sm:basis-auto">+</span>
            </React.Fragment>
          ))}
          {/* empty slot at end */}
          <EmptySlotCard onClick={() => inputRef.current?.focus()} />
        </div>

        {/* search input */}
        <div className="w-full max-w-xl relative mb-8">
          <label className="block text-white/80 text-sm font-medium mb-2">
            Search for a song or paste a Spotify track link:
          </label>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search: 'Bad Bunny Titi Me Pregunto' or paste: https://open.spotify.com/track/..."
            value={input}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Delay hiding search results to allow for clicks
              setTimeout(() => setFocused(false), 200);
            }}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-md px-4 py-3 text-gray-900 focus:outline-none"
          />
          {(focused || previewTrack || loading || validationError || error || showSearchResults) && (
            <div className="absolute left-0 right-0 mt-2 z-50 w-full border border-white/20 rounded-lg bg-gray-900 max-h-96 overflow-y-auto">
              {/* Show preview track for Spotify URLs */}
              {previewTrack && isSpotifyUrl ? (
                <TrackCard track={previewTrack} onConfirm={confirmPreview} dark />
              ) : 
              /* Show search results for search queries */
              showSearchResults && searchResults.length > 0 ? (
                <div className="p-2">
                  <div className="text-white/60 text-sm font-medium mb-2 px-2">
                    Search Results:
                  </div>
                  {searchResults.map((track, index) => (
                    <div key={track.id} className="flex items-center p-3 hover:bg-gray-800/50 rounded-lg transition-colors">
                      <img 
                        src={track.imageUrl} 
                        alt={track.title}
                        className="w-12 h-12 rounded-md object-cover mr-3"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm truncate">{track.title}</div>
                        <div className="text-gray-400 text-xs truncate">{track.artist}</div>
                      </div>
                      <button
                        onClick={() => selectTrackFromSearch(track)}
                        className="ml-3 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 flex-shrink-0"
                      >
                        ADD
                      </button>
                    </div>
                  ))}
                </div>
              ) : 
              /* Show validation/error messages */
              validationError ? (
                <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 font-medium">{validationError}</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 font-medium">{error}</p>
                </div>
              ) : 
              /* Show loading state */
              (loading || isSearching) ? (
                <div className="flex items-center justify-center py-6 gap-3">
                  <svg className="animate-spin h-6 w-6 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span className="text-white/70 font-semibold">
                    {isSearching ? "Searching..." : "Loading..."}
                  </span>
                </div>
              ) : 
              /* Show empty state when no results */
              hasSearched && searchResults.length === 0 && !isSpotifyUrl ? (
                <div className="p-4 text-center">
                  <p className="text-white/60 text-sm">No songs found. Try a different search term.</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 gap-3">
                  <span className="text-white/70 font-semibold">
                    {isSpotifyUrl ? "Paste a Spotify link or search for a song..." : "Type to search for songs..."}
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