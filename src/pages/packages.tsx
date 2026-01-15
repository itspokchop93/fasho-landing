import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { Track } from "../types/track";
import Header from "../components/Header";
import StepIndicator from "../components/StepIndicator";
import SalesBanner from "../components/SalesBanner";
import SalesPop from "../components/SalesPop";
import dynamic from 'next/dynamic';
import { createClient } from '../utils/supabase/client';
import * as gtag from '../utils/gtag';
import { analytics } from "../utils/analytics";

// Packages page component
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface Package {
  id: string;
  name: string;
  price: number;
  plays: string;
  placements: string;
  description: string;
  icon: string;
  popular?: boolean;
}

const packages: Package[] = [
  {
    id: "legendary",
    name: "LEGENDARY",
    price: 479,
    plays: "125K - 150K Streams", 
    placements: "375 - 400 Playlist Pitches",
    description: "Designed for serious artists who accept nothing but total victory",
    icon: "👑"
  },
  {
    id: "unstoppable",
    name: "UNSTOPPABLE",
    price: 259,
    plays: "45K - 50K Streams", 
    placements: "150 - 170 Playlist Pitches",
    description: "The go-to campaign for creators who want massive industry impact",
    icon: "💎"
  },
  {
    id: "dominate",
    name: "DOMINATE", 
    price: 149,
    plays: "18K - 20K Streams",
    placements: "60 - 70 Playlist Pitches",
    description: "Perfect for dominating the industry and making serious waves",
    icon: "🔥",
    popular: true
  },
  {
    id: "momentum", 
    name: "MOMENTUM",
    price: 79,
    plays: "7.5K - 8.5K Streams",
    placements: "25 - 30 Playlist Pitches",
    description: "Made for artists ready to accelerate their growth and level up fast",
    icon: "⚡"
  },
  {
    id: "breakthrough",
    name: "BREAKTHROUGH",
    price: 39,
    plays: "3K - 3.5K Streams",
    placements: "10 - 12 Playlist Pitches",
    description: "The perfect gateway campaign to rapidly skyrocket your music career",
    icon: "🚀"
  }
];

export default function PackagesPage() {
  const router = useRouter();
  const { tracks: tracksParam } = router.query;
  const supabase = createClient();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [selectedPackages, setSelectedPackages] = useState<{[key: number]: string}>({});
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [graphAnimating, setGraphAnimating] = useState(false);
  const [animatedData, setAnimatedData] = useState<number[]>([]);
  const [animatedPlays, setAnimatedPlays] = useState<string>("");
  const [animatedPlacements, setAnimatedPlacements] = useState<number>(0);
  const [previousPackage, setPreviousPackage] = useState<string>("");
  const [currentScale, setCurrentScale] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false); // Hide left arrow initially
  const [canScrollRight, setCanScrollRight] = useState(true); // Start with right arrow showing
  const [scrollProgress, setScrollProgress] = useState(0); // Track scroll progress for progress bar
  const [songIndicatorKey, setSongIndicatorKey] = useState(0); // For triggering animation
  const [confettiAnimation, setConfettiAnimation] = useState<string | null>(null); // Track which package shows confetti
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiData, setConfettiData] = useState<any>(null); // Store the Lottie animation data
  const [currentUser, setCurrentUser] = useState<any>(null); // Track authentication state
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Track if auth is still loading
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null); // Track existing session for renewal
  const [drawerClosed, setDrawerClosed] = useState(false); // Track if drawer is closed (mobile only)
  const [showChangeSongPopup, setShowChangeSongPopup] = useState(false); // Track change song popup visibility
  const carouselRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);
  const selectedPackageRef = useRef<HTMLDivElement>(null);
  const changeSongButtonRef = useRef<HTMLButtonElement>(null);
  const hasTrackedPackagesView = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;
    
    // Check if we have an existing session ID from checkout navigation
    const sessionId = router.query.sessionId as string;
    if (sessionId) {
      setExistingSessionId(sessionId);
      console.log('🔄 PACKAGES: Coming from checkout with existing session:', sessionId);
    }
    
    if (tracksParam && typeof tracksParam === 'string') {
      try {
        const parsedTracks = JSON.parse(tracksParam) as Track[];
        setTracks(parsedTracks);
        // Trigger animation on initial load
        setSongIndicatorKey(prev => prev + 1);
      } catch (error) {
        console.error("Failed to parse tracks:", error);
        router.push( '/add');
      }
    } else {
      router.push( '/add');
    }
  }, [router.isReady, tracksParam, router.query.sessionId]);

  useEffect(() => {
    if (!router.isReady || hasTrackedPackagesView.current) return;
    if (tracks.length === 0) return;
    analytics.track("packages_page_viewed", { song_count: tracks.length });
    hasTrackedPackagesView.current = true;
  }, [router.isReady, tracks.length]);

  // Check for authentication state
  useEffect(() => {
    console.log('🔐 PACKAGES: useEffect started - checking auth');
    
    const checkUser = async () => {
      try {
        console.log('🔐 PACKAGES: About to call supabase.auth.getUser()');
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('🔐 PACKAGES: supabase.auth.getUser() response:', { user: user?.email || null, error });
        
        if (error) {
          console.error('🔐 PACKAGES: Error in getUser:', error);
        }
        
        console.log('🔐 PACKAGES: Setting currentUser to:', user?.email || 'No user');
        setCurrentUser(user);
        setIsAuthLoading(false);
      } catch (err) {
        console.error('🔐 PACKAGES: Exception in checkUser:', err);
        setCurrentUser(null);
        setIsAuthLoading(false);
      }
    };
    
    checkUser();

    // TEMPORARILY DISABLED: Listen for auth changes
    console.log('🔐 PACKAGES: SKIPPING onAuthStateChange listener for testing');
    // const { data: { subscription } } = supabase.auth.onAuthStateChange(
    //   (event, session) => {
    //     console.log('🔐 PACKAGES: Auth state changed:', event, session?.user?.email || 'No user');
    //     console.log('🔐 PACKAGES: Full session object:', session);
    //     setCurrentUser(session?.user ?? null);
    //     setIsAuthLoading(false);
    //   }
    // );

    return () => {
      console.log('🔐 PACKAGES: Cleaning up auth listener (none set)');
      // subscription.unsubscribe();
    };
  }, []);

  // Load confetti animation data
  useEffect(() => {
    const loadConfettiData = async () => {
      try {
        const response = await fetch('https://lottie.host/b8cbac69-4cfa-44c2-8599-4547e60e963d/9Dwil0l2te.json');
        const data = await response.json();
        setConfettiData(data);
      } catch (error) {
        console.error('Failed to load confetti animation:', error);
      }
    };
    
    loadConfettiData();
  }, []);

  const currentTrack = tracks[currentSongIndex];
  const isLastSong = currentSongIndex === tracks.length - 1;
  const isOnlySong = tracks.length === 1;
  const isDiscountedSong = currentSongIndex > 0; // Songs after the first get 25% off

  // Calculate discounted price (25% off, rounded up)
  const getDiscountedPrice = (originalPrice: number) => {
    const discounted = originalPrice * 0.75; // 25% off
    return Math.ceil(discounted); // Round up
  };

  const handlePackageSelect = (packageId: string) => {
    // Toggle functionality - if clicking the same package, unselect it
    const newPackageId = selectedPackage === packageId ? "" : packageId;
    const fromPackageId = selectedPackage || undefined;
    const selectedPkg = packages.find(pkg => pkg.id === packageId);
    
    // Only play confetti if actually selecting a package (not deselecting)
    if (newPackageId !== "") {
      // Trigger confetti animation over the clicked package
      setConfettiAnimation(packageId);
      setConfettiKey(prev => prev + 1); // Force re-render to restart animation
      
      // Reset confetti after animation completes (2 seconds)
      setTimeout(() => {
        setConfettiAnimation(null);
      }, 2000);

      // Track package selection for Google Ads
      if (selectedPkg) {
        analytics.track("package_selected", {
          package_id: selectedPkg.id,
          package_name: selectedPkg.name,
          price: selectedPkg.price,
          currency: "USD",
          spotify_track_id: currentTrack?.id,
          song_count_affected: 1,
        });
        if (fromPackageId && fromPackageId !== newPackageId) {
          analytics.track("package_selection_changed", {
            from_package_id: fromPackageId,
            to_package_id: newPackageId,
            spotify_track_id: currentTrack?.id,
          });
        }
        gtag.trackPackageSelect({
          id: selectedPkg.id,
          name: selectedPkg.name,
          price: selectedPkg.price
        });

        // Track for Google Analytics 4
        gtag.trackGA4Event('select_item', {
          item_list_id: 'fasho_packages',
          item_list_name: 'FASHO Packages',
          items: [{
            item_id: selectedPkg.id,
            item_name: `FASHO ${selectedPkg.name}`,
            item_category: 'Music Promotion',
            price: selectedPkg.price,
            quantity: 1
          }]
        });
      }

      // Mobile drawer effect: Close drawer after 200ms delay
      setTimeout(() => {
        setDrawerClosed(true);
      }, 200);
    } else {
      // If deselecting, open drawer immediately
      setDrawerClosed(false);
    }
    
    setPreviousPackage(selectedPackage);
    setSelectedPackage(newPackageId);
    setSelectedPackages(prev => ({
      ...prev,
      [currentSongIndex]: newPackageId
    }));
  };

  const handleChangePackage = () => {
    // Unselect the current package
    setPreviousPackage(selectedPackage);
    setSelectedPackage("");
    setSelectedPackages(prev => ({
      ...prev,
      [currentSongIndex]: ""
    }));
    
    // Wait 200ms then open drawer
    setTimeout(() => {
      setDrawerClosed(false);
    }, 200);
  };

  // Animate chart data when package changes
  useEffect(() => {
    const selected = packages.find(p => p.id === selectedPackage);
    const hadPreviousSelection = previousPackage !== "";
    
    if (!selected) {
      setAnimatedData([]);
      setAnimatedPlays("");
      setAnimatedPlacements(0);
      return;
    }
    
    // Parse the exact range from package data
    const playsNumbers = selected.plays.match(/[\d,\.]+K?/g);
    const placementsNumbers = selected.placements.match(/\d+/g);
    
    // Convert K format to actual numbers
    const parseNumber = (numStr: string): number => {
      const cleanNum = numStr.replace(/,/g, '');
      if (cleanNum.includes('K')) {
        return parseFloat(cleanNum.replace('K', '')) * 1000;
      }
      return parseInt(cleanNum);
    };
    
    const minPlays = playsNumbers ? parseNumber(playsNumbers[0]) : 0;
    const maxPlays = playsNumbers && playsNumbers.length > 1 ? parseNumber(playsNumbers[1]) : minPlays;
    
    const minPlacements = placementsNumbers ? parseInt(placementsNumbers[0]) : 0;
    const maxPlacements = placementsNumbers && placementsNumbers.length > 1 ? parseInt(placementsNumbers[1]) : minPlacements;
    
    // Generate realistic offset numbers that don't end with 00
    const generateRealisticNumber = (baseNumber: number): number => {
      // Create an offset between 8-18% of the base number
      const offsetPercentage = 0.08 + Math.random() * 0.10; // 8-18%
      const offset = Math.floor(baseNumber * offsetPercentage);
      
      // Add the offset and ensure it doesn't end with 00
      let realisticNumber = baseNumber + offset;
      
      // If it ends with 00, adjust it
      if (realisticNumber % 100 === 0) {
        // Add a random number between 20-99 that doesn't end in 0
        const adjustment = 20 + Math.floor(Math.random() * 70); // 20-89
        realisticNumber += adjustment;
      } else if (realisticNumber % 10 === 0) {
        // If it ends with just one 0, add 1-9
        realisticNumber += Math.floor(Math.random() * 9) + 1;
      }
      
      return Math.floor(realisticNumber);
    };
    
    // Generate realistic range for display
    const realisticMinPlays = generateRealisticNumber(minPlays);
    const realisticMaxPlays = generateRealisticNumber(maxPlays);
    const playsRange = `${realisticMinPlays.toLocaleString()} - ${realisticMaxPlays.toLocaleString()} Streams`;
    
    const avgPlacements = Math.round((minPlacements + maxPlacements) / 2);
    
    // Generate 30-day growth data
    const dailyData: number[] = [];
    for (let i = 0; i < 30; i++) {
      const progress = i / 29;
      const randomVariation = 0.85 + Math.random() * 0.3; // 85-115% variation for realistic data
      const dailyPlays = Math.floor(maxPlays * progress * randomVariation);
      dailyData.push(Math.max(0, dailyPlays));
    }

    setGraphAnimating(true);
    
    // Capture starting values and scale for downward animation
    const startingData = [...animatedData];
    const startingPlacements = animatedPlacements;
    const startingPlays = animatedPlays;
    const previousSelected = packages.find(p => p.id === previousPackage);
    const previousMaxPlays = previousSelected ? 
      Math.floor(parseInt(previousSelected.plays.replace(/[^0-9]/g, '')) * 1000 * 1.1) : 
      maxPlays;
    
    // Set initial scale
    if (!hadPreviousSelection) {
      setCurrentScale(maxPlays);
    }
    
    let startTime: number;
    let animationId: number;
    let phase: 'down' | 'up' = hadPreviousSelection ? 'down' : 'up';
    let phaseStartTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      if (!phaseStartTime) phaseStartTime = timestamp;
      
      const elapsed = timestamp - phaseStartTime;
      const phaseDuration = hadPreviousSelection ? 350 : 750; // Much faster - 200% speed increase
      const progress = Math.min(elapsed / phaseDuration, 1);

      // Easing function (ease-out-cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      if (phase === 'down') {
        // Keep using the previous package's scale during downward animation
        setCurrentScale(previousMaxPlays);
        
        // Animate down from starting values to zero (right to left)
        const newAnimatedData = startingData.map((startValue, index) => {
          const pointDelay = ((29 - index) / 29) * 0.3; // Right to left for downward
          const pointProgress = Math.max(0, Math.min(1, (easeOutCubic - pointDelay) / (1 - pointDelay)));
          return startValue * (1 - pointProgress);
        });
        
        setAnimatedData(newAnimatedData);
        
        // Animate numbers down from starting values
        setAnimatedPlacements(Math.floor(startingPlacements * (1 - easeOutCubic)));
        
        // Clear plays text gradually
        if (easeOutCubic > 0.5) {
          setAnimatedPlays("");
        }
        
        if (progress >= 1) {
          // Switch to up phase and change scale
          phase = 'up';
          phaseStartTime = timestamp;
          setCurrentScale(maxPlays); // Switch to new package's scale
          setAnimatedData(new Array(30).fill(0)); // Reset to zeros for upward animation
        }
      } else {
        // Animate up to target values (left to right)
        const newAnimatedData = dailyData.map((targetPlays, index) => {
          const pointDelay = (index / 29) * 0.3; // Left to right for upward
          const pointProgress = Math.max(0, Math.min(1, (easeOutCubic - pointDelay) / (1 - pointDelay)));
          return targetPlays * pointProgress;
        });

        setAnimatedData(newAnimatedData);
        
        // Animate numbers up
        setAnimatedPlacements(Math.floor(avgPlacements * easeOutCubic));
        setAnimatedPlays(easeOutCubic > 0.1 ? playsRange : "");
        
        if (progress >= 1) {
          setGraphAnimating(false);
          return;
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // Initial setup
    if (!hadPreviousSelection) {
      setAnimatedData(new Array(30).fill(0));
    }

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [selectedPackage]);

  // Reset drawer when song changes (mobile only)
  useEffect(() => {
    // When song changes, reset drawer state based on whether package is selected
    // If no package is selected for the current song, ensure drawer is open
    if (!selectedPackage) {
      setDrawerClosed(false);
    }
    // If a package is selected, drawer can remain closed (user already made selection)
  }, [currentSongIndex, selectedPackage]);

  // Auto-scroll to selected package when drawer closes (mobile only)
  useEffect(() => {
    if (drawerClosed && selectedPackage) {
      let scrollAnimationId: number | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      let isCancelled = false;
      
      // Delay to let layout update (other packages collapsing), then calculate final position
      // This ensures we calculate based on the updated layout state
      // We need enough time for the layout to update, but still scroll during the animation
      timeoutId = setTimeout(() => {
        if (isCancelled || !selectedPackageRef.current) return;
        
        // Use requestAnimationFrame to get the most accurate layout measurement
        scrollAnimationId = requestAnimationFrame(() => {
          if (isCancelled || !selectedPackageRef.current) return;
          
          const element = selectedPackageRef.current;
          const elementRect = element.getBoundingClientRect();
          const elementTop = elementRect.top + window.pageYOffset;
          const elementHeight = elementRect.height;
          const windowHeight = window.innerHeight;
          
          // Calculate target scroll position to center the element (same as scrollIntoView block: 'center')
          const targetScroll = elementTop - (windowHeight / 2) + (elementHeight / 2);
          
          // Get current scroll position
          const startScroll = window.pageYOffset;
          const distance = targetScroll - startScroll;
          
          // Calculate remaining duration to complete at same time as drawer (500ms total)
          // We used ~200ms delay, so scroll duration should be ~300ms to complete at same time
          const delayUsed = 200;
          const duration = 500 - delayUsed; // ~300ms to complete at same time as drawer
          const startTime = performance.now();
          
          // Custom smooth scroll function
          const smoothScroll = (currentTime: number) => {
            if (isCancelled) return;
            
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out) to match smooth scroll behavior
            const easeInOut = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            window.scrollTo(0, startScroll + distance * easeInOut);
            
            if (progress < 1) {
              scrollAnimationId = requestAnimationFrame(smoothScroll);
            }
          };
          
          scrollAnimationId = requestAnimationFrame(smoothScroll);
        });
      }, 200); // Delay to let layout update before calculating position
      
      return () => {
        isCancelled = true;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        if (scrollAnimationId !== null) {
          cancelAnimationFrame(scrollAnimationId);
        }
      };
    }
  }, [drawerClosed, selectedPackage]);

  const handleNext = async () => {
    if (!selectedPackage) {
      alert("Please select a package before continuing");
      return;
    }

    // Don't proceed if auth is still loading
    if (isAuthLoading) {
      console.log('🔐 PACKAGES: Auth still loading, waiting...');
      alert("Please wait while we verify your account...");
      return;
    }

    // Double-check authentication state before proceeding
    console.log('🔐 PACKAGES: handleNext called - performing final auth check');
    
    let finalUserId = currentUser?.id || null;
    
    // If no current user, do one final check
    if (!currentUser) {
      console.log('🔐 PACKAGES: No currentUser found, doing final auth check...');
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('🔐 PACKAGES: Final auth check result:', { user: user?.email || null, error });
        
        if (user && !error) {
          finalUserId = user.id;
          setCurrentUser(user); // Update state for future use
          console.log('🔐 PACKAGES: Updated currentUser from final check:', user.email);
        }
      } catch (err) {
        console.error('🔐 PACKAGES: Final auth check failed:', err);
      }
    }

    console.log('🔐 PACKAGES: Final userId for checkout session:', finalUserId);
    console.log('🔐 PACKAGES: Final currentUser email:', currentUser?.email || 'none');

    if (isLastSong || isOnlySong) {
      try {
        // Track begin checkout for Google Ads
        const checkoutItems = tracks.map((track, index) => {
          const packageId = selectedPackages[index];
          const selectedPkg = packages.find(pkg => pkg.id === packageId);
          return {
            id: `${track.id}_${packageId}`,
            packageName: selectedPkg?.name || 'UNKNOWN',
            price: selectedPkg?.price || 0,
            quantity: 1
          };
        }).filter(item => item.packageName !== 'UNKNOWN');

        const totalAmount = checkoutItems.reduce((sum, item) => sum + item.price, 0);
        const packagesCount = checkoutItems.length;

        analytics.track("packages_step_completed", {
          song_count: tracks.length,
          packages_count: packagesCount,
          total_estimated: totalAmount,
        });

        gtag.trackBeginCheckout({
          totalAmount,
          items: checkoutItems
        });

        // Create secure checkout session with user ID if logged in
        // Pass existing session ID for renewal if we have one
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tracks,
            selectedPackages,
            userId: finalUserId, // Use the final verified user ID
            existingSessionId: existingSessionId // Pass existing session for invalidation
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const { sessionId } = await response.json();

        console.log('🔐 PACKAGES: Created checkout session with userId:', finalUserId);
        console.log('🔐 PACKAGES: Session ID:', sessionId);

        // Go to checkout with session ID - preserving tracking parameters
        const currentParams = new URLSearchParams(window.location.search);
        const preservedParams: any = {};
        
        // Preserve specific tracking parameters
        if (currentParams.get('gclid')) {
          preservedParams.gclid = currentParams.get('gclid');
        }
        if (currentParams.get('fbclid')) {
          preservedParams.fbclid = currentParams.get('fbclid');
        }
        if (currentParams.get('utm_source')) {
          preservedParams.utm_source = currentParams.get('utm_source');
        }
        if (currentParams.get('utm_medium')) {
          preservedParams.utm_medium = currentParams.get('utm_medium');
        }
        if (currentParams.get('utm_campaign')) {
          preservedParams.utm_campaign = currentParams.get('utm_campaign');
        }
        
        router.push({
          pathname: '/checkout',
          query: {
            sessionId,
            ...preservedParams
          }
        });
      } catch (error) {
        console.error('Error creating checkout session:', error);
        alert('Failed to proceed to checkout. Please try again.');
      }
    } else {
      // Go to next song
      const newIndex = currentSongIndex + 1;
      setCurrentSongIndex(newIndex);
      const nextSongPackage = selectedPackages[newIndex] || "";
      setSelectedPackage(nextSongPackage);
      
      // Reset drawer to open state for new song (mobile only)
      // Always reset drawer when changing songs - open if no package selected
      setDrawerClosed(!nextSongPackage);
      
      // Force scroll to top for visual cue that song changed (all devices)
      if (typeof window !== 'undefined') {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (error) {
            // Fallback for browsers that don't support smooth behavior
            window.scrollTo(0, 0);
          }
        });
      }
      
      // Delay animation to allow scroll to complete, then trigger flip animation
      setTimeout(() => {
        setSongIndicatorKey(prev => prev + 1); // Trigger animation
      }, 100);
    }
  };

  const handleChangeSong = () => {
    // Remove current song from tracks and go back to add page
    const updatedTracks = tracks.filter((_, index) => index !== currentSongIndex);
    
    if (updatedTracks.length === 0) {
      router.push( '/add');
    } else {
      // Store remaining tracks and redirect to add page to replace this song
      sessionStorage.setItem('remainingTracks', JSON.stringify(updatedTracks));
      sessionStorage.setItem('replacingSongIndex', currentSongIndex.toString());
      router.push( '/add');
    }
  };

  const handlePreviousSong = () => {
    if (currentSongIndex > 0) {
      const newIndex = currentSongIndex - 1;
      setCurrentSongIndex(newIndex);
      const prevSongPackage = selectedPackages[newIndex] || "";
      setSelectedPackage(prevSongPackage);
      
      // Reset drawer to open state for previous song (mobile only)
      // Always reset drawer when changing songs - open if no package selected
      setDrawerClosed(!prevSongPackage);
      
      // Force scroll to top for visual cue that song changed (all devices)
      if (typeof window !== 'undefined') {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (error) {
            // Fallback for browsers that don't support smooth behavior
            window.scrollTo(0, 0);
          }
        });
      }
      
      // Delay animation to allow scroll to complete, then trigger flip animation
      setTimeout(() => {
        setSongIndicatorKey(prev => prev + 1); // Trigger animation
      }, 100);
    }
  };

  const checkScrollArrows = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    
    // More sensitive detection:
    // Left arrow shows when scrolled away from start (lower threshold)
    const showLeftArrow = scrollLeft > 5;
    
    // Right arrow shows when there's more content to scroll to
    const showRightArrow = scrollLeft < (scrollWidth - clientWidth - 5);
    
    // Ensure we always show right arrow initially if there's scrollable content
    const hasScrollableContent = scrollWidth > clientWidth;
    const finalShowRightArrow = showRightArrow || (hasScrollableContent && scrollLeft < 5);
    
    // Calculate scroll progress (0 to 1)
    const maxScrollLeft = scrollWidth - clientWidth;
    const progress = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
    
    setCanScrollLeft(showLeftArrow);
    setCanScrollRight(finalShowRightArrow);
    setScrollProgress(progress);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const scrollAmount = carouselRef.current.clientWidth * 0.5;
    const newScrollLeft = direction === 'left' 
      ? carouselRef.current.scrollLeft - scrollAmount
      : carouselRef.current.scrollLeft + scrollAmount;
      
    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => checkScrollArrows();
    carousel.addEventListener('scroll', handleScroll);
    
    // Check arrows after component mounts and content is rendered
    const checkTimer = setTimeout(() => {
      checkScrollArrows();
    }, 100);

    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      clearTimeout(checkTimer);
    };
  }, [packages]);

  // Ensure right arrow shows initially when we have scrollable content
  useEffect(() => {
    if (packages.length > 2) {
      setCanScrollRight(true);
      setCanScrollLeft(false); // Hide left arrow initially
    }
  }, [packages.length]);



  // Generate realistic offset numbers that don't end with 00
  const generateRealisticNumber = (baseNumber: number): number => {
    // Create an offset between 8-18% of the base number
    const offsetPercentage = 0.08 + Math.random() * 0.10; // 8-18%
    const offset = Math.floor(baseNumber * offsetPercentage);
    
    // Add the offset and ensure it doesn't end with 00
    let realisticNumber = baseNumber + offset;
    
    // If it ends with 00, adjust it
    if (realisticNumber % 100 === 0) {
      // Add a random number between 20-99 that doesn't end in 0
      const adjustment = 20 + Math.floor(Math.random() * 70); // 20-89
      realisticNumber += adjustment;
    } else if (realisticNumber % 10 === 0) {
      // If it ends with just one 0, add 1-9
      realisticNumber += Math.floor(Math.random() * 9) + 1;
    }
    
    return Math.floor(realisticNumber);
  };

  const getChartData = () => {
    const selected = packages.find(p => p.id === selectedPackage);
    
    if (!selected) {
      const emptyDailyData = [];
      for (let i = 0; i < 30; i++) {
        emptyDailyData.push({
          day: i + 1,
          plays: 0
        });
      }
      return { 
        plays: 0, 
        placements: 0, 
        dailyData: emptyDailyData, 
        playsRange: "", 
        realisticPlaysRange: "",
        maxPlays: 0
      };
    }
    
    // Parse the range format (e.g., "125K - 150K Streams" or "3,000 - 3,500 Streams")
    const playsNumbers = selected.plays.match(/[\d,\.]+K?/g);
    const placementsNumbers = selected.placements.match(/\d+/g);
    
    // Convert K format to actual numbers
    const parseNumber = (numStr: string): number => {
      const cleanNum = numStr.replace(/,/g, '');
      if (cleanNum.includes('K')) {
        return parseFloat(cleanNum.replace('K', '')) * 1000;
      }
      return parseInt(cleanNum);
    };
    
    const minPlays = playsNumbers ? parseNumber(playsNumbers[0]) : 0;
    const maxPlays = playsNumbers && playsNumbers.length > 1 ? parseNumber(playsNumbers[1]) : minPlays;
    
    const minPlacements = placementsNumbers ? parseInt(placementsNumbers[0]) : 0;
    const maxPlacements = placementsNumbers && placementsNumbers.length > 1 ? parseInt(placementsNumbers[1]) : minPlacements;
    
    // Generate realistic range for Expected Total Plays display
    const realisticMinPlays = generateRealisticNumber(minPlays);
    const realisticMaxPlays = generateRealisticNumber(maxPlays);
    const realisticPlaysRange = `${realisticMinPlays.toLocaleString()} - ${realisticMaxPlays.toLocaleString()} Streams`;
    
    // Use the exact plays range from package for Y-axis scaling (keep flat numbers)
    const playsRange = selected.plays;
    
    // Calculate the average/middle ground for playlist placements
    const avgPlacements = Math.round((minPlacements + maxPlacements) / 2);
    
    // Generate 30-day growth data using the max value for realistic projection
    const dailyData = [];
    for (let i = 0; i < 30; i++) {
      const progress = i / 29;
      const randomVariation = 0.85 + Math.random() * 0.3; // 85-115% variation for realistic data
      const dailyPlays = Math.floor(maxPlays * progress * randomVariation);
      dailyData.push({
        day: i + 1,
        plays: Math.max(0, dailyPlays)
      });
    }
    
          return {
        plays: maxPlays,
        placements: avgPlacements,
        dailyData,
        playsRange,
        realisticPlaysRange,
        maxPlays
      };
  };

  const getYAxisLabels = (maxValue: number) => {
    if (maxValue === 0) return ['10,000', '5,000', '0'];
    
    // Determine appropriate step size
    let step: number;
    if (maxValue >= 50000) {
      step = 10000;
    } else if (maxValue >= 20000) {
      step = 5000;
    } else if (maxValue >= 5000) {
      step = 1000;
    } else {
      step = 500;
    }
    
    const topValue = Math.ceil(maxValue / step) * step;
    const midValue = Math.floor(topValue / 2 / step) * step;
    
    return [topValue.toLocaleString(), midValue.toLocaleString(), '0'];
  };

  const chartData = getChartData();
  const displayData = animatedData.length > 0 ? animatedData : chartData.dailyData.map(d => d.plays);
  const currentMaxPlays = Math.max(...displayData, chartData.maxPlays);
  const yAxisLabels = getYAxisLabels(chartData.maxPlays);

  if (!currentTrack) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Choose Campaign Package – Fasho.co</title>
      </Head>
      <style jsx>{`
        .feature-text-mobile {
          font-size: calc(0.875rem + 0.13rem);
        }
        .compare-heading-mobile {
          font-size: calc(1.875rem - 0.15rem);
        }
        .compare-emoji-mobile {
          font-size: calc(1.875rem - 0.15rem);
        }
        .compare-subheading-mobile {
          font-size: calc(1.25rem - 0.08rem);
        }
        .money-heading-mobile {
          font-size: calc(1.875rem - 0.27rem);
        }
        @media (min-width: 768px) {
          .feature-text-mobile {
            font-size: calc(0.875rem - 0.02rem);
          }
          .compare-heading-mobile {
            font-size: 3rem;
          }
          .compare-emoji-mobile {
            font-size: 3rem;
          }
          .compare-subheading-mobile {
            font-size: 1.25rem;
          }
          .money-heading-mobile {
            font-size: 2.25rem;
          }
        }
      `}</style>
      <SalesBanner />
      
      {/* Sales Pop Component - positioned early for fast timer initialization */}
      <SalesPop />
      
      <Header />
      <main className="min-h-screen relative text-white pt-28 pb-12 px-4">
        {/* Background layers */}
        <div className="fixed inset-0 bg-black z-0"></div>
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-35 z-10"
          style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
        ></div>
        
        {/* Floating Dust Particles */}
        <div className="floating-particles">
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
        </div>
        <div className="relative z-20">
        {/* Step Indicator - Inside main content */}
        <StepIndicator currentStep={2} />
        <div className="max-w-7xl mx-auto">
          <h1 className={`${isDiscountedSong ? 'text-3xl' : 'text-4xl'} md:text-5xl font-extrabold text-center mb-6 md:mb-12 -mt-5`}>
            <span className="text-white">Choose Your Campaign</span>{isDiscountedSong && <> for <span className="text-[#59e3a5]">25% OFF</span></>}
          </h1>

          {/* Mobile Layout */}
          <div className="block md:hidden">
            {/* Mobile: Song Info Card - Mobile App Style */}
            <div className="mb-6 px-4 pt-2">
              <div className="relative bg-gradient-to-br from-[#59e3a5]/20 via-[#14c0ff]/15 to-[#8b5cf6]/20 backdrop-blur-sm rounded-2xl border border-[#59e3a5]/30 shadow-xl shadow-[#59e3a5]/10 p-5 overflow-visible">
                {/* Subtle animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#59e3a5]/5 via-transparent to-[#14c0ff]/5 animate-pulse rounded-2xl overflow-hidden"></div>
                
                {/* Song Indicator Badge - Top Right Corner, Halfway In/Out */}
                {tracks.length > 1 && (
                  <div className="absolute -top-2 -right-2 z-30">
                    <span 
                      key={songIndicatorKey}
                      className="inline-flex items-center gap-1.5 bg-[#59e3a5] border-2 border-[#59e3a5] text-black px-2.5 py-1 rounded-full text-xs font-bold shadow-lg animate-flip-down"
                    >
                      <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
                      Song {currentSongIndex + 1} of {tracks.length}
                    </span>
                  </div>
                )}
                
                {/* Content Container */}
                <div className="relative flex items-center gap-4 min-h-[180px]">
                  {/* Album Art - Left Side - Centered and Larger */}
                  <div className="relative flex-shrink-0 flex items-center">
                    {/* 25% OFF badge for discounted songs */}
                    {isDiscountedSong && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-20 animate-pulse">
                        25% OFF
                      </div>
                    )}
                    {/* Gradient border container */}
                    <div className="relative bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[2px] rounded-xl overflow-hidden">
                      <div className="relative w-[160px] h-[160px] rounded-xl overflow-hidden bg-black/20">
                        <Image
                          src={currentTrack.imageUrl}
                          alt={currentTrack.title}
                          width={160}
                          height={160}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>

                  {/* Song Info - Right Side - Centered Vertically and Horizontally */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center items-center text-center">
                    {/* Song Title */}
                    <h2 className="text-white font-black mb-2" style={{ fontSize: '1.5rem' }}>
                      {currentTrack.title}
                    </h2>
                    
                    {/* Artist Name */}
                    <p className="text-white/70" style={{ fontSize: '1rem' }}>
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>

                {/* Change Song Pill Button - Bottom Right Corner */}
                <button
                  ref={changeSongButtonRef}
                  onClick={() => setShowChangeSongPopup(true)}
                  className="absolute bottom-3 right-3 bg-gray-800/40 backdrop-blur-sm text-white/50 font-medium px-1.5 py-0.5 rounded-full border border-white/15 z-30 flex items-center gap-0.5 transition-all duration-300 hover:bg-gray-800/60 hover:text-white/70 hover:border-white/25"
                  style={{ fontSize: '0.6rem' }}
                >
                  <span>Change Song</span>
                  <svg className="w-1.5 h-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Change Song Popup */}
                {showChangeSongPopup && (
                  <div className="absolute bottom-12 right-3 z-40 w-[280px]">
                    {/* Popup Container */}
                    <div className="relative bg-gray-800/95 backdrop-blur-md rounded-lg border border-white/30 shadow-xl p-4">
                      {/* Chevron Corner pointing down */}
                      <div className="absolute -bottom-2 right-6 w-4 h-4 bg-gray-800/95 border-r border-b border-white/30 transform rotate-45"></div>
                      
                      {/* Close Button */}
                      <button
                        onClick={() => setShowChangeSongPopup(false)}
                        className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Popup Content */}
                      <div className="pr-6">
                        <h3 className="text-white font-semibold mb-2" style={{ fontSize: '0.875rem' }}>
                          Want to change your song?
                        </h3>
                        <p className="text-white/70 leading-relaxed mb-4" style={{ fontSize: '0.75rem' }}>
                          This will remove it from your lineup and take you back to the song selection screen.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowChangeSongPopup(false)}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-medium px-3 py-2 rounded-md transition-all duration-200"
                            style={{ fontSize: '0.75rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setShowChangeSongPopup(false);
                              handleChangeSong();
                            }}
                            className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 font-medium px-3 py-2 rounded-md transition-all duration-200"
                            style={{ fontSize: '0.75rem' }}
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Package List - Vertical Mobile App Style */}
            <div className="md:hidden mb-8 px-1">
              {/* Master Section Box */}
              <div className={`bg-gradient-to-br from-gray-700/50 via-gray-800/45 to-gray-900/50 rounded-2xl border border-white/30 backdrop-blur-sm overflow-visible relative transition-all duration-500 ease-in-out ${
                drawerClosed 
                  ? 'px-2 pt-2 pb-9 flex flex-col h-auto min-h-0' 
                  : 'p-4 space-y-4'
              }`}>
                {packages.map((pkg) => {
                  const isSelected = selectedPackage === pkg.id;
                  const shouldShow = !drawerClosed || isSelected;
                  
                  return (
                    <div
                      key={pkg.id}
                      ref={isSelected ? selectedPackageRef : null}
                      onClick={() => handlePackageSelect(pkg.id)}
                      className={`relative cursor-pointer rounded-xl overflow-visible transition-all duration-500 ease-in-out ${
                        shouldShow 
                          ? 'opacity-100 max-h-[600px]' 
                          : 'opacity-0 max-h-0 overflow-hidden pointer-events-none h-0'
                      } ${!drawerClosed && shouldShow ? 'mb-4 p-4' : drawerClosed && isSelected ? 'mb-0 p-4 w-full flex-shrink-0' : drawerClosed ? 'p-0 m-0 h-0' : 'p-4'} ${
                        pkg.popular
                          ? 'bg-gradient-to-br from-gray-800/80 via-gray-900/80 to-black/80 border-2 border-[#8b5cf6]/60 shadow-lg shadow-[#8b5cf6]/30'
                          : isSelected
                          ? 'bg-gradient-to-br from-gray-800/80 via-gray-900/80 to-black/80 border-2 border-[#59e3a5]/70 shadow-md'
                          : 'bg-gradient-to-br from-gray-800/60 via-gray-900/60 to-black/60 border-2 border-white/25 hover:border-white/35'
                      }`}
                    >
                      {/* Confetti Animation Overlay */}
                      {confettiAnimation === pkg.id && confettiData && (
                        <div 
                          key={confettiKey}
                          className="absolute inset-0 z-50 pointer-events-none rounded-xl overflow-hidden"
                        >
                          <Lottie
                            ref={lottieRef}
                            animationData={confettiData}
                            loop={false}
                            autoplay={true}
                            style={{
                              width: '100%',
                              height: '100%',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                            }}
                          />
                        </div>
                      )}

                      {/* Most Popular Badge */}
                      {pkg.popular && (
                        <div className="absolute -top-2 -left-2 bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] text-white font-bold px-1.5 py-0.5 rounded-full shadow-lg z-30" style={{ fontSize: '0.65rem' }}>
                          Most Popular
                        </div>
                      )}

                      {/* Selection Checkmark */}
                      {selectedPackage === pkg.id && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-md z-30 flex items-center gap-1.5">
                          <span>✓</span>
                          <span>Selected Campaign</span>
                        </div>
                      )}

                      {/* Card Content */}
                      <div className="relative">
                        {/* Top Section - Icon and Main Content */}
                        <div className="flex items-center gap-3">
                          {/* Icon - Left Side */}
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#59e3a5]/20 to-[#14c0ff]/20 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-sm">
                            <span className="text-2xl">{pkg.icon}</span>
                          </div>

                          {/* Main Content - Middle */}
                          <div className="flex-1 min-w-0 pr-20">
                            {/* Package Name */}
                            <h3 className="text-white font-black mb-1" style={{ fontSize: '1.125rem' }}>
                              {pkg.name}
                            </h3>

                            {/* Description */}
                            <p className="text-white/60 mb-2.5" style={{ fontSize: '0.75rem' }}>
                              {pkg.description}
                            </p>

                            {/* Features - Stacked vertically */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-black text-xs font-black">✓</span>
                                </div>
                                <span className="text-white/90 font-medium" style={{ fontSize: '0.8rem' }}>
                                  {pkg.plays}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-black text-xs font-black">✓</span>
                                </div>
                                <span className="text-white/90 font-medium" style={{ fontSize: '0.8rem' }}>
                                  {pkg.placements}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Price - Top Right Corner */}
                        <div className="absolute top-1 right-2 text-right z-20">
                          {isDiscountedSong ? (
                            <div>
                              <div className="text-white/40 line-through text-xs mb-0.5">${pkg.price}</div>
                              <div className="font-black text-white" style={{ fontSize: '1.25rem' }}>
                                ${getDiscountedPrice(pkg.price)}
                              </div>
                            </div>
                          ) : (
                            <div className="font-black text-white" style={{ fontSize: '1.25rem' }}>
                              ${pkg.price}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Change Package Button - Shows when drawer is closed */}
                {drawerClosed && selectedPackage && (
                  <button
                    onClick={handleChangePackage}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-800/80 backdrop-blur-sm text-white/80 font-medium px-3 py-1.5 rounded-full border border-white/30 z-30 flex items-center gap-1.5 transition-all duration-300 hover:bg-gray-700/80 hover:text-white hover:border-white/40"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <span>Change Package</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile: Next Song/Step Button */}
            <div className="md:hidden mb-8 px-4 mt-12">
              <div className="relative">
                {/* Pulsing gradient glow background - only when button is active */}
                {selectedPackage && !isAuthLoading && (
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md animate-fast-pulse-glow"
                    style={{ zIndex: 1 }}
                    suppressHydrationWarning={true}
                  ></div>
                )}
                
                <button
                  onClick={handleNext}
                  disabled={!selectedPackage || isAuthLoading}
                  className="relative w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 hover:opacity-90 hover:-translate-y-1 transition-all duration-300 text-lg flex items-center justify-center gap-2"
                  style={{ zIndex: 2 }}
                  suppressHydrationWarning={true}
                >
                  {isAuthLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      Checking account...
                    </>
                  ) : (
                    <>
                      {isLastSong || isOnlySong ? 'Next Step' : 'Next Song'} →
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile: Previous Song Button */}
            {currentSongIndex > 0 && (
              <div className="md:hidden px-4 mb-8">
                <button
                  onClick={handlePreviousSong}
                  className="w-full text-white/70 hover:text-white text-sm py-2 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous Song
                </button>
              </div>
            )}

            {/* Mobile: Chart section */}
            <div className="md:hidden bg-white/5 rounded-xl p-6 border border-white/20 mb-8">
              <h3 className="text-lg font-semibold mb-4">Based on past campaigns</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-white/70">Expected Total Plays</div>
                    <div className="text-lg font-bold text-[#59e3a5] transition-all duration-500">
                      {animatedPlays || chartData.realisticPlaysRange || "Select a package"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/70">Playlist Pitches</div>
                    <div className="text-lg font-bold text-[#14c0ff] transition-all duration-500">
                      {animatedPlacements > 0 ? animatedPlacements.toLocaleString() : (chartData.placements || "—")}
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="text-sm text-white/70 mb-3">14-Day Growth Projection</div>
                  <div className="relative h-32 bg-black/20 rounded-lg p-4 ml-8">
                    <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lineGradientMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#59e3a5" />
                          <stop offset="100%" stopColor="#14c0ff" />
                        </linearGradient>
                        <linearGradient id="areaGradientMobile" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines */}
                      <defs>
                        <pattern id="gridMobile" width="60" height="25" patternUnits="userSpaceOnUse">
                          <path d="M 60 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#gridMobile)" />
                      
                      {/* Area under the curve */}
                      <path
                        d={`M 0 100 ${displayData.map((plays, index) => {
                          const x = (index / (displayData.length - 1)) * 300;
                          const scale = currentScale > 0 ? currentScale : chartData.maxPlays;
                          const y = scale > 0 ? 100 - (plays / scale) * 80 : 100;
                          return `L ${x} ${y}`;
                        }).join(' ')} L 300 100 Z`}
                        fill="url(#areaGradientMobile)"
                      />
                      
                      {/* Data points */}
                      {displayData.map((plays, index) => {
                        const x = (index / (displayData.length - 1)) * 300;
                        const scale = currentScale > 0 ? currentScale : chartData.maxPlays;
                        const y = scale > 0 ? 100 - (plays / scale) * 80 : 100;
                        
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="2"
                            fill="url(#lineGradientMobile)"
                            className="drop-shadow-sm"
                          />
                        );
                      })}
                      
                      {/* Main line */}
                      <path
                        d={`M ${displayData.map((plays, index) => {
                          const x = (index / (displayData.length - 1)) * 300;
                          const scale = currentScale > 0 ? currentScale : chartData.maxPlays;
                          const y = scale > 0 ? 100 - (plays / scale) * 80 : 100;
                          return `${x} ${y}`;
                        }).join(' L ')}`}
                        fill="none"
                        stroke="url(#lineGradientMobile)"
                        strokeWidth="2"
                        className="drop-shadow-sm"
                      />
                    </svg>
                    
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-white/50 -ml-16 w-14 text-right">
                      <span className={`transition-opacity duration-500 ${chartData.maxPlays > 0 ? 'opacity-100' : 'opacity-30'}`}>
                        {yAxisLabels[0]}
                      </span>
                      <span className={`transition-opacity duration-500 ${chartData.maxPlays > 0 ? 'opacity-100' : 'opacity-30'}`}>
                        {yAxisLabels[1]}
                      </span>
                      <span>{yAxisLabels[2]}</span>
                    </div>
                  
                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-white/50 -mb-6">
                      <span>Day 1</span>
                      <span>Day 5</span>
                      <span>Day 14</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Action buttons */}
            <div className="md:hidden space-y-4">
              <button
                onClick={handleChangeSong}
                className="hidden md:block w-full bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-md hover:bg-white/20 hover:-translate-y-1 transition-all duration-300 text-lg"
              >
                Change Songs
              </button>

              {/* Mobile Campaign Features Section */}
              <div className="mt-6 bg-gradient-to-br from-white/5 via-white/3 to-white/5 rounded-2xl px-4 py-[20px] md:p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden">
                {/* Subtle gradient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/5 via-[#14c0ff]/5 to-[#8b5cf6]/5 rounded-2xl blur-xl opacity-60"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Mobile-only gradient heading */}
                  <div className="block md:hidden mb-6 text-center">
                    <h3 className="text-lg font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent block px-2" style={{letterSpacing: '0.01em', fontSize: 'calc(1.125rem + 0.25rem)'}}>
                      Inside Your Campaign 🚀
                    </h3>
                  </div>
                  {/* Featured list - 2 columns on mobile, center-aligned */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 justify-items-start text-left pl-0 md:grid-cols-2 md:gap-x-6 md:gap-y-3 md:justify-items-start md:text-left md:pl-0">
                    {[
                      'Campaign starts within only 24-48 hours',
                      'All streams achieved in only 7-10 days', 
                      '<gradient>Curator Connect+</gradient> Unlimited Access',
                      'All genres supported',
                      'Spotify-safe guarantee',
                      'Established playlist curators',
                      'Priority curator outreach',
                      'Major playlist targeting',
                      'VIP curator network access',
                      'Dedicated account manager'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center md:items-start space-x-2 group justify-start">
                        {/* Green checkmark icon */}
                        <div className="w-5 h-5 md:w-4 md:h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 md:mt-0.5 shadow-md group-hover:scale-110 transition-transform duration-200">
                          <svg className="w-3.5 h-3.5 md:w-2.5 md:h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span 
                          className="text-white/90 leading-relaxed group-hover:text-white transition-colors duration-200 text-left feature-text-mobile" 
                          style={{ fontSize: '0.9375rem' }}
                        >
                          {feature.includes('<gradient>') ? (
                            <>
                              {feature.split('<gradient>')[0]}
                                                              <span className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent font-semibold">
                                  {feature.split('<gradient>')[1].split('</gradient>')[0]}
                                </span>
                              {feature.split('</gradient>')[1]}
                            </>
                          ) : (
                            feature
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-[4fr_2fr] gap-12 items-start">
            {/* Left side - Package selection */}
            <div className="space-y-8">
              {/* Package cards - Baseball card style */}
              <div className="space-y-6 mb-4 relative">
                {/* Subtle gradient glow behind cards */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/10 via-[#14c0ff]/10 to-[#8b5cf6]/10 rounded-2xl blur-xl -z-10"></div>
                {/* Helper function to format streams with K */}
                {(() => {
                  const formatStreamsForDisplay = (streams: string) => {
                    return streams.replace(/(\d{1,3}),(\d{3})/g, (match, num1, num2) => {
                      const fullNumber = parseInt(num1 + num2);
                      return `${fullNumber / 1000}K`;
                    });
                  };

                  return (
                    <>
                      {/* Top row - 3 packages */}
                      <div className="grid grid-cols-3 gap-12">
                        {packages.slice(0, 3).map((pkg) => (
                          <div
                            key={pkg.id}
                            onClick={() => handlePackageSelect(pkg.id)}
                            className={`relative cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-105 w-full group ${
                              selectedPackage === pkg.id
                                ? 'shadow-2xl shadow-[#59e3a5]/30'
                                : 'shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-[#59e3a5]/20'
                            }`}
                            style={{ 
                              minHeight: '260px',
                              width: '260px',
                              zIndex: selectedPackage === pkg.id ? 20 : 10
                            }}
                            suppressHydrationWarning={true}
                          >
                            {/* Gradient Background with Border */}
                            <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                              selectedPackage === pkg.id
                                ? pkg.id === 'dominate' 
                                  ? 'bg-gray-900 border-2 border-[#59e3a5]/80'
                                  : 'bg-gradient-to-br from-gray-800/98 via-gray-900/98 to-black/98 border-2 border-[#59e3a5]/80'
                                : 'bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-black/95 border border-white/10 group-hover:border-white/20'
                            }`} style={{ zIndex: 2 }}></div>

                            {/* Subtle outline */}
                            <div className="absolute inset-0 rounded-2xl border border-white/5" style={{ zIndex: 3 }}></div>

                            {/* Subtle inner glow */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#59e3a5]/5 via-transparent to-[#14c0ff]/5 opacity-50" style={{ zIndex: 4 }}></div>

                                {/* Confetti Animation Overlay */}
                                {confettiAnimation === pkg.id && confettiData && (
                              <div 
                                key={confettiKey}
                                className="absolute inset-0 z-50 pointer-events-none rounded-2xl overflow-hidden"
                              >
                                <Lottie
                                  ref={lottieRef}
                                  animationData={confettiData}
                                  loop={false}
                                  autoplay={true}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                  }}
                                />
                              </div>
                            )}
                            
                            {/* Lens flare animation for Popular package */}
                            {pkg.popular && (
                              <>
                                {/* Outer glow layer */}
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-600 rounded-2xl blur-sm opacity-30 animate-pulse"></div>
                                
                                {/* Animated border layer */}
                                <div className="absolute -inset-0.5 rounded-xl overflow-hidden">
                                  <div className="absolute inset-0 border-container-blue">
                                    <div className="absolute -inset-[20px] animate-spin-slow border-highlight-blue"></div>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {/* Most Popular flag */}
                            {pkg.popular && (
                              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] text-white text-xs font-semibold px-3 py-1 rounded-md shadow-lg z-30">
                                Most Popular
                              </div>
                            )}
                            
                            {/* Selection checkmark */}
                            {selectedPackage === pkg.id && (
                              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center z-30 shadow-lg">
                                <span className="text-black text-sm font-bold">✓</span>
                              </div>
                            )}
                            
                            {/* Content container */}
                            <div className="relative h-full px-4 pt-5 pb-6 flex flex-col" style={{ zIndex: 10 }}>
                              {/* Top - Emoji in gradient circle */}
                              <div className="flex flex-col items-center text-center mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#59e3a5]/20 to-[#14c0ff]/20 rounded-full flex items-center justify-center mb-4 border border-white/10 backdrop-blur-sm shadow-lg">
                                  <span className="text-xl filter drop-shadow-lg">{pkg.icon}</span>
                                </div>
                                
                                {/* Price */}
                                <div className="mb-0">
                                  {isDiscountedSong ? (
                                    <div className="space-y-1">
                                      <div className="text-sm text-white/40 line-through">${pkg.price}</div>
                                      <div className="font-black text-3xl text-white filter drop-shadow-sm">
                                        ${getDiscountedPrice(pkg.price)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="font-black text-3xl text-white filter drop-shadow-sm">${pkg.price}</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Package Name */}
                              <div className="text-center mb-3">
                                <h3 className="font-black text-xl bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent tracking-wide filter drop-shadow-sm">{pkg.name}</h3>
                              </div>
                              
                              {/* Hook Description */}
                              <div className="text-center mb-4">
                                <p className="text-xs text-white/70 leading-relaxed px-2 font-medium">{pkg.description}</p>
                                   </div>
                              
                                                            {/* Features container */}
                              <div className="bg-gradient-to-br from-white/8 to-white/4 rounded-xl px-4 py-4 backdrop-blur-sm border border-white/20 shadow-lg space-y-3">
                                <div className="flex items-center text-white">
                                  <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0 shadow-md">
                                    <span className="text-black text-xs font-black">✓</span>
                                 </div>
                                  <span className="font-bold tracking-wide text-sm">{formatStreamsForDisplay(pkg.plays)}</span>
                                   </div>
                                <div className="flex items-center text-white">
                                  <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0 shadow-md">
                                    <span className="text-black text-xs font-black">✓</span>
                                  </div>
                                  <span className="font-bold tracking-wide text-xs">{pkg.placements}</span>
                                 </div>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Bottom row - 2 packages centered */}
                      <div className="flex justify-center gap-8">
                        {packages.slice(3, 5).map((pkg) => {
                                                    // Special design for BREAKTHROUGH package
                          if (pkg.id === 'breakthrough') {
                            return (
                            <div
                              key={pkg.id}
                              onClick={() => handlePackageSelect(pkg.id)}
                                className={`relative cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-105 group ${
                                selectedPackage === pkg.id
                                    ? 'shadow-2xl shadow-[#59e3a5]/30'
                                    : 'shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-[#59e3a5]/20'
                                }`}
                                style={{ 
                                  minHeight: '260px',
                                  width: '260px',
                                  zIndex: selectedPackage === pkg.id ? 20 : 10
                                }}
                                suppressHydrationWarning={true}
                              >
                                {/* Gradient Background with Border */}
                                <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                                  selectedPackage === pkg.id
                                    ? 'bg-gradient-to-br from-gray-800/98 via-gray-900/98 to-black/98 border-2 border-[#59e3a5]/80'
                                    : 'bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-black/95 border border-white/10 group-hover:border-white/20'
                                }`} style={{ zIndex: 2 }}></div>

                                {/* Subtle outline */}
                                <div className="absolute inset-0 rounded-2xl border border-white/5" style={{ zIndex: 3 }}></div>

                                {/* Subtle inner glow */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#59e3a5]/5 via-transparent to-[#14c0ff]/5 opacity-50" style={{ zIndex: 4 }}></div>

                              {/* Confetti Animation Overlay */}
                              {confettiAnimation === pkg.id && confettiData && (
                                <div 
                                  key={confettiKey}
                                    className="absolute inset-0 z-50 pointer-events-none rounded-2xl overflow-hidden"
                                >
                                  <Lottie
                                    ref={lottieRef}
                                    animationData={confettiData}
                                    loop={false}
                                    autoplay={true}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                    }}
                                  />
                                </div>
                              )}
                              
                                {/* Selection checkmark */}
                              {selectedPackage === pkg.id && (
                                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center z-30 shadow-lg">
                                  <span className="text-black text-sm font-bold">✓</span>
                                </div>
                              )}
                              
                              {/* Content container */}
                                <div className="relative h-full px-4 pt-5 pb-6 flex flex-col" style={{ zIndex: 10 }}>
                                  {/* Top - Emoji in gradient circle */}
                                  <div className="flex flex-col items-center text-center mb-4">
                                                                    <div className="w-12 h-12 bg-gradient-to-br from-[#59e3a5]/20 to-[#14c0ff]/20 rounded-full flex items-center justify-center mb-4 border border-white/10 backdrop-blur-sm shadow-lg">
                                  <span className="text-2xl filter drop-shadow-lg">{pkg.icon}</span>
                                  </div>
                                    
                                    {/* Price */}
                                    <div className="mb-0">
                                    {isDiscountedSong ? (
                                        <div className="space-y-1">
                                          <div className="text-sm text-white/40 line-through">${pkg.price}</div>
                                          <div className="font-black text-3xl text-white filter drop-shadow-sm">
                                          ${getDiscountedPrice(pkg.price)}
                                        </div>
                                      </div>
                                                                          ) : (
                                        <span className="font-black text-3xl text-white filter drop-shadow-sm">${pkg.price}</span>
                                    )}
                                  </div>
                                </div>
                                
                                  {/* Package Name */}
                                  <div className="text-center mb-3">
                                    <h3 className="font-black text-xl bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent tracking-wide filter drop-shadow-sm">{pkg.name}</h3>
                                </div>
                                
                                  {/* Hook Description */}
                                  <div className="text-center mb-4">
                                    <p className="text-xs text-white/70 leading-relaxed px-2 font-medium">{pkg.description}</p>
                                     </div>
                                  
                                  {/* Features container */}
                                  <div className="bg-gradient-to-br from-white/8 to-white/4 rounded-xl px-4 py-4 backdrop-blur-sm border border-white/20 shadow-lg space-y-3">
                                                                        <div className="flex items-center text-white">
                                      <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0 shadow-md">
                                        <span className="text-black text-xs font-black">✓</span>
                                   </div>
                                      <span className="font-bold tracking-wide text-sm">{formatStreamsForDisplay(pkg.plays)}</span>
                                     </div>
                                    <div className="flex items-center text-white">
                                      <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0 shadow-md">
                                        <span className="text-black text-xs font-black">✓</span>
                                   </div>
                                      <span className="font-bold tracking-wide text-xs">{pkg.placements}</span>
                                 </div>
                               </div>
                             </div>
                              </div>
                            );
                          }

                          // MOMENTUM package now using same modern design
                          return (
                            <div
                              key={pkg.id}
                              onClick={() => handlePackageSelect(pkg.id)}
                              className={`relative cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-105 group ${
                                selectedPackage === pkg.id
                                  ? 'shadow-2xl shadow-[#59e3a5]/30'
                                  : 'shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-[#59e3a5]/20'
                              }`}
                              style={{ 
                                minHeight: '260px',
                                width: '260px',
                                zIndex: selectedPackage === pkg.id ? 20 : 10
                              }}
                              suppressHydrationWarning={true}
                            >
                              {/* Gradient Background with Border */}
                              <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                                selectedPackage === pkg.id
                                  ? 'bg-gradient-to-br from-gray-800/98 via-gray-900/98 to-black/98 border-2 border-[#59e3a5]/80'
                                  : 'bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-black/95 border border-white/10 group-hover:border-white/20'
                              }`} style={{ zIndex: 2 }}></div>

                              {/* Subtle outline */}
                              <div className="absolute inset-0 rounded-2xl border border-white/5" style={{ zIndex: 3 }}></div>

                              {/* Subtle inner glow */}
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#59e3a5]/5 via-transparent to-[#14c0ff]/5 opacity-50" style={{ zIndex: 4 }}></div>

                              {/* Confetti Animation Overlay */}
                              {confettiAnimation === pkg.id && confettiData && (
                                <div 
                                  key={confettiKey}
                                  className="absolute inset-0 z-50 pointer-events-none rounded-2xl overflow-hidden"
                                >
                                  <Lottie
                                    ref={lottieRef}
                                    animationData={confettiData}
                                    loop={false}
                                    autoplay={true}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                    }}
                                  />
                                </div>
                              )}
                              
                              {/* Selection checkmark */}
                              {selectedPackage === pkg.id && (
                                <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center z-30 shadow-lg">
                                  <span className="text-black text-sm font-bold">✓</span>
                                </div>
                              )}
                              
                              {/* Content container */}
                              <div className="relative h-full px-4 pt-5 pb-6 flex flex-col" style={{ zIndex: 10 }}>
                                {/* Top - Emoji in gradient circle */}
                                <div className="flex flex-col items-center text-center mb-4">
                                                                  <div className="w-12 h-12 bg-gradient-to-br from-[#59e3a5]/20 to-[#14c0ff]/20 rounded-full flex items-center justify-center mb-4 border border-white/10 backdrop-blur-sm shadow-lg">
                                  <span className="text-2xl filter drop-shadow-lg">{pkg.icon}</span>
                                  </div>
                                  
                                  {/* Price */}
                                  <div className="mb-0">
                                    {isDiscountedSong ? (
                                      <div className="space-y-1">
                                        <div className="text-sm text-white/40 line-through">${pkg.price}</div>
                                        <div className="font-black text-3xl text-white filter drop-shadow-sm">
                                          ${getDiscountedPrice(pkg.price)}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="font-black text-3xl text-white filter drop-shadow-sm">${pkg.price}</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Package Name */}
                                <div className="text-center mb-3">
                                  <h3 className="font-black text-xl bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent tracking-wide filter drop-shadow-sm">{pkg.name}</h3>
                                </div>

                                {/* Hook Description */}
                                <div className="text-center mb-4">
                                  <p className="text-xs text-white/70 leading-relaxed px-2 font-medium">{pkg.description}</p>
                                </div>
                                
                                {/* Features container */}
                                <div className="bg-gradient-to-br from-white/8 to-white/4 rounded-xl px-4 py-4 backdrop-blur-sm border border-white/20 shadow-lg space-y-3">
                                                                      <div className="flex items-center text-white">
                                      <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0 shadow-md">
                                        <span className="text-black text-xs font-black">✓</span>
                                      </div>
                                      <span className="font-bold tracking-wide text-sm">{formatStreamsForDisplay(pkg.plays)}</span>
                                    </div>
                                    <div className="flex items-center text-white">
                                      <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0 shadow-md">
                                        <span className="text-black text-xs font-black">✓</span>
                                      </div>
                                      <span className="font-bold tracking-wide text-xs">{pkg.placements}</span>
                                    </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                       </div>
                    </>
                  );
                })()}
              </div>

                             {/* Chart section */}
               <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                 <h3 className="text-lg font-semibold mb-4">Based on past campaigns</h3>
                 
                 <div className="space-y-6">
                   <div className="flex justify-between items-center">
                     <div>
                       <div className="text-sm text-white/70">Expected Total Plays</div>
                       <div className="text-2xl font-bold text-[#59e3a5] transition-all duration-500">
                         {animatedPlays || chartData.realisticPlaysRange || "Select a package"}
                       </div>
                     </div>
                     <div>
                       <div className="text-sm text-white/70">Playlist Pitches</div>
                       <div className="text-2xl font-bold text-[#14c0ff] transition-all duration-500">
                         {animatedPlacements > 0 ? animatedPlacements.toLocaleString() : (chartData.placements || "—")}
                       </div>
                     </div>
                   </div>
                   
                   <div className="relative">
                     <div className="text-sm text-white/70 mb-3">14-Day Growth Projection</div>
                     <div className="relative h-32 bg-black/20 rounded-lg p-4 ml-8">
                       <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                         <defs>
                           <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                             <stop offset="0%" stopColor="#59e3a5" />
                             <stop offset="100%" stopColor="#14c0ff" />
                           </linearGradient>
                           <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                             <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.3" />
                             <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.1" />
                           </linearGradient>
                         </defs>
                         
                         {/* Grid lines */}
                         <defs>
                           <pattern id="grid" width="60" height="25" patternUnits="userSpaceOnUse">
                             <path d="M 60 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                           </pattern>
                         </defs>
                         <rect width="100%" height="100%" fill="url(#grid)" />
                         
                         {/* Area under the curve */}
                         <path
                           d={`M 0 100 ${displayData.map((plays, index) => {
                             const x = (index / (displayData.length - 1)) * 300;
                             const scale = currentScale > 0 ? currentScale : chartData.maxPlays;
                             const y = scale > 0 ? 100 - (plays / scale) * 80 : 100;
                             return `L ${x} ${y}`;
                           }).join(' ')} L 300 100 Z`}
                           fill="url(#areaGradient)"
                         />
                         
                         {/* Data points */}
                         {displayData.map((plays, index) => {
                           const x = (index / (displayData.length - 1)) * 300;
                           const scale = currentScale > 0 ? currentScale : chartData.maxPlays;
                           const y = scale > 0 ? 100 - (plays / scale) * 80 : 100;
                           
                           return (
                             <circle
                               key={index}
                               cx={x}
                               cy={y}
                               r="2"
                               fill="url(#lineGradient)"
                               className="drop-shadow-sm"
                             />
                           );
                         })}
                         
                         {/* Main line */}
                         <path
                           d={`M ${displayData.map((plays, index) => {
                             const x = (index / (displayData.length - 1)) * 300;
                             const scale = currentScale > 0 ? currentScale : chartData.maxPlays;
                             const y = scale > 0 ? 100 - (plays / scale) * 80 : 100;
                             return `${x} ${y}`;
                           }).join(' L ')}`}
                           fill="none"
                           stroke="url(#lineGradient)"
                           strokeWidth="2"
                           className="drop-shadow-sm"
                         />
                       </svg>
                       
                                                {/* Y-axis labels */}
                         <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-white/50 -ml-16 w-14 text-right">
                           <span className={`transition-opacity duration-500 ${chartData.maxPlays > 0 ? 'opacity-100' : 'opacity-30'}`}>
                             {yAxisLabels[0]}
                           </span>
                           <span className={`transition-opacity duration-500 ${chartData.maxPlays > 0 ? 'opacity-100' : 'opacity-30'}`}>
                             {yAxisLabels[1]}
                           </span>
                           <span>{yAxisLabels[2]}</span>
                         </div>
                       
                       {/* X-axis labels */}
                       <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-white/50 -mb-6">
                         <span>Day 1</span>
                         <span>Day 5</span>
                         <span>Day 14</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

              
            </div>

            {/* Right side - Album art and track info */}
            <div className="text-center">
                            {tracks.length > 1 && (
                <div className="mb-4">
                  <p 
                    key={songIndicatorKey}
                    className="text-white/70 mb-2 text-lg font-semibold animate-drop-bounce"
                  >
                    Song {currentSongIndex + 1} of {tracks.length}
                  </p>
                  <div className="w-2 h-2 bg-[#59e3a5] rounded-full mx-auto"></div>
                </div>
              )}

              <div className={`relative inline-block group ${tracks.length === 1 ? 'pt-5' : ''}`}>
                {/* 25% OFF badge for discounted songs */}
                {isDiscountedSong && (
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-lg font-bold px-4 py-2 rounded-full shadow-lg z-10 animate-pulse">
                    25% OFF
                  </div>
                )}
                {/* Gradient border container that moves with the image */}
                <div className="relative bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[3px] rounded-2xl transition-transform duration-300 group-hover:-translate-y-2 album-warp-3d overflow-hidden">
                  {/* Spark animation overlay */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent w-[200%] h-full animate-spark-travel rounded-2xl"></div>
                  </div>
                  <Image
                    src={currentTrack.imageUrl}
                    alt={currentTrack.title}
                    width={320}
                    height={320}
                    className="rounded-2xl shadow-2xl mx-auto relative z-10"
                    unoptimized
                  />
                </div>
              </div>
              
                             <div className="mt-4 mb-6">
                 <h2 className="text-3xl font-black mb-2" style={{ fontSize: 'calc(1.875rem - 0.4rem)', marginTop: '18px' }}>{currentTrack.title}</h2>
                 <p className="text-base text-white/60">{currentTrack.artist}</p>
               </div>

               {/* Action buttons */}
               <div className="space-y-4">
                 <div className="relative">
                   {/* Pulsing gradient glow background - only when button is active */}
                   {selectedPackage && !isAuthLoading && (
                     <div 
                       className="absolute inset-0 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md animate-fast-pulse-glow"
                       style={{ zIndex: 1 }}
                       suppressHydrationWarning={true}
                     ></div>
                   )}
                   
                   <button
                     onClick={handleNext}
                     disabled={!selectedPackage || isAuthLoading}
                     className="relative w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 hover:opacity-90 hover:-translate-y-1 transition-all duration-300 text-lg flex items-center justify-center gap-2"
                     style={{ zIndex: 2 }}
                     suppressHydrationWarning={true}
                   >
                     {isAuthLoading ? (
                       <>
                         <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                         Checking account...
                       </>
                     ) : (
                       <>
                         {isLastSong || isOnlySong ? 'Next Step' : 'Next Song'} →
                       </>
                     )}
                   </button>
                 </div>
                 <button
                   onClick={handleChangeSong}
                   className="w-full bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-md hover:bg-white/20 hover:-translate-y-1 transition-all duration-300 text-lg"
                 >
                   Change Songs
                 </button>
                 {currentSongIndex > 0 && (
                   <button
                     onClick={handlePreviousSong}
                     className="w-full text-white/70 hover:text-white text-sm py-2 flex items-center justify-center gap-2 transition-colors"
                   >
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                     </svg>
                     Previous Song
                   </button>
                 )}
               </div>

               {/* Campaign Features Section */}
               <div className="mt-8 bg-gradient-to-br from-white/5 via-white/3 to-white/5 rounded-2xl pl-6 pr-3 py-[26px] md:py-6 border border-white/10 backdrop-blur-sm relative overflow-hidden">
                 {/* Subtle gradient glow */}
                 <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/5 via-[#14c0ff]/5 to-[#8b5cf6]/5 rounded-2xl blur-xl opacity-60"></div>
                 
                 {/* Content */}
                 <div className="relative z-10">
                   {/* Mobile-only gradient heading */}
                   <div className="block md:hidden mb-6 text-center">
                     <h3 className="text-lg font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent block px-2" style={{letterSpacing: '0.01em', fontSize: 'calc(1.125rem + 0.25rem)'}}>
                       Inside Your Campaign 🚀
                     </h3>
                   </div>
                   {/* Featured list - 2 columns on mobile, center-aligned */}
                   <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 justify-items-start text-left pl-0 md:grid-cols-2 md:gap-x-6 md:gap-y-3 md:justify-items-start md:text-left md:pl-0">
                     {[
                       'Campaign starts within only 24-48 hours',
                       'All streams achieved in only 7-10 days', 
                       '<gradient>Curator Connect+</gradient> Unlimited Access',
                       'All genres supported',
                       'Spotify-safe guarantee',
                       'Established playlist curators',
                       'Priority curator outreach',
                       'Major playlist targeting',
                       'VIP curator network access',
                       'Dedicated account manager'
                     ].map((feature, index) => (
                       <div key={index} className="flex items-center md:items-start space-x-2 group justify-start">
                         {/* Green checkmark icon */}
                         <div className="w-5 h-5 md:w-4 md:h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 md:mt-0.5 shadow-md group-hover:scale-110 transition-transform duration-200">
                           <svg className="w-3.5 h-3.5 md:w-2.5 md:h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                           </svg>
                         </div>
                         <span className="text-white/90 leading-relaxed group-hover:text-white transition-colors duration-200 text-left feature-text-mobile" style={{ fontSize: '0.9375rem' }}>
                           {feature.includes('<gradient>') ? (
                             <>
                               {feature.split('<gradient>')[0]}
                               <span className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent font-semibold">
                                 {feature.split('<gradient>')[1].split('</gradient>')[0]}
                               </span>
                               {feature.split('</gradient>')[1]}
                             </>
                           ) : (
                             feature
                           )}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
        </div>

        {/* Read More indicator */}
        <div className="text-center -mb-20 md:mb-20 relative z-10 mt-8 md:mt-20">
          <button
            onClick={() => {
              const compareSection = document.querySelector('.compare-subheading-mobile');
              if (compareSection) {
                compareSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="cursor-pointer hover:text-gray-400 transition-colors duration-300 group"
          >
            <p className="text-sm text-gray-500 mb-2 group-hover:text-gray-400">Read More</p>
            <div className="flex justify-center -mb-12">
              <svg 
                className="w-5 h-5 text-gray-500 animate-bounce group-hover:text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ animationDuration: '2s' }}
              >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5 5-5" />
            </svg>
          </div>
          </button>
        </div>

        {/* Shape Divider Section - Full Width */}
        <div className="w-full">
          {/* Flowing Shape Divider - Curves on Both Sides */}
          <div className="relative z-30" style={{ height: '200px', width: '110vw', left: '-5vw', transform: 'rotate(-3deg)', background: 'transparent', marginTop: '60px' }}>
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
                <linearGradient id="packagesShapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.67" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path
                d="M-200,30 C100,120 300,10 500,90 C700,170 900,20 1100,100 C1300,180 1500,15 1640,70 L1640,150 C1500,120 1300,160 1100,140 C900,120 700,180 500,160 C300,140 100,190 -200,170 Z"
                fill="url(#packagesShapeGradient1)"
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
                <linearGradient id="packagesShapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <path
                d="M-200,45 C150,140 400,15 650,110 C900,190 1150,25 1400,125 C1550,165 1640,55 1640,55 L1640,145 C1550,115 1400,185 1150,125 C900,75 650,195 400,145 C150,95 -200,195 -200,195 Z"
                fill="url(#packagesShapeGradient2)"
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
                <linearGradient id="packagesShapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <path
                d="M-200,65 C200,155 450,20 700,120 C950,185 1200,30 1450,135 C1600,175 1640,70 1640,70 L1640,125 C1600,95 1450,180 1200,125 C950,55 700,185 450,135 C200,75 -200,75 -200,75 Z"
                fill="url(#packagesShapeGradient3)"
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
                <linearGradient id="packagesShapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.68" />
                  <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.72" />
                  <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.68" />
                </linearGradient>
              </defs>
              <path
                d="M-200,55 C120,15 280,150 440,65 C600,20 760,165 920,75 C1080,25 1240,145 1400,85 C1520,55 1640,115 1640,115 L1640,165 C1520,135 1400,185 1240,165 C1080,135 920,195 760,175 C600,155 440,195 280,175 C120,155 -200,185 -200,185 Z"
                fill="url(#packagesShapeGradient4)"
              />
            </svg>
          </div>
        </div>

        {/* Campaign Comparison Table - Independent from Packages Page */}
        <div className="w-full bg-transparent relative z-30">
          <div className="max-w-7xl mx-auto px-4 py-20">
            <div className="text-center mb-8 relative z-50">
              <h2 className="text-3xl md:text-5xl font-black mb-4 text-white leading-tight px-1 md:px-4 relative z-50 compare-heading-mobile">
                <span className="text-3xl md:text-5xl compare-emoji-mobile">📊</span>{' '}
                <span style={{
                  background: 'linear-gradient(to right, #59e3a5, #14c0ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Compare Campaigns
                </span>
              </h2>
              <p className="text-xl text-gray-300 px-1 md:px-4 compare-subheading-mobile mb-[16px] md:mb-0">
                Compare all features across our packages
              </p>
              
              {/* Mobile Swipe Indicator */}
              <div className="md:hidden flex justify-end pr-4 mt-[10px] mb-[-8px]">
                <div className="flex items-center space-x-2 text-gray-400 text-sm font-medium">
                  <div className="animate-bounce-left animate-pulse">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Swipe Left</span>
                </div>
              </div>
            </div>

            <div className="bg-black rounded-2xl border border-white/40 overflow-hidden relative z-30 mt-[-30px] md:mt-0">
              <div className="overflow-x-auto">
                <table className="w-full relative z-20">
                  <thead>
                    <tr className="border-b border-white/40">
                      <th className="text-left p-6 text-white font-semibold">Features</th>
                      {/* BREAKTHROUGH */}
                      <th className="text-center p-6 text-white font-semibold min-w-[150px]">
                        <div className="mb-2">BREAKTHROUGH</div>
                        <div className="text-2xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                          $39
                        </div>
                      </th>
                      {/* MOMENTUM */}
                      <th className="text-center p-6 text-white font-semibold min-w-[150px]">
                        <div className="mb-2">MOMENTUM</div>
                        <div className="text-2xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                          $79
                        </div>
                      </th>
                      {/* DOMINATE */}
                      <th className="text-center p-6 text-white font-semibold min-w-[150px]">
                        <div className="mb-2">DOMINATE</div>
                        <div className="text-2xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                          $149
                        </div>
                      </th>
                      {/* UNSTOPPABLE */}
                      <th className="text-center p-6 text-white font-semibold min-w-[150px]">
                        <div className="mb-2">UNSTOPPABLE</div>
                        <div className="text-2xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                          $259
                        </div>
                      </th>
                      {/* LEGENDARY */}
                      <th className="text-center p-6 text-white font-semibold min-w-[150px]">
                        <div className="mb-2">LEGENDARY</div>
                        <div className="text-2xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                          $479
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Campaign starts within only 24 hours */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">Campaign starts within only 24 hours</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* All streams achieved in only 7-10 days */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">All streams achieved in only 7-10 days</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* Established playlist curators */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">Established playlist curators</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* All genres supported */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">All genres supported</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* Spotify-safe guarantee */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">Spotify-safe guarantee</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* Dashboard tracking included */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">Dashboard tracking included</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* Priority curator outreach - only for higher tiers */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">Priority curator outreach</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* Major playlist targeting - only for top 3 tiers */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">Major playlist targeting</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* Industry influencer reach - only for top 2 tiers */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">Industry influencer reach</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* VIP curator network access - only for LEGENDARY */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">VIP curator network access</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {/* Dedicated account manager - only for LEGENDARY */}
                    <tr className="border-b border-white/20 hover:bg-white/10 transition-colors">
                      <td className="p-6 text-white font-medium">Dedicated account manager</td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Why FASHO.co Gets Results Section */}
        <div className="w-full bg-transparent relative z-30">
          <div className="max-w-7xl mx-auto px-4 py-20">
            {/* Why FASHO.co Gets Results */}
            <div className="text-center mb-16 relative z-50">
              <h2 className="font-black mb-6 text-white leading-tight px-4 relative z-50 text-4xl md:text-5xl">
                <span className="text-4xl md:text-5xl">🎯</span>{' '}
                <span style={{
                  background: 'linear-gradient(to right, #59e3a5, #14c0ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Why FASHO.co <br className="md:hidden" />Gets Results
                </span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-20 relative z-30">
              {/* Direct Access to Major Curators */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 p-8 hover:shadow-2xl hover:shadow-[#14c0ff]/20 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Direct Access to Major Curators</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We're not sending spam emails. We're making personal phone calls to curators from RapCaviar, Today's Top Hits, and hundreds of other massive playlists.
                    </p>
                  </div>
                </div>
              </div>

              {/* 10+ Years of Relationships */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 p-8 hover:shadow-2xl hover:shadow-[#14c0ff]/20 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">10+ Years of Relationships</h3>
                    <p className="text-gray-300 leading-relaxed">
                      These curators know us, trust us, and actually listen when we recommend new music. That's why we have a 99%+ success rate.
                    </p>
                  </div>
                </div>
              </div>

              {/* 100% Safe & Organic */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 p-8 hover:shadow-2xl hover:shadow-[#14c0ff]/20 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">100% Safe & Organic</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Real playlists, real listeners, real growth. No bots, no fake streams, no risks to your account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lightning Fast Results */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 p-8 hover:shadow-2xl hover:shadow-[#14c0ff]/20 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Lightning Fast Results</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Most campaigns are completed within 7-10 days. You'll see your first playlist placements within 48-72 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Every Stream = Money in Your Pocket */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl border border-yellow-500/20 p-8 text-center relative z-30">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent money-heading-mobile">
                  💰 Every Stream = Money in Your Pocket
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Remember, every single stream from our playlist placements generates royalties that go directly to you. Many artists see their campaigns pay for themselves within months, then it's pure profit!
                </p>
              </div>
            </div>

            {/* CTA Button to scroll back to package selection */}
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold px-8 py-4 rounded-md hover:opacity-90 hover:-translate-y-1 transition-all duration-300 text-lg shadow-lg"
              >
                CHOOSE MY PACKAGE
              </button>
            </div>
            
            {/* Hidden test button - below CTA */}
            <div className="text-center mt-40 pb-4">
              <button
                onClick={async () => {
                  if (tracks.length > 0) {
                    const testSelectedPackages = { 0: 'test' };
                    localStorage.setItem('checkoutCart', JSON.stringify({
                      tracks: JSON.stringify(tracks),
                      selectedPackages: JSON.stringify(testSelectedPackages)
                    }));
                    
                    try {
                      const response = await fetch('/api/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          tracks: tracks,
                          selectedPackages: testSelectedPackages,
                          userId: null
                        }),
                      });
                      
                      if (response.ok) {
                        const { sessionId } = await response.json();
                        router.push(`/checkout?sessionId=${sessionId}`);
                      }
                    } catch (error) {
                      console.error('Test checkout error:', error);
                    }
                  }
                }}
                className="text-xs opacity-25 hover:opacity-60 transition-opacity text-gray-500 bg-transparent border-none cursor-pointer"
              >
                AA
              </button>
            </div>
          </div>
        </div>
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
        
        .scrollbar-hide {
          -ms-overflow-style: none;  /* Internet Explorer 10+ */
          scrollbar-width: none;  /* Firefox */
        }
        
        .scrollbar-hide::-webkit-scrollbar { 
          display: none;  /* Safari and Chrome */
        }

        @keyframes bounce-left {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(0);
          }
          40% {
            transform: translateX(-3px);
          }
          60% {
            transform: translateX(-1px);
          }
        }

        @keyframes bounce-right {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(0);
          }
          40% {
            transform: translateX(5px);
          }
          60% {
            transform: translateX(2px);
          }
        }

        @keyframes drop-bounce {
          0% {
            opacity: 0;
            transform: translateY(-30px);
          }
          40% {
            opacity: 1;
            transform: translateY(8px);
          }
          60% {
            transform: translateY(-4px);
          }
          80% {
            transform: translateY(2px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-bounce-left {
          animation: bounce-left 2s infinite;
        }

        .animate-bounce-right {
          animation: bounce-right 2s infinite;
        }

        .animate-drop-bounce {
          animation: drop-bounce 0.8s ease-out forwards;
        }

        @keyframes flip-down {
          0% {
            transform: rotateX(0deg);
            opacity: 1;
          }
          50% {
            transform: rotateX(90deg);
            opacity: 0;
          }
          51% {
            transform: rotateX(-90deg);
            opacity: 0;
          }
          100% {
            transform: rotateX(0deg);
            opacity: 1;
          }
        }

        .animate-flip-down {
          animation: flip-down 0.6s ease-in-out forwards;
          transform-style: preserve-3d;
          perspective: 1000px;
        }

        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
        
        .border-container-blue {
          background: rgba(20, 192, 255, 0.15);
          border-radius: 0.75rem;
        }
        
        .border-highlight-blue {
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            #14c0ff 30deg,
            #0ea5e9 45deg,
            #14c0ff 60deg,
            transparent 90deg,
            transparent 180deg,
            #14c0ff 210deg,
            #0ea5e9 225deg,
            #14c0ff 240deg,
            transparent 270deg,
            transparent 360deg
          );
          border-radius: 0.75rem;
        }


      `}</style>
    </>
  );
} 