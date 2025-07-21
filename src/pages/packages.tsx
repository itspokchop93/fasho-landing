import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { Track } from "../types/track";
import Header from "../components/Header";
import dynamic from 'next/dynamic';
import { createClient } from '../utils/supabase/client';
import * as gtag from '../utils/gtag';

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
    description: "",
    icon: "👑"
  },
  {
    id: "unstoppable",
    name: "UNSTOPPABLE",
    price: 259,
    plays: "45K - 50K Streams", 
    placements: "150 - 170 Playlist Pitches",
    description: "",
    icon: "💎"
  },
  {
    id: "dominate",
    name: "DOMINATE", 
    price: 149,
    plays: "18K - 20K Streams",
    placements: "60 - 70 Playlist Pitches",
    description: "",
    icon: "🔥",
    popular: true
  },
  {
    id: "momentum", 
    name: "MOMENTUM",
    price: 79,
    plays: "7.5K - 8.5K Streams",
    placements: "25 - 30 Playlist Pitches",
    description: "",
    icon: "⚡"
  },
  {
    id: "breakthrough",
    name: "BREAKTHROUGH",
    price: 39,
    plays: "3K - 3.5K Streams",
    placements: "10 - 12 Playlist Pitches",
    description: "",
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    if (!router.isReady) return;
    
    if (tracksParam && typeof tracksParam === 'string') {
      try {
        const parsedTracks = JSON.parse(tracksParam) as Track[];
        setTracks(parsedTracks);
        // Trigger animation on initial load
        setSongIndicatorKey(prev => prev + 1);
      } catch (error) {
        console.error("Failed to parse tracks:", error);
        router.push('/add');
      }
    } else {
      router.push('/add');
    }
  }, [router.isReady, tracksParam]);

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
      const selectedPkg = packages.find(pkg => pkg.id === packageId);
      if (selectedPkg) {
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
    }
    
    setPreviousPackage(selectedPackage);
    setSelectedPackage(newPackageId);
    setSelectedPackages(prev => ({
      ...prev,
      [currentSongIndex]: newPackageId
    }));
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

        gtag.trackBeginCheckout({
          totalAmount,
          items: checkoutItems
        });

        // Create secure checkout session with user ID if logged in
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tracks,
            selectedPackages,
            userId: finalUserId // Use the final verified user ID
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const { sessionId } = await response.json();

        console.log('🔐 PACKAGES: Created checkout session with userId:', finalUserId);
        console.log('🔐 PACKAGES: Session ID:', sessionId);

        // Go to checkout with session ID
        router.push({
          pathname: '/checkout',
          query: {
            sessionId
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
      setSelectedPackage(selectedPackages[newIndex] || "");
      
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
      
      // Delay animation to allow scroll to complete
      setTimeout(() => {
        setSongIndicatorKey(prev => prev + 1); // Trigger animation
      }, 350);
    }
  };

  const handleChangeSong = () => {
    // Remove current song from tracks and go back to add page
    const updatedTracks = tracks.filter((_, index) => index !== currentSongIndex);
    
    if (updatedTracks.length === 0) {
      router.push('/add');
    } else {
      // Store remaining tracks and redirect to add page to replace this song
      sessionStorage.setItem('remainingTracks', JSON.stringify(updatedTracks));
      sessionStorage.setItem('replacingSongIndex', currentSongIndex.toString());
      router.push('/add');
    }
  };

  const handlePreviousSong = () => {
    if (currentSongIndex > 0) {
      const newIndex = currentSongIndex - 1;
      setCurrentSongIndex(newIndex);
      setSelectedPackage(selectedPackages[newIndex] || "");
      
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
      
      // Delay animation to allow scroll to complete
      setTimeout(() => {
        setSongIndicatorKey(prev => prev + 1); // Trigger animation
      }, 350);
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
        <div className="max-w-7xl mx-auto">
          <h1 className={`${isDiscountedSong ? 'text-3xl' : 'text-4xl'} md:text-5xl font-extrabold text-center mb-12`}>
            Step 2: Choose your campaign{isDiscountedSong && <> for <span className="text-[#59e3a5]">25% OFF</span></>}
          </h1>

          {/* Mobile Layout */}
          <div className="block md:hidden">
            {/* Mobile: Album art and track info at top */}
            <div className="text-center mb-8">
                            {tracks.length > 1 && (
                <div className="mb-6">
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
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-sm font-bold px-3 py-1 rounded-full shadow-lg z-10 animate-pulse">
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
                    width={300}
                    height={300}
                    className="rounded-2xl shadow-2xl mx-auto relative z-10"
                    unoptimized
                  />
                </div>
              </div>
              
              <div className="mt-6 mb-8">
                <h2 className="text-2xl font-black mb-2">{currentTrack.title}</h2>
                <p className="text-sm text-white/60">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Mobile: Package carousel */}
            <div className="md:hidden mb-8 relative">
              {/* Left arrow */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollCarousel('left')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-50 bg-black/80 backdrop-blur-sm rounded-full p-2 border border-white/20 shadow-lg hover:bg-black/90 transition-all duration-300"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              
              {/* Right arrow */}
              {canScrollRight && (
                <button
                  onClick={() => scrollCarousel('right')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-50 bg-black/80 backdrop-blur-sm rounded-full p-2 border border-white/20 shadow-lg hover:bg-black/90 transition-all duration-300"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              <div 
                ref={carouselRef}
                className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing pb-3 relative"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={checkScrollArrows}
              >
                {/* Subtle gradient glow behind mobile cards */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#59e3a5]/10 via-[#14c0ff]/10 to-[#8b5cf6]/10 rounded-2xl blur-xl -z-10"></div>
                <div className="flex gap-4 px-4 py-6" style={{ width: 'max-content' }}>
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg.id)}
                      className={`relative cursor-pointer rounded-xl transition-all duration-300 flex-shrink-0 hover:-translate-y-1 ${
                        pkg.popular ? '' : 'border-2'
                      } ${
                        selectedPackage === pkg.id && !pkg.popular
                          ? 'border-[#59e3a5] bg-gradient-to-br from-[#59e3a5]/20 via-gray-900/95 to-gray-800/95'
                          : !pkg.popular
                          ? 'border-white/20 bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-gray-800/95 hover:border-white/40'
                          : ''
                      }`}
                      style={{ 
                        width: '240px', 
                        height: isDiscountedSong ? '250px' : '240px'
                      }}
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
                      
                      {/* Selected checkmark */}
                      {selectedPackage === pkg.id && (
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#59e3a5] rounded-full flex items-center justify-center z-30">
                          <span className="text-black text-sm font-bold">✓</span>
                        </div>
                      )}
                      
                      {/* Content container - Vertical baseball card layout */}
                      <div className={`h-full p-2 pb-4 flex flex-col ${pkg.popular ? 'relative z-20 bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-gray-800/95 rounded-xl border' : ''} ${
                        pkg.popular && selectedPackage === pkg.id ? 'border-[#59e3a5]' : pkg.popular ? 'border-white/20' : ''
                      }`}>
                        
                        {/* Top - Icon and Price */}
                        <div className="flex flex-col items-center text-center mb-1">
                          <div className="w-14 h-14 flex items-center justify-center mb-1">
                            <span className="text-3xl">{pkg.icon}</span>
                          </div>
                          <div>
                            {isDiscountedSong ? (
                              <div className="space-y-0">
                                <div className="text-xs text-white/50 line-through">${pkg.price}</div>
                                <div className="text-lg font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{fontSize: 'calc(1.125rem + 0.15rem + 0.25rem)'}}>
                                  ${getDiscountedPrice(pkg.price)}
                                </div>
                              </div>
                            ) : (
                              <span className="font-bold text-white" style={{fontSize: 'calc(1.125rem - 0.12rem + 0.15rem + 0.25rem)'}}>${pkg.price}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Middle - Package name */}
                        <div className="text-center" style={{marginBottom: '5px'}}>
                          <h3 className="font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" 
                              style={{fontSize: ['legendary', 'dominate', 'momentum'].includes(pkg.id) ? 'calc(0.875rem + 0.18rem + 0.12rem + 0.2rem + 0.15rem - 0.1rem)' : pkg.id === 'unstoppable' ? 'calc(0.875rem + 0.12rem + 0.12rem + 0.2rem + 0.15rem - 0.1rem)' : 'calc(0.875rem + 0.12rem + 0.2rem + 0.15rem - 0.1rem)', fontWeight: '900'}}>
                            {pkg.name}
                          </h3>
                        </div>
                        
                        {/* Bottom - Features */}
                        <div className="flex-1 flex flex-col justify-center">
                          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <div className="flex items-center text-white/80 justify-center" style={{fontSize: 'calc(0.75rem + 0.2rem + 0.15rem - 0.08rem)', fontWeight: '700'}}>
                              <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                <span className="text-black text-xs font-bold">✓</span>
                              </div>
                              <span>{pkg.plays}</span>
                            </div>
                            <div className="flex items-center text-white/80 justify-center" style={{fontSize: 'calc(0.75rem + 0.2rem)', fontWeight: '700', marginBottom: '4px'}}>
                              <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                <span className="text-black text-xs font-bold">✓</span>
                              </div>
                              <span>{pkg.placements}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Scrollbar */}
              <div className="relative mx-4 mt-2">
                <div className="h-1 bg-white/10 rounded-full relative overflow-hidden">
                  <div 
                    className="absolute h-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full transition-all duration-300"
                    style={{
                      width: '30%', // Fixed width for the scrollbar thumb
                      left: `${Math.min(70, (scrollProgress * 70))}%` // Move along the track
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Mobile: Chart section */}
            <div className="md:hidden bg-white/5 rounded-xl p-6 border border-white/20 mb-8">
              <h3 className="text-lg font-semibold mb-4">Based on past campaigns</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-white/70">Expected Total Plays</div>
                    <div className="text-xl font-bold text-[#59e3a5] transition-all duration-500">
                      {animatedPlays || chartData.realisticPlaysRange || "Select a package"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-white/70">Playlist Placements</div>
                    <div className="text-xl font-bold text-[#14c0ff] transition-all duration-500">
                      {animatedPlacements > 0 ? animatedPlacements.toLocaleString() : (chartData.placements || "—")}
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="text-sm text-white/70 mb-3">30-Day Growth Projection</div>
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
                      <span>Day 15</span>
                      <span>Day 30</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Action buttons */}
            <div className="md:hidden space-y-4">
              <button
                onClick={handleNext}
                disabled={!selectedPackage || isAuthLoading}
                className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 hover:opacity-90 hover:-translate-y-1 transition-all duration-300 text-lg flex items-center justify-center gap-2"
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

              {/* Mobile Campaign Features Section */}
              <div className="mt-6 bg-gradient-to-br from-white/5 via-white/3 to-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden">
                {/* Subtle gradient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/5 via-[#14c0ff]/5 to-[#8b5cf6]/5 rounded-2xl blur-xl opacity-60"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'Campaign starts within only 24-48 hours',
                      'All streams achieved in only 7-10 days', 
                      'Established playlist curators',
                      'All genres supported',
                      'Spotify-safe guarantee',
                      'Dashboard tracking included',
                      'Priority curator outreach',
                      'Major playlist targeting',
                      'VIP curator network access',
                      'Dedicated account manager'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-start space-x-2 group">
                        {/* Green checkmark icon */}
                        <div className="w-3 h-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 shadow-sm group-hover:scale-110 transition-transform duration-200">
                          <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-white/90 text-xs leading-relaxed group-hover:text-white transition-colors duration-200 text-left">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 items-start">
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
                      <div className="grid grid-cols-3 gap-6">
                        {packages.slice(0, 3).map((pkg) => (
                          <div
                            key={pkg.id}
                            onClick={() => handlePackageSelect(pkg.id)}
                                                        className={`relative cursor-pointer rounded-xl transition-all duration-300 hover:-translate-y-1 ${
                              pkg.popular ? '' : 'border-2'
                            } ${
                              selectedPackage === pkg.id && !pkg.popular
                                ? 'border-[#59e3a5] bg-gradient-to-br from-[#59e3a5]/20 via-gray-900/95 to-gray-800/95'
                                : !pkg.popular
                                ? 'border-white/20 bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-gray-800/95 hover:border-white/40'
                                : ''
                            }`}
                                style={{ minHeight: isDiscountedSong ? '205px' : '200px' }}
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
                            
                            {/* Lens flare animation for Popular package with reduced opacity */}
                            {pkg.popular && (
                              <>
                                {/* Outer glow layer - reduced spread (blur-md to blur-sm, -inset-1 to -inset-0.5) */}
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
                            
                            {selectedPackage === pkg.id && (
                              <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#59e3a5] rounded-full flex items-center justify-center z-30">
                                <span className="text-black text-sm font-bold">✓</span>
                              </div>
                            )}
                            
                            {/* Content container */}
                            <div className={`h-full ${pkg.popular ? `relative z-20 bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-gray-800/95 rounded-xl px-3 pt-4 pb-6 border flex flex-col ${selectedPackage === pkg.id ? 'border-[#59e3a5]' : 'border-white/20'}` : 'px-3 pt-4 pb-6 flex flex-col'}`}>
                              {/* Top - Icon and Price */}
                              <div className="flex flex-col items-center text-center mb-2">
                                <div className="w-18 h-18 flex items-center justify-center mb-3">
                                  <span className="text-4xl">{pkg.icon}</span>
                                </div>
                                <div>
                                  {isDiscountedSong ? (
                                    <div className="space-y-0">
                                      <div className="text-sm text-white/50 line-through">${pkg.price}</div>
                                      <div className="font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{fontSize: 'calc(1.25rem + 0.35rem - 0.12rem)'}}>
                                        ${getDiscountedPrice(pkg.price)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="font-bold" style={{fontSize: 'calc(1.25rem + 0.35rem - 0.12rem)'}}>${pkg.price}</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Middle - Package Name */}
                              <div className="text-center mb-2">
                                <h3 className="font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{fontSize: ['legendary', 'dominate', 'momentum'].includes(pkg.id) ? 'calc(1rem + 0.2rem + 0.18rem)' : pkg.id === 'unstoppable' ? 'calc(1rem + 0.2rem + 0.12rem)' : 'calc(1rem + 0.2rem)'}}>{pkg.name}</h3>
                              </div>
                              
                                                             {/* Bottom - Features with checkmarks */}
                               <div className="space-y-2">
                                 <div className="flex items-center justify-center text-sm text-white/90">
                                   <div className="w-4 h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                     <span className="text-black text-xs font-bold">✓</span>
                                   </div>
                                   <span>{formatStreamsForDisplay(pkg.plays)}</span>
                                 </div>
                                 <div className={`flex items-center justify-center text-sm text-white/90 ${['unstoppable', 'dominate'].includes(pkg.id) ? '' : 'mb-1'}`}>
                                   <div className="w-4 h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                     <span className="text-black text-xs font-bold">✓</span>
                                   </div>
                                   <span>{pkg.placements}</span>
                                 </div>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Bottom row - 2 packages centered */}
                      <div className="flex justify-center gap-6">
                                                      {packages.slice(3, 5).map((pkg) => (
                            <div
                              key={pkg.id}
                              onClick={() => handlePackageSelect(pkg.id)}
                              className={`relative cursor-pointer rounded-xl transition-all duration-300 hover:-translate-y-1 border-2 w-[240px] ${
                                selectedPackage === pkg.id
                                  ? 'border-[#59e3a5] bg-gradient-to-br from-[#59e3a5]/20 via-gray-900/95 to-gray-800/95'
                                  : 'border-white/20 bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-gray-800/95 hover:border-white/40'
                              }`}
                              style={{ minHeight: isDiscountedSong ? '205px' : '200px' }}
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
                              
                              {selectedPackage === pkg.id && (
                                <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#59e3a5] rounded-full flex items-center justify-center z-30">
                                  <span className="text-black text-sm font-bold">✓</span>
                                </div>
                              )}
                              
                              {/* Content container */}
                              <div className="h-full px-3 pt-4 pb-6 flex flex-col">
                                {/* Top - Icon and Price */}
                                <div className="flex flex-col items-center text-center mb-2">
                                  <div className="w-18 h-18 flex items-center justify-center mb-3">
                                    <span className="text-4xl">{pkg.icon}</span>
                                  </div>
                                  <div>
                                    {isDiscountedSong ? (
                                      <div className="space-y-0">
                                        <div className="text-sm text-white/50 line-through">${pkg.price}</div>
                                        <div className="font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{fontSize: 'calc(1.25rem + 0.35rem)'}}>
                                          ${getDiscountedPrice(pkg.price)}
                                        </div>
                                      </div>
                                                                          ) : (
                                      <span className="font-bold" style={{fontSize: 'calc(1.25rem + 0.35rem - 0.12rem)'}}>${pkg.price}</span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Middle - Package Name */}
                                <div className="text-center mb-2">
                                  <h3 className="font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{fontSize: ['legendary', 'dominate', 'momentum'].includes(pkg.id) ? 'calc(1rem + 0.2rem + 0.18rem)' : pkg.id === 'unstoppable' ? 'calc(1rem + 0.2rem + 0.12rem)' : 'calc(1rem + 0.2rem)'}}>{pkg.name}</h3>
                                </div>
                                
                                                                 {/* Bottom - Features with checkmarks */}
                                 <div className="space-y-2">
                                   <div className="flex items-center justify-center text-sm text-white/90">
                                     <div className="w-4 h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                       <span className="text-black text-xs font-bold">✓</span>
                                     </div>
                                     <span>{formatStreamsForDisplay(pkg.plays)}</span>
                                   </div>
                                   <div className={`flex items-center justify-center text-sm text-white/90 ${['unstoppable', 'dominate'].includes(pkg.id) ? '' : 'mb-1'}`}>
                                     <div className="w-4 h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                       <span className="text-black text-xs font-bold">✓</span>
                                     </div>
                                     <span>{pkg.placements}</span>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           ))}
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
                       <div className="text-sm text-white/70">Playlist Placements</div>
                       <div className="text-2xl font-bold text-[#14c0ff] transition-all duration-500">
                         {animatedPlacements > 0 ? animatedPlacements.toLocaleString() : (chartData.placements || "—")}
                       </div>
                     </div>
                   </div>
                   
                   <div className="relative">
                     <div className="text-sm text-white/70 mb-3">30-Day Growth Projection</div>
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
                         <span>Day 15</span>
                         <span>Day 30</span>
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
                 <button
                   onClick={handleNext}
                   disabled={!selectedPackage || isAuthLoading}
                   className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 hover:opacity-90 hover:-translate-y-1 transition-all duration-300 text-lg flex items-center justify-center gap-2"
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
               <div className="mt-8 bg-gradient-to-br from-white/5 via-white/3 to-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm relative overflow-hidden">
                 {/* Subtle gradient glow */}
                 <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/5 via-[#14c0ff]/5 to-[#8b5cf6]/5 rounded-2xl blur-xl opacity-60"></div>
                 
                 {/* Content */}
                 <div className="relative z-10">
                   
                   <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                     {[
                       'Campaign starts within only 24-48 hours',
                       'All streams achieved in only 7-10 days', 
                       'Established playlist curators',
                       'All genres supported',
                       'Spotify-safe guarantee',
                       'Dashboard tracking included',
                       'Priority curator outreach',
                       'Major playlist targeting',
                       'VIP curator network access',
                       'Dedicated account manager'
                     ].map((feature, index) => (
                       <div key={index} className="flex items-start space-x-2 group">
                         {/* Green checkmark icon */}
                         <div className="w-4 h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md group-hover:scale-110 transition-transform duration-200">
                           <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                           </svg>
                         </div>
                         <span className="text-white/90 text-xs leading-relaxed group-hover:text-white transition-colors duration-200 text-left">
                           {feature}
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
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-white leading-tight px-4 relative z-50">
                <span className="text-4xl md:text-5xl">📊</span>{' '}
                <span style={{
                  background: 'linear-gradient(to right, #59e3a5, #14c0ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Compare Your Campaigns
                </span>
              </h2>
              <p className="text-xl text-gray-300">
                Compare all features across our packages
              </p>
              
              {/* Mobile Swipe Indicator */}
              <div className="md:hidden flex justify-end pr-4 mb-1">
                <div className="flex items-center space-x-2 text-gray-400 text-sm" style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}>
                  <div className="animate-pulse" style={{ animation: 'bounceLeft 1.5s infinite' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Swipe Left</span>
                </div>
              </div>
              
              <style jsx>{`
                @keyframes bounceLeft {
                  0%, 20%, 50%, 80%, 100% {
                    transform: translateX(0);
                  }
                  40% {
                    transform: translateX(-4px);
                  }
                  60% {
                    transform: translateX(-2px);
                  }
                }
              `}</style>
            </div>

            <div className="bg-black rounded-2xl border border-white/40 overflow-hidden relative z-30">
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
              <h2 className="font-black mb-6 text-white leading-tight px-4 relative z-50 md:text-5xl" style={{ fontSize: 'calc(2.25rem + 0.35rem)' }}>
                <span className="text-4xl md:text-5xl">🎯</span>{' '}
                <span style={{
                  background: 'linear-gradient(to right, #59e3a5, #14c0ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Why FASHO.co Gets Results
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
                <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  💰 Every Stream = Money in Your Pocket
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Remember, every single stream from our playlist placements generates royalties that go directly to you. Many artists see their campaigns pay for themselves within months, then it's pure profit!
                </p>
              </div>
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