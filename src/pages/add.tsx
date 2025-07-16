import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SelectedTrackCard from "../components/SelectedTrackCard";
import EmptySlotCard from "../components/EmptySlotCard";
import TrackCard from "../components/TrackCard";
import { Track } from "../types/track";
import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { createClient } from '../utils/supabase/client';
import { createPortal } from 'react-dom';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isMounted, setIsMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when input changes or dropdown opens
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px gap
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Track when component is mounted for portal
  useEffect(() => { setIsMounted(true); }, []);

  // Update position on focus, showSearchResults, or input change
  useEffect(() => {
    if (focused || showSearchResults) {
      updateDropdownPosition();
    }
  }, [focused, showSearchResults, input]);

  // Update position on scroll/resize
  useEffect(() => {
    if (focused || showSearchResults) {
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [focused, showSearchResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside the entire search container
      if (
        searchDropdownRef.current && !searchDropdownRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target)
      ) {
        setFocused(false);
        setShowSearchResults(false);
        setPreviewTrack(null); // Hide preview dropdown as well
      }
    };

    if (showSearchResults || focused || previewTrack) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults, focused, previewTrack]);

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
      <Header transparent={true} />
      <main className="min-h-screen bg-black text-white py-16 md:py-24 px-4 flex flex-col items-center">
        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-4 md:mb-6 relative z-10 leading-tight mt-[10px]">
          <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">More</span> Songs = <span className="bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent">More</span> Success 🚀
        </h1>
        
        {/* Secondary Heading */}
        <h2 className="text-[2.15rem] sm:text-3xl md:text-3xl lg:text-5xl font-bold text-center mb-3 md:mb-4 relative z-10 leading-tight">
          Add additional songs<br className="sm:hidden" /> now for <span className="text-[#59e3a5] font-black">25% OFF!</span>
        </h2>
        
        {/* Subheadline */}
        <p className="text-sm sm:text-base md:text-base text-gray-300 text-center mb-8 md:mb-12 max-w-2xl relative z-10 px-2 mt-1">
          You're Smart. You Know One Song Won't Build A Career By Itself.
        </p>

        {/* cards */}
        <div className="flex gap-4 md:gap-6 mb-6 md:mb-10 flex-wrap justify-center items-center relative z-10" ref={tracksContainerRef}>
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

        {/* Search Container with Dark Gradient Background */}
        <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/70 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-8 border border-gray-600/30 mb-6 md:mb-8 w-full max-w-3xl z-10">
          {/* Dark gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700/40 via-gray-800/30 to-gray-900/40 rounded-3xl p-[1px]">
            <div className="h-full w-full rounded-3xl bg-gradient-to-br from-gray-900/95 to-gray-800/85 backdrop-blur-xl"></div>
          </div>
          
          <div className="relative z-10">
        {/* search input */}
            <div className="w-full relative mb-6">
              <label className="block text-white/80 text-base md:text-lg font-semibold mb-3 text-center">
            Find Your <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Add-On</span> Tracks Here:
          </label>
          <input
            ref={inputRef}
            type="text"
                placeholder="Search Your Song Name or Paste A Track Link"
            value={input}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Delay hiding search results to allow for clicks
              setTimeout(() => setFocused(false), 200);
            }}
            onChange={(e) => setInput(e.target.value)}
                className="w-full rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#14c0ff]/50 transition-all duration-300 text-sm md:text-base"
          />

        </div>

        <button
          disabled={tracks.length === 0}
          onClick={promote}
              className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-4 md:px-8 py-3 md:py-4 rounded-lg md:rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-[#14c0ff]/30 transition-all duration-300 text-sm md:text-base"
        >
          Promote selected songs →
        </button>

        {/* Conditional "No thanks" button - only show when user has exactly 1 song */}
        {tracks.length === 1 && (
          <button
            onClick={promote}
            className="w-full text-gray-400 text-xs opacity-50 mt-3 hover:opacity-75 transition-opacity duration-200 underline"
          >
            No thanks, I don't want compounding growth
          </button>
        )}
          </div>
        </div>

        {/* Text under button */}
        <p className="text-sm sm:text-base md:text-lg text-gray-400 text-center mb-12 md:mb-20 max-w-3xl leading-relaxed relative z-10 px-2">
          Think about it - while other artists drop one track and pray, you're building a whole catalog of playlist-backed hits. Every song working together to create unstoppable momentum.
        </p>

        {/* Shape Divider from Homepage (homeShapeGradient) */}
        <div className="relative z-50 w-full" style={{ height: '200px', width: '110vw', left: '-5vw', transform: 'rotate(-3deg)', background: 'transparent', marginTop: '-35px' }}>
          {/* Background foundation */}
          <div className="absolute inset-0 z-30" style={{ background: 'transparent' }}></div>
          
          {/* Base layer - darkest */}
          <svg
            className="absolute inset-0 w-full h-full z-40"
            viewBox="0 0 1440 200"
            preserveAspectRatio="none"
            style={{ filter: 'drop-shadow(0 4px 20px rgba(20, 192, 255, 0.4))' }}
          >
            <defs>
              <linearGradient id="homeShapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.67" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <path
              d="M-200,30 C100,120 300,10 500,90 C700,170 900,20 1100,100 C1300,180 1500,15 1640,70 L1640,150 C1500,120 1300,160 1100,140 C900,120 700,180 500,160 C300,140 100,190 -200,170 Z"
              fill="url(#homeShapeGradient1)"
            />
          </svg>

          {/* Middle layer */}
          <svg
            className="absolute inset-0 w-full h-full z-40"
            viewBox="0 0 1440 200"
            preserveAspectRatio="none"
            style={{ filter: 'drop-shadow(0 4px 16px rgba(89, 227, 165, 0.4))' }}
          >
            <defs>
              <linearGradient id="homeShapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <path
              d="M-200,45 C150,140 400,15 650,110 C900,190 1150,25 1400,125 C1550,165 1640,55 1640,55 L1640,145 C1550,115 1400,185 1150,125 C900,75 650,195 400,145 C150,95 -200,195 -200,195 Z"
              fill="url(#homeShapeGradient2)"
            />
          </svg>

          {/* Top layer - brightest */}
          <svg
            className="absolute inset-0 w-full h-full z-40"
            viewBox="0 0 1440 200"
            preserveAspectRatio="none"
            style={{ filter: 'drop-shadow(0 2px 12px rgba(139, 92, 246, 0.5))' }}
          >
            <defs>
              <linearGradient id="homeShapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <path
              d="M-200,65 C200,155 450,20 700,120 C950,185 1200,30 1450,135 C1600,175 1640,70 1640,70 L1640,125 C1600,95 1450,180 1200,125 C950,55 700,185 450,135 C200,75 -200,75 -200,75 Z"
              fill="url(#homeShapeGradient3)"
            />
          </svg>

          {/* Additional accent layer */}
          <svg
            className="absolute inset-0 w-full h-full z-40"
            viewBox="0 0 1440 200"
            preserveAspectRatio="none"
            style={{ filter: 'drop-shadow(0 1px 8px rgba(89, 227, 165, 0.3))' }}
          >
            <defs>
              <linearGradient id="homeShapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.68" />
                <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.68" />
              </linearGradient>
            </defs>
            <path
              d="M-200,55 C120,15 280,150 440,65 C600,20 760,165 920,75 C1080,25 1240,145 1400,85 C1520,55 1640,115 1640,115 L1640,165 C1520,135 1400,185 1240,165 C1080,135 920,195 760,175 C600,155 440,195 280,175 C120,155 -200,185 -200,185 Z"
              fill="url(#homeShapeGradient4)"
            />
          </svg>

          {/* Enhanced sparkles layer - bright white/silver sparkles */}
          <div className="absolute inset-0 pointer-events-none z-50">
            {/* Large sparkle effects */}
            <div className="absolute top-[20%] left-[15%] w-3 h-3 bg-white rounded-full opacity-90 animate-pulse" style={{ animationDelay: '0s', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }}></div>
            <div className="absolute top-[60%] left-[25%] w-2 h-2 bg-white rounded-full opacity-80 animate-pulse" style={{ animationDelay: '1s', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}></div>
            <div className="absolute top-[40%] left-[45%] w-4 h-4 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: '2s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.9))' }}></div>
            <div className="absolute top-[30%] left-[65%] w-2 h-2 bg-white rounded-full opacity-85 animate-pulse" style={{ animationDelay: '0.5s', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.7))' }}></div>
            <div className="absolute top-[70%] left-[75%] w-3 h-3 bg-white rounded-full opacity-75 animate-pulse" style={{ animationDelay: '1.5s', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }}></div>
            <div className="absolute top-[50%] left-[85%] w-2 h-2 bg-white rounded-full opacity-90 animate-pulse" style={{ animationDelay: '2.5s', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}></div>
            
            {/* Medium sparkles */}
            <div className="absolute top-[35%] left-[20%] w-1.5 h-1.5 bg-white rounded-full opacity-60 animate-pulse" style={{ animationDelay: '3s', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))' }}></div>
            <div className="absolute top-[80%] left-[35%] w-1 h-1 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: '0.8s', filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))' }}></div>
            <div className="absolute top-[15%] left-[55%] w-2 h-2 bg-white rounded-full opacity-80 animate-pulse" style={{ animationDelay: '1.8s', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}></div>
            <div className="absolute top-[65%] left-[70%] w-1 h-1 bg-white rounded-full opacity-65 animate-pulse" style={{ animationDelay: '2.8s', filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))' }}></div>
            <div className="absolute top-[45%] left-[90%] w-1.5 h-1.5 bg-white rounded-full opacity-75 animate-pulse" style={{ animationDelay: '0.3s', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))' }}></div>
            
            {/* Small sparkles for density */}
            <div className="absolute top-[25%] left-[10%] w-1 h-1 bg-white rounded-full opacity-50 animate-pulse" style={{ animationDelay: '1.3s' }}></div>
            <div className="absolute top-[55%] left-[30%] w-0.5 h-0.5 bg-white rounded-full opacity-60 animate-pulse" style={{ animationDelay: '2.3s' }}></div>
            <div className="absolute top-[75%] left-[50%] w-1 h-1 bg-white rounded-full opacity-55 animate-pulse" style={{ animationDelay: '0.7s' }}></div>
            <div className="absolute top-[35%] left-[80%] w-0.5 h-0.5 bg-white rounded-full opacity-65 animate-pulse" style={{ animationDelay: '1.7s' }}></div>
            <div className="absolute top-[85%] left-[60%] w-1 h-1 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: '2.7s' }}></div>
          </div>
        </div>

        {/* Big Gradient Background - In Far Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[100vh] bg-gradient-to-br from-[#59e3a5]/25 via-[#14c0ff]/20 via-[#8b5cf6]/25 to-[#59e3a5]/15 rounded-full blur-3xl opacity-80"></div>
          <div className="absolute top-1/3 left-1/3 w-[80vw] h-[80vh] bg-gradient-to-tr from-[#14c0ff]/20 via-transparent to-[#8b5cf6]/20 rounded-full blur-2xl"></div>
        </div>

        {/* SECTION #1: Why Artists Add Multiple Songs */}
        <section className="w-full max-w-7xl px-4 py-12 md:py-20 relative">
          
          <div className="relative z-10">
            {/* Section Title */}
            <div className="text-center mb-8 md:mb-16 px-2 md:px-4 py-6 md:py-12">
              <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-black mb-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent leading-tight px-4 py-2 -mb-[20px] md:-mb-[45px]">
                Why Artists Add Multiple Songs (And Win Big)
              </h2>
            </div>

            {/* Three Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {/* Card 1: Compound Growth */}
              <div className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl rounded-2xl p-4 md:p-8 border border-white/10 hover:border-[#59e3a5]/30 transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="text-3xl md:text-4xl mb-3 md:mb-4">📈</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#59e3a5]">Compound Your Growth</h3>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    When you run multiple campaigns simultaneously, your monthly listeners don't just add up - they <span className="text-white font-semibold">MULTIPLY</span>. Fans discover one song, then dive into your whole catalog.
                  </p>
                </div>
              </div>

              {/* Card 2: Algorithm */}
              <div className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl rounded-2xl p-4 md:p-8 border border-white/10 hover:border-[#14c0ff]/30 transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-[#14c0ff]/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="text-3xl md:text-4xl mb-3 md:mb-4">🎯</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#14c0ff]">Dominate The Algorithm</h3>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    Spotify's algorithm loves consistency. Multiple active songs = multiple data points showing you're an artist worth pushing. It's basically <span className="text-white font-semibold">cheat codes</span> for organic growth.
                  </p>
                </div>
              </div>

              {/* Card 3: Revenue */}
              <div className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl rounded-2xl p-4 md:p-8 border border-white/10 hover:border-[#8b5cf6]/30 transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/10 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="text-3xl md:text-4xl mb-3 md:mb-4">💰</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#8b5cf6]">Stack Your Streams</h3>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    Why settle for one revenue stream when you could have 5? Every song earning royalties. Every track building your fanbase. This is how you turn music into a <span className="text-white font-semibold">real income</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION #2: The Math */}
        <section className="w-full max-w-6xl px-4 py-12 md:py-20 relative mt-[10px] md:mt-[20px]">
          {/* Section Title */}
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-black mb-6 bg-gradient-to-r from-[#14c0ff] via-[#8b5cf6] to-[#59e3a5] bg-clip-text text-transparent -mb-[10px] md:-mb-[20px] px-2">
              The Math Just Makes Sense
            </h2>
          </div>

          {/* Math Cards - Vertical Stack */}
          <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
            {/* 1 Song */}
            <div className="relative bg-gradient-to-r from-gray-900/90 to-gray-800/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center text-black font-bold text-lg md:text-xl">1</div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-white">1 Song Campaign</h3>
                    <p className="text-sm md:text-base text-gray-400">Great start, solid growth</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl md:text-2xl font-bold text-[#59e3a5]">1x</div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">Growth Rate</div>
                </div>
              </div>
            </div>

            {/* 3 Songs */}
            <div className="relative bg-gradient-to-r from-[#14c0ff]/20 via-gray-900/90 to-gray-800/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-[#14c0ff]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] rounded-full flex items-center justify-center text-black font-bold text-lg md:text-xl shrink-0">3</div>
                  <div>
                    <h3 className="text-xl font-bold text-white">3 Song Campaign</h3>
                    <p className="text-sm md:text-base text-gray-300">3x the playlist placements, 3x the discovery potential, only 2.25x the cost</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#14c0ff]">3x</div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">Growth Rate</div>
                </div>
              </div>
            </div>

            {/* 5 Songs */}
            <div className="relative bg-gradient-to-r from-[#8b5cf6]/20 via-gray-900/90 to-gray-800/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-[#8b5cf6]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] rounded-full flex items-center justify-center text-black font-bold text-lg md:text-xl shrink-0">5</div>
                  <div>
                    <h3 className="text-xl font-bold text-white">5 Song Campaign</h3>
                    <p className="text-sm md:text-base text-gray-300">Full catalog exposure, maximum algorithm leverage, unstoppable momentum</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#8b5cf6]">5x</div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">Growth Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Tip */}
          <div className="relative bg-gradient-to-r from-[#59e3a5]/10 via-[#14c0ff]/10 to-[#8b5cf6]/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 mb-6">
                <span className="text-3xl">💡</span>
                <span className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Pro Tip</span>
              </div>
              <p className="text-xl md:text-2xl text-white font-medium">
                Artists who market 3+ songs see <span className="text-[#59e3a5] font-bold text-3xl">400%</span> better long-term growth than single-song campaigns
              </p>
            </div>
          </div>
        </section>

        {/* SECTION #3: Real Artists Know */}
        <section className="w-full max-w-5xl px-4 py-12 md:py-20 relative mb-12 md:mb-20">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8b5cf6]/5 via-transparent to-[#59e3a5]/5 rounded-3xl blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Section Title */}
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl font-black mb-6 bg-gradient-to-r from-[#8b5cf6] via-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent px-2">
                Real Artists Know:<br />
                <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">Your Best Song Might Not Be Your First</span>
              </h2>
            </div>

            {/* Quote-style Cards */}
            <div className="space-y-4 md:space-y-8">
              {/* Quote 1 */}
              <div className="relative bg-gradient-to-br from-gray-900/70 to-gray-800/50 backdrop-blur-xl rounded-2xl p-4 md:p-8 border border-white/10">
                <div className="flex items-start space-x-3 md:space-x-4">
                  <div className="text-3xl md:text-4xl lg:text-5xl text-[#59e3a5] font-serif">"</div>
                  <div className="flex-1">
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-300 mb-2 md:mb-3">That track you think is mid?</p>
                    <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">Could be your breakthrough hit.</p>
                  </div>
                </div>
              </div>

              {/* Quote 2 */}
              <div className="relative bg-gradient-to-br from-gray-900/70 to-gray-800/50 backdrop-blur-xl rounded-2xl p-4 md:p-8 border border-white/10">
                <div className="flex items-start space-x-3 md:space-x-4">
                  <div className="text-3xl md:text-4xl lg:text-5xl text-[#14c0ff] font-serif">"</div>
                  <div className="flex-1">
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-300 mb-2 md:mb-3">That deep cut on your EP?</p>
                    <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">Might be the one that catches fire.</p>
                  </div>
                </div>
              </div>

              {/* Quote 3 */}
              <div className="relative bg-gradient-to-br from-gray-900/70 to-gray-800/50 backdrop-blur-xl rounded-2xl p-4 md:p-8 border border-white/10">
                <div className="flex items-start space-x-3 md:space-x-4">
                  <div className="text-3xl md:text-4xl lg:text-5xl text-[#8b5cf6] font-serif">"</div>
                  <div className="flex-1">
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-300 mb-2 md:mb-3">That feature you did last year?</p>
                    <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">Perfect time to give it new life.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Final CTA */}
            <div className="text-center mt-16">
              <div className="bg-gradient-to-r from-[#59e3a5]/20 via-[#14c0ff]/20 to-[#8b5cf6]/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 mb-8">
                <p className="text-xl md:text-2xl font-bold text-white mb-4">
                  Don't leave money on the table. Don't let potential hits die in your catalog.
                </p>
                <div className="w-full h-1 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-full"></div>
              </div>
              
              {/* Button to scroll back to search */}
              <button
                onClick={() => {
                  const inputField = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (inputField) {
                    inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => inputField.focus(), 500);
                  }
                }}
                className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold px-6 sm:px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl text-base md:text-lg hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                ADD ON MORE SONGS NOW!
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Search Results Portal */}
      {isMounted && showSearchResults && (
        createPortal(
          <div
            ref={searchDropdownRef}
            className="fixed z-[9999] bg-gradient-to-br from-[#23272f] to-[#1a1a2e] border border-white/20 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: '400px'
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10">
              <h3 className="text-white font-semibold text-sm">
                {isSearching ? 'Searching...' : `Found ${searchResults.length} tracks`}
              </h3>
            </div>
            
            {/* Results */}
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {isSearching ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-[#14c0ff] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-400">Searching Spotify...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((track, index) => (
                  <div
                    key={index}
                    onClick={() => selectTrackFromSearch(track)}
                    className="p-4 hover:bg-white/5 cursor-pointer transition-all duration-200 border-b border-white/5 last:border-b-0 group"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={track.imageUrl}
                        alt={track.title}
                        className="w-12 h-12 rounded-lg object-cover shadow-md border border-white/10 group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate group-hover:text-[#14c0ff] transition-colors duration-200">
                          {track.title}
                        </div>
                        <div className="text-gray-400 text-sm truncate">
                          {track.artist}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-[#14c0ff] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.87 0-5.431.967-7.5 2.591" />
                    </svg>
                  </div>
                  <p className="text-gray-400 mb-2">No tracks found</p>
                  <p className="text-gray-500 text-sm">Try searching with different keywords</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      )}

      {/* Preview Track Portal */}
      {isMounted && previewTrack && isSpotifyUrl && (
        createPortal(
          <div 
            className="fixed z-[9999] bg-gradient-to-br from-[#23272f] to-[#1a1a2e] border border-white/20 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10">
              <h3 className="text-white font-semibold text-sm">Selected Track</h3>
            </div>
            
            {/* Track Preview */}
            <div className="p-4">
              <TrackCard track={previewTrack} onConfirm={confirmPreview} dark />
            </div>
          </div>,
          document.body
        )
      )}
    </>
  );
} 