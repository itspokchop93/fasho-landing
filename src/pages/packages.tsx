import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { Track } from "../types/track";

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

  useEffect(() => {
    if (!router.isReady) return;
    
    if (tracksParam && typeof tracksParam === 'string') {
      try {
        const parsedTracks = JSON.parse(tracksParam) as Track[];
        setTracks(parsedTracks);
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

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    setSelectedPackages(prev => ({
      ...prev,
      [currentSongIndex]: packageId
    }));
  };

  const handleNext = () => {
    if (!selectedPackage) {
      alert("Please select a package before continuing");
      return;
    }

    if (isLastSong || isOnlySong) {
      // Go to checkout with all selections
      const orderData = tracks.map((track, index) => ({
        track,
        packageId: selectedPackages[index] || selectedPackage,
        package: packages.find(p => p.id === (selectedPackages[index] || selectedPackage))
      }));
      
      router.push({
        pathname: '/checkout',
        query: {
          order: JSON.stringify(orderData)
        }
      });
    } else {
      // Go to next song
      setCurrentSongIndex(prev => prev + 1);
      setSelectedPackage(selectedPackages[currentSongIndex + 1] || "");
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

  const getChartData = () => {
    const selected = packages.find(p => p.id === selectedPackage);
    if (!selected) return { plays: 0, placements: 0, dailyData: [] };
    
    const basePlay = parseInt(selected.plays.replace(/[^0-9]/g, '')) * 1000;
    const basePlacements = parseInt(selected.placements.replace(/[^0-9]/g, ''));
    
    // Add 10-20% more than advertised for realistic expectations
    const actualPlays = Math.floor(basePlay * (1.1 + Math.random() * 0.1));
    const actualPlacements = Math.floor(basePlacements * (1.05 + Math.random() * 0.1));
    
    // Generate 30-day growth data
    const dailyData = [];
    for (let i = 0; i < 30; i++) {
      const progress = i / 29;
      const randomVariation = 0.8 + Math.random() * 0.4; // 80-120% of expected
      const dailyPlays = Math.floor(actualPlays * progress * randomVariation);
      dailyData.push({
        day: i + 1,
        plays: Math.max(0, dailyPlays)
      });
    }
    
    return {
      plays: actualPlays,
      placements: actualPlacements,
      dailyData
    };
  };

  const chartData = getChartData();

  if (!currentTrack) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Choose Campaign Package – Fasho.co</title>
      </Head>
      <main className="min-h-screen bg-black text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-12">
            Step 2: Choose your campaign for <span className="text-[#59e3a5]">60% OFF</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left side - Package selection */}
            <div className="space-y-8">
              {/* Package cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => handlePackageSelect(pkg.id)}
                    className={`relative cursor-pointer rounded-xl p-6 border-2 transition-all duration-300 ${
                      selectedPackage === pkg.id
                        ? 'border-[#59e3a5] bg-[#59e3a5]/5'
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    {selectedPackage === pkg.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#59e3a5] rounded-full flex items-center justify-center">
                        <span className="text-black text-sm font-bold">✓</span>
                      </div>
                    )}
                    
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
                      <span className="text-2xl font-bold">${pkg.price}</span>
                    </div>
                  </div>
                ))}
              </div>

                             {/* Chart section */}
               <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                 <h3 className="text-lg font-semibold mb-4">Based on past campaigns</h3>
                 
                 {selectedPackage ? (
                   <div className="space-y-6">
                     <div className="flex justify-between items-center">
                       <div>
                         <div className="text-sm text-white/70">Expected Total Plays</div>
                         <div className="text-2xl font-bold text-[#59e3a5]">{chartData.plays.toLocaleString()}</div>
                       </div>
                       <div>
                         <div className="text-sm text-white/70">Playlist Placements</div>
                         <div className="text-2xl font-bold text-[#14c0ff]">{chartData.placements}</div>
                       </div>
                     </div>
                     
                     <div className="relative">
                       <div className="text-sm text-white/70 mb-3">30-Day Growth Projection</div>
                       <div className="relative h-32 bg-black/20 rounded-lg p-4">
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
                           {chartData.dailyData.length > 0 && (
                             <path
                               d={`M 0 100 ${chartData.dailyData.map((point, index) => {
                                 const x = (index / (chartData.dailyData.length - 1)) * 300;
                                 const y = 100 - (point.plays / chartData.plays) * 80;
                                 return `L ${x} ${y}`;
                               }).join(' ')} L 300 100 Z`}
                               fill="url(#areaGradient)"
                             />
                           )}
                           
                           {/* Main line */}
                           {chartData.dailyData.length > 0 && (
                             <path
                               d={`M ${chartData.dailyData.map((point, index) => {
                                 const x = (index / (chartData.dailyData.length - 1)) * 300;
                                 const y = 100 - (point.plays / chartData.plays) * 80;
                                 return `${x} ${y}`;
                               }).join(' L ')}`}
                               fill="none"
                               stroke="url(#lineGradient)"
                               strokeWidth="2"
                               className="drop-shadow-sm"
                             />
                           )}
                         </svg>
                         
                         {/* Y-axis labels */}
                         <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-white/50 -ml-8">
                           <span>{chartData.plays.toLocaleString()}</span>
                           <span>{Math.floor(chartData.plays * 0.5).toLocaleString()}</span>
                           <span>0</span>
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
                 ) : (
                   <div className="text-center py-8 text-white/50">
                     Select a package to see performance projections
                   </div>
                 )}
               </div>

              
            </div>

            {/* Right side - Album art and track info */}
            <div className="text-center">
              <div className="mb-6">
                <p className="text-white/70 mb-2">
                  Song {currentSongIndex + 1} of {tracks.length}
                </p>
                <div className="w-2 h-2 bg-[#59e3a5] rounded-full mx-auto"></div>
              </div>
              
              <div className="relative inline-block">
                <Image
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  width={400}
                  height={400}
                  className="rounded-2xl shadow-2xl mx-auto"
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
                   className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-8 py-4 rounded-md disabled:opacity-50 hover:opacity-90 transition-opacity text-lg"
                 >
                   {isLastSong || isOnlySong ? 'Next Step' : 'Next Song'} →
                 </button>
                 <button
                   onClick={handleChangeSong}
                   className="w-full bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-md hover:bg-white/20 transition-colors text-lg"
                 >
                   Change Songs
                 </button>
               </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 