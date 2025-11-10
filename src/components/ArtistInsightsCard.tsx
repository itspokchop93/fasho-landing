import React, { useState, useEffect } from 'react';

interface ArtistInsightsData {
  name: string;
  imageUrl: string;
  followersCount: number;
  genres: string[];
  popularity: number;
}

interface Props {
  artistData: ArtistInsightsData;
  isMobile?: boolean;
}

export default function ArtistInsightsCard({ artistData, isMobile = false }: Props) {
  // Animation states for count-up effects
  const [animatedFollowers, setAnimatedFollowers] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Calculate popularity percentage based on 25k followers max (internal logic)
  const calculatePopularityPercentage = (followers: number): number => {
    const maxFollowers = 25000;
    const percentage = Math.min((followers / maxFollowers) * 100, 100);
    return Math.max(percentage, 1); // Minimum 1% to show some progress
  };

  // Get encouraging message based on popularity percentage
  const getPopularityMessage = (percentage: number): string => {
    if (percentage <= 5) return "Every legend started exactly where you are!";
    if (percentage <= 10) return "You're building something special, keep creating!";
    if (percentage <= 20) return "Your unique sound is finding its audience!";
    if (percentage <= 30) return "You're ahead of most emerging artists!";
    if (percentage <= 40) return "You're in the rising artist category!";
    if (percentage <= 50) return "You've got solid fan engagement going!";
    if (percentage <= 60) return "You're outperforming many established artists already!";
    if (percentage <= 70) return "You're in rare company among artists!";
    if (percentage <= 80) return "You're among the top tier artists!";
    if (percentage <= 90) return "You've reached elite artist status!";
    if (percentage <= 95) return "You're in the upper echelon!";
    return "You're among the most popular artists!";
  };

  const popularityPercentage = calculatePopularityPercentage(artistData.followersCount);
  const popularityMessage = getPopularityMessage(popularityPercentage);
  const score = Math.round(popularityPercentage);

  // Easing function for smooth animation
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Count-up animation effect
  useEffect(() => {
    const duration = 2000; // 2 seconds for smooth animation
    const frameRate = 60; // 60fps
    const totalFrames = Math.round(duration / (1000 / frameRate));
    
    let currentFrame = 0;
    
    const animate = () => {
      currentFrame++;
      const progress = currentFrame / totalFrames;
      const easedProgress = easeOutCubic(progress);
      
      // Animate followers count
      const currentFollowers = Math.round(artistData.followersCount * easedProgress);
      setAnimatedFollowers(currentFollowers);
      
      // Animate score
      const currentScore = Math.round(score * easedProgress);
      setAnimatedScore(currentScore);
      
      if (currentFrame < totalFrames) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final values are exact
        setAnimatedFollowers(artistData.followersCount);
        setAnimatedScore(score);
      }
    };
    
    // Start animation after a brief delay for better UX
    const timeout = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [artistData.followersCount, score]);

  // Format follower count for display
  const formatFollowerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Get primary genre (first one, capitalized, or "Vibes" if none)
  const getPrimaryGenre = (genres: string[]): string => {
    if (genres.length === 0) return "Vibes";
    const primaryGenre = genres[0];
    // Capitalize first letter
    return primaryGenre.charAt(0).toUpperCase() + primaryGenre.slice(1).toLowerCase();
  };

  return (
    <div className="mb-2 animate-popdown w-full px-1" style={{ zIndex: 50 }}>
      <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[1px] rounded-2xl shadow-[0_8px_32px_0_rgba(20,192,255,0.35)]">
        <div className="bg-gradient-to-r from-[#23272f] to-[#1a1a2e] rounded-2xl p-6 w-full overflow-visible" style={{ zIndex: 51 }}>
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="w-2 h-8 bg-gradient-to-b from-[#59e3a5] to-[#14c0ff] rounded-full mr-3" style={{ zIndex: 52 }}></div>
            <h3 className="text-white font-bold text-xl" style={{ zIndex: 52 }}>Artist Insights</h3>
          </div>

          {/* Mobile vs Desktop Layout */}
          {isMobile ? (
            <>
              {/* Mobile: Artist Profile Row - Centered */}
              <div className="flex flex-col items-center text-center mb-6" style={{ zIndex: 52 }}>
                <img
                  src={artistData.imageUrl}
                  alt={artistData.name}
                  className="w-20 h-20 rounded-full object-cover shadow-md border border-white/10 mb-2"
                  style={{ zIndex: 53 }}
                />
                <div className="w-full">
                  <div className="font-semibold text-white text-center truncate" style={{ fontSize: '1.3rem', zIndex: 52 }}>
                    {artistData.name}
                  </div>
                  {/* Hide "Artist" label on mobile */}
                </div>
              </div>

              {/* Mobile: Stats Layout - Genre on top row, Followers and Popularity on second row */}
              <div className="space-y-2 mb-6" style={{ zIndex: 52 }}>
                {/* Genre - Full width on its own row */}
                <div className="bg-white/5 rounded-xl p-2 border border-white/10 w-full" style={{ zIndex: 52 }}>
                  <div className="text-[#14c0ff] font-bold text-base text-center truncate" style={{ zIndex: 52 }}>
                    {getPrimaryGenre(artistData.genres)}
                  </div>
                  <div className="text-gray-400 text-xs text-center" style={{ zIndex: 52 }}>
                    Genre
                  </div>
                </div>

                {/* Followers and Popularity - Side by side on second row */}
                <div className="grid grid-cols-2 gap-2" style={{ zIndex: 52 }}>
                  {/* Followers */}
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10" style={{ zIndex: 52 }}>
                    <div className="text-[#59e3a5] font-bold text-base text-center" style={{ zIndex: 52 }}>
                      {formatFollowerCount(animatedFollowers)}
                    </div>
                    <div className="text-gray-400 text-xs text-center" style={{ zIndex: 52 }}>
                      Followers
                    </div>
                  </div>

                  {/* Popularity Score */}
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10" style={{ zIndex: 52 }}>
                    <div className="text-[#8b5cf6] font-bold text-base text-center" style={{ zIndex: 52 }}>
                      {animatedScore}/100
                    </div>
                    <div className="text-gray-400 text-xs text-center" style={{ zIndex: 52 }}>
                      Popularity
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Desktop: Original Grid Layout */
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Artist Profile */}
              <div className="flex items-center space-x-3" style={{ zIndex: 52 }}>
                <img
                  src={artistData.imageUrl}
                  alt={artistData.name}
                  className="w-16 h-16 rounded-full object-cover shadow-md border border-white/10"
                  style={{ zIndex: 53 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-left truncate" style={{ fontSize: '1.3rem', zIndex: 52 }}>
                    {artistData.name}
                  </div>
                  <div className="text-gray-300 text-left text-sm" style={{ zIndex: 52 }}>
                    Artist
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3" style={{ zIndex: 52 }}>
                {/* Followers */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10" style={{ zIndex: 52 }}>
                  <div className="text-[#59e3a5] font-bold text-lg text-center" style={{ zIndex: 52 }}>
                    {formatFollowerCount(animatedFollowers)}
                  </div>
                  <div className="text-gray-400 text-xs text-center" style={{ zIndex: 52 }}>
                    Followers
                  </div>
                </div>

                {/* Genre */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10" style={{ zIndex: 52 }}>
                  <div className="text-[#14c0ff] font-bold text-lg text-center truncate" style={{ zIndex: 52 }}>
                    {getPrimaryGenre(artistData.genres)}
                  </div>
                  <div className="text-gray-400 text-xs text-center" style={{ zIndex: 52 }}>
                    Genre
                  </div>
                </div>

                {/* Popularity Score */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10" style={{ zIndex: 52 }}>
                  <div className="text-[#8b5cf6] font-bold text-lg text-center" style={{ zIndex: 52 }}>
                    {animatedScore}/100
                  </div>
                  <div className="text-gray-400 text-xs text-center" style={{ zIndex: 52 }}>
                    Popularity
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Popularity Meter */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10" style={{ zIndex: 52 }}>
            {/* Meter Title */}
            <div className={`${isMobile ? 'text-center mb-3' : 'flex items-center justify-between mb-3'}`}>
              <h4 className={`text-white font-semibold text-lg ${isMobile ? 'mb-1' : ''}`} style={{ zIndex: 52 }}>Popularity Meter 🎉</h4>
              <div className={`${isMobile ? 'text-center' : 'flex items-center'}`}>
                <p className={`text-gray-500 italic ${isMobile ? 'text-[10px]' : 'text-xs'}`} style={{ zIndex: 52 }}>
                  Based on upcoming artists in your genre
                </p>
              </div>
            </div>

            {/* Progress Bar Container */}
            <div className="relative mb-3 overflow-visible" style={{ zIndex: 52 }}>
              {/* Background Bar */}
              <div className="w-full h-4 bg-gray-700/50 rounded-full overflow-hidden relative" style={{ zIndex: 52 }}>
                {/* Gradient Progress Bar */}
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ 
                    width: `${popularityPercentage}%`,
                    zIndex: 53,
                    background: 'linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%)'
                  }}
                >
                  {/* Shimmer effect - constrained to filled bar only */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"
                    style={{ 
                      animation: 'shimmer 2s infinite',
                      zIndex: 54
                    }}
                  ></div>
                </div>
                
                {/* Score text overlay */}
                <div 
                  className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow-lg"
                  style={{ zIndex: 55 }}
                >
                  {animatedScore}/100
                </div>
              </div>
              
              {/* Sparks positioned completely outside the progress bar */}
              {popularityPercentage > 5 && (
                <div 
                  className="absolute top-2 pointer-events-none" 
                  style={{ 
                    left: `${popularityPercentage}%`,
                    zIndex: 57 
                  }}
                >
                  {/* Spark 1 */}
                  <div 
                    className="absolute w-1 h-1 bg-yellow-300 rounded-full spark-1"
                    style={{
                      right: '2px',
                      top: '-4px',
                      animation: 'spark1 1.5s infinite ease-out'
                    }}
                  ></div>
                  {/* Spark 2 */}
                  <div 
                    className="absolute w-0.5 h-0.5 bg-orange-400 rounded-full spark-2"
                    style={{
                      right: '1px',
                      top: '4px',
                      animation: 'spark2 1.8s infinite ease-out'
                    }}
                  ></div>
                  {/* Spark 3 */}
                  <div 
                    className="absolute w-1 h-1 bg-yellow-200 rounded-full spark-3"
                    style={{
                      right: '3px',
                      top: '1px',
                      animation: 'spark3 1.3s infinite ease-out'
                    }}
                  ></div>
                  {/* Spark 4 */}
                  <div 
                    className="absolute w-0.5 h-0.5 bg-white rounded-full spark-4"
                    style={{
                      right: '1px',
                      top: '-2px',
                      animation: 'spark4 2.1s infinite ease-out'
                    }}
                  ></div>
                  {/* Spark 5 */}
                  <div 
                    className="absolute w-0.5 h-0.5 bg-yellow-400 rounded-full spark-5"
                    style={{
                      right: '4px',
                      top: '3px',
                      animation: 'spark5 1.7s infinite ease-out'
                    }}
                  ></div>
                </div>
              )}
            </div>

            {/* Encouraging Message */}
            <div className="text-center">
              <p className="text-gray-300 text-sm font-medium italic" style={{ zIndex: 52 }}>
                {popularityMessage}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shimmer and Spark animation styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        @keyframes spark1 {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          10% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          70% {
            opacity: 0.8;
            transform: translate(8px, -6px) scale(0.5);
          }
          100% {
            opacity: 0;
            transform: translate(15px, -12px) scale(0);
          }
        }
        
        @keyframes spark2 {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          15% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          75% {
            opacity: 0.6;
            transform: translate(6px, 8px) scale(0.3);
          }
          100% {
            opacity: 0;
            transform: translate(12px, 15px) scale(0);
          }
        }
        
        @keyframes spark3 {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          5% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          65% {
            opacity: 0.9;
            transform: translate(10px, 2px) scale(0.4);
          }
          100% {
            opacity: 0;
            transform: translate(18px, 4px) scale(0);
          }
        }
        
        @keyframes spark4 {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          20% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          80% {
            opacity: 0.7;
            transform: translate(5px, -4px) scale(0.2);
          }
          100% {
            opacity: 0;
            transform: translate(10px, -8px) scale(0);
          }
        }
        
        @keyframes spark5 {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0);
          }
          12% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          72% {
            opacity: 0.5;
            transform: translate(9px, 7px) scale(0.6);
          }
          100% {
            opacity: 0;
            transform: translate(16px, 14px) scale(0);
          }
        }
      `}</style>
    </div>
  );
}