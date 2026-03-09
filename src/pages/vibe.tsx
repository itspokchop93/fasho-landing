import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SalesBanner from '../components/SalesBanner';
import StepIndicator from '../components/StepIndicator';
import SalesPop from '../components/SalesPop';
import { GENRE_GROUPS, migrateGenres } from '../constants/genres';
import { Track } from '../types/track';
import { analytics } from '../utils/analytics';
import { createClient } from '../utils/supabase/client';

const GenreCloud = dynamic(() => import('../components/GenreCloud'), { ssr: false });
const GenreCloudMobile = dynamic(() => import('../components/GenreCloudMobile'), { ssr: false });

export default function VibePage() {
  const router = useRouter();
  const supabase = createClient();
  const tracksParam = router.query.tracks as string;
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const profileGenresFetched = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;

    if (tracksParam && typeof tracksParam === 'string') {
      try {
        const parsedTracks = JSON.parse(tracksParam) as Track[];
        setTracks(parsedTracks);
      } catch (error) {
        console.error('Failed to parse tracks:', error);
        router.push('/add');
      }
    } else {
      router.push('/add');
    }

    // Priority: sessionStorage (current session edits) > user profile (saved from last order)
    const savedGenres = sessionStorage.getItem('selectedVibes');
    if (savedGenres) {
      try {
        const parsed = JSON.parse(savedGenres);
        if (parsed.length > 0) {
          const migrated = migrateGenres(parsed);
          if (migrated.length > 0) {
            setSelectedGenres(migrated);
            sessionStorage.setItem('selectedVibes', JSON.stringify(migrated));
            return;
          }
        }
      } catch {
        // fall through to profile fetch
      }
    }

    // No session data — try fetching from user profile
    if (!profileGenresFetched.current) {
      profileGenresFetched.current = true;
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const res = await fetch('/api/user-profile');
          if (!res.ok) return;
          const data = await res.json();
          const profileGenre = data.profile?.music_genre;
          if (profileGenre && typeof profileGenre === 'string' && profileGenre.trim()) {
            const rawGenres = profileGenre.split(',').map((g: string) => g.trim()).filter(Boolean);
            const migrated = migrateGenres(rawGenres);
            if (migrated.length > 0) {
              setSelectedGenres(migrated);
              sessionStorage.setItem('selectedVibes', JSON.stringify(migrated));
            }
          }
        } catch {
          // guest user or fetch failed — no pre-fill
        }
      })();
    }
  }, [router.isReady, tracksParam]);

  const handleSelectionChange = useCallback((selected: string[]) => {
    setSelectedGenres(selected);
    sessionStorage.setItem('selectedVibes', JSON.stringify(selected));
  }, []);

  const handleContinue = async () => {
    if (selectedGenres.length === 0) return;
    setIsLoading(true);

    const genreString = selectedGenres.join(', ');
    sessionStorage.setItem('selectedVibes', JSON.stringify(selectedGenres));

    // Sync updated genres to user profile if logged in
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch('/api/sync-user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ music_genre: genreString }),
        }).catch(() => {});
      }
    } catch {
      // not logged in — will sync at checkout
    }

    analytics.track('vibe_step_completed', {
      genres_selected: selectedGenres,
      genre_count: selectedGenres.length,
      song_count: tracks.length,
    });

    const currentParams = new URLSearchParams(window.location.search);
    const preservedParams: Record<string, string> = {};
    ['gclid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(key => {
      const val = currentParams.get(key);
      if (val) preservedParams[key] = val;
    });

    router.push({
      pathname: '/packages',
      query: {
        tracks: JSON.stringify(tracks),
        ...preservedParams,
      },
    });
  };

  return (
    <>
      <Head>
        <title>Select Your Vibe | FASHO</title>
        <meta name="description" content="Choose the genres and vibes that best describe your music style." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      <SalesBanner />
      <SalesPop />
      <Header transparent={true} />

      <main className="relative min-h-screen bg-black text-white pt-24 pb-16 md:pt-28 md:pb-24 px-4 flex flex-col items-center overflow-hidden">
        {/* Background gradient blobs */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              width: '120vw',
              height: '100vh',
              background: 'radial-gradient(ellipse at center, rgba(89, 227, 165, 0.08) 0%, rgba(20, 192, 255, 0.06) 40%, rgba(139, 92, 246, 0.05) 70%, transparent 100%)',
            }}
          />
          <div
            className="absolute top-1/3 left-1/4 rounded-full blur-2xl"
            style={{
              width: '60vw',
              height: '60vh',
              background: 'radial-gradient(ellipse at center, rgba(20, 192, 255, 0.06) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 rounded-full blur-2xl"
            style={{
              width: '50vw',
              height: '50vh',
              background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Grid overlay across the full page */}
        <div
          className="fixed inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 w-full flex flex-col items-center">
          <StepIndicator currentStep={2} className="pb-4 sm:pb-6 md:pb-8" />

          <h1
            className="font-extrabold text-center mb-1.5 sm:mb-2 md:mb-3 mt-1 sm:mt-0 md:-mt-2 leading-tight"
            style={{ fontSize: 'clamp(1.85rem, 6vw, 3rem)' }}
          >
            <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Select</span> Your Vibe
          </h1>

          <p
            className="text-gray-300 text-center mb-4 sm:mb-3 md:mb-4 max-w-xl px-2"
            style={{ fontSize: 'clamp(0.8rem, 2.5vw, 1.125rem)' }}
          >
            Choose what best fits your sound. We'll find playlists that match.
          </p>

          {/* Desktop/large tablet: Canvas-based cloud */}
          <div className="hidden md:block w-full mx-auto px-2" style={{ maxWidth: '1100px' }}>
            <GenreCloud
              groups={GENRE_GROUPS}
              selectedGenres={selectedGenres}
              onSelectionChange={handleSelectionChange}
              canvasHeight="480px"
            />
          </div>

          {/* Mobile/small tablet: Pill group layout */}
          <div className="block md:hidden w-full max-w-lg mx-auto px-1">
            <GenreCloudMobile
              groups={GENRE_GROUPS}
              selectedGenres={selectedGenres}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          <div className="mt-5 sm:mt-6 w-full max-w-2xl mx-auto flex flex-col items-center gap-3 sm:gap-4 px-2">
            <button
              onClick={handleContinue}
              disabled={selectedGenres.length === 0 || isLoading}
              className={`
                w-full max-w-md py-3.5 sm:py-4 rounded-xl font-bold transition-all duration-300
                ${selectedGenres.length > 0
                  ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-[#59e3a5]/20'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              `}
              style={{ fontSize: 'clamp(0.95rem, 3vw, 1.125rem)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin inline-block"></span>
                  Continuing...
                </span>
              ) : selectedGenres.length === 0 ? 'Select at least one vibe' : 'Continue to Campaign'}
            </button>

            {selectedGenres.length > 0 && (
              <p
                className="text-xs sm:text-sm text-gray-400 px-4 py-1.5 rounded-lg"
                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                <span className="font-bold">{selectedGenres.length}</span> vibe{selectedGenres.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
