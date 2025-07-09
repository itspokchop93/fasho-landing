import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Head from "next/head";
import Header from "../components/Header";
import TrackCard from "../components/TrackCard";
import { Track } from "../types/track";
import { createClient } from '../utils/supabase/client';
import HeroParticles from '../components/HeroParticles';
import Player from 'lottie-react';

export default function Home() {
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const [focused, setFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [lottieData, setLottieData] = useState<any>(null);
  const [musicNotesLottie, setMusicNotesLottie] = useState<any>(null);

  // Check for success query parameter on component mount
  useEffect(() => {
    if (router.query.success === 'true') {
      setShowSuccessBanner(true);
    }
  }, [router.query]);

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

  // Simple input focus handler with immediate position update
  const handleInputFocus = () => {
    setFocused(true);
  };

  const isSpotifyUrlCheck = (url: string): boolean => {
    return url.includes('open.spotify.com/track/');
  };

  const validateSpotifyUrl = (url: string): string | null => {
    const spotifyTrackRegex = /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)(\?.*)?/;
    return spotifyTrackRegex.test(url) ? null : "Please enter a valid Spotify track URL";
  };

  const searchSpotifyTracks = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const response = await fetch('/api/spotify/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim(), limit: 8 }),
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.tracks || []);
        setHasSearched(true);
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectTrackFromSearch = (selectedTrack: Track) => {
    setTrack(selectedTrack);
    setPreviewTrack(selectedTrack);
    setUrl(selectedTrack.url);
    setShowSearchResults(false);
    setFocused(false);
    setValidationError(null);
    setError(null);
  };

  // Handle URL changes
  useEffect(() => {
    const isSpotifyUrl = isSpotifyUrlCheck(url);
    if (isSpotifyUrl) {
      setShowSearchResults(false);
    }
    
    // Check if URL is a Spotify URL
    if (url.trim() === '') {
      setValidationError(null);
      setError(null);
      setPreviewTrack(null);
      setSearchResults([]);
      setShowSearchResults(false);
      setHasSearched(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (isSpotifyUrl) {
      // Handle Spotify URL
      const validation = validateSpotifyUrl(url);
      if (validation) {
        setValidationError(validation);
        setPreviewTrack(null);
      } else {
        setValidationError(null);
        // Fetch track info immediately for valid Spotify URLs
        fetchTrackInfo(url);
      }
      setShowSearchResults(false);
    } else {
      // Handle search query with debouncing
      setValidationError(null);
      setPreviewTrack(null);
      
      const newTimeout = setTimeout(() => {
        searchSpotifyTracks(url);
      }, 300);
      
      setSearchTimeout(newTimeout);
    }
  }, [url]);

  const fetchTrackInfo = async (spotifyUrl: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: spotifyUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch track information');
      }

      if (data.track) {
        setPreviewTrack(data.track);
        setValidationError(null);
      }
    } catch (error: any) {
      console.error('Error fetching track:', error);
      setError(error.message || 'Failed to load track information');
      setPreviewTrack(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (previewTrack) {
      setTrack(previewTrack);
      setFocused(false);
      setShowSearchResults(false);
      setPreviewTrack(null);
      // Redirect to /add page with the selected track
      const trackData = encodeURIComponent(JSON.stringify(previewTrack));
      router.push(`/add?selectedTrack=${trackData}`);
    }
  };

  const handleSubmit = async () => {
    if (!track && !previewTrack) {
      setError('Please select a track first');
      return;
    }

    const selectedTrack = track || previewTrack;
    if (!selectedTrack) return;

    setLoading(true);
    try {
      // Redirect to /add page with the selected track
      const trackData = encodeURIComponent(JSON.stringify(selectedTrack));
      router.push(`/add?selectedTrack=${trackData}`);
    } catch (error) {
      console.error('Error redirecting:', error);
      setError('Failed to continue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const dismissBanner = () => {
    setShowSuccessBanner(false);
  };

  const scrollToTrackInput = () => {
    const element = document.getElementById('track-input-section');
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

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

  // Update position on focus, showSearchResults, or url change
  useEffect(() => {
    if (focused || showSearchResults) {
      updateDropdownPosition();
    }
  }, [focused, showSearchResults, url]);

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

  useEffect(() => {
    fetch('https://lottie.host/4e0a756c-18e1-43d6-8e24-a8d87d055629/jkbtAckwsK.json')
      .then(res => res.json())
      .then(setLottieData)
      .catch(() => setLottieData(null));
    fetch('https://lottie.host/c10f7e98-ed41-4450-bd5d-e57601e608cd/1PggLaUa9m.json')
      .then(res => res.json())
      .then(setMusicNotesLottie)
      .catch(() => setMusicNotesLottie(null));
  }, []);

  return (
    <>
      <Head>
        <title>Fasho – #1 Spotify Music Promotion</title>
        <meta
          name="description"
          content="#1 Spotify music promotion platform. Professional marketing campaigns that get your tracks heard by the right audience."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] py-4 px-4 relative z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <svg 
                className="h-6 w-6 text-white mr-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  Successfully signed in! Welcome to Fasho! 🎉
                </h3>
                <p className="text-white/90 text-sm">
                  Your email has been confirmed. Time to make your music go viral!
                </p>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Dismiss notification"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Header transparent={true} />

      {/* Main Content */}
      <main className="min-h-screen bg-gradient-to-b from-[#18192a] to-[#0a0a13] text-white relative overflow-x-hidden">
        {/* Subtle, large radial glow behind hero/campaign */}
        <div className="pointer-events-none absolute left-1/2 -top-[10vh] -translate-x-1/2 z-0 w-[96vw] h-[64vh]" style={{ filter: 'blur(60px)' }}>
          <div className="w-full h-full bg-gradient-radial from-[#14c0ff]/30 via-[#59e3a5]/20 to-transparent opacity-60"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10">
          {/* Hero Section - Reduced padding from pt-60 to pt-40 (25px reduction) */}
          <section className="min-h-screen flex items-center justify-center px-4 pt-40 relative overflow-hidden">
            {/* Animated lens flare particles background - covers entire hero section */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
              <HeroParticles />
            </div>
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-20">
                {/* Main Heading - Reduced by 15px and added white-to-black gradient text with reduced shadow */}
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-none">
                  <span className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
                    #1 Spotify
                  </span>
                  <br />
                  <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
                    Music Promotion
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-xl md:text-2xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed" style={{ paddingBottom: '45px' }}>
                  Stop watching other artists blow up while your tracks collect dust. It's time to get the plays, fans, and recognition you deserve.
                </p>

                {/* Menu Anchor for Track Input */}
                <div id="track-input-section"></div>

                {/* Track Input Section - Enhanced Design with increased bottom padding and 10px top padding */}
                <div className="mt-16 mb-[18px] -mb-[55px] relative pb-10 pt-2.5">
                  {/* Lottie Animation Behind Input Field */}
                  <div className="absolute left-1/2 -top-12 -translate-x-1/2 z-0 w-full flex justify-center pointer-events-none" style={{height: '70px'}}>
                    <div className="w-[90%] max-w-4xl">
                      {lottieData && (
                        <Player
                          autoplay
                          loop
                          animationData={lottieData}
                          style={{ width: '100%', height: '70px', marginTop: 0 }}
                          rendererSettings={{ preserveAspectRatio: 'xMidYMin slice' }}
                        />
                      )}
                    </div>
                  </div>
                  {/* Background glow effect - original subtle value restored */}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[114%] z-0" style={{ top: '50%', filter: 'blur(24px)' }}>
                    <div className="w-full h-full bg-gradient-to-r from-[#59e3a5]/20 via-[#14c0ff]/20 to-[#8b5cf6]/20 rounded-full opacity-5"></div>
                  </div>
                  {/* Lottie Music Notes Animation - Top Right Corner */}
                  <div className="absolute top-0 right-0 z-0 pointer-events-none" style={{ width: '149px', height: '149px', transform: 'translate(30%, -50%)' }}>
                    {musicNotesLottie && (
                      <Player
                        autoplay
                        loop
                        animationData={musicNotesLottie}
                        style={{ width: '100%', height: '100%' }}
                        rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                      />
                    )}
                  </div>
                  {/* Lottie Music Notes Animation - Top Left Corner (Flipped) */}
                  <div className="absolute top-0 left-0 z-0 pointer-events-none" style={{ width: '149px', height: '149px', transform: 'translate(-30%, -50%) scaleX(-1)' }}>
                    {musicNotesLottie && (
                      <Player
                        autoplay
                        loop
                        animationData={musicNotesLottie}
                        style={{ width: '100%', height: '100%' }}
                        rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                      />
                    )}
                  </div>
                  {/* Main container with enhanced styling */}
                  <div className="relative z-20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-[0_12px_40px_0_rgba(20,192,255,0.45)]">
                    {/* Static border gradient */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[2px]">
                      <div className="h-full w-full rounded-3xl bg-black/80 backdrop-blur-xl"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      {/* Campaign Start Text - Reduced by 10px and added gradient text with reduced shadow */}
                      <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-4">
                          🚀 Start Your Campaign
                        </h2>
                        <p className="text-lg text-gray-300 mb-8">
                          Search For Your Spotify Song or Enter Your Track Link
                        </p>
                      </div>

                      {/* Input and Button Layout - Responsive - SEARCH CONTAINER WITH ESCAPE POSITIONING */}
                      <div className="w-full max-w-4xl mx-auto relative mb-8">
                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                          <div className="flex-1 relative">
                            <input
                              ref={inputRef}
                              type="text"
                              placeholder="Enter Your Song Name or Track Link"
                              value={url}
                              onFocus={handleInputFocus}
                              onChange={(e) => setUrl(e.target.value)}
                              className={`w-full px-6 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14c0ff]/50 focus:border-[#14c0ff]/50 transition-all duration-300 text-lg hover:bg-white/15 hover:shadow-lg hover:shadow-[#14c0ff]/20 ${
                                (focused || showSearchResults) ? 'ring-2 ring-[#14c0ff]/50 border-[#14c0ff]/50' : ''
                              }`}
                              disabled={loading}
                            />
                            {/* Input focus indicator */}
                            {(focused || showSearchResults) && (
                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-full animate-pulse"></div>
                            )}
                          </div>
                          {/* Launch Campaign Button - Always normal color, pulse when filled */}
                          <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`px-8 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 active:scale-95 relative overflow-hidden group whitespace-nowrap ${url.trim() ? 'animate-pulse' : ''}`}
                          >
                            {/* Button content */}
                            <span className="relative z-10 text-white">
                              {loading ? 'Launching...' : 'Launch Campaign'}
                            </span>
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                          </button>
                        </div>
                      </div>
                      {/* Song card directly below input/button row, INSIDE the campaign container */}
                      {previewTrack && isSpotifyUrlCheck(url) && (
                        <div className="w-full max-w-4xl mx-auto mb-2 animate-popdown">
                          <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[1px] rounded-2xl shadow-[0_8px_32px_0_rgba(20,192,255,0.35)]">
                            <div className="flex items-center w-full bg-gradient-to-r from-[#23272f] to-[#1a1a2e] rounded-2xl p-4 gap-4">
                              <img
                                src={previewTrack.imageUrl}
                                alt={previewTrack.title}
                                className="w-20 h-20 rounded-xl object-cover shadow-md border border-white/10 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-white truncate text-left" style={{ fontSize: '1.625rem' }}>{previewTrack.title}</div>
                                <div className="text-gray-300 truncate text-left" style={{ fontSize: '1.125rem' }}>{previewTrack.artist}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PAS Framework Section */}
          <div className="max-w-4xl mx-auto px-6 py-20" style={{ lineHeight: '1.8' }}>
            {/* PAS Final Draft Section - User Provided */}
            <div className="text-center mb-20 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-0 pb-2 -mt-8 bg-gradient-to-b from-white via-white to-gray-600 bg-clip-text text-transparent drop-shadow-lg animate-fade-in-up animation-delay-100" style={{ lineHeight: '1.3' }}>
                Your Music Is Fire,
              </h2>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 pb-6 bg-gradient-to-b from-white via-white to-gray-600 bg-clip-text text-transparent drop-shadow-lg animate-fade-in-up animation-delay-200" style={{ lineHeight: '1.3' }}>
                But <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Nobody's</span> Hearing It….
              </h2>
              <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-300" style={{ lineHeight: '1.8' }}>
                You spent days making the best song of your life. Created the dopest cover art for it. All your friends said it slaps harder than Will Smith at the Oscars.
              </p>
              <p className="text-2xl md:text-3xl font-bold pb-12 animate-fade-in-up animation-delay-400" style={{ lineHeight: '1.6' }}>
                But your Spotify still says <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">" &lt; 1,000 "</span> plays…
              </p>
              <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-500" style={{ lineHeight: '1.8' }}>
                Meanwhile, some dude who recorded his whole album on an iPhone just hit 2 million streams and got signed.
              </p>
              <p className="text-4xl md:text-5xl font-black pb-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent animate-fade-in-up animation-delay-600" style={{ lineHeight: '1.5' }}>
                Damn…
              </p>
              <p className="text-3xl md:text-4xl font-black text-white pb-12 animate-fade-in-up animation-delay-700" style={{ lineHeight: '1.5' }}>
                Ready to know the truth?
              </p>
              <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-800" style={{ lineHeight: '1.8' }}>
                <b>Talent and hard work DOES NOT guarantee success on Spotify.</b> The platform only pushes artists who already have momentum. Big streams, high engagement, and playlist placements. If you've got them, Spotify's algorithm LOVES you. But if you don't? You're invisible.
              </p>
              <p className="text-3xl md:text-4xl font-black text-white pb-12 animate-fade-in-up animation-delay-900" style={{ lineHeight: '1.5' }}>
                Here's the <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">CATCH</span> that's <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">KILLING</span> independent artists…
              </p>
              <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-1000" style={{ lineHeight: '1.8' }}>
                Spotify's algorithm won't promote you WITHOUT streams. But you can't get streams if Spotify WON'T promote you! You're trapped in a death loop where the only way to win is to <i><b><span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">ALREADY</span></b></i> be winning.
              </p>
              <p className="text-2xl md:text-3xl font-bold text-white pb-12 animate-fade-in-up animation-delay-1100" style={{ lineHeight: '1.6' }}>
                Trust us, we know the struggle.
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black pb-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent animate-fade-in-up animation-delay-1200" style={{ lineHeight: '1.3' }}>
                But it gets worse….
              </h2>
            </div>
            {/* New Icon List */}
            <div className="grid md:grid-cols-1 gap-8 mb-16 animate-fade-in-up animation-delay-1250">
              <div className="flex items-start space-x-4 text-left animate-fade-in-up animation-delay-1300">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-2xl text-white font-medium" style={{ lineHeight: '1.7' }}>
                  <b>60,000 new songs drop on Spotify EVERY single day</b> - and you're competing against ALL of them (42 new songs were uploaded in the time it took you to read this sentence)
                </p>
              </div>
              <div className="flex items-start space-x-4 text-left animate-fade-in-up animation-delay-1400">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-2xl text-white font-medium" style={{ lineHeight: '1.7' }}>
                  Without getting placed on the <b>RIGHT</b> playlists, you're <b>INVISIBLE</b> to Spotify's algorithm (and everyone else)
                </p>
              </div>
              <div className="flex items-start space-x-4 text-left animate-fade-in-up animation-delay-1500">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-2xl text-white font-medium" style={{ lineHeight: '1.7' }}>
                  It's not 2019 anymore - posting <b>"LINK IN BIO"</b> on Instagram works just as bad as buying an Ad in the newspaper
                </p>
              </div>
              <div className="flex items-start space-x-4 text-left animate-fade-in-up animation-delay-1600">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-2xl text-white font-medium" style={{ lineHeight: '1.7' }}>
                  It takes the average artist <b>4.7 YEARS</b> of trial and error to finally break into the industry (and most quit after year 2)
                </p>
              </div>
              <div className="flex items-start space-x-4 text-left animate-fade-in-up animation-delay-1700">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-2xl text-white font-medium" style={{ lineHeight: '1.7' }}>
                  Artists with <b>HALF your talent</b> are going viral DAILY because they learned how to work <b>SMARTER</b> than everyone else
                </p>
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white pb-12 animate-fade-in-up animation-delay-1800" style={{ lineHeight: '1.6' }}>
              And while you're still wondering if playlist placements are "worth it," other artists are collecting streaming revenue and booking their first tours.
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black pb-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent text-center animate-fade-in-up animation-delay-1900" style={{ lineHeight: '1.3' }}>
              But The WORST Part Is...
            </h2>
            <p className="text-2xl md:text-3xl font-bold text-white pb-12 animate-fade-in-up animation-delay-2000" style={{ lineHeight: '1.6' }}>
              REAL Spotify growth is trapped behind a field of landmines.
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-2100" style={{ lineHeight: '1.8' }}>
              Fake agencies charging $99 for bot plays from Kazakstan. Scammers in your DMs with "PROMO 4 SALE" messages. Snake oil companies on Google who put you on handmade playlists with only 52 followers.
            </p>
            <p className="text-2xl md:text-3xl font-bold text-white pb-12 animate-fade-in-up animation-delay-2200" style={{ lineHeight: '1.6' }}>
              No Cap - Finding <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">REAL</span> Spotify Marketing is Harder Than Finding a PS5 to Buy During COVID
            </p>
            <h2 className="text-4xl md:text-5xl font-black pb-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent text-center animate-fade-in-up animation-delay-2300" style={{ lineHeight: '1.3' }}>
              That's Why Over 25K Creators Use…
            </h2>
            <div className="flex justify-center items-center pb-12 animate-fade-in-up animation-delay-2350">
              <img src="/fasho-logo-wide.png" alt="Fasho Logo" className="w-[480px] max-w-full h-auto" />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white pb-12 animate-fade-in-up animation-delay-2400" style={{ lineHeight: '1.6' }}>
              The ONLY Spotify marketing service with DIRECT access to curators of the world's BIGGEST playlists.
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-2500" style={{ lineHeight: '1.8' }}>
              We don't mess with bots. We don't own sketchy playlists. We don't make empty promises.
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-2600" style={{ lineHeight: '1.8' }}>
              We get your music directly in front of playlist curators who control MILLIONS of real listeners.
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-2700" style={{ lineHeight: '1.8' }}>
              <span className="font-bold text-white">RapCaviar. Today's Top Hits. Viva Latino. The playlists that actually move the needle on careers.</span>
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-2800" style={{ lineHeight: '1.8' }}>
              While other companies are cold emailing random curators hoping for a response, we're on first name basis with the people who matter. We've spent 10 years building these relationships so you don't have to.
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-2900" style={{ lineHeight: '1.8' }}>
              Our team is stacked with former directors and executives from labels like Universal, Sony, RCA, Atlantic, and Roc Nation. The same people who built marketing campaigns for Beyonce, Justin Bieber, Billie Eilish, and Kendrick Lamar now work for YOU.
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-3000" style={{ lineHeight: '1.8' }}>
              We got tired of watching talented artists get chewed up and spit out by an industry that only cares about who you know. Gatekeepers controlling everything. Labels taking 80% of your revenue. The game was rigged from the start.
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-3100" style={{ lineHeight: '1.8' }}>
              So we built FASHO.co to flip the script. To give independent artists direct access to the same tools and connections that major labels pay millions for.
            </p>
            <h2 className="text-2xl md:text-3xl font-black pb-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent text-center animate-fade-in-up animation-delay-3200" style={{ lineHeight: '1.3' }}>
              The Results Speak For Themselves…
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-3300" style={{ lineHeight: '1.8' }}>
              With a 100% success rate, our campaigns start delivering within 48 hours. Not weeks. Not "maybe soon"…  Two days.
            </p>
            <p className="text-xl md:text-2xl text-gray-300 pb-12 font-medium animate-fade-in-up animation-delay-3400" style={{ lineHeight: '1.8' }}>
              Our playlist network drives MILLIONS of engaged listeners to our clients every single week. Real people who save songs, follow artists, and actually show up to shows.
            </p>
            <p className="text-2xl md:text-3xl font-bold text-white pb-12 animate-fade-in-up animation-delay-3500" style={{ lineHeight: '1.6' }}>
              This isn't hope. It's a guarantee. Your music, on major playlists, reaching massive audiences, starting TODAY.
            </p>
          </div>

          {/* Promotion Section - ENFORCED LOW Z-INDEX */}
          <section className="pt-8 pb-20 px-4 relative z-0">
            <div className="max-w-6xl mx-auto">
              {/* Feature Points - moved here, above heading */}
              <div className="grid md:grid-cols-3 gap-8 mb-12 relative z-0">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-2">Lightning Fast</h3>
                  <p className="text-gray-400">Get your campaign live in minutes, not days</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#14c0ff] to-[#8b5cf6] rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-2">Targeted Reach</h3>
                  <p className="text-gray-400">Connect with fans who love your genre</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#8b5cf6] to-[#59e3a5] rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📈</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-2">Real Growth</h3>
                  <p className="text-gray-400">Track your success with detailed analytics</p>
                </div>
              </div>

              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-black bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-6">
                  Promotion, without the hassle
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  Our automated system handles everything from playlist placement to social media promotion. 
                  Focus on creating music while we handle the marketing.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#59e3a5] to-[#14c0ff] rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl">🎵</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-3">Playlist Placement</h3>
                  <p className="text-gray-400">Get featured on curated playlists that match your genre and style</p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#14c0ff] to-[#8b5cf6] rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl">📱</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-3">Social Media</h3>
                  <p className="text-gray-400">Amplify your reach across all major social platforms</p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#8b5cf6] to-[#59e3a5] rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl">🎧</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-3">Radio Promotion</h3>
                  <p className="text-gray-400">Submit to online radio stations and streaming platforms</p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#59e3a5] to-[#8b5cf6] rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl">📊</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-3">Analytics</h3>
                  <p className="text-gray-400">Track your campaign performance with detailed insights</p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#14c0ff] to-[#59e3a5] rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl">🎯</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-3">Targeted Ads</h3>
                  <p className="text-gray-400">Reach your ideal audience with precision targeting</p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#8b5cf6] to-[#14c0ff] rounded-lg flex items-center justify-center mb-4">
                    <span className="text-xl">📈</span>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-3">Growth Tracking</h3>
                  <p className="text-gray-400">Monitor your progress with real-time performance metrics</p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <button
                  onClick={scrollToTrackInput}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 group"
                >
                  <span>Make your music happen</span>
                  <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* Partner Logos Section - ENFORCED LOWEST Z-INDEX */}
          <section className="py-20 px-4 border-t border-white/10 relative z-0">
            <div className="max-w-6xl mx-auto text-center">
              <h3 className="text-2xl font-semibold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-12">
                Trusted by thousands of artists worldwide
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
                <div className="text-white/40 text-lg font-semibold">Spotify</div>
                <div className="text-white/40 text-lg font-semibold">Apple Music</div>
                <div className="text-white/40 text-lg font-semibold">YouTube Music</div>
                <div className="text-white/40 text-lg font-semibold">SoundCloud</div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Dropdown as a portal */}
      {isMounted && !isSpotifyUrlCheck(url) && (showSearchResults || isSearching || validationError || error) && createPortal(
        <div
          ref={searchDropdownRef}
          className="fixed z-[99999] border border-white/20 rounded-xl bg-gray-900/95 backdrop-blur-xl max-h-96 overflow-y-auto shadow-2xl shadow-black/50"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            minWidth: '300px',
            maxWidth: '90vw'
          }}
        >
          {/* Show search results for search queries */}
          {showSearchResults && searchResults.length > 0 ? (
            <div className="p-2">
              <div className="text-white/60 text-sm font-medium mb-3 px-3 py-2 border-b border-white/10">
                🎵 Search Results
              </div>
              {searchResults.map((searchTrack, index) => (
                <div
                  key={searchTrack.id}
                  className="flex items-center p-3 hover:bg-gray-800/70 rounded-lg transition-all duration-200 cursor-pointer mx-2 mb-1 hover:shadow-lg hover:shadow-[#14c0ff]/20"
                  onClick={() => selectTrackFromSearch(searchTrack)}
                >
                  <img
                    src={searchTrack.imageUrl}
                    alt={searchTrack.title}
                    className="w-12 h-12 rounded-lg object-cover mr-3 shadow-md"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-white font-semibold text-sm truncate">{searchTrack.title}</div>
                    <div className="text-gray-400 text-xs truncate">{searchTrack.artist}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectTrackFromSearch(searchTrack);
                    }}
                    className="ml-3 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white px-4 py-2 rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-[#14c0ff]/30 transition-all duration-200 flex-shrink-0 transform hover:scale-105 active:scale-95"
                  >
                    SELECT
                  </button>
                </div>
              ))}
            </div>
          ) :
          /* Show validation/error messages */
          validationError ? (
            <div className="p-4 bg-red-900/50 border border-red-500/30 rounded-lg m-2">
              <p className="text-red-200 font-medium text-sm">❌ {validationError}</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/50 border border-red-500/30 rounded-lg m-2">
              <p className="text-red-200 font-medium text-sm">⚠️ {error}</p>
            </div>
          ) :
          /* Show loading state */
          (isSearching) ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <svg className="animate-spin h-6 w-6 text-[#14c0ff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span className="text-white/80 font-semibold">
                {isSearching ? "🔍 Searching..." : "⏳ Loading..."}
              </span>
            </div>
          ) :
          /* Show empty state when no results */
          hasSearched && searchResults.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400 text-3xl mb-2">🎵</div>
              <p className="text-white/60 text-sm font-medium">No songs found</p>
              <p className="text-white/40 text-xs mt-1">Try a different search term</p>
            </div>
          ) : null}
        </div>,
        document.body
      )}
    </>
  );
} 