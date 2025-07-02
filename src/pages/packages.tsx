import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { Track } from "../types/track";
import Header from "../components/Header";

interface Package {
  id: string;
  name: string;
  price: number;
  plays: string;
  placements: string;
  description: string;
}

const packages: Package[] = [
  {
    id: "starter",
    name: "Starter",
    price: 39,
    plays: "1k Plays",
    placements: "35 Playlist Placements",
    description: "Perfect for getting started"
  },
  {
    id: "advanced", 
    name: "Advanced",
    price: 89,
    plays: "5k Plays",
    placements: "75 Playlist Placements",
    description: "Great for growing artists"
  },
  {
    id: "diamond",
    name: "Diamond", 
    price: 249,
    plays: "15k Plays",
    placements: "115 Playlist Placements",
    description: "Professional promotion"
  },
  {
    id: "ultra",
    name: "Ultra",
    price: 499,
    plays: "50k Plays", 
    placements: "250 Playlist Placements",
    description: "Maximum exposure"
  }
];

export default function PackagesPage() {
  const router = useRouter();
  const { tracks: tracksParam } = router.query;

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
  const [songIndicatorKey, setSongIndicatorKey] = useState(0); // For triggering animation
  const carouselRef = useRef<HTMLDivElement>(null);

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
    
    const basePlay = parseInt(selected.plays.replace(/[^0-9]/g, '')) * 1000;
    const maxPlays = Math.floor(basePlay * 1.1);
    const basePlacements = parseInt(selected.placements.replace(/[^0-9]/g, ''));
    const actualPlacements = Math.floor(basePlacements * (1.05 + Math.random() * 0.05));
    const playsRange = `${(basePlay / 1000).toFixed(0)}k - ${(maxPlays / 1000).toFixed(1)}k plays`;
    
    // Generate 30-day growth data
    const dailyData: number[] = [];
    for (let i = 0; i < 30; i++) {
      const progress = i / 29;
      const randomVariation = 0.8 + Math.random() * 0.4;
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
        setAnimatedPlacements(Math.floor(actualPlacements * easeOutCubic));
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

  const handleNext = () => {
    if (!selectedPackage) {
      alert("Please select a package before continuing");
      return;
    }

    if (isLastSong || isOnlySong) {
      // Go to checkout with tracks and selected packages
      router.push({
        pathname: '/checkout',
        query: {
          tracks: JSON.stringify(tracks),
          selectedPackages: JSON.stringify(selectedPackages)
        }
      });
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
    
    setCanScrollLeft(showLeftArrow);
    setCanScrollRight(finalShowRightArrow);
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
        maxPlays: 0 
      };
    }
    
    const basePlay = parseInt(selected.plays.replace(/[^0-9]/g, '')) * 1000;
    const basePlacements = parseInt(selected.placements.replace(/[^0-9]/g, ''));
    
    // Create range: base to 10% higher
    const minPlays = basePlay;
    const maxPlays = Math.floor(basePlay * 1.1);
    const playsRange = `${(minPlays / 1000).toFixed(0)}k - ${(maxPlays / 1000).toFixed(1)}k plays`;
    const actualPlacements = Math.floor(basePlacements * (1.05 + Math.random() * 0.05));
    
    // Generate 30-day growth data using the max value for scaling
    const dailyData = [];
    for (let i = 0; i < 30; i++) {
      const progress = i / 29;
      const randomVariation = 0.8 + Math.random() * 0.4; // 80-120% of expected
      const dailyPlays = Math.floor(maxPlays * progress * randomVariation);
      dailyData.push({
        day: i + 1,
        plays: Math.max(0, dailyPlays)
      });
    }
    
    return {
      plays: maxPlays,
      placements: actualPlacements,
      dailyData,
      playsRange,
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
        <div className="relative z-20">
        <div className="max-w-7xl mx-auto">
          <h1 className={`${isDiscountedSong ? 'text-3xl' : 'text-4xl'} md:text-5xl font-extrabold text-center mb-12`}>
            Step 2: Choose your campaign{isDiscountedSong && <> for <span className="text-[#59e3a5]">25% OFF</span></>}
          </h1>

          {/* Mobile Layout */}
          <div className="block md:hidden">
            {/* Mobile: Album art and track info at top */}
            <div className="text-center mb-8">
              <div className="mb-6">
                <p 
                  key={songIndicatorKey}
                  className="text-white/70 mb-2 text-lg font-semibold animate-drop-bounce"
                >
                  Song {currentSongIndex + 1} of {tracks.length}
                </p>
                <div className="w-2 h-2 bg-[#59e3a5] rounded-full mx-auto"></div>
              </div>
              
              <div className="relative inline-block group">
                {/* Gradient outline */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-2xl blur-sm opacity-75"></div>
                {/* 25% OFF badge for discounted songs */}
                {isDiscountedSong && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-sm font-bold px-3 py-1 rounded-full shadow-lg z-10 animate-pulse">
                    25% OFF
                  </div>
                )}
                <Image
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  width={300}
                  height={300}
                  className="relative rounded-2xl shadow-2xl mx-auto transition-transform duration-300 group-hover:-translate-y-2"
                  unoptimized
                />
              </div>
              
              <div className="mt-6 mb-8">
                <h2 className="text-xl font-bold mb-2">{currentTrack.title}</h2>
                <p className="text-lg text-white/70">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Mobile: Package carousel */}
            <div className="mb-8 relative">
              {/* Left arrow */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollCarousel('left')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/70 backdrop-blur-sm rounded-full p-2 border border-white/20 shadow-lg animate-bounce-left"
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/70 backdrop-blur-sm rounded-full p-2 border border-white/20 shadow-lg animate-bounce-right"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              <div 
                ref={carouselRef}
                className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="flex gap-4 px-4 pt-6 pb-2" style={{ width: 'max-content' }}>
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg.id)}
                      className={`relative cursor-pointer rounded-xl transition-all duration-300 flex-shrink-0 ${
                        pkg.id === 'advanced' ? '' : 'p-6 border-2'
                      } ${
                        selectedPackage === pkg.id && pkg.id !== 'advanced'
                          ? 'border-[#59e3a5] bg-[#59e3a5]/5'
                          : pkg.id !== 'advanced'
                          ? 'border-white/20 bg-white/5 hover:border-white/40'
                          : ''
                      }`}
                      style={{ width: 'calc(50vw - 1rem)' }}
                    >
                      {/* Lens flare animation for Advanced package */}
                      {pkg.id === 'advanced' && (
                        <>
                          {/* Outer glow layer */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                          
                          {/* Animated border layer */}
                          <div className="absolute -inset-0.5 rounded-xl overflow-hidden">
                            <div className="absolute inset-0 border-container-blue">
                              <div className="absolute -inset-[100px] animate-spin-slow border-highlight-blue"></div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Most Popular flag for Advanced package */}
                      {pkg.id === 'advanced' && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] text-white text-xs font-semibold px-4 py-1 rounded-md shadow-lg z-30 whitespace-nowrap">
                          Most Popular
                        </div>
                      )}
                      {selectedPackage === pkg.id && (
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#59e3a5] rounded-full flex items-center justify-center z-30">
                          <span className="text-black text-sm font-bold">✓</span>
                        </div>
                      )}
                      
                      {/* Content container - same structure for all packages */}
                      <div className={`${pkg.id === 'advanced' ? `relative z-20 bg-gray-900 rounded-xl p-6 border h-full flex flex-col ${selectedPackage === pkg.id ? 'border-[#59e3a5]' : 'border-white/20'}` : 'h-full flex flex-col'}`}>
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
                            <span className="text-lg">🎧</span>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-center mb-2">{pkg.name}</h3>
                        <p className="text-xs text-white/70 text-center mb-4">{pkg.description}</p>
                        
                        <div className="space-y-2 mb-4 flex-grow">
                          <div className="text-xs text-white/80">{pkg.plays}</div>
                          <div className="text-xs text-white/80">{pkg.placements}</div>
                        </div>
                        
                        <div className="text-center mt-auto">
                          {isDiscountedSong ? (
                            <div className="space-y-1">
                              <div className="text-sm text-white/50 line-through">${pkg.price}</div>
                              <div className="text-xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                                ${getDiscountedPrice(pkg.price)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xl font-bold">${pkg.price}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile: Chart section */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20 mb-8">
              <h3 className="text-lg font-semibold mb-4">Based on past campaigns</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-white/70">Expected Total Plays</div>
                    <div className="text-xl font-bold text-[#59e3a5] transition-all duration-500">
                      {animatedPlays || chartData.playsRange || "Select a package"}
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
            <div className="space-y-4">
              <button
                onClick={handleNext}
                disabled={!selectedPackage}
                className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 hover:opacity-90 hover:-translate-y-1 transition-all duration-300 text-lg"
              >
                {isLastSong || isOnlySong ? 'Next Step' : 'Next Song'} →
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
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left side - Package selection */}
            <div className="space-y-8">
              {/* Package cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => handlePackageSelect(pkg.id)}
                    className={`relative cursor-pointer rounded-xl transition-all duration-300 hover:-translate-y-2 ${
                      pkg.id === 'advanced' ? '' : 'p-6 border-2'
                    } ${
                      selectedPackage === pkg.id && pkg.id !== 'advanced'
                        ? 'border-[#59e3a5] bg-[#59e3a5]/5'
                        : pkg.id !== 'advanced'
                        ? 'border-white/20 bg-white/5 hover:border-white/40'
                        : ''
                    }`}
                  >
                    {/* Lens flare animation for Advanced package */}
                    {pkg.id === 'advanced' && (
                      <>
                        {/* Outer glow layer */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                        
                        {/* Animated border layer */}
                        <div className="absolute -inset-0.5 rounded-xl overflow-hidden">
                          <div className="absolute inset-0 border-container-blue">
                            <div className="absolute -inset-[100px] animate-spin-slow border-highlight-blue"></div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Most Popular flag for Advanced package */}
                    {pkg.id === 'advanced' && (
                      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] text-white text-xs font-semibold px-3 py-1 rounded-md shadow-lg z-30">
                        Most Popular
                      </div>
                    )}
                    {selectedPackage === pkg.id && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#59e3a5] rounded-full flex items-center justify-center z-30">
                        <span className="text-black text-sm font-bold">✓</span>
                      </div>
                    )}
                    
                    {/* Content container - same structure for all packages */}
                    <div className={`${pkg.id === 'advanced' ? `relative z-20 bg-gray-900 rounded-xl p-6 border ${selectedPackage === pkg.id ? 'border-[#59e3a5]' : 'border-white/20'}` : ''}`}>
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
                          <span className="text-2xl">🎧</span>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-center mb-2">{pkg.name}</h3>
                      <p className="text-sm text-white/70 text-center mb-4">{pkg.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="text-sm text-white/80">{pkg.plays}</div>
                        <div className="text-sm text-white/80">{pkg.placements}</div>
                      </div>
                      
                      <div className="text-center">
                        {isDiscountedSong ? (
                          <div className="space-y-1">
                            <div className="text-sm text-white/50 line-through">${pkg.price}</div>
                            <div className="text-2xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                              ${getDiscountedPrice(pkg.price)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-2xl font-bold">${pkg.price}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

                             {/* Chart section */}
               <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                 <h3 className="text-lg font-semibold mb-4">Based on past campaigns</h3>
                 
                 <div className="space-y-6">
                   <div className="flex justify-between items-center">
                     <div>
                       <div className="text-sm text-white/70">Expected Total Plays</div>
                       <div className="text-2xl font-bold text-[#59e3a5] transition-all duration-500">
                         {animatedPlays || chartData.playsRange || "Select a package"}
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
              <div className="mb-6">
                <p 
                  key={songIndicatorKey}
                  className="text-white/70 mb-2 text-xl font-semibold animate-drop-bounce"
                >
                  Song {currentSongIndex + 1} of {tracks.length}
                </p>
                <div className="w-2 h-2 bg-[#59e3a5] rounded-full mx-auto"></div>
              </div>
              
              <div className="relative inline-block group">
                {/* Gradient outline */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-2xl blur-sm opacity-75"></div>
                {/* 25% OFF badge for discounted songs */}
                {isDiscountedSong && (
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-lg font-bold px-4 py-2 rounded-full shadow-lg z-10 animate-pulse">
                    25% OFF
                  </div>
                )}
                <Image
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  width={400}
                  height={400}
                  className="relative rounded-2xl shadow-2xl mx-auto transition-transform duration-300 group-hover:-translate-y-2"
                  unoptimized
                />
              </div>
              
                             <div className="mt-6 mb-8">
                 <h2 className="text-2xl font-bold mb-2">{currentTrack.title}</h2>
                 <p className="text-xl text-white/70">{currentTrack.artist}</p>
               </div>

               {/* Action buttons */}
               <div className="space-y-4">
                 <button
                   onClick={handleNext}
                   disabled={!selectedPackage}
                   className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 hover:opacity-90 hover:-translate-y-1 transition-all duration-300 text-lg"
                 >
                   {isLastSong || isOnlySong ? 'Next Step' : 'Next Song'} →
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
          background: rgba(20, 192, 255, 0.45);
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