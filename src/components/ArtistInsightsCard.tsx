import React, { useState, useEffect } from 'react';

interface ArtistInsightsData {
  name: string;
  imageUrl: string;
  followersCount: number;
  genres: string[];
  monthlyListeners?: number;
  worldRank?: number;
  topCities?: Array<{ country: string; city: string; numberOfListeners: number }>;
  topTracks?: Array<{ name: string; streamCount: number }>;
  verified?: boolean;
}

interface Props {
  artistData: ArtistInsightsData;
  isLoading?: boolean;
  isMobile?: boolean;
}

export default function ArtistInsightsCard({ artistData, isLoading = false, isMobile = false }: Props) {
  const [animatedFollowers, setAnimatedFollowers] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedListeners, setAnimatedListeners] = useState(0);

  // FASHO Popularity Index (FPI) v2
  // Multi-signal composite score using logarithmic normalization and dynamic weighting.
  // Signals: followers, monthly listeners, engagement ratio, world rank, top track streams, verified status.
  // v2 fixes: rank scoring uses gentler curve so top-500 artists aren't penalized,
  // engagement uses log normalization so mainstream artists with large passive audiences
  // aren't unfairly punished, and primary metrics (followers + listeners) carry more weight.
  const calculateFPI = (data: ArtistInsightsData): number => {
    const log10Safe = (n: number) => n > 0 ? Math.log10(n) : 0;

    const followerScore = data.followersCount > 0
      ? Math.min((log10Safe(data.followersCount) / log10Safe(80_000_000)) * 100, 100)
      : 0;

    const listenerScore = data.monthlyListeners && data.monthlyListeners > 0
      ? Math.min((log10Safe(data.monthlyListeners) / log10Safe(100_000_000)) * 100, 100)
      : null;

    // Log-based engagement curve: more forgiving for mainstream artists with large
    // passive listener bases. ratio 0.05 → ~46, 0.10 → ~61, 0.24 → ~82, 0.50 → 100.
    let engagementScore: number | null = null;
    if (data.monthlyListeners && data.monthlyListeners > 0 && data.followersCount > 0) {
      const ratio = data.followersCount / data.monthlyListeners;
      engagementScore = Math.min((log10Safe(ratio * 100 + 1) / log10Safe(51)) * 100, 100);
    }

    // Gentler rank curve: 100 - 12*log10(rank). Rank 1→100, 10→88, 100→76,
    // 207→72, 1K→64, 10K→52, 100K→40. Having any rank is a strong positive signal.
    const rankScore = data.worldRank && data.worldRank > 0
      ? Math.max(100 - 12 * log10Safe(data.worldRank), 0)
      : null;

    const topStreams = data.topTracks && data.topTracks.length > 0
      ? Math.max(...data.topTracks.map(t => t.streamCount || 0))
      : 0;
    const streamScore = topStreams > 0
      ? Math.min((log10Safe(topStreams) / log10Safe(3_000_000_000)) * 100, 100)
      : null;

    // Primary metrics (followers + listeners) carry 70% combined weight;
    // supplementary signals (engagement, rank, streams) carry 30%.
    const components: { score: number; baseWeight: number }[] = [
      { score: followerScore, baseWeight: 35 },
    ];
    if (listenerScore !== null) components.push({ score: listenerScore, baseWeight: 35 });
    if (engagementScore !== null) components.push({ score: engagementScore, baseWeight: 10 });
    if (rankScore !== null) components.push({ score: rankScore, baseWeight: 10 });
    if (streamScore !== null) components.push({ score: streamScore, baseWeight: 10 });

    const totalWeight = components.reduce((sum, c) => sum + c.baseWeight, 0);
    const weightedSum = components.reduce((sum, c) => sum + (c.score * (c.baseWeight / totalWeight)), 0);

    const bonus = data.verified ? 2 : 0;

    return Math.min(Math.max(Math.round(weightedSum + bonus), 1), 100);
  };

  const getPopularityMessage = (score: number): string => {
    if (score <= 10) return "Every legend started exactly where you are!";
    if (score <= 20) return "You're building something special, keep creating!";
    if (score <= 30) return "Your unique sound is finding its audience!";
    if (score <= 40) return "You're ahead of most emerging artists!";
    if (score <= 50) return "You're in the rising artist category!";
    if (score <= 60) return "You've got solid traction going!";
    if (score <= 70) return "You're outperforming many established artists!";
    if (score <= 80) return "You're in rare company among artists!";
    if (score <= 90) return "You've reached elite artist status!";
    if (score <= 95) return "You're in the upper echelon of all artists!";
    return "You're among the most popular artists on the planet!";
  };

  const popularityPercentage = calculateFPI(artistData);
  const popularityMessage = getPopularityMessage(popularityPercentage);
  const score = popularityPercentage;

  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  useEffect(() => {
    if (isLoading) return;
    
    const duration = 2000;
    const frameRate = 60;
    const totalFrames = Math.round(duration / (1000 / frameRate));
    let currentFrame = 0;
    
    const animate = () => {
      currentFrame++;
      const progress = currentFrame / totalFrames;
      const easedProgress = easeOutCubic(progress);
      
      setAnimatedFollowers(Math.round(artistData.followersCount * easedProgress));
      setAnimatedScore(Math.round(score * easedProgress));
      if (artistData.monthlyListeners) {
        setAnimatedListeners(Math.round(artistData.monthlyListeners * easedProgress));
      }
      
      if (currentFrame < totalFrames) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedFollowers(artistData.followersCount);
        setAnimatedScore(score);
        if (artistData.monthlyListeners) {
          setAnimatedListeners(artistData.monthlyListeners);
        }
      }
    };
    
    const timeout = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [artistData.followersCount, artistData.monthlyListeners, score, isLoading]);

  const formatCount = (count: number): string => {
    if (count >= 1000000000) {
      return `${(count / 1000000000).toFixed(1)}B`;
    } else if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const hasEnhancedData = !!(artistData.monthlyListeners || artistData.worldRank || artistData.topTracks?.length);

  if (isLoading) {
    return (
      <div className="mb-2 animate-popdown w-full px-1" style={{ zIndex: 50 }}>
        <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[1px] rounded-2xl shadow-[0_8px_32px_0_rgba(20,192,255,0.35)]">
          <div className="bg-gradient-to-r from-[#23272f] to-[#1a1a2e] rounded-2xl p-6 w-full overflow-hidden">
            <div className="flex items-center mb-4">
              <div className="w-2 h-8 bg-gradient-to-b from-[#59e3a5] to-[#14c0ff] rounded-full mr-3"></div>
              <h3 className="text-white font-bold" style={{ fontSize: '1.25rem' }}>Artist Insights</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-8 relative">
              {/* Star fireworks container */}
              <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
                {/* Left side stars */}
                <div className="aic-star aic-star-1" style={{ left: '15%', top: '30%' }}></div>
                <div className="aic-star aic-star-2" style={{ left: '10%', top: '50%' }}></div>
                <div className="aic-star aic-star-3" style={{ left: '20%', top: '65%' }}></div>
                <div className="aic-star aic-star-4" style={{ left: '25%', top: '20%' }}></div>
                <div className="aic-star aic-star-5" style={{ left: '8%', top: '75%' }}></div>
                <div className="aic-star aic-star-6" style={{ left: '30%', top: '45%' }}></div>
                {/* Right side stars */}
                <div className="aic-star aic-star-7" style={{ right: '15%', top: '25%' }}></div>
                <div className="aic-star aic-star-8" style={{ right: '10%', top: '55%' }}></div>
                <div className="aic-star aic-star-9" style={{ right: '22%', top: '70%' }}></div>
                <div className="aic-star aic-star-10" style={{ right: '18%', top: '15%' }}></div>
                <div className="aic-star aic-star-11" style={{ right: '8%', top: '40%' }}></div>
                <div className="aic-star aic-star-12" style={{ right: '28%', top: '60%' }}></div>
                {/* Center scattered */}
                <div className="aic-star aic-star-13" style={{ left: '35%', top: '15%' }}></div>
                <div className="aic-star aic-star-14" style={{ right: '35%', top: '80%' }}></div>
              </div>

              {/* Report icon with glow ring */}
              <div className="relative mb-5">
                <div className="aic-glow-ring"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#14c0ff]/20 border border-white/10 flex items-center justify-center backdrop-blur-sm" style={{ zIndex: 2 }}>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="url(#report-grad)" strokeWidth="1.5" strokeLinecap="round"/>
                    <rect x="9" y="3" width="6" height="4" rx="1" stroke="url(#report-grad)" strokeWidth="1.5"/>
                    <path d="M9 12h6M9 16h4" stroke="url(#report-grad)" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="16.5" cy="17.5" r="2.5" fill="url(#report-grad2)" opacity="0.8"/>
                    <path d="M15.5 17.5l0.7 0.7 1.3-1.4" stroke="#23272f" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="report-grad" x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#59e3a5"/>
                        <stop offset="0.5" stopColor="#14c0ff"/>
                        <stop offset="1" stopColor="#8b5cf6"/>
                      </linearGradient>
                      <linearGradient id="report-grad2" x1="14" y1="15" x2="19" y2="20" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#59e3a5"/>
                        <stop offset="1" stopColor="#14c0ff"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <p className="text-gray-200 font-semibold text-center" style={{ fontSize: '0.95rem', letterSpacing: '0.01em' }}>
                Our AI is calculating your popularity score...
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <div className="w-1.5 h-1.5 bg-[#59e3a5] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-[#14c0ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
        <style jsx>{`
          .aic-glow-ring {
            position: absolute;
            inset: -8px;
            border-radius: 20px;
            background: conic-gradient(from 0deg, #59e3a5, #14c0ff, #8b5cf6, #59e3a5);
            opacity: 0.25;
            animation: aic-ring-spin 4s linear infinite;
            filter: blur(8px);
            z-index: 1;
          }
          @keyframes aic-ring-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .aic-star {
            position: absolute;
            width: 3px;
            height: 3px;
            border-radius: 50%;
          }
          .aic-star::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: inherit;
            box-shadow: 0 0 4px 1px currentColor;
          }
          .aic-star-1 { background: #59e3a5; color: #59e3a5; animation: aic-burst-tl 2.4s ease-out infinite; }
          .aic-star-2 { background: #14c0ff; color: #14c0ff; animation: aic-burst-l 2.8s ease-out 0.3s infinite; width: 2px; height: 2px; }
          .aic-star-3 { background: #8b5cf6; color: #8b5cf6; animation: aic-burst-bl 2.1s ease-out 0.6s infinite; }
          .aic-star-4 { background: #14c0ff; color: #14c0ff; animation: aic-burst-tl 3.0s ease-out 0.2s infinite; width: 2px; height: 2px; }
          .aic-star-5 { background: #59e3a5; color: #59e3a5; animation: aic-burst-l 2.5s ease-out 0.8s infinite; width: 2px; height: 2px; }
          .aic-star-6 { background: #8b5cf6; color: #8b5cf6; animation: aic-burst-tl 2.2s ease-out 1.0s infinite; width: 2px; height: 2px; }
          .aic-star-7 { background: #59e3a5; color: #59e3a5; animation: aic-burst-tr 2.6s ease-out 0.1s infinite; }
          .aic-star-8 { background: #8b5cf6; color: #8b5cf6; animation: aic-burst-r 2.3s ease-out 0.5s infinite; width: 2px; height: 2px; }
          .aic-star-9 { background: #14c0ff; color: #14c0ff; animation: aic-burst-br 2.7s ease-out 0.4s infinite; }
          .aic-star-10 { background: #59e3a5; color: #59e3a5; animation: aic-burst-tr 2.0s ease-out 0.7s infinite; width: 2px; height: 2px; }
          .aic-star-11 { background: #14c0ff; color: #14c0ff; animation: aic-burst-r 2.9s ease-out 0.9s infinite; }
          .aic-star-12 { background: #8b5cf6; color: #8b5cf6; animation: aic-burst-br 2.4s ease-out 0.15s infinite; width: 2px; height: 2px; }
          .aic-star-13 { background: #59e3a5; color: #59e3a5; animation: aic-burst-tl 3.1s ease-out 0.55s infinite; width: 2px; height: 2px; }
          .aic-star-14 { background: #14c0ff; color: #14c0ff; animation: aic-burst-br 2.2s ease-out 1.1s infinite; width: 2px; height: 2px; }

          @keyframes aic-burst-tl {
            0% { opacity: 0; transform: translate(0, 0) scale(0); }
            15% { opacity: 1; transform: translate(-3px, -2px) scale(1.2); }
            60% { opacity: 0.6; transform: translate(-12px, -14px) scale(0.8); }
            100% { opacity: 0; transform: translate(-20px, -24px) scale(0); }
          }
          @keyframes aic-burst-tr {
            0% { opacity: 0; transform: translate(0, 0) scale(0); }
            15% { opacity: 1; transform: translate(3px, -2px) scale(1.2); }
            60% { opacity: 0.6; transform: translate(12px, -14px) scale(0.8); }
            100% { opacity: 0; transform: translate(20px, -24px) scale(0); }
          }
          @keyframes aic-burst-l {
            0% { opacity: 0; transform: translate(0, 0) scale(0); }
            15% { opacity: 1; transform: translate(-2px, 0) scale(1.1); }
            60% { opacity: 0.5; transform: translate(-16px, -4px) scale(0.7); }
            100% { opacity: 0; transform: translate(-26px, -8px) scale(0); }
          }
          @keyframes aic-burst-r {
            0% { opacity: 0; transform: translate(0, 0) scale(0); }
            15% { opacity: 1; transform: translate(2px, 0) scale(1.1); }
            60% { opacity: 0.5; transform: translate(16px, -4px) scale(0.7); }
            100% { opacity: 0; transform: translate(26px, -8px) scale(0); }
          }
          @keyframes aic-burst-bl {
            0% { opacity: 0; transform: translate(0, 0) scale(0); }
            15% { opacity: 1; transform: translate(-3px, 2px) scale(1.2); }
            60% { opacity: 0.6; transform: translate(-10px, 10px) scale(0.6); }
            100% { opacity: 0; transform: translate(-18px, 18px) scale(0); }
          }
          @keyframes aic-burst-br {
            0% { opacity: 0; transform: translate(0, 0) scale(0); }
            15% { opacity: 1; transform: translate(3px, 2px) scale(1.2); }
            60% { opacity: 0.6; transform: translate(10px, 10px) scale(0.6); }
            100% { opacity: 0; transform: translate(18px, 18px) scale(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mb-2 animate-popdown w-full px-1" style={{ zIndex: 50 }}>
      <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[1px] rounded-2xl shadow-[0_8px_32px_0_rgba(20,192,255,0.35)]">
        <div className="bg-gradient-to-r from-[#23272f] to-[#1a1a2e] rounded-2xl p-6 w-full overflow-visible" style={{ zIndex: 51 }}>
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="w-2 h-8 bg-gradient-to-b from-[#59e3a5] to-[#14c0ff] rounded-full mr-3" style={{ zIndex: 52 }}></div>
            <h3 className="text-white font-bold" style={{ fontSize: '1.25rem', zIndex: 52 }}>Artist Insights</h3>
            {artistData.verified && (
              <span className="ml-2 text-[#14c0ff]" title="Verified Artist">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </span>
            )}
          </div>

          {isMobile ? (
            <>
              {/* Mobile: Artist Profile */}
              <div className="flex flex-col items-center text-center mb-5" style={{ zIndex: 52 }}>
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
                </div>
              </div>

              {/* Mobile: Stats — Followers | Listeners | Popularity */}
              <div className="grid grid-cols-3 gap-2 mb-5" style={{ zIndex: 52 }}>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <div className="text-[#59e3a5] font-bold text-center" style={{ fontSize: '1rem' }}>
                    {formatCount(animatedFollowers)}
                  </div>
                  <div className="text-gray-400 text-center" style={{ fontSize: '0.65rem' }}>Followers</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <div className="text-[#14c0ff] font-bold text-center" style={{ fontSize: '1rem' }}>
                    {hasEnhancedData && artistData.monthlyListeners ? formatCount(animatedListeners) : '—'}
                  </div>
                  <div className="text-gray-400 text-center whitespace-nowrap" style={{ fontSize: '0.55rem' }}>Monthly Listeners</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <div className="text-[#8b5cf6] font-bold text-center" style={{ fontSize: '1rem' }}>
                    {animatedScore}/100
                  </div>
                  <div className="text-gray-400 text-center" style={{ fontSize: '0.65rem' }}>Popularity</div>
                </div>
              </div>

              {/* Mobile: Top Cities + World Ranking */}
              {hasEnhancedData && (artistData.topCities?.length || artistData.worldRank) ? (
                artistData.worldRank ? (
                  /* Has world rank — split row: compact cities list + rank */
                  <div className="grid grid-cols-2 gap-2 mb-5" style={{ zIndex: 52 }}>
                    {artistData.topCities && artistData.topCities.length > 0 && (
                      <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                        <div className="text-white font-bold mb-1.5" style={{ fontSize: '0.7rem' }}>Your Top Cities</div>
                        <div className="space-y-1">
                          {artistData.topCities.slice(0, 3).map((city, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                                <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" fill={idx === 0 ? '#8b5cf6' : idx === 1 ? '#14c0ff' : '#59e3a5'}/>
                                <circle cx="8" cy="6" r="1.5" fill="#23272f"/>
                              </svg>
                              <span className="font-medium truncate whitespace-nowrap text-white" style={{ fontSize: '0.6rem' }}>{city.city}</span>
                              <span className="text-gray-600 flex-shrink-0" style={{ fontSize: '0.35rem' }}>&#x2022;</span>
                              <span className="text-gray-500 whitespace-nowrap flex-shrink-0" style={{ fontSize: '0.55rem' }}>{formatCount(city.numberOfListeners)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="bg-white/5 rounded-xl border border-white/10 relative overflow-hidden h-full">
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]" style={{ width: '160%', height: '160%' }} viewBox="0 0 100 100" fill="none" preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id="globe-grad-m" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#c0c0c0"/>
                            <stop offset="0.3" stopColor="#e8e8e8"/>
                            <stop offset="0.5" stopColor="#ffffff"/>
                            <stop offset="0.7" stopColor="#d4d4d4"/>
                            <stop offset="1" stopColor="#a0a0a0"/>
                          </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="44" stroke="url(#globe-grad-m)" strokeWidth="2.5" fill="none"/>
                        <ellipse cx="50" cy="50" rx="22" ry="44" stroke="url(#globe-grad-m)" strokeWidth="1.5" fill="none"/>
                        <ellipse cx="50" cy="50" rx="36" ry="44" stroke="url(#globe-grad-m)" strokeWidth="1" fill="none"/>
                        <line x1="6" y1="50" x2="94" y2="50" stroke="url(#globe-grad-m)" strokeWidth="1.5"/>
                        <line x1="50" y1="6" x2="50" y2="94" stroke="url(#globe-grad-m)" strokeWidth="1"/>
                        <path d="M14 30 Q50 30 86 30" stroke="url(#globe-grad-m)" strokeWidth="1"/>
                        <path d="M14 70 Q50 70 86 70" stroke="url(#globe-grad-m)" strokeWidth="1"/>
                      </svg>
                      <div className="relative flex flex-col justify-center items-center text-center h-full p-2.5" style={{ zIndex: 2 }}>
                        <div className="text-white font-bold" style={{ fontSize: '0.7rem' }}>Your World Ranking</div>
                        <div className="text-yellow-400 font-black my-auto py-1" style={{ fontSize: '1.7rem', lineHeight: 1 }}>
                          #{artistData.worldRank.toLocaleString()}
                        </div>
                        <div className="text-gray-500" style={{ fontSize: '0.55rem' }}>Global Artist Rank</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No world rank — centered city boxes, bigger text */
                  artistData.topCities && artistData.topCities.length > 0 ? (
                    <div className="mb-5" style={{ zIndex: 52 }}>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="text-white font-bold text-center mb-3" style={{ fontSize: '0.85rem' }}>Your Top Cities</div>
                        <div className="grid grid-cols-3 gap-2">
                          {artistData.topCities.slice(0, 3).map((city, idx) => {
                            const pinColors = ['#8b5cf6', '#14c0ff', '#59e3a5'];
                            return (
                              <div key={idx} className="bg-white/5 rounded-lg p-2.5 border border-white/[0.07] text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" fill={pinColors[idx]}/>
                                    <circle cx="8" cy="6" r="1.5" fill="#23272f"/>
                                  </svg>
                                  <span className="font-semibold truncate text-white" style={{ fontSize: '0.85rem' }}>
                                    {city.city}
                                  </span>
                                </div>
                                <div className="text-gray-400 mt-0.5" style={{ fontSize: '0.65rem' }}>
                                  {formatCount(city.numberOfListeners)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null
                )
              ) : null}
            </>
          ) : (
            /* Desktop Layout */
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {/* Artist avatar + name */}
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
                    <div className="text-gray-400 text-left" style={{ fontSize: '0.8rem', zIndex: 52 }}>
                      Artist
                    </div>
                  </div>
                </div>

                {/* Stat boxes: Followers | Listeners | Popularity */}
                <div className="grid grid-cols-3 gap-2" style={{ zIndex: 52 }}>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-[#59e3a5] font-bold text-center whitespace-nowrap" style={{ fontSize: '1.1rem' }}>
                      {formatCount(animatedFollowers)}
                    </div>
                    <div className="text-gray-400 text-center whitespace-nowrap" style={{ fontSize: '0.7rem' }}>Followers</div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-[#14c0ff] font-bold text-center whitespace-nowrap" style={{ fontSize: '1.1rem' }}>
                      {hasEnhancedData && artistData.monthlyListeners ? formatCount(animatedListeners) : '—'}
                    </div>
                    <div className="text-gray-400 text-center whitespace-nowrap" style={{ fontSize: '0.6rem' }}>Monthly Listeners</div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-[#8b5cf6] font-bold text-center whitespace-nowrap" style={{ fontSize: '1.1rem' }}>
                      {animatedScore}/100
                    </div>
                    <div className="text-gray-400 text-center whitespace-nowrap" style={{ fontSize: '0.7rem' }}>Popularity</div>
                  </div>
                </div>
              </div>

              {/* Desktop: Top Cities + World Ranking — split row */}
              {hasEnhancedData && (artistData.topCities?.length || artistData.worldRank) ? (
                <div className={`grid ${artistData.topCities?.length && artistData.worldRank ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-5`} style={{ zIndex: 52 }}>
                  {/* Top Cities */}
                  {artistData.topCities && artistData.topCities.length > 0 && (() => {
                    const hasRank = !!artistData.worldRank;
                    return (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-white font-bold mb-3" style={{ fontSize: hasRank ? '0.9rem' : '1.05rem' }}>Your Top Cities</div>
                      <div className="grid grid-cols-3 gap-2">
                        {artistData.topCities.slice(0, 3).map((city, idx) => {
                          const pinColors = ['#8b5cf6', '#14c0ff', '#59e3a5'];
                          return (
                            <div key={idx} className={`bg-white/5 rounded-lg ${hasRank ? 'p-2.5' : 'p-3'} border border-white/[0.07] text-center`}>
                              <div className="flex items-center justify-center gap-1">
                                <svg className={`${hasRank ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} viewBox="0 0 16 16" fill="none">
                                  <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" fill={pinColors[idx]}/>
                                  <circle cx="8" cy="6" r="1.5" fill="#23272f"/>
                                </svg>
                                <span className="font-semibold truncate text-white" style={{ fontSize: hasRank ? '0.8rem' : '0.95rem' }}>
                                  {city.city}
                                </span>
                              </div>
                              <div className="text-gray-400 mt-0.5" style={{ fontSize: hasRank ? '0.65rem' : '0.75rem' }}>
                                {formatCount(city.numberOfListeners)} listeners
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })()}

                  {/* World Ranking */}
                  {artistData.worldRank ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 relative overflow-hidden flex flex-col justify-center items-center text-center">
                      {/* Metallic globe background — centered behind the number */}
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]" width="220" height="220" viewBox="0 0 100 100" fill="none">
                        <defs>
                          <linearGradient id="globe-grad-d" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#b0b0b0"/>
                            <stop offset="0.2" stopColor="#e0e0e0"/>
                            <stop offset="0.4" stopColor="#ffffff"/>
                            <stop offset="0.55" stopColor="#f0f0f0"/>
                            <stop offset="0.7" stopColor="#d0d0d0"/>
                            <stop offset="0.85" stopColor="#b8b8b8"/>
                            <stop offset="1" stopColor="#909090"/>
                          </linearGradient>
                          <radialGradient id="globe-shine" cx="35%" cy="30%" r="50%">
                            <stop stopColor="#ffffff" stopOpacity="0.3"/>
                            <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
                          </radialGradient>
                        </defs>
                        <circle cx="50" cy="50" r="44" stroke="url(#globe-grad-d)" strokeWidth="2.5" fill="none"/>
                        <circle cx="50" cy="50" r="44" fill="url(#globe-shine)"/>
                        <ellipse cx="50" cy="50" rx="22" ry="44" stroke="url(#globe-grad-d)" strokeWidth="1.5" fill="none"/>
                        <ellipse cx="50" cy="50" rx="36" ry="44" stroke="url(#globe-grad-d)" strokeWidth="1" fill="none"/>
                        <line x1="6" y1="50" x2="94" y2="50" stroke="url(#globe-grad-d)" strokeWidth="1.5"/>
                        <line x1="50" y1="6" x2="50" y2="94" stroke="url(#globe-grad-d)" strokeWidth="1"/>
                        <path d="M12 32 Q50 28 88 32" stroke="url(#globe-grad-d)" strokeWidth="1"/>
                        <path d="M12 68 Q50 72 88 68" stroke="url(#globe-grad-d)" strokeWidth="1"/>
                      </svg>
                      <div className="relative" style={{ zIndex: 2 }}>
                        <div className="text-white font-bold mb-2" style={{ fontSize: '0.9rem' }}>Your World Ranking</div>
                        <div className="text-yellow-400 font-black" style={{ fontSize: '2.4rem', lineHeight: 1.1 }}>
                          #{artistData.worldRank.toLocaleString()}
                        </div>
                        <div className="text-gray-500 mt-1" style={{ fontSize: '0.7rem' }}>Global Artist Rank</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          {/* Popularity Meter */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10" style={{ zIndex: 52 }}>
            <div className={`${isMobile ? 'text-center mb-3' : 'flex items-center justify-between mb-3'}`}>
              <h4 className={`text-white font-semibold ${isMobile ? 'mb-1' : ''}`} style={{ fontSize: '1.125rem', zIndex: 52 }}>Popularity Meter</h4>
              <div className={`${isMobile ? 'text-center' : 'flex items-center'}`}>
                <p className="text-gray-500 italic" style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', zIndex: 52 }}>
                  Based on upcoming artists in your genre
                </p>
              </div>
            </div>

            <div className="relative mb-3 overflow-visible" style={{ zIndex: 52 }}>
              <div className="w-full h-4 bg-gray-700/50 rounded-full overflow-hidden relative" style={{ zIndex: 52 }}>
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ 
                    width: `${popularityPercentage}%`,
                    zIndex: 53,
                    background: 'linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%)'
                  }}
                >
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full"
                    style={{ animation: 'aic-shimmer 2s infinite', zIndex: 54 }}
                  ></div>
                </div>
                
                <div 
                  className="absolute inset-0 flex items-center justify-center text-white font-bold drop-shadow-lg"
                  style={{ fontSize: '0.75rem', zIndex: 55 }}
                >
                  {animatedScore}/100
                </div>
              </div>
              
              {popularityPercentage > 5 && (
                <div 
                  className="absolute top-2 pointer-events-none" 
                  style={{ left: `${popularityPercentage}%`, zIndex: 57 }}
                >
                  <div className="absolute w-1 h-1 bg-yellow-300 rounded-full" style={{ right: '2px', top: '-4px', animation: 'aic-sp1 1.5s infinite ease-out' }}></div>
                  <div className="absolute w-0.5 h-0.5 bg-orange-400 rounded-full" style={{ right: '1px', top: '4px', animation: 'aic-sp2 1.8s infinite ease-out' }}></div>
                  <div className="absolute w-1 h-1 bg-yellow-200 rounded-full" style={{ right: '3px', top: '1px', animation: 'aic-sp3 1.3s infinite ease-out' }}></div>
                  <div className="absolute w-0.5 h-0.5 bg-white rounded-full" style={{ right: '1px', top: '-2px', animation: 'aic-sp4 2.1s infinite ease-out' }}></div>
                  <div className="absolute w-0.5 h-0.5 bg-yellow-400 rounded-full" style={{ right: '4px', top: '3px', animation: 'aic-sp5 1.7s infinite ease-out' }}></div>
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-gray-300 font-medium italic" style={{ fontSize: '0.875rem', zIndex: 52 }}>
                {popularityMessage}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes aic-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes aic-sp1 {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          10% { opacity: 1; transform: translate(0, 0) scale(1); }
          70% { opacity: 0.8; transform: translate(8px, -6px) scale(0.5); }
          100% { opacity: 0; transform: translate(15px, -12px) scale(0); }
        }
        @keyframes aic-sp2 {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          15% { opacity: 1; transform: translate(0, 0) scale(1); }
          75% { opacity: 0.6; transform: translate(6px, 8px) scale(0.3); }
          100% { opacity: 0; transform: translate(12px, 15px) scale(0); }
        }
        @keyframes aic-sp3 {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          5% { opacity: 1; transform: translate(0, 0) scale(1); }
          65% { opacity: 0.9; transform: translate(10px, 2px) scale(0.4); }
          100% { opacity: 0; transform: translate(18px, 4px) scale(0); }
        }
        @keyframes aic-sp4 {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          20% { opacity: 1; transform: translate(0, 0) scale(1); }
          80% { opacity: 0.7; transform: translate(5px, -4px) scale(0.2); }
          100% { opacity: 0; transform: translate(10px, -8px) scale(0); }
        }
        @keyframes aic-sp5 {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          12% { opacity: 1; transform: translate(0, 0) scale(1); }
          72% { opacity: 0.5; transform: translate(9px, 7px) scale(0.6); }
          100% { opacity: 0; transform: translate(16px, 14px) scale(0); }
        }
      `}</style>
    </div>
  );
}
