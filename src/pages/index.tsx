import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Head from "next/head";
import Header from "../components/Header";
import TrackCard from "../components/TrackCard";
import ShapeDivider from "../components/ShapeDivider";
import { Track } from "../types/track";
import { createClient } from '../utils/supabase/client';
import HeroParticles from '../components/HeroParticles';
import Lottie from 'lottie-react';

// Custom hook for viewport intersection
const useInView = (options: IntersectionObserverInit = {}) => {
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setTimeout(() => {
            setIsInView(true);
            setHasAnimated(true);
          }, 500); // 500ms delay after entering viewport
        }
      },
      { threshold: 0.1, ...options }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [hasAnimated, options]);

  return [ref, isInView] as const;
};

// Add at the top of the Home component:
const PHONE_SECTION_ID = "phone-mockup-scroll-section";

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
  
  // How It Works Lottie animations
  const [step1Lottie, setStep1Lottie] = useState<any>(null);
  const [step2Lottie, setStep2Lottie] = useState<any>(null);
  const [step3Lottie, setStep3Lottie] = useState<any>(null);
  const [step4Lottie, setStep4Lottie] = useState<any>(null);
  
  // Confetti animation for logo
  const [confettiLottie, setConfettiLottie] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Viewport animation hooks for PAS section
  const [heading1Ref, heading1InView] = useInView();
  const [heading2Ref, heading2InView] = useInView();
  const [text1Ref, text1InView] = useInView();
  const [text2Ref, text2InView] = useInView();
  const [text3Ref, text3InView] = useInView();
  const [text4Ref, text4InView] = useInView();
  const [text5Ref, text5InView] = useInView();
  const [text6Ref, text6InView] = useInView();
  const [text6bRef, text6bInView] = useInView(); // New separate element for "Talent and hard work..."
  const [text7Ref, text7InView] = useInView();
  const [text8Ref, text8InView] = useInView();
  const [text8bRef, text8bInView] = useInView(); // New separate element for "You're trapped in a death loop..."
  const [text9Ref, text9InView] = useInView();
  const [heading3Ref, heading3InView] = useInView();
  const [iconListRef, iconListInView] = useInView();
  const [bottomSectionRef, bottomSectionInView] = useInView();
  const [worstPartRef, worstPartInView] = useInView({ threshold: 0.1 }); // Fixed animation timing
  const [fakeAgenciesRef, fakeAgenciesInView] = useInView();
  const [fakeAgenciesParaRef, fakeAgenciesParaInView] = useInView();
  const [noCapRef, noCapInView] = useInView();
  const [thatsWhyRef, thatsWhyInView] = useInView();
  const [logoRef, logoInView] = useInView({ threshold: 0.1 }); // Enhanced logo animation
  const [onlySpotifyRef, onlySpotifyInView] = useInView();
  const [dontMessRef, dontMessInView] = useInView();
  const [getMusicRef, getMusicInView] = useInView();
  const [rapCaviarRef, rapCaviarInView] = useInView();
  const [whileOtherRef, whileOtherInView] = useInView();
  const [whoIsFashoRef, whoIsFashoInView] = useInView();
  const [ourTeamRef, ourTeamInView] = useInView();
  const [gotTiredRef, gotTiredInView] = useInView();
  const [gameRiggedRef, gameRiggedInView] = useInView();
  const [builtFashoRef, builtFashoInView] = useInView();
  const [resultsRef, resultsInView] = useInView();
  const [with100Ref, with100InView] = useInView();
  const [playlistNetworkRef, playlistNetworkInView] = useInView();
  const [isntHopeRef, isntHopeInView] = useInView();
  
  // How It Works section animation hooks
  const [howItWorksHeadingRef, howItWorksHeadingInView] = useInView();
  const [step1Ref, step1InView] = useInView();
  const [step2Ref, step2InView] = useInView();
  const [step3Ref, step3InView] = useInView();
  const [step4Ref, step4InView] = useInView();
  
  // Dashboard mockup scroll animation
  const [dashboardRef, dashboardInView] = useInView({ threshold: 0.3 });
  const [scrollY, setScrollY] = useState(0);
  
  // New animation hooks for slide-up animations with 600ms delay
  const [forgetTextRef, forgetTextInView] = useInView({ threshold: 0.3 });
  const [blowUpButtonRef, blowUpButtonInView] = useInView({ threshold: 0.3 });
  const [commandCenterRef, commandCenterInView] = useInView({ threshold: 0.3 });
  const [dashboardDescRef, dashboardDescInView] = useInView({ threshold: 0.3 });
  const [genreHeadingRef, genreHeadingInView] = useInView({ threshold: 0.3 });
  const [genreSubheadingRef, genreSubheadingInView] = useInView({ threshold: 0.3 });
  const [genreListContainerRef, genreListContainerInView] = useInView({ threshold: 0.3 });
  const [experimentalTextRef, experimentalTextInView] = useInView({ threshold: 0.3 });
  const [campaignButtonRef, campaignButtonInView] = useInView({ threshold: 0.3 });
  const [authenticityHeadingRef, authenticityHeadingInView] = useInView({ threshold: 0.3 });
  const [authenticitySubheadingRef, authenticitySubheadingInView] = useInView({ threshold: 0.3 });
  const [authenticityIntroRef, authenticityIntroInView] = useInView({ threshold: 0.3 });
  const [authenticityOperatesRef, authenticityOperatesInView] = useInView({ threshold: 0.3 });
  const [authenticityListRef, authenticityListInView] = useInView({ threshold: 0.3 });
  const [authenticityClosingRef, authenticityClosingInView] = useInView({ threshold: 0.3 });
  const [authenticityHighlightRef, authenticityHighlightInView] = useInView({ threshold: 0.3 });
  const [authenticityGuaranteeRef, authenticityGuaranteeInView] = useInView({ threshold: 0.3 });

  const phoneSectionRef = useRef<HTMLDivElement>(null);
  const [phoneScrollProgress, setPhoneScrollProgress] = useState(0); // 0 = Step 1, 1 = Step 2, 2 = Step 3, 3 = Step 4, 4 = Exit
  const [isPhoneScrollLocked, setIsPhoneScrollLocked] = useState(false);
  const [hasCompletedStep4, setHasCompletedStep4] = useState(false);

  // --- Scroll lock with proper exit conditions ---
  useEffect(() => {
    const section = phoneSectionRef.current;
    if (!section) return;

    let lastTouchY = 0;
    let isTouching = false;
    
    // Track accumulated scroll that would exit the section
    let pendingScrollUp = 0;
    let pendingScrollDown = 0;
    const EXIT_THRESHOLD = 150; // pixels needed to exit
    
    // Cooldown to prevent immediate re-lock after exit
    let exitCooldown = false;
    let lastExitTime = 0;

    function handleScrollEvent(e: WheelEvent) {
      if (!isPhoneScrollLocked) return;
      e.preventDefault();
      
      const delta = e.deltaY;
      
      setPhoneScrollProgress(prev => {
        let next = prev + delta / 1800; // Increased from 1200 to 1800 for longer scroll range across 4 steps
        
        // Handle exit conditions based on scroll progress boundaries
        if (next <= 0 && delta < 0) {
          // User is scrolling up from Step 1 - wants to exit upward
          pendingScrollUp += Math.abs(delta);
          pendingScrollDown = 0; // Reset opposite direction
          
          if (pendingScrollUp >= EXIT_THRESHOLD) {
            // Release lock and scroll up to actually exit the section
            setIsPhoneScrollLocked(false);
            setHasCompletedStep4(false); // Reset completion state when exiting upward
            exitCooldown = true;
            lastExitTime = Date.now();
            
            // Use accumulated scroll to push user past the section
            setTimeout(() => {
              const section = phoneSectionRef.current;
              if (section) {
                const rect = section.getBoundingClientRect();
                const scrollAmount = Math.min(300, pendingScrollUp + 100); // Increased to ensure we're far enough
                window.scrollTo({
                  top: window.scrollY - scrollAmount,
                  behavior: 'instant'
                });
              }
            }, 10);
            return 0;
          }
          // Reset completed state if user goes back to Step 1
          if (prev >= 3) {
            setHasCompletedStep4(false);
          }
          return 0; // Stay at Step 1
        } 
        else if (next >= 4 && delta > 0) {
          // User is scrolling down from Step 4 - wants to exit downward
          pendingScrollDown += delta;
          pendingScrollUp = 0; // Reset opposite direction
          
          if (pendingScrollDown >= EXIT_THRESHOLD) {
            // Release lock and scroll down to actually exit the section
            setIsPhoneScrollLocked(false);
            setHasCompletedStep4(true); // Mark that user has completed Step 4
            exitCooldown = true;
            lastExitTime = Date.now();
            
            // Use accumulated scroll to push user past the section
            setTimeout(() => {
              const section = phoneSectionRef.current;
              if (section) {
                const rect = section.getBoundingClientRect();
                const scrollAmount = Math.min(300, pendingScrollDown + 100); // Increased to ensure we're far enough
                window.scrollTo({
                  top: window.scrollY + scrollAmount,
                  behavior: 'instant'
                });
              }
            }, 10);
            return 4;
          }
          return Math.min(next, 4); // Stay at Step 4 max, but allow progression within step
        }
        else {
          // Normal scrolling within bounds - reset exit counters
          pendingScrollUp = 0;
          pendingScrollDown = 0;
          
          // Clamp to valid range
          if (next > 4) next = 4;
          if (next < 0) next = 0;
          return next;
        }
      });
    }

    function handleTouchStart(e: TouchEvent) {
      isTouching = true;
      lastTouchY = e.touches[0].clientY;
    }
    
    function handleTouchMove(e: TouchEvent) {
      if (!isPhoneScrollLocked || !isTouching) return;
      e.preventDefault();
      
      const touchY = e.touches[0].clientY;
      const delta = lastTouchY - touchY;
      lastTouchY = touchY;
      
      setPhoneScrollProgress(prev => {
        let next = prev + delta / 1350; // Increased from 900 to 1350 for longer scroll range on touch across 4 steps
        
        // Handle exit conditions for touch
        if (next <= 0 && delta < 0) {
          // Swiping down (scrolling up) from Step 1 - wants to exit upward
          pendingScrollUp += Math.abs(delta);
          pendingScrollDown = 0;
          
          if (pendingScrollUp >= EXIT_THRESHOLD) {
            setIsPhoneScrollLocked(false);
            setHasCompletedStep4(false); // Reset completion state when exiting upward
            exitCooldown = true;
            lastExitTime = Date.now();
            
            // Use accumulated scroll to push user past the section
            setTimeout(() => {
              const section = phoneSectionRef.current;
              if (section) {
                const scrollAmount = Math.min(300, (pendingScrollUp * 3) + 100); // Touch multiplier + extra distance
                window.scrollTo({
                  top: window.scrollY - scrollAmount,
                  behavior: 'instant'
                });
              }
            }, 10);
            return 0;
          }
          // Reset completed state if user goes back to Step 1
          if (prev >= 3) {
            setHasCompletedStep4(false);
          }
          return 0;
        } 
        else if (next >= 4 && delta > 0) {
          // Swiping up (scrolling down) from Step 4 - wants to exit downward
          pendingScrollDown += delta;
          pendingScrollUp = 0;
          
          if (pendingScrollDown >= EXIT_THRESHOLD) {
            setIsPhoneScrollLocked(false);
            setHasCompletedStep4(true); // Mark that user has completed Step 4
            exitCooldown = true;
            lastExitTime = Date.now();
            
            // Use accumulated scroll to push user past the section
            setTimeout(() => {
              const section = phoneSectionRef.current;
              if (section) {
                const scrollAmount = Math.min(300, (pendingScrollDown * 3) + 100); // Touch multiplier + extra distance
                window.scrollTo({
                  top: window.scrollY + scrollAmount,
                  behavior: 'instant'
                });
              }
            }, 10);
            return 4;
          }
          return Math.min(next, 4);
        }
        else {
          // Normal movement within bounds
          pendingScrollUp = 0;
          pendingScrollDown = 0;
          
          if (next > 4) next = 4;
          if (next < 0) next = 0;
          return next;
        }
      });
    }
    
    function handleTouchEnd() {
      isTouching = false;
    }

    // --- Section boundary detection ---
    function checkSectionStatus() {
      if (!section) return;
      
      // Check cooldown to prevent immediate re-lock after exit
      const timeSinceExit = Date.now() - lastExitTime;
      if (exitCooldown && timeSinceExit < 1000) { // 1 second cooldown
        return; // Don't check for re-lock during cooldown
      } else if (exitCooldown && timeSinceExit >= 1000) {
        exitCooldown = false; // Reset cooldown
      }
      
      const rect = section.getBoundingClientRect();
      
      // Different trigger points for scrolling up vs down
      const scrollDownTriggerPoint = window.innerHeight * 0.10; // 10% from top (perfect for scroll down)
      const scrollUpTriggerPoint = window.innerHeight * 0.40; // 40% from top (higher up for scroll up)
      
      // Determine which trigger point to use based on section position
      let triggerPoint, triggerZone;
      if (rect.top >= 0) {
        // Section is below viewport top (scrolling down approach)
        triggerPoint = scrollDownTriggerPoint;
        triggerZone = 50; // Tight trigger zone for scroll down
      } else {
        // Section is above viewport top (scrolling up approach)  
        triggerPoint = scrollUpTriggerPoint;
        triggerZone = 200; // Large trigger zone for scroll up
      }
      
      const distanceFromTrigger = rect.top - triggerPoint;
      const isInTriggerZone = Math.abs(distanceFromTrigger) <= triggerZone;
      
      if (isInTriggerZone && !isPhoneScrollLocked && !exitCooldown) {
        // Enter scroll lock - preserve current progress or determine initial position
        setIsPhoneScrollLocked(true);
        
        // Only set starting position if we don't have a current progress state
        // This preserves the state when re-entering after unlock
        setPhoneScrollProgress(prev => {
          // If user has completed Step 4 and is approaching from below, show Step 4
          if (hasCompletedStep4) {
            return 4;
          }
          // If we already have a valid progress, keep it
          if (prev >= 0 && prev <= 4) {
            return prev;
          }
          // Otherwise, determine starting position based on section position and scroll direction
          const sectionTop = rect.top;
          // If section is above the scroll-down trigger point (user scrolling up), start at beginning (Step 1)
          // If section is below the scroll-down trigger point (user scrolling down), start at end (Step 4)
          return sectionTop < scrollDownTriggerPoint ? 0 : 0; // Always start at Step 1 unless already completed
        });
        
        pendingScrollUp = 0;
        pendingScrollDown = 0;
      } else if (!isInTriggerZone && isPhoneScrollLocked) {
        // Section moved out of trigger zone - unlock (fallback safety)
        setIsPhoneScrollLocked(false);
      }
    }

    // Add listeners
    if (isPhoneScrollLocked) {
      document.body.style.overflow = "hidden";
      window.addEventListener("wheel", handleScrollEvent, { passive: false });
      window.addEventListener("touchstart", handleTouchStart, { passive: false });
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd, { passive: false });
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("wheel", handleScrollEvent);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    }

    // Always monitor section position
    window.addEventListener('scroll', checkSectionStatus, { passive: true });
    window.addEventListener('resize', checkSectionStatus);
    checkSectionStatus(); // Initial check
    
    return () => {
      // Cleanup
      document.body.style.overflow = "";
      window.removeEventListener("wheel", handleScrollEvent);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener('scroll', checkSectionStatus);
      window.removeEventListener('resize', checkSectionStatus);
    };
  }, [isPhoneScrollLocked]);

  // Clamp phoneScrollProgress between 0 and 3 for animation rendering
  useEffect(() => {
    if (phoneScrollProgress < 0) setPhoneScrollProgress(0);
    if (phoneScrollProgress > 4) setPhoneScrollProgress(4);
  }, [phoneScrollProgress]);

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
    
    // Fetch How It Works Lottie animations
    fetch('https://lottie.host/b76aafe8-c1b4-4569-9b06-e0c4e37c24c9/MWD7Q429FV.json')
      .then(res => res.json())
      .then(setStep1Lottie)
      .catch(() => setStep1Lottie(null));
    fetch('https://lottie.host/609897e0-f81e-491b-bb13-cf282d5618df/COCkv21oLf.json')
      .then(res => res.json())
      .then(setStep2Lottie)
      .catch(() => setStep2Lottie(null));
    fetch('https://lottie.host/5d5ad430-7c7f-426a-9986-6a9bbb5d0881/0c3XaexH48.json')
      .then(res => res.json())
      .then(setStep3Lottie)
      .catch(() => setStep3Lottie(null));
    fetch('https://lottie.host/64b9402c-da31-414c-a6b8-a7be56703617/Tb08YLNDaF.json')
      .then(res => res.json())
      .then(setStep4Lottie)
      .catch(() => setStep4Lottie(null));
    
    // Fetch confetti animation for logo
    fetch('https://lottie.host/9f09b7c7-7e40-468a-a439-9e5a066324c5/tTvaeR1KMa.json')
      .then(res => res.json())
      .then(setConfettiLottie)
      .catch(() => setConfettiLottie(null));
  }, []);

  useEffect(() => {
    if (logoInView) {
      // Start confetti animation 700ms after logo enters view (when logo becomes visible)
      const timer = setTimeout(() => {
        setShowConfetti(true);
      }, 700);
      
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [logoInView]);

  // Scroll animation for dashboard
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate smooth scroll transform with easing
  const getDashboardTransform = () => {
    if (!dashboardRef.current) return 'translateY(0px)';
    
    const element = dashboardRef.current;
    const rect = element.getBoundingClientRect();
    const elementTop = window.scrollY + rect.top;
    const elementHeight = rect.height;
    const windowHeight = window.innerHeight;
    
    // Start animation when element is 95% into view (maximum early trigger)
    const startPoint = elementTop - windowHeight * 0.95;
    // End animation much higher - when element is just past center view
    const endPoint = elementTop + elementHeight * 0.3;
    
    const scrollProgress = (scrollY - startPoint) / (endPoint - startPoint);
    const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
    
    // Eased progress using cubic-bezier for smooth transition
    const easedProgress = clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
    
    // Maximum transform distance
    const maxTransform = 300;
    const transformY = easedProgress * maxTransform;
    
    return `translateY(-${transformY}px)`;
  };

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
                        <Lottie
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
                      <Lottie
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
                      <Lottie
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

          {/* Flowing Shape Divider - Curves on Both Sides */}
          <div className="relative z-30 pb-32" style={{ height: '200px', width: '110vw', left: '-5vw', position: 'relative', transform: 'rotate(-3deg)', background: 'transparent' }}>
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
            <svg
              className="absolute inset-0 w-full h-full z-41"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
            >
              {/* Inner sparkle dots - bright white/silver */}
              <circle cx="180" cy="95" r="1.5" fill="#ffffff" opacity="0.9" />
              <circle cx="280" cy="80" r="1.2" fill="#f0f0f0" opacity="0.85" />
              <circle cx="485" cy="105" r="1.5" fill="#ffffff" opacity="0.95" />
              <circle cx="780" cy="115" r="1.6" fill="#ffffff" opacity="0.9" />
              <circle cx="1080" cy="100" r="1.4" fill="#ffffff" opacity="0.9" />
              <circle cx="1220" cy="90" r="1.1" fill="#e0e0e0" opacity="0.8" />
              <circle cx="1350" cy="110" r="1.7" fill="#ffffff" opacity="0.95" />
              
              {/* Additional inner sparkles */}
              <circle cx="320" cy="130" r="1.1" fill="#ffffff" opacity="0.8" />
              <circle cx="420" cy="60" r="0.9" fill="#f8f8f8" opacity="0.75" />
              <circle cx="550" cy="135" r="1.2" fill="#ffffff" opacity="0.85" />
              <circle cx="720" cy="55" r="0.9" fill="#f0f0f0" opacity="0.75" />
              <circle cx="880" cy="140" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="1180" cy="145" r="1.3" fill="#ffffff" opacity="0.8" />
              
              {/* Top exterior sparkles - above the shape */}
              <circle cx="250" cy="18" r="1.3" fill="#ffffff" opacity="0.85" />
              <circle cx="380" cy="25" r="1.1" fill="#f0f0f0" opacity="0.8" />
              <circle cx="520" cy="10" r="1.8" fill="#ffffff" opacity="0.9" />
              <circle cx="900" cy="5" r="1.6" fill="#ffffff" opacity="0.85" />
              <circle cx="1300" cy="12" r="1.4" fill="#ffffff" opacity="0.9" />
              
              {/* Bottom exterior sparkles - below the shape */}
              <circle cx="200" cy="188" r="1.4" fill="#ffffff" opacity="0.8" />
              <circle cx="350" cy="185" r="1.2" fill="#f5f5f5" opacity="0.75" />
              <circle cx="640" cy="180" r="1.7" fill="#ffffff" opacity="0.85" />
              <circle cx="1040" cy="175" r="1.5" fill="#ffffff" opacity="0.9" />
              <circle cx="1380" cy="182" r="1.6" fill="#ffffff" opacity="0.85" />
              
              {/* Bright star sparkles - within shape */}
              <g transform="translate(240,110)" opacity="0.85">
                <path d="M0,-1.8 L0.5,-0.5 L1.8,0 L0.5,0.5 L0,1.8 L-0.5,0.5 L-1.8,0 L-0.5,-0.5 Z" fill="#ffffff" />
              </g>
              <g transform="translate(360,85)" opacity="0.8">
                <path d="M0,-1.6 L0.45,-0.45 L1.6,0 L0.45,0.45 L0,1.6 L-0.45,0.45 L-1.6,0 L-0.45,-0.45 Z" fill="#f0f0f0" />
              </g>
              <g transform="translate(680,125)" opacity="0.9">
                <path d="M0,-2.2 L0.65,-0.65 L2.2,0 L0.65,0.65 L0,2.2 L-0.65,0.65 L-2.2,0 L-0.65,-0.65 Z" fill="#ffffff" />
              </g>
              <g transform="translate(1050,135)" opacity="0.9">
                <path d="M0,-2.3 L0.7,-0.7 L2.3,0 L0.7,0.7 L0,2.3 L-0.7,0.7 L-2.3,0 L-0.7,-0.7 Z" fill="#ffffff" />
              </g>
              
              {/* Star sparkles on exterior - top */}
              <g transform="translate(160,8)" opacity="0.8">
                <path d="M0,-1.4 L0.4,-0.4 L1.4,0 L0.4,0.4 L0,1.4 L-0.4,0.4 L-1.4,0 L-0.4,-0.4 Z" fill="#ffffff" />
              </g>
              <g transform="translate(1000,22)" opacity="0.85">
                <path d="M0,-1.6 L0.45,-0.45 L1.6,0 L0.45,0.45 L0,1.6 L-0.45,0.45 L-1.6,0 L-0.45,-0.45 Z" fill="#ffffff" />
              </g>
              
              {/* Star sparkles on exterior - bottom */}
              <g transform="translate(150,192)" opacity="0.75">
                <path d="M0,-1.5 L0.4,-0.4 L1.5,0 L0.4,0.4 L0,1.5 L-0.4,0.4 L-1.5,0 L-0.4,-0.4 Z" fill="#ffffff" />
              </g>
              <g transform="translate(1160,194)" opacity="0.85">
                <path d="M0,-1.9 L0.55,-0.55 L1.9,0 L0.55,0.55 L0,1.9 L-0.55,0.55 L-1.9,0 L-0.55,-0.55 Z" fill="#ffffff" />
              </g>
            </svg>

            {/* Subtle atmospheric glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#59e3a5]/8 via-[#14c0ff]/12 to-[#8b5cf6]/8 blur-[12px] opacity-40 z-40"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14c0ff]/4 to-transparent blur-[6px] opacity-40 z-40"></div>

            {/* Top Layer Sparkles - High Z-Index */}
            <svg
              className="absolute inset-0 w-full h-full z-50 pointer-events-none"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
            >
              {/* Large bright sparkle dots - on top of shape (reduced by 30%) */}
              <circle cx="380" cy="95" r="1.8" fill="#f0f0f0" opacity="0.59">
                <animate attributeName="opacity" values="0.59;0.33;0.59" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="820" cy="90" r="1.9" fill="#ffffff" opacity="0.57">
                <animate attributeName="opacity" values="0.57;0.33;0.57" dur="2.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="1080" cy="110" r="2.1" fill="#ffffff" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.39;0.6" dur="3.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="1280" cy="95" r="1.7" fill="#f8f8f8" opacity="0.55">
                <animate attributeName="opacity" values="0.55;0.26;0.55" dur="2.2s" repeatCount="indefinite" />
              </circle>

              {/* Medium sparkle dots (reduced by 30%) */}
              <circle cx="480" cy="75" r="1.2" fill="#f0f0f0" opacity="0.49">
                <animate attributeName="opacity" values="0.49;0.2;0.49" dur="3.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="920" cy="70" r="1.3" fill="#f5f5f5" opacity="0.51">
                <animate attributeName="opacity" values="0.51;0.23;0.51" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="1180" cy="130" r="1.6" fill="#ffffff" opacity="0.56">
                <animate attributeName="opacity" values="0.56;0.29;0.56" dur="3.3s" repeatCount="indefinite" />
              </circle>

              {/* Animated star sparkles - on top of shape (reduced by 30%) */}
              <g transform="translate(520,90)" opacity="0.55">
                <path d="M0,-2.2 L0.6,-0.6 L2.2,0 L0.6,0.6 L0,2.2 L-0.6,0.6 L-2.2,0 L-0.6,-0.6 Z" fill="#f0f0f0">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="10s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0.23;0.55" dur="3.4s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1020,85)" opacity="0.57">
                <path d="M0,-2.4 L0.7,-0.7 L2.4,0 L0.7,0.7 L0,2.4 L-0.7,0.7 L-2.4,0 L-0.7,-0.7 Z" fill="#ffffff">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.57;0.26;0.57" dur="3.1s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1220,105)" opacity="0.54">
                <path d="M0,-2.0 L0.55,-0.55 L2.0,0 L0.55,0.55 L0,2.0 L-0.55,0.55 L-2.0,0 L-0.55,-0.55 Z" fill="#f8f8f8">
                  <animateTransform attributeName="transform" type="rotate" values="0;360" dur="6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.54;0.2;0.54" dur="2.5s" repeatCount="indefinite" />
                </path>
              </g>

              {/* Small twinkling dots (reduced by 30%) */}
              <circle cx="650" cy="120" r="0.9" fill="#f0f0f0" opacity="0.42">
                <animate attributeName="opacity" values="0.42;0.1;0.42" dur="2.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="1120" cy="75" r="0.8" fill="#f5f5f5" opacity="0.44">
                <animate attributeName="opacity" values="0.44;0.13;0.44" dur="2.3s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* PAS Framework Section */}
          <div className="max-w-4xl mx-auto px-6 py-20 mt-0" style={{ lineHeight: '1.8', overflow: 'visible', background: 'none', marginTop: '40px' }}>
            {/* PAS Final Draft Section - User Provided */}
            <div className="text-center mb-20">
              <h2 ref={heading1Ref} className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-0 pb-2 -mt-8 bg-gradient-to-b from-white via-white to-gray-600 bg-clip-text text-transparent drop-shadow-lg transition-all duration-700 ${heading1InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.3' }}>
                Your Music Is Fire,
              </h2>
              <h2 ref={heading2Ref} className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-8 pb-6 bg-gradient-to-b from-white via-white to-gray-600 bg-clip-text text-transparent drop-shadow-lg transition-all duration-700 ${heading2InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.3' }}>
                But <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Nobody's</span> Hearing It….
              </h2>
              <p ref={text1Ref} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${text1InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
                You spent days making the best song of your life. Created the dopest cover art for it. All your friends said it slaps harder than Will Smith at the Oscars....
              </p>
              <p ref={text2Ref} className={`text-2xl md:text-3xl font-bold pb-12 text-center transition-all duration-700 ${text2InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
                But your Spotify still says <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">" &lt; 1,000 "</span> plays
              </p>
              <p ref={text3Ref} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${text3InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
                Meanwhile, some dude who recorded his whole album <b>on an iPhone</b> just hit <b>2 million</b> streams and <b>got signed.</b>
              </p>
              <p ref={text4Ref} className={`text-4xl md:text-5xl font-black pb-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent transition-all duration-700 ${text4InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.5' }}>
                Damn…
              </p>
              <p ref={text5Ref} className={`text-3xl md:text-4xl font-black text-white pb-12 pt-1 transition-all duration-700 ${text5InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.5' }}>
                Ready to know the truth?
              </p>
              <p ref={text6bRef} className={`font-black text-white pb-8 text-center transition-all duration-700 ${text6bInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.874rem', lineHeight: '1.5' }}>
                Talent and hard work DOES NOT guarantee success on Spotify.
              </p>
              <p ref={text6Ref} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${text6InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
                The platform only pushes artists who <b><i>ALREADY</i></b> have momentum. Big streams, high engagement, and playlist placements. If you've got them, Spotify's algorithm <b>LOVES</b> you. But if you don't? <b>You're invisible.</b>
              </p>
              <p ref={text7Ref} className={`text-2xl md:text-3xl font-black text-white pb-12 text-center transition-all duration-700 ${text7InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.5' }}>
                Here's the <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">CATCH</span> that's <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">KILLING</span> independent artists…
              </p>
              <p ref={text8Ref} className={`text-gray-300 pb-6 font-medium text-center transition-all duration-700 ${text8InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
                Spotify won't promote you if you <b><i><u>DON'T</u></i></b> have streams. But you can't get streams if Spotify <b><i><u>WON'T</u></i></b> promote you!
              </p>
              <p ref={text8bRef} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${text8bInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
                You're trapped in a death loop where the only way to win is to <i><b><span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">ALREADY</span></b></i> be winning.
              </p>
              <p ref={text9Ref} className={`text-3xl md:text-4xl font-bold text-white pb-12 transition-all duration-700 ${text9InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
                Trust me, we know the struggle.
              </p>
              <h2 ref={heading3Ref} className={`text-4xl md:text-5xl lg:text-6xl font-black pb-1 pt-2 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent transition-all duration-700 ${heading3InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.3' }}>
                But it gets worse….
              </h2>
            </div>
            {/* New Icon List */}
            <div ref={iconListRef} className={`grid md:grid-cols-1 gap-8 mb-16 -mt-12 transition-all duration-700 ${iconListInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-start space-x-4 text-left">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-white font-medium" style={{ fontSize: '1.6rem', lineHeight: '1.7' }}>
                  <b>60,000 new songs drop on Spotify EVERY single day</b> - and you're competing against ALL of them (42 new songs were uploaded in the time it took you to read this sentence)
                </p>
              </div>
              <div className="flex items-start space-x-4 text-left">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-white font-medium" style={{ fontSize: '1.6rem', lineHeight: '1.7' }}>
                  Without getting placed on the <b>RIGHT</b> playlists, you're <b>INVISIBLE</b> to Spotify's algorithm (and everyone else)
                </p>
              </div>
              <div className="flex items-start space-x-4 text-left">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-white font-medium" style={{ fontSize: '1.6rem', lineHeight: '1.7' }}>
                  It's not 2019 anymore - posting <b>"LINK IN BIO"</b> on Instagram works just as bad as buying an Ad in the newspaper
                </p>
              </div>
              <div className="flex items-start space-x-4 text-left">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-white font-medium" style={{ fontSize: '1.6rem', lineHeight: '1.7' }}>
                  It takes the average artist <b>4.7 YEARS</b> of trial and error to finally break into the industry (and most quit after year 2)
                </p>
              </div>
              <div className="flex items-start space-x-4 text-left">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center mt-1">
                  <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent font-bold text-5xl">✗</span>
                </div>
                <p className="text-white font-medium" style={{ fontSize: '1.6rem', lineHeight: '1.7' }}>
                  Artists with <b>HALF your talent</b> are going viral DAILY because they learned how to work <b>SMARTER</b> than you do
                </p>
              </div>
            </div>
            <div ref={bottomSectionRef}>
            <p className={`text-2xl md:text-3xl font-bold text-white pb-12 text-center transition-all duration-700 ${bottomSectionInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
              And while you're still wondering if playlist placements are <i>"worth it"</i>, other artists are collecting streaming revenue and booking their first tours.
            </p>
            <h2 ref={worstPartRef} className={`text-4xl md:text-5xl lg:text-6xl font-black pb-12 pt-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent text-center transition-all duration-700 ${worstPartInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.3' }}>
              But The WORST Part Is...
            </h2>
            <p ref={fakeAgenciesRef} className={`text-2xl md:text-3xl font-bold text-white pb-12 text-center transition-all duration-700 ${fakeAgenciesInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
              REAL Spotify growth is trapped behind a field of landmines.
            </p>
            <p ref={fakeAgenciesParaRef} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${fakeAgenciesParaInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              Fake agencies charging <b>$99</b> for <b>bot plays</b> from <b>Kazakstan.</b> Scammers in your DMs with <b>"PROMO 4 SALE"</b> messages. Snake oil companies on <b>Google</b> who put you on <b>handmade playlists</b> with only <b>52 followers.</b>
            </p>
            <p ref={noCapRef} className={`text-2xl md:text-3xl font-bold text-white pb-12 text-center transition-all duration-700 ${noCapInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
              No Cap - Finding <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">REAL</span> Spotify Marketing is Harder Than Finding a PS5 to Buy During COVID
            </p>
            <h2 ref={thatsWhyRef} className={`text-4xl md:text-5xl font-black pb-12 pt-2 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent text-center transition-all duration-700 ${thatsWhyInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.3' }}>
              That's Why Over 25K Creators Use…
            </h2>
            <div ref={logoRef} className={`flex justify-center items-center pb-12 pt-2 relative ${logoInView ? 'animate-bounce-in-spectacular' : 'opacity-0'}`}>
              <img src="/fasho-logo-wide.png" alt="Fasho Logo" className="w-[480px] max-w-full h-auto relative z-10" />
              {/* Confetti Animation - Positioned relative to logo */}
              {confettiLottie && showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-50 flex justify-center items-center" style={{ width: '800px', height: '600px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                  <Lottie
                    autoplay
                    loop={false}
                    animationData={confettiLottie}
                    style={{ width: '100%', height: '100%' }}
                    rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                  />
                </div>
              )}
            </div>
            <p ref={onlySpotifyRef} className={`text-2xl md:text-3xl font-bold text-white pb-12 text-center transition-all duration-700 ${onlySpotifyInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
              The ONLY Spotify marketing service with DIRECT access to curators of the world's BIGGEST playlists.
            </p>
            <p ref={dontMessRef} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${dontMessInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              We don't mess with <b>bots.</b> We don't own <b>sketchy playlists.</b> We don't make <b>empty promises.</b>
            </p>
            <p ref={getMusicRef} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${getMusicInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              We get your music directly in front of playlist curators who control <b><i><span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">MILLIONS</span></i></b> of real listeners.
            </p>
            <p ref={rapCaviarRef} className={`text-2xl md:text-3xl font-bold text-white pb-12 text-center transition-all duration-700 ${rapCaviarInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
              RapCaviar. Today's Top Hits. Viva Latino. The playlists that actually move the needle on careers.
            </p>
            <p ref={whileOtherRef} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${whileOtherInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              While other companies are cold emailing <b>random</b> curators hoping for a response, we're on <b>first name basis</b> with the people who matter. We've spent <b>10 years</b> building these relationships so <b>you don't have to.</b>
            </p>
            <h2 ref={whoIsFashoRef} className={`text-3xl md:text-4xl lg:text-5xl font-black pt-2 pb-14 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent text-center transition-all duration-700 ${whoIsFashoInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.3' }}>
              Welcome to the A-Team...
            </h2>
            <p ref={ourTeamRef} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${ourTeamInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              Our team is stacked with former directors and executives from labels like <b>Universal, Sony, RCA, Atlantic,</b> and <b>Roc Nation.</b> The same people who built marketing campaigns for <b>Beyonce, Justin Bieber, Billie Eilish,</b> and <b>Kendrick Lamar</b> now work for <b>YOU.</b>
            </p>
            <p ref={gotTiredRef} className={`text-gray-300 pb-6 font-medium text-center transition-all duration-700 ${gotTiredInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              We got tired of watching talented artists get <b>chewed up</b> and <b>spit out</b> by an industry that only cares about <b>who you know.</b> Gatekeepers controlling <b>everything.</b> Labels taking <b>80%</b> of your revenue.
            </p>
            <p ref={gameRiggedRef} className={`text-2xl md:text-3xl font-bold text-white pt-1.5 pb-14 text-center transition-all duration-700 ${gameRiggedInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
              The game was rigged from the start.
            </p>
            <p ref={builtFashoRef} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${builtFashoInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              So we built <b className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent font-black">FASHO.co</b> to flip the script. To give independent artists <b>direct</b> access to the <b>same tools</b> and <b>connections</b> that major labels pay <b><i>millions</i></b> for.
            </p>
            <h2 ref={resultsRef} className={`text-4xl md:text-5xl font-black pb-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent text-center transition-all duration-700 ${resultsInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.3' }}>
              The Results Speak For Themselves…
            </h2>
            <p ref={with100Ref} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${with100InView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              With a <b>100% success rate,</b> our campaigns start delivering within <b>48 hours.</b> Not weeks. Not "maybe soon"… Two days.
            </p>
            <p ref={playlistNetworkRef} className={`text-gray-300 pb-12 font-medium text-center transition-all duration-700 ${playlistNetworkInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
              Our playlist network drives <b>MILLIONS</b> of engaged listeners to our clients <b>every single week.</b> Real people who <b>save songs, follow artists, and actually show up to shows.</b>
            </p>
            <p ref={isntHopeRef} className={`text-2xl md:text-3xl font-bold text-white pb-12 text-center transition-all duration-700 ${isntHopeInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} style={{ lineHeight: '1.6' }}>
              This isn't hope. It's a guarantee. Your music, on major playlists, reaching massive audiences, starting TODAY.
            </p>
            </div>
          </div>

          {/* Shape Divider */}
          <div className="relative z-30 pb-32 pb-48" style={{ height: '200px', width: '110vw', left: '-5vw', position: 'relative', transform: 'rotate(8deg)', background: 'transparent' }}>
            {/* Extended gradient overlay that flows into next section */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#18192a] via-[#16213e] to-[#0a0a13] -z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent to-[#0a0a13] -z-5"></div>
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
                <linearGradient id="phoneShapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d="M-200,30 C100,120 300,10 500,90 C700,170 900,20 1100,100 C1300,180 1500,15 1640,70 L1640,150 C1500,120 1300,160 1100,140 C900,120 700,180 500,160 C300,140 100,190 -200,170 Z"
                fill="url(#phoneShapeGradient1)"
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
                <linearGradient id="phoneShapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <path
                d="M-200,45 C150,140 400,15 650,110 C900,190 1150,25 1400,125 C1550,165 1640,55 1640,55 L1640,145 C1550,115 1400,185 1150,125 C900,75 650,195 400,145 C150,95 -200,195 -200,195 Z"
                fill="url(#phoneShapeGradient2)"
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
                <linearGradient id="phoneShapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M-200,65 C200,155 450,20 700,120 C950,185 1200,30 1450,135 C1600,175 1640,70 1640,70 L1640,125 C1600,95 1450,180 1200,125 C950,55 700,185 450,135 C200,75 -200,75 -200,75 Z"
                fill="url(#phoneShapeGradient3)"
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
                <linearGradient id="phoneShapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.82" />
                  <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.82" />
                </linearGradient>
              </defs>
              <path
                d="M-200,55 C120,15 280,150 440,65 C600,20 760,165 920,75 C1080,25 1240,145 1400,85 C1520,55 1640,115 1640,115 L1640,165 C1520,135 1400,185 1240,165 C1080,135 920,195 760,175 C600,155 440,195 280,175 C120,155 -200,185 -200,185 Z"
                fill="url(#phoneShapeGradient4)"
              />
            </svg>

            {/* Enhanced sparkles layer - bright white/silver sparkles */}
            <svg
              className="absolute inset-0 w-full h-full z-41"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
            >
              {/* Inner sparkle dots - bright white/silver */}
              <circle cx="180" cy="95" r="1.5" fill="#ffffff" opacity="0.9" />
              <circle cx="280" cy="80" r="1.2" fill="#f0f0f0" opacity="0.85" />
              <circle cx="485" cy="105" r="1.5" fill="#ffffff" opacity="0.95" />
              <circle cx="780" cy="115" r="1.6" fill="#ffffff" opacity="0.9" />
              <circle cx="1080" cy="100" r="1.4" fill="#ffffff" opacity="0.9" />
              <circle cx="1220" cy="90" r="1.1" fill="#e0e0e0" opacity="0.8" />
              <circle cx="1350" cy="110" r="1.7" fill="#ffffff" opacity="0.95" />
              
              {/* Additional inner sparkles */}
              <circle cx="320" cy="130" r="1.1" fill="#ffffff" opacity="0.8" />
              <circle cx="420" cy="60" r="0.9" fill="#f8f8f8" opacity="0.75" />
              <circle cx="550" cy="135" r="1.2" fill="#ffffff" opacity="0.85" />
              <circle cx="720" cy="55" r="0.9" fill="#f0f0f0" opacity="0.75" />
              <circle cx="880" cy="140" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="1180" cy="145" r="1.3" fill="#ffffff" opacity="0.8" />
              
              {/* Top exterior sparkles - above the shape */}
              <circle cx="250" cy="18" r="1.3" fill="#ffffff" opacity="0.85" />
              <circle cx="380" cy="25" r="1.1" fill="#f0f0f0" opacity="0.8" />
              <circle cx="520" cy="10" r="1.8" fill="#ffffff" opacity="0.9" />
              <circle cx="900" cy="5" r="1.6" fill="#ffffff" opacity="0.85" />
              <circle cx="1300" cy="12" r="1.4" fill="#ffffff" opacity="0.9" />
              
              {/* Bottom exterior sparkles - below the shape */}
              <circle cx="200" cy="188" r="1.4" fill="#ffffff" opacity="0.8" />
              <circle cx="350" cy="185" r="1.2" fill="#f5f5f5" opacity="0.75" />
              <circle cx="640" cy="180" r="1.7" fill="#ffffff" opacity="0.85" />
              <circle cx="1040" cy="175" r="1.5" fill="#ffffff" opacity="0.9" />
              <circle cx="1380" cy="182" r="1.6" fill="#ffffff" opacity="0.85" />
              
              {/* Bright star sparkles - within shape */}
              <g transform="translate(240,110)" opacity="0.85">
                <path d="M0,-1.8 L0.5,-0.5 L1.8,0 L0.5,0.5 L0,1.8 L-0.5,0.5 L-1.8,0 L-0.5,-0.5 Z" fill="#ffffff" />
              </g>
              <g transform="translate(360,85)" opacity="0.8">
                <path d="M0,-1.6 L0.45,-0.45 L1.6,0 L0.45,0.45 L0,1.6 L-0.45,0.45 L-1.6,0 L-0.45,-0.45 Z" fill="#f0f0f0" />
              </g>
              <g transform="translate(680,125)" opacity="0.9">
                <path d="M0,-2.2 L0.65,-0.65 L2.2,0 L0.65,0.65 L0,2.2 L-0.65,0.65 L-2.2,0 L-0.65,-0.65 Z" fill="#ffffff" />
              </g>
              <g transform="translate(1050,135)" opacity="0.9">
                <path d="M0,-2.3 L0.7,-0.7 L2.3,0 L0.7,0.7 L0,2.3 L-0.7,0.7 L-2.3,0 L-0.7,-0.7 Z" fill="#ffffff" />
              </g>
              
              {/* Star sparkles on exterior - top */}
              <g transform="translate(160,8)" opacity="0.8">
                <path d="M0,-1.4 L0.4,-0.4 L1.4,0 L0.4,0.4 L0,1.4 L-0.4,0.4 L-1.4,0 L-0.4,-0.4 Z" fill="#ffffff" />
              </g>
              <g transform="translate(1000,22)" opacity="0.85">
                <path d="M0,-1.6 L0.45,-0.45 L1.6,0 L0.45,0.45 L0,1.6 L-0.45,0.45 L-1.6,0 L-0.45,-0.45 Z" fill="#ffffff" />
              </g>
              
              {/* Star sparkles on exterior - bottom */}
              <g transform="translate(150,192)" opacity="0.75">
                <path d="M0,-1.5 L0.4,-0.4 L1.5,0 L0.4,0.4 L0,1.5 L-0.4,0.4 L-1.5,0 L-0.4,-0.4 Z" fill="#ffffff" />
              </g>
              <g transform="translate(1160,194)" opacity="0.85">
                <path d="M0,-1.9 L0.55,-0.55 L1.9,0 L0.55,0.55 L0,1.9 L-0.55,0.55 L-1.9,0 L-0.55,-0.55 Z" fill="#ffffff" />
              </g>
            </svg>

            {/* Subtle atmospheric glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#59e3a5]/8 via-[#14c0ff]/12 to-[#8b5cf6]/8 blur-[12px] opacity-40 z-40"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14c0ff]/4 to-transparent blur-[6px] opacity-40 z-40"></div>

            {/* Top Layer Sparkles - High Z-Index */}
            <svg
              className="absolute inset-0 w-full h-full z-50 pointer-events-none"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
            >
              {/* Large bright sparkle dots - on top of shape (reduced by 30%) */}
              <circle cx="380" cy="95" r="1.8" fill="#f0f0f0" opacity="0.59">
                <animate attributeName="opacity" values="0.59;0.33;0.59" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="820" cy="90" r="1.9" fill="#ffffff" opacity="0.57">
                <animate attributeName="opacity" values="0.57;0.33;0.57" dur="2.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="1080" cy="110" r="2.1" fill="#ffffff" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.39;0.6" dur="3.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="1280" cy="95" r="1.7" fill="#f8f8f8" opacity="0.55">
                <animate attributeName="opacity" values="0.55;0.26;0.55" dur="2.2s" repeatCount="indefinite" />
              </circle>

              {/* Medium sparkle dots (reduced by 30%) */}
              <circle cx="480" cy="75" r="1.2" fill="#f0f0f0" opacity="0.49">
                <animate attributeName="opacity" values="0.49;0.2;0.49" dur="3.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="920" cy="70" r="1.3" fill="#f5f5f5" opacity="0.51">
                <animate attributeName="opacity" values="0.51;0.23;0.51" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="1180" cy="130" r="1.6" fill="#ffffff" opacity="0.56">
                <animate attributeName="opacity" values="0.56;0.29;0.56" dur="3.3s" repeatCount="indefinite" />
              </circle>

              {/* Animated star sparkles - on top of shape (reduced by 30%) */}
              <g transform="translate(520,90)" opacity="0.55">
                <path d="M0,-2.2 L0.6,-0.6 L2.2,0 L0.6,0.6 L0,2.2 L-0.6,0.6 L-2.2,0 L-0.6,-0.6 Z" fill="#f0f0f0">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="10s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0.23;0.55" dur="3.4s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1020,85)" opacity="0.57">
                <path d="M0,-2.4 L0.7,-0.7 L2.4,0 L0.7,0.7 L0,2.4 L-0.7,0.7 L-2.4,0 L-0.7,-0.7 Z" fill="#ffffff">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.57;0.26;0.57" dur="3.1s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1220,105)" opacity="0.54">
                <path d="M0,-2.0 L0.55,-0.55 L2.0,0 L0.55,0.55 L0,2.0 L-0.55,0.55 L-2.0,0 L-0.55,-0.55 Z" fill="#f8f8f8">
                  <animateTransform attributeName="transform" type="rotate" values="0;360" dur="6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.54;0.2;0.54" dur="2.5s" repeatCount="indefinite" />
                </path>
              </g>

              {/* Small twinkling dots (reduced by 30%) */}
              <circle cx="650" cy="120" r="0.9" fill="#f0f0f0" opacity="0.42">
                <animate attributeName="opacity" values="0.42;0.1;0.42" dur="2.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="1120" cy="75" r="0.8" fill="#f5f5f5" opacity="0.44">
                <animate attributeName="opacity" values="0.44;0.13;0.44" dur="2.3s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Phone Mockup Section */}
          <section id={PHONE_SECTION_ID} ref={phoneSectionRef} className="py-20 px-4 relative z-20 -mt-24">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                {/* Left Column - All 4 Steps, animated by scroll progress */}
                <div className="order-2 lg:order-1 relative" style={{ minHeight: 220 }}>
                  {/* Step 1 Text */}
                  <div style={{
                    position: 'absolute',
                    top: -100,
                    left: 0,
                    right: 0,
                    opacity: phoneScrollProgress < 1 ? 1 - (phoneScrollProgress * 1) : 0,
                    transform: `translateY(${phoneScrollProgress < 1 ? phoneScrollProgress * -40 : -40}px)`,
                    pointerEvents: phoneScrollProgress < 0.5 ? 'auto' : 'none',
                    transition: 'opacity 0.3s, transform 0.3s',
                  }}>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mb-1" style={{ lineHeight: '1.2' }}>
                    STEP 1
                  </h2>
                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-8" style={{ lineHeight: '1.2' }}>
                    Find Your Song
                  </h3>
                  <p className="text-xl text-gray-300 leading-relaxed">
                    Search your song or drop a direct link to your track and we'll analyze everything - your genre, style, energy, mood, and vibe. Our team scans through thousands of trending playlists in our exclusive network to find the EXACT ones where your music fits perfectly. We match you with curators who are actively looking for YOUR sound. Takes 30 seconds to submit, and our team immediately starts identifying opportunities that other services would never find.
                  </p>
                </div>

                  {/* Step 2 Text */}
                  <div style={{
                    position: 'absolute',
                    top: -100,
                    left: 0,
                    right: 0,
                    opacity: phoneScrollProgress >= 1 && phoneScrollProgress < 2 ? (phoneScrollProgress - 1) : 0,
                    transform: `translateY(${phoneScrollProgress >= 1 && phoneScrollProgress < 2 ? 40 - ((phoneScrollProgress - 1) * 40) : 40}px)`,
                    pointerEvents: phoneScrollProgress >= 1 && phoneScrollProgress < 1.5 ? 'auto' : 'none',
                    transition: 'opacity 0.3s, transform 0.3s',
                  }}>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent mb-1" style={{ lineHeight: '1.2' }}>
                      STEP 2
                    </h2>
                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-8" style={{ lineHeight: '1.2' }}>
                      Choose Your Package
                    </h3>
                    <p className="text-xl text-gray-300 leading-relaxed">
                      Pick the campaign that matches where you're at in your career. Just dropped your first single? We got you. Ready to push that track to viral status? We got that too. Each package is built different - from starter campaigns that get you those first crucial playlist placements, all the way to our highest tier packages that put you in front of MILLIONS of new listeners. Add multiple tracks for 25% off each additional song. Stack your entire EP if you want. This is YOUR campaign, built YOUR way.
                    </p>
                  </div>
                  
                  {/* Step 3 Text */}
                  <div style={{
                    position: 'absolute',
                    top: -100,
                    left: 0,
                    right: 0,
                    opacity: phoneScrollProgress >= 2 && phoneScrollProgress < 3 ? (phoneScrollProgress - 2) : 0,
                    transform: `translateY(${phoneScrollProgress >= 2 && phoneScrollProgress < 3 ? 40 - ((phoneScrollProgress - 2) * 40) : 40}px)`,
                    pointerEvents: phoneScrollProgress >= 2 && phoneScrollProgress < 2.5 ? 'auto' : 'none',
                    transition: 'opacity 0.3s, transform 0.3s',
                  }}>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] bg-clip-text text-transparent mb-1" style={{ lineHeight: '1.2' }}>
                      STEP 3
                    </h2>
                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-8" style={{ lineHeight: '1.2' }}>
                      We Go To Work For You
                    </h3>
                    <p className="text-xl text-gray-300 leading-relaxed">
                      This is where the magic happens. Our team gets on the phone and in the emails with playlist curators who TRUST us. We're not sending mass emails into the void - we're having real conversations with real people who control the biggest playlists on Spotify. "Hey Marcus, remember that R&B track that killed it last month? We got another one." That's how we move. Personal relationships, direct communication, and a track record that makes curators actually excited to hear what we're bringing them.
                    </p>
                  </div>
                  
                  {/* Step 4 Text */}
                  <div style={{
                    position: 'absolute',
                    top: -100,
                    left: 0,
                    right: 0,
                                    opacity: phoneScrollProgress >= 3 && phoneScrollProgress < 4 ? (phoneScrollProgress - 3) : (phoneScrollProgress >= 4 ? 1 : 0),
                transform: `translateY(${phoneScrollProgress >= 3 && phoneScrollProgress < 4 ? 40 - ((phoneScrollProgress - 3) * 40) : (phoneScrollProgress >= 4 ? 0 : 40)}px)`,
                pointerEvents: phoneScrollProgress >= 3 && phoneScrollProgress < 3.5 ? 'auto' : 'none',
                    transition: 'opacity 0.3s, transform 0.3s',
                  }}>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#59e3a5] to-[#8b5cf6] bg-clip-text text-transparent mb-1" style={{ lineHeight: '1.2' }}>
                      STEP 4
                    </h2>
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-8" style={{ lineHeight: '1.2' }}>
                      Watch Your Career Transform
                    </h3>
                    <p className="text-xl text-gray-300 leading-relaxed">
                      Within 48 hours, your campaign goes live and everything shifts. Major playlists start adding your track. Thousands of new listeners discovering your music every day. The same Spotify for Artists app that used to depress you? Now it's showing numbers you screenshot and send to your group chat. No more watching everyone else win while you wonder what you're doing wrong. You're IN the game now - getting the plays, building the fanbase, and finally seeing your music reach the audience it was meant for. This is what momentum feels like.
                    </p>
                  </div>
                </div>

                {/* Right Column - Phone Mockup, Step 1 and Step 2 animated by scroll progress */}
                <div className="order-1 lg:order-2 flex justify-center relative" style={{ minHeight: 600 }}>
                  {/* Background Glow Effect - Static */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[500px] h-[500px] bg-gradient-to-br from-[#59e3a5]/40 via-[#14c0ff]/50 via-[#8b5cf6]/45 to-[#59e3a5]/35 rounded-full blur-3xl opacity-80 animate-pulse" style={{ animationDuration: '4s' }}></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-96 h-96 bg-gradient-to-tl from-[#14c0ff]/35 via-[#8b5cf6]/40 to-[#59e3a5]/30 rounded-full blur-2xl opacity-70"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-80 h-80 bg-gradient-to-tr from-[#8b5cf6]/45 via-[#14c0ff]/50 to-[#59e3a5]/40 rounded-full blur-xl opacity-60"></div>
                  </div>
                  {/* Phone Frame (static) */}
                    <div className="w-80 h-[600px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl relative z-10 border border-gray-700/50">
                    <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                      {/* Status Bar (static) */}
                      <div className="flex justify-between items-center px-8 py-4 text-white text-sm relative">
                          <span>9:41</span>
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                          <div className="w-12 h-2 bg-white rounded-full opacity-80" style={{marginBottom: '2px'}}></div>
                        </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-6 h-3 border border-white rounded-sm">
                              <div className="w-4 h-1 bg-white rounded-sm m-0.5"></div>
                            </div>
                          </div>
                        </div>
                      {/* App Header (static) */}
                        <div className="px-8 py-4 border-b border-white/10">
                          <div className="flex items-center space-x-3">
                            <img src="/fasho-logo-wide.png" alt="Fasho" className="w-10 h-auto" />
                          <h3 className="text-white font-bold text-lg">
                            {phoneScrollProgress < 1 ? 'Find Your Song' : 
                             phoneScrollProgress < 2 ? 'Build Your Package' :
                             phoneScrollProgress < 3 ? 'Let\'s Get You Placed' :
phoneScrollProgress < 4 ? 'Watch Your Success' :
'Watch Your Success'}
                          </h3>
                          </div>
                        </div>
                      {/* Animated Screen Contents */}
                      <div className="flex-1 relative">
                        {/* Step 1 Screen Content */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: phoneScrollProgress < 1 ? 1 - (phoneScrollProgress * 1) : 0,
                          pointerEvents: phoneScrollProgress < 0.5 ? 'auto' : 'none',
                          transform: `translateY(${phoneScrollProgress < 1 ? phoneScrollProgress * -40 : -40}px)`,
                          transition: 'opacity 0.3s, transform 0.3s',
                        }}>
                        {/* Search Input Mockup */}
                        <div className="px-6 py-8" style={{ overflow: 'visible' }}>
                          <div className="relative" style={{ overflow: 'visible' }}>
                            {/* Search Input Field */}
                            <div className="w-full px-4 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-gray-400 transition-all duration-300">
                              {/* Animated typing effect */}
                              <div className="flex items-center">
                                <span className="text-white typing-animation" style={{minWidth: 0}}>The Weeknd</span>
                                <div className="ml-1 w-0.5 h-5 bg-[#14c0ff] cursor-blink"></div>
                              </div>
                            </div>
                            {/* Animated search results - Only show AFTER typing completes */}
                            <div className="mt-4 space-y-3 search-results">
                              <div className="bg-white/5 rounded-xl p-3 border border-white/5 result-item result-card-clickable">
                                <div className="flex items-center space-x-3">
                                  <img src="/weekend1.jpg" alt="Starboy" className="w-10 h-10 rounded-lg object-cover" />
                                  <div className="flex-1">
                                    <div className="text-white text-sm font-medium">Starboy</div>
                                    <div className="text-gray-400 text-xs">The Weeknd ft. Daft Punk</div>
                                  </div>
                                  {/* Green checkmark in corner */}
                                  <div className="w-4 h-4 bg-[#59e3a5] rounded-full flex items-center justify-center result-checkmark">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                              </div>
                              </div>
                              <div className="bg-white/5 rounded-xl p-3 border border-white/5 result-item">
                                <div className="flex items-center space-x-3">
                                  <img src="/weekend2.jpg" alt="Can't Feel My Face" className="w-10 h-10 rounded-lg object-cover" />
                                  <div className="flex-1">
                                    <div className="text-white text-sm font-medium">Can't Feel My Face</div>
                                    <div className="text-gray-400 text-xs">The Weeknd</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Static Magnifying Glass Icon - Always visible, not animated */}
                            <div className="flex justify-center mt-8">
                              <div className="w-14 h-14 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                        {/* Step 2 Screen Content */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: phoneScrollProgress >= 1 && phoneScrollProgress < 2 ? (phoneScrollProgress - 1) : 0,
                          pointerEvents: phoneScrollProgress >= 1 && phoneScrollProgress < 1.5 ? 'auto' : 'none',
                          transform: `translateY(${phoneScrollProgress >= 1 && phoneScrollProgress < 2 ? 40 - ((phoneScrollProgress - 1) * 40) : 40}px)`,
                          transition: 'opacity 0.3s, transform 0.3s',
                        }}>
                          {/* Step 2 Mockup Content */}
                          <div className="px-8 py-8 flex flex-col h-full justify-between">
                            {/* Song Info Card */}
                            <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[1px] rounded-2xl shadow-[0_8px_32px_0_rgba(20,192,255,0.35)] mb-6 relative">
                              {/* 25% OFF Badge */}
                              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-xs font-semibold px-2 py-1 rounded-md z-10">
                                25% OFF
                    </div>
                              <div className="flex items-center w-full bg-gradient-to-r from-[#23272f] to-[#1a1a2e] rounded-2xl p-4 gap-4">
                                <img src="/weekend1.jpg" alt="Starboy" className="w-16 h-16 rounded-xl object-cover shadow-md border border-white/10 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-white truncate text-left text-lg">Starboy</div>
                                  <div className="text-gray-300 truncate text-left text-base">The Weeknd ft. Daft Punk</div>
                  </div>
                </div>
              </div>
                            {/* Package Selection Mockup */}
                            <div className="flex flex-col gap-4 mb-6">
                              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center relative package-card-clickable">
                                <div className="text-white font-bold text-lg mb-1">Premium Package</div>
                                <div className="text-white text-2xl font-black mb-1">$199</div>
                                <div className="text-white/80 text-sm">Best for viral growth</div>
                                {/* Green checkmark in corner */}
                                <div className="absolute top-3 right-3 w-4 h-4 bg-[#59e3a5] rounded-full flex items-center justify-center package-checkmark">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
            </div>
                              </div>
                              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col items-center">
                                <div className="text-white font-bold text-lg mb-1">Standard Package</div>
                                <div className="text-white text-2xl font-black mb-1">$99</div>
                                <div className="text-white/80 text-sm">Solid starter boost</div>
                              </div>
                              {/* Next Step Button */}
                              <button className="w-full py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl shadow-lg text-lg hover:scale-105 active:scale-95 transition-transform duration-200">
                                Next Step
                              </button>
                            </div>
                            {/* Removed old Next Step Button */}
                          </div>
                        </div>

                        {/* Step 3 Screen Content */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: phoneScrollProgress >= 2 && phoneScrollProgress < 3 ? (phoneScrollProgress - 2) : 0,
                          pointerEvents: phoneScrollProgress >= 2 && phoneScrollProgress < 2.5 ? 'auto' : 'none',
                          transform: `translateY(${phoneScrollProgress >= 2 && phoneScrollProgress < 3 ? 40 - ((phoneScrollProgress - 2) * 40) : 40}px)`,
                          transition: 'opacity 0.3s, transform 0.3s',
                        }}>
                          {/* Step 3 Mockup Content - Lottie Animation */}
                          <div className="px-2 pb-1 flex flex-col h-full">
                            {/* Lottie Animation - Large size positioned at very top */}
                            <div className="w-full flex items-start justify-center mb-2">
                              {step3Lottie && (
                                <Lottie
                                  autoplay
                                  loop
                                  animationData={step3Lottie}
                                  style={{ width: '120%', height: '120%' }}
                                  rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                                />
                              )}
                            </div>
                            
                            {/* Text content with gradient and drop shadow */}
                            <div className="text-center mt-8">
                              <p className="font-bold text-sm leading-relaxed bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}>
                                Direct access to curators of the world's biggest playlists. They know us, they trust us, and they love our artists.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Step 4 Screen Content */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                                          opacity: phoneScrollProgress >= 3 && phoneScrollProgress < 4 ? (phoneScrollProgress - 3) : (phoneScrollProgress >= 4 ? 1 : 0),
                pointerEvents: phoneScrollProgress >= 3 && phoneScrollProgress < 3.5 ? 'auto' : 'none',
                transform: `translateY(${phoneScrollProgress >= 3 && phoneScrollProgress < 4 ? 40 - ((phoneScrollProgress - 3) * 40) : (phoneScrollProgress >= 4 ? 0 : 40)}px)`,
                          transition: 'opacity 0.3s, transform 0.3s',
                        }}>
                          {/* Step 4 Mockup Content - Lottie Animation and Chat Message */}
                          <div className="px-2 pb-1 flex flex-col h-full">
                            {/* Lottie Animation - Large size positioned at very top */}
                            <div className="w-full flex items-start justify-center mb-2">
                              {step4Lottie && (
                                <Lottie
                                  autoplay
                                  loop
                                  animationData={step4Lottie}
                                  style={{ width: '120%', height: '120%' }}
                                  rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                                />
                              )}
                            </div>
                            
                            {/* Chat Message Mockup */}
                            <div className="text-center mt-16">
                              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mx-4 relative border border-white/20">
                                {/* Chat bubble tail - single downward arrow */}
                                <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white/10 rotate-45 border-r border-b border-white/20"></div>
                                
                                {/* Message content */}
                                <div className="flex items-center mb-3">
                                  {/* Avatar */}
                                  <div className="w-8 h-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                                    <span className="text-white text-sm font-bold">J</span>
                                  </div>
                                  {/* Message Text */}
                                  <div className="flex-1 text-center">
                                    <p className="text-white font-medium text-sm whitespace-nowrap">
                                      Dude you're going viral! 🔥
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Timestamp at bottom right */}
                                <div className="flex justify-end">
                                  <span className="text-gray-400 text-[10px]">just now</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div> {/* End Animated Screen Contents */}
                    </div> {/* End Phone Inner */}
                  </div> {/* End Phone Frame */}
                </div> {/* End Right Column */}
              </div> {/* End grid */}
            </div> {/* End max-w-7xl */}
          </section>

          {/* Track Your Success Section */}
          <section className="pt-20 pb-24 px-4 relative z-10 -mt-16">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h3 
                  ref={forgetTextRef}
                  className={`text-2xl md:text-3xl lg:text-4xl font-black text-white max-w-3xl mx-auto leading-relaxed transition-all duration-700 ${forgetTextInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                >
                  Forget everything you think you know about playlist marketing. We've made it stupid simple. You submit, we connect, you grow. That's it.
                </h3>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <button
                  ref={blowUpButtonRef as any}
                  onClick={scrollToTrackInput}
                  className={`px-12 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-700 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-lg ${blowUpButtonInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                >
                  <span className="relative z-10">I'M READY TO BLOW UP</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </div>
          </section>

          {/* Dashboard Preview Section */}
          <section className="py-24 px-4 pb-48 relative z-10 overflow-hidden">
            {/* Extended gradient overlay that flows into next section */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#18192a] via-[#16213e] to-[#0a0a13] -z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent to-[#0a0a13] -z-5"></div>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 
                  ref={commandCenterRef}
                  className={`text-4xl md:text-5xl lg:text-6xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent transition-all duration-700 ${commandCenterInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} 
                  style={{ lineHeight: '1.3' }}
                >
                  Your Personal Command Center
                </h2>
                <p 
                  ref={dashboardDescRef}
                  className={`text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed transition-all duration-700 ${dashboardDescInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                >
                  Everything you need in one clean dashboard. Launch campaigns, track your playlist placements, monitor your growth, and hit us up when you need anything - all from one spot.
                </p>
              </div>

              {/* Browser Window Mockup */}
              <div ref={dashboardRef} className="relative flex justify-center">
                {/* Background Glow Effect */}
                <div className="absolute inset-0 -m-16 rounded-3xl opacity-50 blur-3xl bg-gradient-to-r from-[#59e3a5]/30 via-[#14c0ff]/40 to-[#8b5cf6]/30 animate-pulse"></div>
                
                <div 
                  className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-t-2xl shadow-2xl transition-transform duration-700 ease-out relative z-10 w-[90%]"
                  style={{ transform: getDashboardTransform() }}
                >
                  {/* Browser Header */}
                  <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-t-2xl px-4 py-3 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                        <div className="flex space-x-1.5">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                          </div>
                      <div className="flex-1 mx-6">
                        <div className="bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center border border-white/20">
                          <span className="text-white text-sm font-mono">fasho.co/dashboard</span>
                        </div>
                          </div>
                      <div className="w-20"></div>
                    </div>
                  </div>

                {/* Dashboard Content */}
                  <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[1px] rounded-b-2xl relative">
                    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-b-2xl p-6 relative">
                      
                      {/* Fade to transparent overlay for bottom 10% */}
                      <div className="absolute inset-x-0 bottom-0 h-[10%] bg-gradient-to-t from-[#16213e] via-[#16213e]/90 to-transparent rounded-b-2xl pointer-events-none z-10"></div>
                      
                  {/* Dashboard Header */}
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                    <div>
                            <h3 className="text-2xl font-bold text-white">Campaign Dashboard</h3>
                            <p className="text-gray-400 text-sm">Real-time performance metrics</p>
                    </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
                            LIVE
                          </div>
                    </div>
                  </div>

                      {/* Top Stats Grid - Only 3 cards now */}
                      <div className="grid md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-gray-400 text-sm font-medium">Estimated Streams</div>
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                          <div className="text-2xl font-bold text-white mb-1">247,382</div>
                          <div className="flex items-center text-green-400 text-sm">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            +23% this week
                    </div>
                      </div>
                        
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-gray-400 text-sm font-medium">Playlist Adds</div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                          <div className="text-2xl font-bold text-white mb-1">47</div>
                          <div className="flex items-center text-blue-400 text-sm">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            +12 new placements
                      </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-gray-400 text-sm font-medium">Active Campaigns</div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                          </div>
                          <div className="text-2xl font-bold text-white mb-1">3</div>
                          <div className="flex items-center text-purple-400 text-sm">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            2 launching soon
                          </div>
                    </div>
                  </div>

                      {/* Chart and Artist Profile Section */}
                      <div className="grid lg:grid-cols-3 gap-6 mb-6">
                        {/* Animated Chart Section - Takes 2/3 width */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-6">
                            <h4 className="text-white font-semibold text-lg">Stream Growth Analytics</h4>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full"></div>
                                <span>Streams</span>
                        </div>
                              <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <div className="w-3 h-3 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-full"></div>
                                <span>Saves</span>
                      </div>
                            </div>
                          </div>
                          
                          {/* Animated Line Chart with Bouncing Data Points */}
                          <div className="h-48 relative bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-lg p-4 overflow-hidden">
                           {/* Grid lines */}
                            <div className="absolute inset-0 opacity-20">
                              <div className="h-full w-full grid grid-cols-12 grid-rows-6">
                                {[...Array(72)].map((_, i) => (
                                  <div key={i} className="border-r border-t border-white/10"></div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Bouncing Line Chart with SVG */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                           <defs>
                                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.8" />
                                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.9" />
                                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                                </linearGradient>
                                <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#14c0ff" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.1" />
                             </linearGradient>
                           </defs>
                              
                              {/* Animated line path with bouncing effect */}
                           <path
                                d="M 0 70 Q 12 55 25 60 T 50 45 T 75 35 T 100 30"
                             fill="none"
                                stroke="url(#chartGradient)"
                                strokeWidth="0.8"
                                className="animate-pulse"
                                style={{
                                  filter: 'drop-shadow(0 0 4px rgba(20, 192, 255, 0.6))'
                                }}
                              >
                                <animate
                                  attributeName="d"
                                  values="M 0 70 Q 12 55 25 60 T 50 45 T 75 35 T 100 30;
                                          M 0 65 Q 12 50 25 55 T 50 40 T 75 30 T 100 25;
                                          M 0 70 Q 12 55 25 60 T 50 45 T 75 35 T 100 30"
                                  dur="3s"
                                  repeatCount="indefinite"
                                />
                           </path>
                              
                              {/* Fill area under the line */}
                           <path
                                d="M 0 70 Q 12 55 25 60 T 50 45 T 75 35 T 100 30 L 100 100 L 0 100 Z"
                                fill="url(#chartFill)"
                              >
                                <animate
                                  attributeName="d"
                                  values="M 0 70 Q 12 55 25 60 T 50 45 T 75 35 T 100 30 L 100 100 L 0 100 Z;
                                          M 0 65 Q 12 50 25 55 T 50 40 T 75 30 T 100 25 L 100 100 L 0 100 Z;
                                          M 0 70 Q 12 55 25 60 T 50 45 T 75 35 T 100 30 L 100 100 L 0 100 Z"
                                  dur="3s"
                                  repeatCount="indefinite"
                                />
                           </path>
                              
                              {/* Animated data points */}
                              <circle cx="25" cy="60" r="1" fill="#59e3a5" className="animate-pulse">
                                <animate attributeName="cy" values="60;55;60" dur="3s" repeatCount="indefinite" />
                                <animate attributeName="r" values="1;1.5;1" dur="2s" repeatCount="indefinite" />
                           </circle>
                              <circle cx="50" cy="45" r="1" fill="#14c0ff" className="animate-pulse">
                                <animate attributeName="cy" values="45;40;45" dur="3s" repeatCount="indefinite" />
                                <animate attributeName="r" values="1;1.5;1" dur="2.5s" repeatCount="indefinite" />
                           </circle>
                              <circle cx="75" cy="35" r="1" fill="#8b5cf6" className="animate-pulse">
                                <animate attributeName="cy" values="35;30;35" dur="3s" repeatCount="indefinite" />
                                <animate attributeName="r" values="1;1.5;1" dur="2.2s" repeatCount="indefinite" />
                           </circle>
                         </svg>
                            
                            {/* Floating data points */}
                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-2 text-xs text-white">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                                <span>Live updates</span>
                          </div>
                        </div>
                          </div>
                        </div>

                        {/* Spotify Artist Profile Section - Takes 1/3 width */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-semibold text-lg">Artist Profile</h4>
                            <svg className="w-5 h-5 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                          </div>
                          
                          {/* Artist Info */}
                          <div className="text-center mb-6">
                            <img src="/weekend1.jpg" alt="The Weeknd" className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-[#14c0ff]/50" />
                            <h5 className="text-white font-bold text-lg">The Weeknd</h5>
                            <p className="text-gray-400 text-sm">Verified Artist</p>
                          </div>
                          
                          {/* Artist Stats */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-sm">Monthly Listeners</span>
                              <span className="text-white font-semibold">94.2M</span>
                          </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-sm">Followers</span>
                              <span className="text-white font-semibold">47.8M</span>
                        </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-sm">World Rank</span>
                              <span className="text-white font-semibold">#7</span>
                      </div>
                          </div>
                          
                    </div>
                  </div>

                  {/* Active Campaigns Section */}
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold text-lg mb-4">Active Campaigns</h4>
                        
                      {/* Campaign 1 */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center space-x-4">
                            <img src="/weekend1.jpg" alt="Starboy" className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/20" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-white font-semibold">Starboy - The Weeknd ft. Daft Punk</h5>
                                <div className="bg-green-400/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                                  ACTIVE
                            </div>
                          </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-400">Campaign Progress</div>
                                  <div className="text-white font-medium">73% Complete</div>
                          </div>
                                <div>
                                  <div className="text-gray-400">Playlist Placements</div>
                                  <div className="text-white font-medium">24 Active</div>
                          </div>
                            <div>
                                  <div className="text-gray-400">Weekly Streams</div>
                                  <div className="text-white font-medium">+18,247</div>
                          </div>
                        </div>
                        {/* Progress bar */}
                              <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full transition-all duration-2000 ease-out"
                                  style={{ width: '73%' }}
                                ></div>
                          </div>
                          </div>
                            <div className="flex flex-col space-y-2">
                              <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                                View Details
                              </button>
                      </div>
                    </div>
                  </div>
                  
                        {/* Campaign 2 */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                          <div className="flex items-center space-x-4">
                            <img src="/weekend2.jpg" alt="Can't Feel My Face" className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/20" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-white font-semibold">Can't Feel My Face - The Weeknd</h5>
                                <div className="bg-blue-400/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium">
                                  LAUNCHING
                </div>
                </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-400">Campaign Progress</div>
                                  <div className="text-white font-medium">28% Complete</div>
              </div>
                                <div>
                                  <div className="text-gray-400">Playlist Placements</div>
                                  <div className="text-white font-medium">8 Confirmed</div>
            </div>
                                <div>
                                  <div className="text-gray-400">Expected Launch</div>
                                  <div className="text-white font-medium">2 days</div>
              </div>
                  </div>
                              {/* Progress bar */}
                              <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] rounded-full transition-all duration-2000 ease-out animate-pulse"
                                  style={{ width: '28%' }}
                                ></div>
                  </div>
                </div>
                            <div className="flex flex-col space-y-2">
                              <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
                                View Details
                              </button>
                  </div>
                  </div>
                </div>
                  </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </section>

          {/* Genre Coverage Section */}
          <section className="py-24 px-4 relative z-20 -mt-24" style={{ background: 'transparent' }}>
            <div className="max-w-7xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-16">
                <h2 
                  ref={genreHeadingRef}
                  className={`text-3xl md:text-4xl lg:text-5xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent transition-all duration-700 ${genreHeadingInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} 
                  style={{ lineHeight: '1.3' }}
                >
                  " Wait, But I Make [Insert Genre Here] "
                </h2>
                <h3 
                  ref={genreSubheadingRef}
                  className={`text-xl md:text-2xl lg:text-3xl font-black text-white max-w-3xl mx-auto leading-relaxed transition-all duration-700 ${genreSubheadingInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                >
                  Say less. We work with playlists in EVERY genre known to mankind.
                </h3>
              </div>

              {/* Three Column Genre Lists */}
              <div 
                ref={genreListContainerRef}
                className={`grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 max-w-6xl mx-auto justify-items-center relative p-8 md:p-12 transition-all duration-700 ${genreListContainerInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
              >
                {/* Subtle gradient glow behind container */}
                <div className="absolute inset-0 -m-4 bg-gradient-to-br from-[#59e3a5]/20 via-[#14c0ff]/15 to-[#8b5cf6]/20 rounded-3xl blur-xl -z-20"></div>
                {/* Dark gradient background container */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-gray-900/90 to-black/95 rounded-3xl backdrop-blur-sm border-2 border-white/20 shadow-2xl shadow-black/20 -z-10"></div>
                {/* First Column */}
                <div className="space-y-6">
                  {[
                    'Hip-Hop & Rap',
                    'Pop', 
                    'R&B',
                    'Electronic/EDM',
                    'Rock',
                    'Indie',
                    'Latin',
                    'Country',
                    'Jazz',
                    'Classical'
                  ].map((genre, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      {/* Green Gradient Checkmark */}
                      <div className="w-7 h-7 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                        <svg className="w-4 h-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-white text-2xl font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{genre}</span>
                    </div>
                  ))}
                </div>

                {/* Second Column */}
                <div className="space-y-6">
                  {[
                    'Reggaeton',
                    'K-Pop',
                    'Afrobeats',
                    'House',
                    'Techno',
                    'Trap',
                    'Lo-fi',
                    'Punk',
                    'Metal',
                    'Folk'
                  ].map((genre, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      {/* Green Gradient Checkmark */}
                      <div className="w-7 h-7 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                        <svg className="w-4 h-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-white text-2xl font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{genre}</span>
                    </div>
                  ))}
                </div>

                {/* Third Column */}
                <div className="space-y-6">
                  {[
                    'Soul',
                    'Funk',
                    'Reggae',
                    'Gospel',
                    'Blues',
                    'Podcast/Spoken Word',
                    'Meditation',
                    'Workout',
                    'Study Music',
                    'Gaming Soundtracks'
                  ].map((genre, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      {/* Green Gradient Checkmark */}
                      <div className="w-7 h-7 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                        <svg className="w-4 h-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-white text-2xl font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{genre}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Subheading */}
              <div className="text-center mb-12">
                <h3 
                  ref={experimentalTextRef}
                  className={`text-2xl md:text-3xl lg:text-4xl font-black text-white max-w-4xl mx-auto leading-relaxed transition-all duration-700 ${experimentalTextInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                >
                  Do you make experimental ambient-folk-trap-piano-blitz? Yup, we got playlists for that too.
                </h3>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <button
                  ref={campaignButtonRef as any}
                  onClick={scrollToTrackInput}
                  className={`px-12 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-700 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-lg ${campaignButtonInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                >
                  <span className="relative z-10">LET'S START MY CAMPAIGN</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </div>
          </section>

          {/* Authenticity Guaranteed Section */}
          <section className="py-24 px-4 relative z-10" style={{ background: 'transparent' }}>
            <div className="max-w-7xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-16">
                <h2 
                  ref={authenticityHeadingRef}
                  className={`text-4xl md:text-5xl lg:text-6xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent flex items-center justify-center gap-4 transition-all duration-700 ${authenticityHeadingInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`} 
                  style={{ lineHeight: '1.3' }}
                >
                  Authenticity Guaranteed
                  {/* Green Check Mark Icon */}
                  <div className="w-16 h-16 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_12px_rgba(89,227,165,0.4)]">
                    <svg className="w-10 h-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </h2>
                <h3 
                  ref={authenticitySubheadingRef}
                  className={`text-2xl md:text-3xl lg:text-4xl font-black text-white max-w-4xl mx-auto leading-relaxed mb-12 transition-all duration-700 ${authenticitySubheadingInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                >
                  We know you're skeptical. You should be.
                </h3>
              </div>

              {/* Main Content Container with Unique Design */}
              <div className="relative max-w-6xl mx-auto">
                {/* Background Design Elements */}
                <div className="absolute inset-0 -m-8 rounded-3xl opacity-30 blur-2xl bg-gradient-to-br from-[#59e3a5]/20 via-[#14c0ff]/30 to-[#8b5cf6]/20 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/90 to-[#0a0a13]/95 rounded-2xl backdrop-blur-sm border-2 border-white/10 shadow-2xl"></div>
                
                {/* Content */}
                <div className="relative z-10 p-8 md:p-12">
                  {/* Opening Paragraph */}
                  <div className="text-center mb-12">
                    <p 
                      ref={authenticityIntroRef}
                      className={`text-xl md:text-2xl text-gray-300 leading-relaxed mb-8 transition-all duration-700 ${authenticityIntroInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                    >
                      The Spotify marketing world is full of companies running bot farms from their mom's basement. They promise millions, deliver garbage, and disappear with your money.
                    </p>
                    <p 
                      ref={authenticityOperatesRef}
                      className={`text-2xl md:text-3xl font-black text-white leading-relaxed transition-all duration-700 ${authenticityOperatesInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                    >
                      FASHO.co operates differently:
                    </p>
                  </div>

                  {/* Icon List with Unique Layout */}
                  <div 
                    ref={authenticityListRef}
                    className={`grid md:grid-cols-2 gap-8 mb-12 transition-all duration-700 ${authenticityListInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                  >
                    {[
                      'REAL playlist curators who we\'ve worked with for years',
                      'REAL listeners who actually save and replay your music',
                      'REAL growth that Spotify\'s algorithm recognizes and rewards',
                      'REAL results you can verify in your Spotify for Artists app'
                    ].map((item, index) => (
                      <div key={index} className="flex items-start space-x-4 p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 backdrop-blur-sm hover:from-white/10 hover:to-white/5 transition-all duration-300 group">
                        {/* Animated Check Icon */}
                        <div className="w-8 h-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_8px_rgba(89,227,165,0.3)] group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-white text-lg font-medium leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:text-[#59e3a5] transition-colors duration-300">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Closing Statements */}
                  <div className="text-center space-y-8">
                    <p 
                      ref={authenticityClosingRef}
                      className={`text-xl md:text-2xl text-gray-300 leading-relaxed transition-all duration-700 ${authenticityClosingInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                    >
                      No bots. No fake streams. No sketchy tactics that risk your account.
                    </p>
                    
                    <div 
                      ref={authenticityHighlightRef}
                      className={`relative transition-all duration-700 ${authenticityHighlightInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                    >
                      {/* Highlight Box */}
                      <div className="bg-gradient-to-r from-[#59e3a5]/10 via-[#14c0ff]/15 to-[#8b5cf6]/10 rounded-2xl p-8 border border-[#14c0ff]/30 backdrop-blur-sm">
                        <p className="text-xl md:text-2xl text-white leading-relaxed mb-4">
                          Just legitimate playlist placements that put your music in front of people who actually want to hear it. The same way every major artist built their career - through authentic exposure to the right audience.
                        </p>
                        <p className="text-lg md:text-xl text-[#59e3a5] font-semibold leading-relaxed">
                          Your account stays safe. Your growth stays permanent. Your music reaches real fans.
                        </p>
                      </div>
                    </div>

                    <p 
                      ref={authenticityGuaranteeRef}
                      className={`text-2xl md:text-3xl font-black text-white leading-relaxed transition-all duration-700 ${authenticityGuaranteeInView ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}`}
                    >
                      That's not marketing speak. That's a guarantee.
                    </p>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                
                {/* Floating Sparkles */}
                <div className="absolute top-8 left-8 w-2 h-2 bg-white rounded-full opacity-60 animate-ping"></div>
                <div className="absolute top-1/3 right-8 w-3 h-3 bg-[#14c0ff] rounded-full opacity-40 animate-ping" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-[#59e3a5] rounded-full opacity-50 animate-ping" style={{ animationDelay: '3s' }}></div>
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-24 px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{ lineHeight: '1.3' }}>
                Ready to Go Viral?
                </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                Join thousands of artists who've already transformed their careers with Fasho. Your breakthrough moment is just one campaign away.
              </p>
                <button
                  onClick={scrollToTrackInput}
                className="px-16 py-5 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-xl"
              >
                <span className="relative z-10">Launch Your Campaign Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
            </div>
          </section>

          {/* Add large margin for testing separation */}
          <div style={{ marginBottom: '200px' }}></div>

        </div> {/* End Content Container */}

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
                ) : hasSearched ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.87 0-5.431.967-7.5 2.591" />
              </svg>
            </div>
                    <p className="text-gray-400 mb-2">No tracks found</p>
                    <p className="text-gray-500 text-sm">Try searching with different keywords</p>
            </div>
          ) : null}
              </div>
        </div>,
        document.body
          )
        )}

        {/* Preview Track Portal */}
        {isMounted && previewTrack && !isSpotifyUrlCheck(url) && (
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
                <div className="flex items-center space-x-3 mb-4">
                  <img
                    src={previewTrack.imageUrl}
                    alt={previewTrack.title}
                    className="w-16 h-16 rounded-xl object-cover shadow-md border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate text-lg">{previewTrack.title}</div>
                    <div className="text-gray-300 truncate">{previewTrack.artist}</div>
                  </div>
                </div>
                
                <button
                  onClick={handleConfirm}
                  className="w-full py-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#14c0ff]/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
                >
                  Continue with this track
                </button>
              </div>
            </div>,
            document.body
          )
        )}
      </main>
    </>
  );
}