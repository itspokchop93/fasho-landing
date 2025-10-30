import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TrackCard from "../components/TrackCard";
import ArtistInsightsCard from "../components/ArtistInsightsCard";
import ShapeDivider from "../components/ShapeDivider";
import SplitText from "../components/SplitText";
import ScrollFloat from "../components/ScrollFloat";
import Particles from "../components/Particles";
import { Track } from "../types/track";
import { createClient } from '../utils/supabase/client';
import HeroParticles from '../components/HeroParticles';
import GlareHover from '../components/GlareHover';
import SalesBanner from '../components/SalesBanner';
import SalesPop from '../components/SalesPop';
import Lottie from 'lottie-react';
import * as gtag from '../utils/gtag';
import { fetchSiteSettings, SiteSettings, defaultSiteSettings } from '../utils/siteSettings';

// CSS for responsive font sizing
const responsiveFontStyles = `
  .text-base-mobile-lg-desktop {
    font-size: 1.6rem;
  }
  @media (min-width: 1024px) {
    .text-base-mobile-lg-desktop {
      font-size: calc(1.6rem + 0.25rem);
  }
  }
  
  /* CTA Button spacing - MOBILE ONLY */
  .cta-button-spacing {
    margin-bottom: 5px;
    padding-bottom: 5px;
  }
  @media (min-width: 640px) {
    .cta-button-spacing {
      margin-bottom: 0px;
      padding-bottom: 0px;
    }
  }
  @media (min-width: 768px) {
    .cta-button-spacing {
      margin-bottom: 0px;
      padding-bottom: 0px;
    }
  }
  @media (min-width: 1024px) {
    .cta-button-spacing {
      margin-bottom: 0px;
      padding-bottom: 0px;
    }
  }
  
  /* Access Curator Connect Button spacing - MOBILE ONLY */
  .curator-connect-button-spacing {
    margin-top: 400px;
  }
  @media (min-width: 640px) {
    .curator-connect-button-spacing {
      margin-top: 0px;
    }
  }
  
  /* Authenticity Section Mobile Styles */
  .auth-header-container {
    margin-bottom: 16px;
  }
  @media (max-width: 639px) {
    .auth-header-container {
      margin-bottom: -20px !important;
    }
  }
  
  .auth-skeptical-text {
    margin-bottom: -40px !important;
  }
  @media (min-width: 640px) {
    .auth-skeptical-text {
      margin-bottom: 0px !important;
    }
  }
  
  .auth-content-container {
    margin-top: -120px !important;
  }
  @media (min-width: 640px) {
    .auth-content-container {
      margin-top: 0px !important;
    }
  }
  
  .auth-heading-gap {
    gap: 0.5rem;
  }
  @media (min-width: 640px) {
    .auth-heading-gap {
      gap: 2.5rem;
    }
  }
  
  .auth-checkmark-desktop {
    display: none !important;
  }
  @media (min-width: 640px) {
    .auth-checkmark-desktop {
      display: flex !important;
      margin-left: 35px;
    }
    .auth-checkmark-mobile-only {
      display: none !important;
    }
  }
  
  .auth-checkmark-mobile-only {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
  }
  
  .auth-operates-text {
    margin-bottom: -25px;
  }
  @media (min-width: 640px) {
    .auth-operates-text {
      margin-bottom: 0px;
    }
  }
  
  .auth-checkmark-mobile {
    width: 48px !important;
    height: 48px !important;
    display: flex !important;
  }
  .auth-checkmark-mobile svg {
    width: 30px !important;
    height: 30px !important;
  }
  @media (min-width: 640px) {
    .auth-checkmark-mobile {
      width: 64px !important;
      height: 64px !important;
    }
    .auth-checkmark-mobile svg {
      width: 40px !important;
      height: 40px !important;
    }
  }
  
  .text-heading-mobile-lg-desktop {
    font-size: 1.5rem;
  }
  @media (min-width: 1024px) {
    .text-heading-mobile-lg-desktop {
      font-size: calc(1.5rem + 0.25rem);
  }
  }
  
  .text-large-heading-mobile-lg-desktop {
    font-size: 1.875rem;
  }
  @media (min-width: 1024px) {
    .text-large-heading-mobile-lg-desktop {
      font-size: calc(1.875rem + 0.25rem);
  }
  }
  
  .text-damn-mobile-lg-desktop {
    font-size: 2.25rem;
  }
  @media (min-width: 1024px) {
    .text-damn-mobile-lg-desktop {
      font-size: calc(2.25rem + 0.25rem);
    }
    }
  
  .text-catch-mobile-lg-desktop {
    font-size: calc(1.5rem + 0.25rem + 0.55rem);
    }
  @media (min-width: 1024px) {
    .text-catch-mobile-lg-desktop {
      font-size: calc(1.5rem + 0.25rem + 0.55rem + 0.7rem + 0.55rem);
    }
  }
`;

// Custom hook for viewport intersection with hydration-safe implementation
const useInView = (options: IntersectionObserverInit & { delay?: number } = {}) => {
  const [isInView, setIsInView] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const hasAnimatedRef = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  // Handle hydration mismatch by ensuring consistent server/client rendering
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const { delay = 500, ...observerOptions } = options;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true; // Prevent multiple triggers
          setTimeout(() => {
            setIsInView(true);
          }, delay);
        }
      },
      { threshold: 0.1, ...observerOptions }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [hasMounted]); // Depend on hasMounted to prevent early execution

  // During SSR and initial hydration, return consistent values
  if (!hasMounted) {
    return [ref, false] as const;
  }

  return [ref, isInView] as const;
};

// FAQ Card Component
const FAQCard = ({ question, answer }: { question: string; answer: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse emoji and text from question
  const parseQuestion = (question: string) => {
    const emojiMatch = question.match(/^(\S+)\s+(.*)$/);
    if (emojiMatch) {
      return { emoji: emojiMatch[1], text: emojiMatch[2] };
    }
    return { emoji: '', text: question };
  };

  const { emoji, text } = parseQuestion(question);

  return (
    <div 
      className={`bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-2xl border border-white/10 p-8 transition-all duration-300 hover:from-white/10 hover:to-white/5 hover:shadow-2xl hover:shadow-[#14c0ff]/10 cursor-pointer ${
        isExpanded ? 'border-[#59e3a5]/50 shadow-2xl shadow-[#59e3a5]/20' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        {/* Accent Bar for Expanded State */}
        <div className="flex items-center flex-1">
          {isExpanded && (
            <div className="w-7 h-1 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full mr-4 transition-all duration-300"></div>
          )}
          <h3 className="text-white font-semibold leading-tight" style={{ fontSize: 'calc(1.125rem + 0.10rem)' }}>
            {emoji && (
              <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mr-2">
                {emoji}
              </span>
            )}
            {text}
          </h3>
        </div>
        
        {/* Plus/Minus Icon */}
        <div className={`w-6 h-6 flex items-center justify-center transition-all duration-300 ml-4 ${
          isExpanded ? 'text-[#59e3a5]' : 'text-[#8b5cf6]'
        }`}>
          {isExpanded ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </div>
      </div>
      
      {/* Expandable Answer */}
      <div className={`overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'
      }`}>
        <p className="text-gray-300 leading-relaxed" style={{ fontSize: 'calc(1rem + 0.2rem)' }}>
          {answer}
        </p>
      </div>
    </div>
  );
};

// Hydration-safe scaling hook for browser mockups
const useClientScale = (baseWidth = 1200, minScale = 0.12, maxScale = 1) => {
  const isSSR = typeof window === 'undefined';
  let initialScale = 1;
  if (isSSR && typeof navigator !== 'undefined' && navigator.userAgent) {
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      initialScale = 0.25;
    }
  }
  const [scale, setScale] = useState<number>(isSSR ? initialScale : 1);
  useEffect(() => {
    const calcScale = () => {
      if (typeof window === 'undefined') return;
      const viewportWidth = window.innerWidth;
      let scaleVal;
      if (viewportWidth >= 1400) {
        scaleVal = maxScale;
      } else if (viewportWidth >= 1024) {
        scaleVal = Math.max(0.6, (viewportWidth - 50) / baseWidth);
      } else if (viewportWidth >= 768) {
        scaleVal = Math.max(0.45, (viewportWidth - 30) / baseWidth);
      } else {
        if (viewportWidth <= 320) scaleVal = 0.22;
        else if (viewportWidth <= 375) scaleVal = 0.26;
        else if (viewportWidth <= 414) scaleVal = 0.28;
        else scaleVal = Math.max(minScale, (viewportWidth * 0.8) / baseWidth);
      }
      setScale(Math.min(maxScale, scaleVal));
    };
    calcScale();
    window.addEventListener('resize', calcScale, { passive: true });
    return () => window.removeEventListener('resize', calcScale);
  }, [baseWidth, minScale, maxScale]);
  return scale;
};
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
  const supabase = createClient();
  
  // How It Works Lottie animations
  const [step1Lottie, setStep1Lottie] = useState<any>(null);
  const [step2Lottie, setStep2Lottie] = useState<any>(null);
  const [step3Lottie, setStep3Lottie] = useState<any>(null);
  const [step4Lottie, setStep4Lottie] = useState<any>(null);
  
  // Confetti animation for logo
  const [confettiLottie, setConfettiLottie] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Green checkmark animation for selected track
  const [checkmarkLottie, setCheckmarkLottie] = useState<any>(null);

  // Testimonial carousel state
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [resumeTimeout, setResumeTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Logo carousel state
  const [logoIndex, setLogoIndex] = useState(0);

  // User authentication state
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Site settings state
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);

  // Testimonial data
  const testimonials = [
    {
      name: "Lil Tecca",
      title: "Hip-Hop Artist",
      image: "/tecca.jpeg",
      quote: "FASHO.co hit different fr. Been dealing with majors my whole career but these guys actually move faster than my label. Track was live on hundreds of major playlists in 48 hours no cap.",
      gradient: "from-[#59e3a5]/30 via-[#14c0ff]/40 to-[#8b5cf6]/30",
      border: "border-[#14c0ff]/50",
      starGradient: "from-[#59e3a5] to-[#14c0ff]"
    },
    {
      name: "Jelly Roll",
      title: "Country/Hip-Hop Artist",
      image: "/jelly.jpg",
      quote: "Before the world knew my name, FASHO had me on all the major playlists. Started using them when I was still grinding in Nashville and they believed in the vision. My team was so impressed we've used them for every release since. These guys been real from day one.",
      gradient: "from-[#8b5cf6]/30 via-[#59e3a5]/40 to-[#14c0ff]/30",
      border: "border-[#59e3a5]/50",
      starGradient: "from-[#8b5cf6] to-[#59e3a5]"
    },
    {
      name: "Lin-Manuel Miranda",
      title: "Creator of Hamilton",
      image: "/lin.jpg",
      quote: "Launching Hamilton's music on Spotify required a unique approach - FASHO understood that immediately. They got us on playlists that reached both Broadway fans and hip-hop heads. Their precision and execution were remarkable. Simply put, they delivered.",
      gradient: "from-[#14c0ff]/30 via-[#8b5cf6]/40 to-[#59e3a5]/30",
      border: "border-[#8b5cf6]/50",
      starGradient: "from-[#14c0ff] to-[#8b5cf6]"
    },
    {
      name: "Alex Warren",
      title: "Singer",
      image: "/alex.jpg",
      quote: "FASHO.co was instrumental in making 'Ordinary' explode. While everyone obsessed over TikTok, they quietly built my Spotify foundation with major playlist placements. That song changed my life - FASHO's strategy was a huge part of it.",
      gradient: "from-[#59e3a5]/30 via-[#14c0ff]/40 to-[#8b5cf6]/30",
      border: "border-[#14c0ff]/50",
      starGradient: "from-[#59e3a5] to-[#14c0ff]"
    },
    {
      name: "Sarah's True Crime Obsession",
      title: "True Crime Podcaster",
      image: "/sarah.jpg",
      quote: "I'm a skeptic by nature - occupational hazard when you investigate murders for a living. But FASHO delivered exactly what they promised. Top 100 podcasts chart within 2 months. This is the real deal.",
      gradient: "from-[#14c0ff]/30 via-[#8b5cf6]/40 to-[#59e3a5]/30",
      border: "border-[#8b5cf6]/50",
      starGradient: "from-[#14c0ff] to-[#8b5cf6]"
    },
    {
      name: "Miguel",
      title: "R&B Artist",
      image: "/miguel.jpg",
      quote: "10 years in this industry taught me one thing - everybody talks, few deliver. These dudes just handle business. Clean dashboard, transparent process, and my streaming revenue finally makes sense.",
      gradient: "from-[#8b5cf6]/30 via-[#59e3a5]/40 to-[#14c0ff]/30",
      border: "border-[#59e3a5]/50",
      starGradient: "from-[#8b5cf6] to-[#59e3a5]"
    },
    {
      name: "Chase Atlantic",
      title: "Alternative Rock Band",
      image: "/chaseatlantic.jpg",
      quote: "Literally spent $10K last year on three different 'marketing agencies' that delivered absolutely nothing. My agent told me about FASHO.co and within a month my phone was receiving calls from A&Rs. Do the math on that ROI.",
      gradient: "from-[#14c0ff]/30 via-[#59e3a5]/40 to-[#8b5cf6]/30",
      border: "border-[#14c0ff]/50",
      starGradient: "from-[#14c0ff] to-[#59e3a5]"
    }
  ];

  // Logo data
  const logos = [
    { src: "/logos/atlantic.png", alt: "Atlantic Records" },
    { src: "/logos/capitol.png", alt: "Capitol Records" },
    { src: "/logos/colum.png", alt: "Columbia Records" },
    { src: "/logos/dfjam.png", alt: "Def Jam Recordings" },
    { src: "/logos/empire.png", alt: "Empire Distribution" },
    { src: "/logos/intersco.png", alt: "Interscope Records" },
    { src: "/logos/island.png", alt: "Island Records" },
    { src: "/logos/rca.png", alt: "RCA Records" },
    { src: "/logos/repub.png", alt: "Republic Records" },
    { src: "/logos/roc.png", alt: "Roc Nation" },
    { src: "/logos/sny.png", alt: "Sony Music" },
    { src: "/logos/unversal.png", alt: "Universal Music Group" },
    { src: "/logos/warnr.png", alt: "Warner Records" },
    { src: "/logos/aftermath.png", alt: "Aftermath Entertainment" }
  ];

  // Auto-scroll carousel effect with proper infinite loop
  useEffect(() => {
    if (isCarouselPaused) return; // Don't create interval if paused

    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        // Continue through all testimonials including duplicates
        if (nextIndex >= testimonials.length * 2) {
          return 0;
        }
        return nextIndex;
      });
    }, 3000); // 2000ms transition + 1000ms pause = 3000ms total

    return () => clearInterval(interval);
  }, [testimonials.length, isCarouselPaused]);

  // Cleanup resume timeout on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
      }
    };
  }, [resumeTimeout]);

  // Check for authentication state and fetch site settings
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error checking user:', error);
        setCurrentUser(null);
      }
    };
    
    const loadSiteSettings = async () => {
      try {
        const settings = await fetchSiteSettings();
        setSiteSettings(settings);
      } catch (error) {
        console.error('Error loading site settings:', error);
        setSiteSettings(defaultSiteSettings);
      }
    };
    
    checkUser();
    loadSiteSettings();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setCurrentUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Handle seamless reset when we reach the duplicate testimonials
  useEffect(() => {
    if (currentTestimonialIndex === testimonials.length) {
      // When we reach the first duplicate, reset to beginning after transition
      const timer = setTimeout(() => {
        // Temporarily disable transitions and reset to equivalent position
        const carouselElement = document.querySelector('.testimonial-carousel');
        if (carouselElement) {
          (carouselElement as HTMLElement).style.transition = 'none';
          setCurrentTestimonialIndex(0);
          // Re-enable transitions after a brief delay
          setTimeout(() => {
            (carouselElement as HTMLElement).style.transition = 'transform 2000ms ease-in-out';
          }, 50);
        }
      }, 2000); // Wait for transition to complete
      return () => clearTimeout(timer);
    }
  }, [currentTestimonialIndex, testimonials.length]);

  // Mobile detection for responsive carousel
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile(); // Check on mount
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Viewport animation hooks for PAS section

  const [musicFireRef, musicFireInView] = useInView();
  const [nobodyHearingRef, nobodyHearingInView] = useInView();
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
  const [bottomSectionRef, bottomSectionInView] = useInView({ threshold: 0.1, delay: 0 });
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
  const [teamCampaignsRef, teamCampaignsInView] = useInView();
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
  const [curatorRef, curatorInView] = useInView({ threshold: 0.3 });
  const [scrollY, setScrollY] = useState(0);
  
  // New animation hooks for slide-up animations with 600ms delay
  const [forgetTextRef, forgetTextInView] = useInView({ threshold: 0.3 });
  const [blowUpButtonRef, blowUpButtonInView] = useInView({ threshold: 0.3 });
  const [commandCenterRef, commandCenterInView] = useInView({ threshold: 0.3 });
  const [dashboardDescRef, dashboardDescInView] = useInView({ threshold: 0.3 });
  const [genreHeadingRef, genreHeadingInView] = useInView({ threshold: 0.3 });
  const [genreSubheadingRef, genreSubheadingInView] = useInView({ threshold: 0.3 });
  const [genreListContainerRef, genreListContainerInView] = useInView({ threshold: 0.3 });
  
  // Mobile genre list animation hooks - one for each row
  const [genreRow1Ref, genreRow1InView] = useInView({ threshold: 0.3 });
  const [genreRow2Ref, genreRow2InView] = useInView({ threshold: 0.3 });
  const [genreRow3Ref, genreRow3InView] = useInView({ threshold: 0.3 });
  const [genreRow4Ref, genreRow4InView] = useInView({ threshold: 0.3 });
  const [genreRow5Ref, genreRow5InView] = useInView({ threshold: 0.3 });
  const [genreRow6Ref, genreRow6InView] = useInView({ threshold: 0.3 });
  const [genreRow7Ref, genreRow7InView] = useInView({ threshold: 0.3 });
  const [genreRow8Ref, genreRow8InView] = useInView({ threshold: 0.3 });
  const [genreRow9Ref, genreRow9InView] = useInView({ threshold: 0.3 });
  const [genreRow10Ref, genreRow10InView] = useInView({ threshold: 0.3 });
  const [genreRow11Ref, genreRow11InView] = useInView({ threshold: 0.3 });
  const [genreRow12Ref, genreRow12InView] = useInView({ threshold: 0.3 });
  const [genreRow13Ref, genreRow13InView] = useInView({ threshold: 0.3 });
  const [genreRow14Ref, genreRow14InView] = useInView({ threshold: 0.3 });
  const [genreRow15Ref, genreRow15InView] = useInView({ threshold: 0.3 });
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
  const [playlistsHeadingRef, playlistsHeadingInView] = useInView({ threshold: 0.3 });
  const [playlistsSubheadingRef, playlistsSubheadingInView] = useInView({ threshold: 0.3 });
  const [playlistsGridRef, playlistsGridInView] = useInView({ threshold: 0.3 });
  const [thousandsMoreRef, thousandsMoreInView] = useInView({ threshold: 0.3 });
  const [playlistsButtonRef, playlistsButtonInView] = useInView({ threshold: 0.3 });
  const [testimonialsHeadingRef, testimonialsHeadingInView] = useInView({ threshold: 0.3 });
  const [testimonialsSubheadingRef, testimonialsSubheadingInView] = useInView({ threshold: 0.3 });

  // Hydration-safe scale for browser mockups
  const dashboardScale = useClientScale(1200);
  const curatorScale = useClientScale(1200);

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

  // Testimonial animation logic
  useEffect(() => {
    const testimonials = [
      {
        image: '/signup-pics/haybeeth.jpg',
        text: '..got placed on 84 playlists in 14 days',
        handle: '@LayBankz'
      },
      {
        image: '/signup-pics/aaronnicc.jpg',
        text: 'I broke Spotify\'s new artist stream record',
        handle: '@TommyRichman'
      },
      {
        image: '/signup-pics/bgcortez.jpg',
        text: 'Over 2.5M streams from their Legendary campaign',
        handle: '@BensonBoone'
      },
      {
        image: '/signup-pics/brett.jpg',
        text: '..the best playlist marketing company I\'ve worked with, hands down...',
        handle: '@AddisonRae'
      },
      {
        image: '/signup-pics/collins.jpg',
        text: 'FASHO has been killing it for years. I use them for everything...',
        handle: '@FloMilli'
      },
      {
        image: '/signup-pics/eduardo.jpg',
        text: 'Broke over 32M streams and we\'re still going!',
        handle: '@ian'
      }
    ];

    let currentIndex = 0;
    let isAnimating = false;
    let timeoutId: NodeJS.Timeout;

    function showTestimonial() {
      const container = document.getElementById('testimonial-container');
      const image = document.getElementById('testimonial-image');
      const text = document.getElementById('testimonial-text');
      
      if (!container || !image || !text || isAnimating) return;
      
      isAnimating = true;
      const testimonial = testimonials[currentIndex];
      
      // Update content while hidden
      (image as HTMLImageElement).src = testimonial.image;
      (image as HTMLImageElement).alt = testimonial.handle;
      text.innerHTML = `<span class="font-medium">${testimonial.text}</span> <span class="text-[#59e3a5]">${testimonial.handle}</span>`;
      
      // Slide down and fade in
      container.style.transform = 'translateY(0px)';
      container.style.opacity = '1';
      
      // Show for 3 seconds, then slide back up
      timeoutId = setTimeout(() => {
        // Slide up and fade out
        container.style.transform = 'translateY(-40px)';
        container.style.opacity = '0';
        
        setTimeout(() => {
          currentIndex = (currentIndex + 1) % testimonials.length;
          isAnimating = false;
          
          // Schedule next testimonial after 0.01 second gap
          timeoutId = setTimeout(showTestimonial, 10);
        }, 500); // Wait for slide up animation to complete (matches duration-500)
      }, 3000); // Show for 3 seconds
    }

    // Start first testimonial after 3 seconds
    timeoutId = setTimeout(showTestimonial, 3000);

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

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
      // Redirect to /add page with the selected track - preserve current URL parameters
      const trackData = encodeURIComponent(JSON.stringify(previewTrack));
      
      // Preserve existing URL parameters (like gclid) from current page
      const currentParams = new URLSearchParams(window.location.search);
      const preservedParams = currentParams.toString();
      const separator = preservedParams ? '&' : '';
      
      router.push(`/add?selectedTrack=${trackData}${separator}${preservedParams}`);
    }
  };

  const handleSubmit = async () => {
    if (!track && !previewTrack) {
      setError('Please select a track first');
      return;
    }

    const selectedTrack = track || previewTrack;
    if (!selectedTrack) return;

    // Track track selection for Google Ads
    gtag.trackEvent('search', {
      search_term: selectedTrack.title,
      event_category: 'engagement',
      event_label: 'Track Selection',
      value: 1
    });

    // Track for Google Analytics 4
    gtag.trackGA4ButtonClick('Launch Campaign', 'hero_section');
    gtag.trackGA4Event('search', {
      search_term: selectedTrack.title,
      content_type: 'music_track'
    });

    console.log('🎯 GOOGLE ADS: Track search/selection tracked:', selectedTrack.title);

    setLoading(true);
    try {
      // Redirect to /add page with the selected track - preserve current URL parameters
      const trackData = encodeURIComponent(JSON.stringify(selectedTrack));
      
      // Preserve existing URL parameters (like gclid) from current page
      const currentParams = new URLSearchParams(window.location.search);
      const preservedParams = currentParams.toString();
      const separator = preservedParams ? '&' : '';
      
      router.push(`/add?selectedTrack=${trackData}${separator}${preservedParams}`);
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
      const headerOffset = 200;
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
    
    // Fetch green checkmark animation for selected track
    fetch('https://lottie.host/ba779d58-538c-4ebc-b3d1-672141860dfb/KOnR9jV5wA.json')
      .then(res => res.json())
      .then(setCheckmarkLottie)
      .catch(() => setCheckmarkLottie(null));
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

  // Scroll animation for dashboard - THROTTLED to prevent excessive re-renders
  useEffect(() => {
    let ticking = false;
    let lastScrollTime = 0;
    
    const handleScroll = () => {
      const now = Date.now();
      // Only update every 16ms (60fps) to prevent excessive re-renders
      if (now - lastScrollTime < 16) return;
      
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
          lastScrollTime = now;
        });
        ticking = true;
      }
    };
    
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      // Debounce resize events to prevent excessive re-renders
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setScrollY(window.scrollY);
      }, 100);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Calculate responsive scale and scroll transform for Command Center
  const getDashboardTransform = () => {
    // Calculate responsive scale factor
    const getScaleFactor = () => {
      if (typeof window === 'undefined') return 1;
      
      const viewportWidth = window.innerWidth;
      const baseWidth = 1200; // Our fixed browser mockup width (wider for realistic proportions)
      const maxScale = 1; // Maximum scale on desktop
      const minScale = 0.12; // Much smaller minimum scale for mobile screens
      
      // Calculate scale based on viewport width with better mobile handling
      let scale;
      if (viewportWidth >= 1400) {
        scale = maxScale; // Full size on extra large screens
      } else if (viewportWidth >= 1024) {
        scale = Math.max(0.6, (viewportWidth - 50) / baseWidth); // Less aggressive scaling on tablets
      } else if (viewportWidth >= 768) {
        scale = Math.max(0.45, (viewportWidth - 30) / baseWidth); // Better tablet scaling
              } else {
          // Mobile: much more aggressive scaling for better fit
          scale = Math.max(minScale, (viewportWidth - 60) / baseWidth);
        }
      
      return Math.min(maxScale, scale);
    };
    
    // Calculate scroll animation transform (disabled on mobile)
    let scrollTransform = 'translateY(0px)';
    if (dashboardRef.current && typeof window !== 'undefined' && window.innerWidth >= 768) {
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
      const maxTransform = 180;
    const transformY = easedProgress * maxTransform;
    
      scrollTransform = `translateY(-${transformY}px)`;
    }
    
    const scaleFactor = getScaleFactor();
    return `${scrollTransform} scale(${scaleFactor})`;
  };

  // Calculate responsive scale and scroll transform for Curator Connect
  const getCuratorTransform = () => {
    // Calculate responsive scale factor
    const getScaleFactor = () => {
      if (typeof window === 'undefined') return 1;
      
      const viewportWidth = window.innerWidth;
      const baseWidth = 1200; // Our fixed browser mockup width (wider for realistic proportions)
      const maxScale = 1; // Maximum scale on desktop
      const minScale = 0.12; // Much smaller minimum scale for mobile screens
      
      // Calculate scale based on viewport width with better mobile handling
      let scale;
      if (viewportWidth >= 1400) {
        scale = maxScale; // Full size on extra large screens
      } else if (viewportWidth >= 1024) {
        scale = Math.max(0.6, (viewportWidth - 50) / baseWidth); // Less aggressive scaling on tablets
      } else if (viewportWidth >= 768) {
        scale = Math.max(0.45, (viewportWidth - 30) / baseWidth); // Better tablet scaling
              } else {
          // Mobile: much more aggressive scaling for better fit
          scale = Math.max(minScale, (viewportWidth - 60) / baseWidth);
        }
      
      return Math.min(maxScale, scale);
    };
    
    // Calculate scroll animation transform (disabled on mobile)
    let scrollTransform = 'translateY(0px)';
    if (curatorRef.current && typeof window !== 'undefined' && window.innerWidth >= 768) {
    const element = curatorRef.current;
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
    
      // Maximum transform distance (reduced for less sensitivity)
      const maxTransform = 180;
    const transformY = easedProgress * maxTransform;
    
      scrollTransform = `translateY(-${transformY}px)`;
    }
    
    const scaleFactor = getScaleFactor();
    return `${scrollTransform} scale(${scaleFactor})`;
  };
  return (
    <>
      <Head>
        <title>{siteSettings.site_title}</title>
        <meta
          name="description"
          content={siteSettings.site_description}
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

      {/* Sales Banner */}
      <SalesBanner />

      {/* Sales Pop Component - positioned early for fast timer initialization */}
      <SalesPop />

      {/* Header */}
      <Header transparent={true} />

      {/* Main Content */}
      <main className="min-h-screen bg-gradient-to-b from-[#18192a] to-[#0a0a13] text-white relative overflow-x-hidden overflow-y-visible w-full max-w-full">
        {/* Subtle, large radial glow behind hero/campaign */}
        <div className="pointer-events-none absolute left-1/2 -top-[10vh] -translate-x-1/2 z-0 w-[96vw] h-[64vh]" style={{ filter: 'blur(60px)' }}>
          <div className="w-full h-full bg-gradient-radial from-[#14c0ff]/30 via-[#59e3a5]/20 to-transparent opacity-60"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10">
          {/* Hero Section */}
          <section className="min-h-screen flex items-center justify-center px-4 pt-44 relative overflow-hidden w-full">
            {/* Animated lens flare particles background - covers entire hero section */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
              <HeroParticles />
            </div>
            {/* WebGL Particles overlay - higher z-index */}
            <div className="absolute inset-0 w-full h-full z-5 pointer-events-none">
              <Particles
                particleColors={['#ffffff', '#59e3a5', '#14c0ff']}
                particleCount={700}
                particleSpread={30}
                speed={0.1}
                particleBaseSize={300}
                moveParticlesOnHover={true}
                alphaParticles={true}
                disableRotation={false}
              />
            </div>
            <div className="w-full max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-20 max-w-5xl mx-auto">
                {/* Client Testimonial Feature */}
                <div className="mb-6 md:mb-12 animate-fade-in-up mt-[-35px] md:mt-0" style={{ animationDelay: '0s', animationFillMode: 'both' }}>
                  {/* Stack of Client Images */}
                  <div className="flex justify-center items-center mb-0 md:mb-4">
                    <div className="flex -space-x-2">
                      <img src="/signup-pics/haybeeth.jpg" alt="Client" className="w-9 h-9 md:w-9 md:h-9 rounded-full border-2 border-white/20 object-cover" />
                      <img src="/signup-pics/aaronnicc.jpg" alt="Client" className="w-9 h-9 md:w-9 md:h-9 rounded-full border-2 border-white/20 object-cover" />
                      <img src="/signup-pics/bgcortez.jpg" alt="Client" className="w-9 h-9 md:w-9 md:h-9 rounded-full border-2 border-white/20 object-cover" />
                      <img src="/signup-pics/brett.jpg" alt="Client" className="w-9 h-9 md:w-9 md:h-9 rounded-full border-2 border-white/20 object-cover" />
                      <img src="/signup-pics/collins.jpg" alt="Client" className="w-9 h-9 md:w-9 md:h-9 rounded-full border-2 border-white/20 object-cover" />
                      <img src="/signup-pics/eduardo.jpg" alt="Client" className="w-9 h-9 md:w-9 md:h-9 rounded-full border-2 border-white/20 object-cover" />
                      <img src="/signup-pics/jean-daniel.jpg" alt="Client" className="w-9 h-9 md:w-9 md:h-9 rounded-full border-2 border-white/20 object-cover" />
                  </div>
                  </div>
                  
                  {/* Single Rotating Testimonial */}
                  <div className="flex items-center justify-center mt-[-8px] md:mt-2 h-16 md:h-8 relative overflow-hidden px-4">
                    <div 
                      className="flex items-center gap-2 transition-all duration-500 ease-out bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-full px-4 py-1 md:px-3 md:py-1.5 border border-white/20 absolute max-w-[calc(100vw-2rem)] md:max-w-none"
                      id="testimonial-container"
                      style={{ transform: 'translateY(-40px)', opacity: '0' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-[#59e3a5] flex-shrink-0">
                        <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"></path>
                        <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"></path>
                      </svg>
                      <img src="/signup-pics/haybeeth.jpg" alt="@LayBankz" className="hidden md:block h-4 w-4 rounded-full object-cover" id="testimonial-image" />
                      <p className="text-[10px] md:text-xs text-gray-300 md:whitespace-nowrap max-w-[280px] md:max-w-none" id="testimonial-text">
                        <span className="font-medium">..got placed on 84 playlists in 14 days</span> <span className="text-[#59e3a5]">@LayBankz</span>
                      </p>
                  </div>
                  </div>
                </div>



                                  {/* Pre-headline */}
                  <div className="text-[0.62rem] md:text-[0.975rem] text-white/80 font-normal mb-[14px] md:mb-[24px] animate-fade-in-up mt-[20px] md:mt-0" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                    The Industry's #1 Playlist Marketing Company Since 2016
                  </div>
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-[8px]"></div>

                {/* Main Heading with simple slide-up animation */}
                <h1 className="text-[2.18rem] xs:text-[2.93rem] sm:text-[3.02rem] md:text-[3.77rem] lg:text-[4.52rem] font-black mb-8 leading-tight animate-fade-in-up drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]" style={{ whiteSpace: 'normal', animationDelay: '0.1s', animationFillMode: 'both' }}>
                  <span className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent">Bot Plays</span> and <span className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent">Fake Playlists</span><br className="hidden md:block" /> <span className="bg-gradient-to-b from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Won't Make You Famous</span>
                </h1>



                {/* Subtitle */}
                <div className="text-[1rem] md:text-[1.4rem] text-gray-300 mb-6 max-w-4xl mx-auto leading-relaxed break-words animate-fade-in-up mt-[-15px] md:mt-0" style={{ paddingBottom: '10px', wordBreak: 'break-word', overflowWrap: 'break-word', animationDelay: '0.2s', animationFillMode: 'both' }}>
                  Gain Millions Of REAL Fans With Guaranteed Placements On The World's Largest Spotify Playlists. We've Helped Over 15k+ Artists Just Like You Rapidly Explode Their Careers.
                </div>

                {/* ========== HERO CTA BUTTONS - TEMPORARILY HIDDEN ==========
                     WILL REACTIVATE THESE LATER - DO NOT DELETE
                     Simply uncomment this section when ready to go live
                {/* Hero CTA Buttons */}
                {/*<div className="hero-cta-container animate-fade-in-up" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
                  <a 
                    href="#start-campaign"
                    className="hero-cta-button hero-cta-primary"
                  >
                    PLACE ME TODAY!
                  </a>
                  <a 
                    href="#"
                    className="hero-cta-button hero-cta-secondary"
                  >
                    FREE AI ANALYZER
                  </a>
                </div>*/}

                {/* Hero CTA Divider */}
                {/*<div className="hero-cta-divider animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}></div>*/}
                {/* ========== END HERO CTA BUTTONS SECTION ========== */}

                                  {/* Stats Badges */}
                  <div className="flex justify-center items-center gap-3 md:gap-3 mb-8 animate-fade-in-up px-4" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                  <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl px-1.5 md:px-4 py-1.5 md:py-2 border border-white/20 shadow-lg flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <svg className="w-2.5 h-2.5 md:w-4 md:h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-white font-semibold text-[0.65rem] md:text-base whitespace-nowrap">100% Organic</span>
                  </div>
                  
                  <div className="hidden md:block w-px h-6 bg-gray-600"></div>
                  
                  <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl px-1.5 md:px-4 py-1.5 md:py-2 border border-white/20 shadow-lg flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <svg className="w-2.5 h-2.5 md:w-4 md:h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-white font-semibold text-[0.65rem] md:text-base whitespace-nowrap">100% Success Rate</span>
                  </div>
                  
                  <div className="hidden md:block w-px h-6 bg-gray-600"></div>
                  
                  <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl px-1.5 md:px-4 py-1.5 md:py-2 border border-white/20 shadow-lg flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <svg className="w-2.5 h-2.5 md:w-4 md:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-white font-semibold text-[0.65rem] md:text-base whitespace-nowrap">Results In Only 48hrs</span>
                  </div>
                </div>

                {/* Start Campaign Anchor - positioned above trust badges for optimal viewport positioning */}
                <div id="start-campaign"></div>

                {/* Trust Badges */}
                <div className="flex justify-center items-center gap-8 md:gap-12 mb-32 z-10">
                  <div className="text-center flex flex-col items-center">
                  <img 
                    src="/tpilot.png" 
                    alt="TrustPilot Badge" 
                      className="h-10 md:h-11 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-300 z-20 mb-2 trustpilot-badge-spacing" 
                    style={{ verticalAlign: 'middle' }}
                  />
                    <p className="text-mobile-reduced text-gray-400 leading-tight whitespace-nowrap artists-reviews-spacing">
                      <span className="text-[#00D4AA]">3,725</span> Artists Reviews
                    </p>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <p className="text-mobile-reduced text-gray-400 leading-tight whitespace-nowrap fasho-official-spacing google-badge-spacing">
                      FASHO.co Is An Official
                    </p>
                  <img 
                    src="/gpart.jpg" 
                    alt="Google Partner Badge" 
                      className="h-8 md:h-9 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-300 z-20" 
                      style={{ verticalAlign: 'middle' }}
                  />
                  </div>
                  <div className="text-center flex flex-col items-center">
                    {/* 5 Star Icons */}
                    <div className="flex justify-center gap-1 mb-2 rolling-stone-stars-spacing">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-2 md:w-3 h-2 md:h-3" fill="#ed1c24" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ))}
                    </div>
                    <img 
                      src="/rostoned.png" 
                      alt="Rolling Stone Badge" 
                      className="h-4 md:h-5 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-300 z-20 rolling-stone-badge-spacing" 
                      style={{ verticalAlign: 'middle' }}
                    />
                    <p className="text-mobile-reduced text-gray-400 leading-tight text-center rolling-stone-text-spacing">
                      Rated "Most Valuable<br />For Artists" of 2025
                    </p>
                  </div>
                </div>

                {/* Menu Anchor for Track Input */}
                <div id="track-input-section"></div>

                {/* Track Input Section - Enhanced Design with increased bottom padding and 10px top padding */}
                <div className="mt-16 mb-[18px] -mb-[55px] relative pb-10 pt-2.5">
                  {/* Lottie Animation Behind Input Field */}
                  <div className="absolute left-1/2 -top-12 -translate-x-1/2 z-0 w-full flex justify-center pointer-events-none" style={{height: '70px'}}>
                    <div style={{ width: '896px', maxWidth: '90vw', margin: '0 auto', padding: '0 20px' }}>
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
                  <div className="relative z-20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-6 md:p-8 border border-white/20 shadow-[0_12px_40px_0_rgba(20,192,255,0.45)] w-full max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] md:max-w-[calc(100vw-4rem)] lg:max-w-4xl mx-auto">
                    {/* Static border gradient */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[2px]">
                      <div className="h-full w-full rounded-3xl bg-black/80 backdrop-blur-xl"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 w-full max-w-full mx-auto">
                      {/* Campaign Start Text - Reduced by 10px and added gradient text with reduced shadow */}
                      <div className="text-center mb-8">
                        <h2 className="text-[1.6rem] md:text-4xl font-black bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] mb-4 pt-2.5 md:pt-0 break-words">
                          🚀 Start Your Campaign
                        </h2>
                        <p className="md:text-lg text-gray-300 mb-6 md:mb-8 -mb-2.5" style={{ fontSize: '0.725rem' }}>
                          <span className="md:text-lg md:text-[1.125rem]">Search For Your Spotify Song or Enter Your Track Link</span>
                        </p>
                      </div>

                      {/* Input and Button Layout - Responsive - SEARCH CONTAINER WITH ESCAPE POSITIONING */}
                      <div className="relative mb-8 w-full">
                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center w-full">
                          <div className="flex-1 relative">
                            <input
                              ref={inputRef}
                              type="text"
                              placeholder="Search Your Song Name or Paste A Track Link"
                              value={url}
                              onFocus={handleInputFocus}
                              onChange={(e) => setUrl(e.target.value)}
                              className={`w-full px-6 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14c0ff]/50 focus:border-[#14c0ff]/50 transition-all duration-300 text-base md:text-lg hover:bg-white/15 hover:shadow-lg hover:shadow-[#14c0ff]/20 ${
                                (focused || showSearchResults) ? 'ring-2 ring-[#14c0ff]/50 border-[#14c0ff]/50' : ''
                              }`}
                              disabled={loading}
                            />
                            {/* Input focus indicator */}
                            {(focused || showSearchResults) && (
                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-full animate-pulse"></div>
                            )}
                            
                            {/* Mobile Search Results - positioned directly below input */}
                            {isMobile && showSearchResults && (
                              <div
                                ref={searchDropdownRef}
                                className="absolute top-full left-0 right-0 mt-1 z-[9999] bg-gradient-to-br from-[#23272f] to-[#1a1a2e] border border-white/20 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
                                style={{ maxHeight: '400px' }}
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
                                          <div className="flex-1 min-w-0 text-left">
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
                              </div>
                            )}
                          </div>
                          {/* Launch Campaign Button - Always normal color, pulse when filled */}
                          <div className="relative">
                            {/* Pulsing Glow Background - Only when Artist Insights are showing */}
                            {previewTrack && previewTrack.artistInsights && (
                              <div 
                                className="absolute inset-0 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-2xl blur-md opacity-60 animate-pulse-glow"
                                style={{ zIndex: 100 }}
                              ></div>
                            )}
                            
                            <button
                              onClick={handleSubmit}
                              disabled={loading}
                              className={`relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden group whitespace-nowrap`}
                              style={{ zIndex: 101 }}
                            >
                              {/* Button content */}
                              <span className="relative z-10 text-white">
                                {loading ? 'Loading...' : 'Launch Campaign'}
                              </span>
                              {/* Shimmer effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Song card directly below input/button row, INSIDE the campaign container */}
                      {previewTrack && isSpotifyUrlCheck(url) && (
                        <div className="mb-2 animate-popdown w-full px-1">
                          <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] p-[1px] rounded-2xl shadow-[0_8px_32px_0_rgba(20,192,255,0.35)]">
                            <div className="flex items-center bg-gradient-to-r from-[#23272f] to-[#1a1a2e] rounded-2xl p-4 gap-4 w-full overflow-visible">
                              <img
                                src={previewTrack.imageUrl}
                                alt={previewTrack.title}
                                className="w-20 h-20 rounded-xl object-cover shadow-md border border-white/10 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div 
                                  className="font-bold text-white text-left truncate" 
                                  style={{ fontSize: !isMobile ? 'calc(1rem + 0.25rem)' : '1rem' }}
                                >
                                  {previewTrack.title}
                                </div>
                                <div 
                                  className="text-gray-300 text-left truncate" 
                                  style={{ fontSize: !isMobile ? 'calc(0.9rem + 0.25rem)' : '0.9rem' }}
                                >
                                  {previewTrack.artist}
                                </div>
                              </div>
                              {/* Green checkmark Lottie animation */}
                              {checkmarkLottie && (
                                <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                                  <Lottie
                                    autoplay
                                    loop={false}
                                    animationData={checkmarkLottie}
                                    style={{ width: '40px', height: '40px' }}
                                    rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Artist Insights Card - shown below song preview when artist data is available */}
                      {previewTrack && previewTrack.artistInsights && isSpotifyUrlCheck(url) && (
                        <ArtistInsightsCard 
                          artistData={previewTrack.artistInsights}
                          isMobile={isMobile}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {/* Infinite Logo Carousel - Pure CSS Implementation - BREAK OUT TO FULL WIDTH */}
                <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] py-16 -mb-9" style={{ background: 'transparent' }}>
                  <div className="w-full" style={{ background: 'transparent' }}>
                    {/* Section Header */}
                    <div className="text-center mb-12 largest-labels-spacing" style={{ background: 'transparent' }}>
                      <h2 className="text-[calc(1.5rem-0.2rem)] sm:text-2xl md:text-3xl font-black text-white mb-4 largest-labels-text" style={{ background: 'transparent' }}>
                        We're Used By The Largest Labels
                      </h2>
                    </div>

                    {/* CSS Infinite Carousel - Working Implementation */}
                    <div className="logo-carousel-container" style={{ height: '120px', background: 'transparent' }}>
                      <style jsx>{`
                        .logo-carousel-container {
                          overflow: hidden;
                          position: relative;
                          width: 100%;
                        }
                        
                        .logo-carousel-track {
                          display: flex;
                          align-items: center;
                          width: calc(140px * 28); /* 14 logos × 2 sets × 140px each */
                          animation: logoScroll 30s linear infinite;
                        }
                        

                        
                        .logo-item {
                          width: 120px;
                          height: 80px;
                          margin: 0 10px;
                          flex-shrink: 0;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                        }
                        
                        @keyframes logoScroll {
                          0% {
                            transform: translateX(0);
                          }
                          100% {
                            transform: translateX(calc(-140px * 14)); /* Move by exactly one set */
                          }
                        }
                      `}</style>
                      
                      <div className="logo-carousel-track">
                        {/* First set of logos */}
                        {logos.map((logo, index) => (
                          <div key={`set1-${index}`} className="logo-item">
                            <img
                              src={logo.src}
                              alt={logo.alt}
                              className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300 filter grayscale hover:grayscale-0"
                              style={{ height: '60px' }}
                            />
                          </div>
                        ))}
                        {/* Second set of logos for seamless loop */}
                        {logos.map((logo, index) => (
                          <div key={`set2-${index}`} className="logo-item">
                            <img
                              src={logo.src}
                              alt={logo.alt}
                              className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity duration-300 filter grayscale hover:grayscale-0"
                              style={{ height: '60px' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Flowing Shape Divider - Curves on Both Sides */}
          <div className="relative z-30" style={{ height: '200px', width: '110vw', left: '-5vw', transform: 'rotate(-3deg)', background: 'transparent', marginTop: '-75px' }}>
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

          {/* New Hero Section - Headings Above Box */}
          <div className="max-w-[90rem] mx-auto px-3 sm:px-6 py-20 -mt-2 sm:mt-5 md:mt-10 mb-8 sm:mb-[110px]">
            {/* Headings above the box */}
            <div className="text-center mb-0 sm:mb-12">
              <h2 className="text-[clamp(2rem,5vw,2.75rem)] sm:text-[clamp(1.5rem,5vw,2.5rem)] font-black text-white mb-6 leading-tight">
                <span className="block sm:hidden">Forget <span className="bg-gradient-to-l from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">EVERYTHING</span><br />You've Tried So Far.<br />This Is How Artists <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">ACTUALLY</span><br />Blow Up On Spotify.</span>
                <span className="hidden sm:block">Forget <span className="bg-gradient-to-l from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">EVERYTHING</span> You've Tried So Far.<br />This Is How Artists <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">ACTUALLY</span> Blow Up On Spotify.</span>
                    </h2>
              <p className="text-[clamp(1.125rem,2.5vw,1.5rem)] sm:text-[clamp(1rem,2vw,1.5rem)] text-gray-300 leading-relaxed max-w-5xl mx-auto mb-[-6.5rem] sm:mb-0 px-4 sm:px-0">
                You already know Spotify playlists are the key to <b>massive success.</b> You've seen <b>unknown</b> artists appear on major playlists like Rap Caviar and explode <b>overnight.</b> What's the trick? They have direct access to the curators who run these <b>career making</b> playlists....<br /><br /><span className="text-[clamp(1.5rem,2.5vw,2rem)] sm:text-[clamp(1.25rem,2.5vw,2rem)] font-bold text-white">And now so do you.</span>
                </p>
              </div>
                  
            {/* Icon Box Cards - Independent Design */}
            <div className="max-w-[90rem] mx-auto px-1 sm:px-6 mb-4 sm:mb-12 scale-90 origin-center">
              {/* Grid layout for 6 icon boxes - 2 columns on desktop, 1 on mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                
                {/* Icon Box Card 1 - Wake Up To Thousands of New Listeners */}
                <div className="group relative bg-gradient-to-br from-[#18192a]/90 via-[#1a1b3a]/70 to-[#0a0a13]/90 backdrop-blur-xl rounded-3xl p-8 lg:p-10 border-2 border-white/20 hover:border-[#59e3a5]/50 transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(89,227,165,0.3)] hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/10 via-transparent to-[#14c0ff]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-6 flex items-center justify-center bg-gradient-to-br from-[#59e3a5] to-[#14c0ff] rounded-2xl shadow-[0_10px_30px_0_rgba(89,227,165,0.4)] transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-black text-[1.6875rem] sm:text-[1.9375rem] mb-4 leading-tight">Wake Up To <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Thousands</span> of New Listeners Who <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Love You</span></h3>
                    <p className="text-gray-300 text-[1.25rem] sm:text-[1.1875rem] leading-relaxed">Your song lands on playlists with <b className="text-white">massive engaged audiences</b> who save tracks, follow artists, and come back for more. Which means you're gaining <b className="text-white">actual fans</b> who'll stream your entire catalog, show up to your shows, and tell their friends about you. We don't use bots, so you're building <b className="text-white">real momentum</b> that compounds instead of getting flagged for fake engagement and watching your account get buried.</p>
              </div>
                </div>
                      
                {/* Icon Box Card 2 - Your Song Submitted To Our Full Network Overnight */}
                <div className="group relative bg-gradient-to-br from-[#18192a]/90 via-[#1a1b3a]/70 to-[#0a0a13]/90 backdrop-blur-xl rounded-3xl p-8 lg:p-10 border-2 border-white/20 hover:border-[#14c0ff]/50 transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(20,192,255,0.3)] hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#14c0ff]/10 via-transparent to-[#59e3a5]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-6 flex items-center justify-center bg-gradient-to-br from-[#14c0ff] to-[#59e3a5] rounded-2xl shadow-[0_10px_30px_0_rgba(20,192,255,0.4)] transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-black text-[1.6875rem] sm:text-[1.9375rem] mb-4 leading-tight">Your Song Submitted To Our <span className="bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] bg-clip-text text-transparent">Massive Network</span> Overnight</h3>
                    <p className="text-gray-300 text-[1.25rem] sm:text-[1.1875rem] leading-relaxed">We pitch your track to every matching curator in our database <b className="text-white">before tomorrow ends.</b> While other artists are still researching playlist contact info and writing their third draft of a pitch email, you're <b className="text-white">already</b> getting heard by <b className="text-white">decision-makers,</b> and you're not losing the critical first-week momentum window when Spotify's algorithm pays the most attention.</p>
                </div>
              </div>
                      
                {/* Icon Box Card 3 - Placements Start Within 48-72 Hours */}
                <div className="group relative bg-gradient-to-br from-[#18192a]/90 via-[#1a1b3a]/70 to-[#0a0a13]/90 backdrop-blur-xl rounded-3xl p-8 lg:p-10 border-2 border-white/20 hover:border-[#59e3a5]/50 transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(89,227,165,0.3)] hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/10 via-transparent to-[#14c0ff]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-6 flex items-center justify-center bg-gradient-to-br from-[#59e3a5] to-[#14c0ff] rounded-2xl shadow-[0_10px_30px_0_rgba(89,227,165,0.4)] transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-black text-[1.6875rem] sm:text-[1.9375rem] mb-4 leading-tight">Placements Start In Only <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">48-72 Hours</span></h3>
                    <p className="text-gray-300 text-[1.25rem] sm:text-[1.1875rem] leading-relaxed">You'll see your first <b className="text-white">playlist adds</b> rolling in before the weekend hits. No more <b className="text-white">lying awake</b> wondering if you wasted your money, no more <b className="text-white">refreshing</b> Spotify for Artists every hour hoping something happened—just <b className="text-white">immediate proof</b> that your campaign is working and the <b className="text-white">"hell yea"</b> moment of finally hitting <b className="text-white">big streaming numbers</b> on your music.</p>
            </div>
                </div>

                {/* Icon Box Card 4 - Works For Every Genre And For Every Artist */}
                <div className="group relative bg-gradient-to-br from-[#18192a]/90 via-[#1a1b3a]/70 to-[#0a0a13]/90 backdrop-blur-xl rounded-3xl p-8 lg:p-10 border-2 border-white/20 hover:border-[#14c0ff]/50 transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(20,192,255,0.3)] hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#14c0ff]/10 via-transparent to-[#59e3a5]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-6 flex items-center justify-center bg-gradient-to-br from-[#14c0ff] to-[#59e3a5] rounded-2xl shadow-[0_10px_30px_0_rgba(20,192,255,0.4)] transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <h3 className="text-white font-black text-[1.6875rem] sm:text-[1.9375rem] mb-4 leading-tight">Works For <span className="bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] bg-clip-text text-transparent">Every</span> Genre And For <span className="bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] bg-clip-text text-transparent">Every</span> Artist</h3>
                    <p className="text-gray-300 text-[1.25rem] sm:text-[1.1875rem] leading-relaxed">Whether you're making <b className="text-white">drill, indie pop,</b> or <b className="text-white">lo-fi beats,</b> whether you're at <b className="text-white">500 streams</b> or <b className="text-white">500,000,</b> we've got curators who specialize in your <b className="text-white">exact sound</b> and work with artists at <b className="text-white">all experience levels.</b> You're not getting thrown into random playlists that don't fit your vibe. You're getting <b className="text-white">strategic placements</b> that actually build your <b className="text-white">real fanbase</b> with listeners who'll love your songs and come back for more.</p>
                  </div>
                </div>
                      
                {/* Icon Box Card 5 - Guaranteed Results On Every Package */}
                <div className="group relative bg-gradient-to-br from-[#18192a]/90 via-[#1a1b3a]/70 to-[#0a0a13]/90 backdrop-blur-xl rounded-3xl p-8 lg:p-10 border-2 border-white/20 hover:border-[#59e3a5]/50 transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(89,227,165,0.3)] hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/10 via-transparent to-[#14c0ff]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-6 flex items-center justify-center bg-gradient-to-br from-[#59e3a5] to-[#14c0ff] rounded-2xl shadow-[0_10px_30px_0_rgba(89,227,165,0.4)] transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-black text-[1.6875rem] sm:text-[1.9375rem] mb-4 leading-tight">Guaranteed <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Results</span> On Every Package</h3>
                    <p className="text-gray-300 text-[1.25rem] sm:text-[1.1875rem] leading-relaxed">You'll know the <b className="text-white">exact</b> range of <b className="text-white">placements</b> and <b className="text-white">streams</b> you're getting before you spend a dollar, so you're not gambling or crossing your fingers or hoping for the best. You're making a <b className="text-white">calculated investment</b> with a guaranteed floor, which means you can finally budget your music career like a <b className="text-white">real business</b> instead of throwing money at the wall.</p>
                  </div>
                </div>

                {/* Icon Box Card 6 - 10+ Years of Curator Relationships */}
                <div className="group relative bg-gradient-to-br from-[#18192a]/90 via-[#1a1b3a]/70 to-[#0a0a13]/90 backdrop-blur-xl rounded-3xl p-8 lg:p-10 border-2 border-white/20 hover:border-[#14c0ff]/50 transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(20,192,255,0.3)] hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#14c0ff]/10 via-transparent to-[#59e3a5]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-6 flex items-center justify-center bg-gradient-to-br from-[#14c0ff] to-[#59e3a5] rounded-2xl shadow-[0_10px_30px_0_rgba(20,192,255,0.4)] transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-black text-[1.6875rem] sm:text-[1.9375rem] mb-4 leading-tight"><span className="bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] bg-clip-text text-transparent">10+ Years</span> of Curator <span className="bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] bg-clip-text text-transparent">Relationships</span> You Can't Build Yourself</h3>
                    <p className="text-gray-300 text-[1.25rem] sm:text-[1.1875rem] leading-relaxed">You're getting <b className="text-white">instant access</b> to the same playlist network major labels spend <b className="text-white">six figures</b> accessing. That means you skip the <b className="text-white">7-8 years</b> of cold emails, ghosted DMs, and rejected submissions it would take to build these connections yourself. Spend that time actually <b className="text-white">making music</b> instead of begging curators to even <i className="text-white">listen</i> to your song.</p>
                  </div>
                </div>
                      
              </div>
            </div>
            
            {/* CTA Button After Icon Boxes */}
            <div className="text-center mt-[-5rem] sm:mt-12">
              <button
                onClick={scrollToTrackInput}
                className="px-16 py-5 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-700 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-xl"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Get My Song On Playlists
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          </div>
          {/* Shape Divider */}
          <div className="relative z-10 pb-48" style={{ height: '200px', width: '110vw', left: '-5vw', position: 'relative', transform: 'rotate(8deg)', background: 'transparent', marginTop: '-60px', marginBottom: '85px' }}>
            {/* All background elements removed for full transparency */}
            
            {/* Background foundation */}
            <div className="absolute inset-0 z-10" style={{ background: 'transparent' }}></div>
            
            {/* Base layer - darkest */}
            <svg
              className="absolute inset-0 w-full h-full z-10"
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
              className="absolute inset-0 w-full h-full z-10"
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
              className="absolute inset-0 w-full h-full z-10"
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
              className="absolute inset-0 w-full h-full z-10"
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

          {/* Desktop How It Works Sections - 4 Separate Sections */}
          
          {/* Step 1 Section - Left Column */}
          <section className="hidden lg:block py-8 px-4 relative z-20" style={{ background: 'transparent' }}>
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Column - Step 1 Text */}
                <div className="order-2 lg:order-1">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mb-1" style={{ lineHeight: '1.2' }}>
                    STEP 1
                  </h2>
                  <h3 className="text-[calc(1.875rem+0.4rem)] sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 md:mb-8" style={{ lineHeight: '1.2' }}>
                    Drop Your Track, We Handle The Rest
                  </h3>
                  <p className="text-[calc(0.95rem+0.2rem)] sm:text-[0.95rem] md:text-[1.4rem] text-gray-300 leading-relaxed pb-8 md:pb-12">
                    Paste your Spotify link or search your song title. Takes 30 seconds, then you're done. No spreadsheets to build, no curator emails to track down, no guessing which playlists might actually fit your vibe. While you go back to making music and enjoying your life, our team is analyzing your track's DNA: the genre, the subgenre, the tempo, the mood, the energy, even the vocal delivery style. We're matching your sound against thousands of curators in our network who are actively building playlists in your exact lane right now. This isn't guesswork. We know these curators personally, we know what they're adding this week, and we know exactly which ones are going to love your sound the second they hear it.
                  </p>
                  <button
                    onClick={scrollToTrackInput}
                    className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:from-[#14c0ff] hover:to-[#59e3a5] transition-all duration-300 flex items-center justify-end mt-2"
                  >
                    Get My Placements Now →
                  </button>
                </div>

                {/* Right Column - Step 1 Phone Mockup */}
                <div className="order-1 lg:order-2 flex justify-center">
                  {/* Background Glow Effect */}
                  <div className="relative">
                    <div className="absolute inset-0 -m-8 bg-gradient-to-br from-[#59e3a5]/30 via-[#14c0ff]/40 to-[#8b5cf6]/30 rounded-full blur-3xl opacity-80 animate-pulse"></div>
                    
                    {/* Phone Frame */}
                    <div className="w-56 h-[420px] md:w-72 md:h-[540px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl relative z-10 border border-gray-700/50">
                      <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                        {/* Status Bar */}
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
                        
                        {/* App Header */}
                        <div className="px-4 md:px-8 py-4 border-b border-white/10">
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <img src="/fasho-logo-wide.png" alt="Fasho" className="w-8 md:w-10 h-auto" />
                            <h3 className="text-white font-bold whitespace-nowrap text-xs md:text-lg" style={{
                              fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0.925rem'
                            }}>Find Your Song</h3>
                          </div>
                        </div>
                        
                        {/* Step 1 Screen Content */}
                        <div className="flex-1 relative">
                          {/* Search Input Mockup */}
                          <div style={{ padding: '20px 16px', overflow: 'visible' }}>
                            <div className="relative" style={{ overflow: 'visible' }}>
                              {/* Search Input Field */}
                              <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-gray-400 transition-all duration-300" style={{ padding: '12px', fontSize: '13px' }}>
                                {/* Animated typing effect */}
                                <div className="flex items-center">
                                  <span className="text-white typing-animation" style={{minWidth: 0, fontSize: '13px'}}>The Weeknd</span>
                                  <div style={{ marginLeft: '3px', width: '1.5px', height: '16px', backgroundColor: '#14c0ff' }} className="cursor-blink"></div>
                                </div>
                              </div>
                              {/* Animated search results - Only show AFTER typing completes */}
                              <div className="search-results" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="bg-white/5 rounded-lg border border-white/5 result-item result-card-clickable" style={{ padding: '12px' }}>
                                  <div className="flex items-center" style={{ gap: '10px' }}>
                                    <img src="/weekend1.jpg" alt="Starboy" className="rounded-md object-cover" style={{ width: '40px', height: '40px' }} />
                                    <div className="flex-1">
                                      <div className="text-white font-medium" style={{ fontSize: '14px' }}>Starboy</div>
                                      <div className="text-gray-400" style={{ fontSize: '12px' }}>The Weeknd ft. Daft Punk</div>
                                    </div>
                                    {/* Green checkmark in corner */}
                                    <div className="bg-[#59e3a5] rounded-full flex items-center justify-center result-checkmark" style={{ width: '16px', height: '16px' }}>
                                      <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '10px', height: '10px' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-white/5 rounded-lg border border-white/5 result-item" style={{ padding: '12px' }}>
                                  <div className="flex items-center" style={{ gap: '10px' }}>
                                    <img src="/weekend2.jpg" alt="Can't Feel My Face" className="rounded-md object-cover" style={{ width: '40px', height: '40px' }} />
                                    <div className="flex-1">
                                      <div className="text-white font-medium" style={{ fontSize: '14px' }}>Can't Feel My Face</div>
                                      <div className="text-gray-400" style={{ fontSize: '12px' }}>The Weeknd</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Static Magnifying Glass Icon - Always visible, not animated */}
                              <div className="flex justify-center" style={{ marginTop: '20px' }}>
                                <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center shadow-lg" style={{ width: '40px', height: '40px' }}>
                                  <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                </div>
                              </div>
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
          {/* Step 2 Section - Right Column */}
          <section className="hidden lg:block py-20 px-4 relative z-30" style={{ background: 'transparent' }}>
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Column - Step 2 Phone Mockup */}
                <div className="order-2 lg:order-1 flex justify-center">
                  {/* Background Glow Effect */}
                  <div className="relative">
                    <div className="absolute inset-0 -m-8 bg-gradient-to-br from-[#14c0ff]/30 via-[#8b5cf6]/40 to-[#59e3a5]/30 rounded-full blur-3xl opacity-80 animate-pulse"></div>
                    
                    {/* Phone Frame */}
                    <div className="w-56 h-[420px] md:w-72 md:h-[540px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl relative z-10 border border-gray-700/50">
                      <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                        {/* Status Bar */}
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
                        
                        {/* App Header */}
                        <div className="px-4 md:px-8 py-4 border-b border-white/10">
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <img src="/fasho-logo-wide.png" alt="Fasho" className="w-8 md:w-10 h-auto" />
                            <h3 className="text-white font-bold whitespace-nowrap text-xs md:text-lg" style={{
                              fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0.925rem'
                            }}>Build Your Package</h3>
                          </div>
                        </div>
                        
                        {/* Step 2 Screen Content */}
                        <div className="flex-1 relative">
                          {/* Step 2 Mockup Content */}
                          <div className="flex flex-col h-full" style={{ padding: '20px' }}>
                            {/* Song Info Card */}
                            <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-xl shadow-[0_8px_32px_0_rgba(20,192,255,0.35)] relative" style={{ padding: '1px', marginBottom: '20px' }}>
                              {/* 25% OFF Badge */}
                              <div className="absolute bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold rounded-md z-10" style={{ top: '-8px', right: '-8px', fontSize: '10px', padding: '3px 6px' }}>
                                25% OFF
                              </div>
                              <div className="flex items-center w-full bg-gradient-to-r from-[#23272f] to-[#1a1a2e] rounded-xl" style={{ padding: '12px', gap: '12px' }}>
                                <img src="/weekend1.jpg" alt="Starboy" className="rounded-lg object-cover shadow-md border border-white/10 flex-shrink-0" style={{ width: '48px', height: '48px' }} />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-white truncate text-left" style={{ fontSize: '14px' }}>Starboy</div>
                                  <div className="text-gray-300 truncate text-left" style={{ fontSize: '12px' }}>The Weeknd ft. Daft Punk</div>
                                </div>
                              </div>
                            </div>
                            {/* Package Selection Mockup */}
                            <div className="flex flex-col" style={{ gap: '12px' }}>
                              <div className="bg-white/5 rounded-lg border border-white/10 flex flex-col items-center relative package-card-clickable" style={{ padding: '12px' }}>
                                <div className="text-white font-bold" style={{ fontSize: '14px', marginBottom: '3px' }}>MOMENTUM</div>
                                <div className="text-white font-black" style={{ fontSize: '18px', marginBottom: '3px' }}>$79</div>
                                <div className="text-white/80" style={{ fontSize: '11px' }}>7,500 - 8,500 Streams</div>
                                {/* Green checkmark in corner */}
                                <div className="absolute bg-[#59e3a5] rounded-full flex items-center justify-center package-checkmark" style={{ top: '8px', right: '8px', width: '14px', height: '14px' }}>
                                  <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '8px', height: '8px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                              <div className="bg-white/5 rounded-lg border border-white/10 flex flex-col items-center" style={{ padding: '12px' }}>
                                <div className="text-white font-bold" style={{ fontSize: '14px', marginBottom: '3px' }}>BREAKTHROUGH</div>
                                <div className="text-white font-black" style={{ fontSize: '18px', marginBottom: '3px' }}>$39</div>
                                <div className="text-white/80" style={{ fontSize: '11px' }}>3,000 - 3,500 Streams</div>
                              </div>
                              {/* Next Step Button */}
                              <button className="w-full bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200" style={{ padding: '12px', fontSize: '14px' }}>
                                Next Step
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Step 2 Text */}
                <div className="order-1 lg:order-2">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent mb-1" style={{ lineHeight: '1.2' }}>
                    STEP 2
                  </h2>
                  <h3 className="text-[calc(1.875rem+0.4rem)] sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 md:mb-8" style={{ lineHeight: '1.2' }}>
                    Pick A Package
                  </h3>
                  <p className="text-[calc(0.95rem+0.2rem)] sm:text-[0.95rem] md:text-[1.4rem] text-gray-300 leading-relaxed pb-8 md:pb-12">
                    Choose the campaign level that matches where you're at. If you just dropped your first single and need those crucial first placements to prove this is real—we got you. If you're sitting on 10K monthly listeners and ready to 10x that number—we got that too. Every package guarantees a range of results: playlist counts, stream estimates, follower reach. No vague promises, no "we'll try our best" nonsense. You'll see the splash your music will make before you pay a single dollar. Got an EP? Stack additional tracks and save 25% on each additional song. Got an album rollout planned? Run multiple campaigns and watch each release build on the last one's momentum like clockwork.
                  </p>
                  <button
                    onClick={scrollToTrackInput}
                    className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#14c0ff] transition-all duration-300 flex items-center justify-end mt-2"
                  >
                    Show My Package Options →
                  </button>
                </div>
              </div>
            </div>
          </section>
          {/* Step 3 Section - Left Column */}
          <section className="hidden lg:block py-20 px-4 relative z-40" style={{ background: 'transparent' }}>
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Column - Step 3 Text */}
                <div className="order-2 lg:order-1">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] bg-clip-text text-transparent mb-1" style={{ lineHeight: '1.2' }}>
                    STEP 3
                  </h2>
                  <h3 className="text-[calc(1.875rem+0.4rem)] sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 md:mb-8" style={{ lineHeight: '1.2' }}>
                    Our Team Goes To Work
                  </h3>
                  <p className="text-[calc(0.95rem+0.2rem)] sm:text-[0.95rem] md:text-[1.4rem] text-gray-300 leading-relaxed pb-8 md:pb-12">
                    Here's what happens behind the scenes while you wait: Our team starts reaching out to every curator in our network who matches your sound. We're not sending desperate cold emails that every artist has tried before. We're texting Marcus who runs that 340K follower R&B playlist. We're calling Jessica who curates three different lo-fi lists with 2M combined followers. We're DMing Nicky G. who's been asking us for more Latin trap. These people actually answer when we reach out because we've been delivering them quality music for over 10 years. "Hey, remember that artist we placed last month who's now at 50K monthly listeners? Got another one in that same lane." That's the conversation happening about YOUR song. Personal relationships, real credibility, curators who trust our taste because we've never wasted their time.
                  </p>
                  <button
                    onClick={scrollToTrackInput}
                    className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] hover:from-[#59e3a5] hover:to-[#8b5cf6] transition-all duration-300 flex items-center justify-end mt-2"
                  >
                    Let's Build My Momentum →
                  </button>
                </div>

                {/* Right Column - Step 3 Phone Mockup */}
                <div className="order-1 lg:order-2 flex justify-center">
                  {/* Background Glow Effect */}
                  <div className="relative">
                    <div className="absolute inset-0 -m-8 bg-gradient-to-br from-[#8b5cf6]/30 via-[#59e3a5]/40 to-[#14c0ff]/30 rounded-full blur-3xl opacity-80 animate-pulse"></div>
                    
                    {/* Phone Frame */}
                    <div className="w-56 h-[420px] md:w-72 md:h-[540px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl relative z-10 border border-gray-700/50">
                      <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                        {/* Status Bar */}
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
                        
                        {/* App Header */}
                        <div className="px-4 md:px-8 py-4 border-b border-white/10">
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <img src="/fasho-logo-wide.png" alt="Fasho" className="w-8 md:w-10 h-auto" />
                            <h3 className="text-white font-bold whitespace-nowrap text-xs md:text-lg" style={{
                              fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0.925rem'
                            }}>We Get You Placed</h3>
                          </div>
                        </div>
                        
                        {/* Step 3 Screen Content */}
                        <div className="flex-1 relative">
                          {/* Step 3 Mockup Content - Lottie Animation */}
                          <div className="flex flex-col h-full" style={{ padding: '4px', paddingBottom: '6px' }}>
                            {/* Lottie Animation - Large size positioned at very top */}
                            <div className="w-full flex items-start justify-center" style={{ marginBottom: '4px', marginTop: '-8px' }}>
                              {step3Lottie && (
                                <Lottie
                                  autoplay
                                  loop
                                  animationData={step3Lottie}
                                  style={{ width: '110%', height: '110%' }}
                                  rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                                />
                              )}
                            </div>
                            
                            {/* Text content with gradient and drop shadow */}
                            <div className="text-center" style={{ marginTop: '8px' }}>
                              <p className="font-bold leading-relaxed bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))', fontSize: '12px' }}>
                                Direct access to curators of the world's biggest playlists. They know us, they trust us, and they love our artists.
                              </p>
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

          {/* Step 4 Section - Right Column */}
          <section className="hidden lg:block py-20 px-4 relative z-50" style={{ background: 'transparent' }}>
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Column - Step 4 Phone Mockup */}
                <div className="order-2 lg:order-1 flex justify-center">
                  {/* Background Glow Effect */}
                  <div className="relative">
                    <div className="absolute inset-0 -m-8 bg-gradient-to-br from-[#59e3a5]/30 via-[#8b5cf6]/40 to-[#14c0ff]/30 rounded-full blur-3xl opacity-80 animate-pulse"></div>
                    
                    {/* Phone Frame */}
                    <div className="w-56 h-[420px] md:w-72 md:h-[540px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl relative z-10 border border-gray-700/50">
                      <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                        {/* Status Bar */}
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
                        
                        {/* App Header */}
                        <div className="px-4 md:px-8 py-4 border-b border-white/10">
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <img src="/fasho-logo-wide.png" alt="Fasho" className="w-8 md:w-10 h-auto" />
                            <h3 className="text-white font-bold whitespace-nowrap text-xs md:text-lg" style={{
                              fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0.925rem'
                            }}>Watch Your Success</h3>
                          </div>
                        </div>
                        
                        {/* Step 4 Screen Content */}
                        <div className="flex-1 relative">
                          {/* Step 4 Mockup Content - Lottie Animation and Chat Message */}
                          <div className="flex flex-col h-full" style={{ padding: '12px', paddingBottom: '6px' }}>
                            {/* Lottie Animation - Large size positioned at very top */}
                            <div className="w-full flex items-start justify-center" style={{ marginBottom: '12px' }}>
                              {step4Lottie && (
                                <Lottie
                                  autoplay
                                  loop
                                  animationData={step4Lottie}
                                  style={{ width: '110%', height: '110%' }}
                                  rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                                />
                              )}
                            </div>
                            
                            {/* Chat Message Mockup */}
                            <div className="text-center" style={{ marginTop: '40px' }}>
                              <div className="bg-white/10 backdrop-blur-sm rounded-xl relative border border-white/20" style={{ padding: '12px', margin: '0 12px' }}>
                                {/* Chat bubble tail - single downward arrow */}
                                <div className="absolute bg-white/10 rotate-45 border-r border-b border-white/20" style={{ bottom: '-6px', left: '18px', width: '12px', height: '12px' }}></div>
                                
                                {/* Message content */}
                                <div className="flex items-center" style={{ marginBottom: '8px' }}>
                                  {/* Avatar */}
                                  <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0" style={{ width: '24px', height: '24px', marginRight: '8px' }}>
                                    <span className="text-white font-bold" style={{ fontSize: '11px' }}>J</span>
                                  </div>
                                  {/* Message Text */}
                                  <div className="flex-1 text-left">
                                    <p className="text-white font-medium" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                                      Dude you're going<br />viral! 🔥
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Timestamp at bottom right */}
                                <div className="flex justify-end">
                                  <span className="text-gray-400" style={{ fontSize: '9px' }}>just now</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Step 4 Text */}
                <div className="order-1 lg:order-2">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#59e3a5] to-[#8b5cf6] bg-clip-text text-transparent mb-1" style={{ lineHeight: '1.2' }}>
                    STEP 4
                  </h2>
                  <h3 className="text-[calc(1.5rem+0.3rem)] sm:text-2xl md:text-3xl lg:text-4xl font-black text-white mb-4 md:mb-8" style={{ lineHeight: '1.2' }}>
                    Watch Your Career Explode
                  </h3>
                  <p className="text-[calc(0.95rem+0.2rem)] sm:text-[0.95rem] md:text-[1.4rem] text-gray-300 leading-relaxed pb-8 md:pb-12">
                    48 to 72 hours after your campaign launches, everything changes. You wake up, open Spotify for Artists out of habit, and..... Your monthly listeners jumped like crazy overnight. You refresh. New playlist just added your track. Refresh again. Another one. That app that used to make you feel like something's missing? Now you're checking it six times a day just to watch the numbers climb. Your friends start texting you screenshots: "Yo I just heard your song on this playlist." Your TikTok video that used to get 340 views? Now it's getting 200K+ because new listeners are finding your socials. This is what actual momentum feels like—not hoping and manifesting and waiting for lightning to strike. You're watching your career move in real life, and for the first moment since you started this whole music thing, you're not wondering if you're wasting your time & energy. You're in the game now.
                  </p>
                  <button
                    onClick={scrollToTrackInput}
                    className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#59e3a5] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#59e3a5] transition-all duration-300 flex items-center justify-end mt-2"
                  >
                    I'm Ready To Blow Up →
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Mobile How It Works Sections (individual static sections) - Only visible on Mobile */}
          
                        {/* Mobile Step 1 Section */}
              <section className="block lg:hidden py-4 px-4 relative z-20">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mb-4" style={{ fontSize: '3rem', lineHeight: '1.2' }}>
                      STEP 1
                    </h2>
                <h3 className="text-[calc(1.5rem+0.4rem)] sm:text-2xl md:text-3xl font-black text-white mb-6" style={{ lineHeight: '1.2' }}>
                  Drop Your Track, We Handle The Rest
                </h3>
                <p className="text-[calc(1rem+0.2rem)] sm:text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                  Paste your Spotify link or search your song title. Takes 30 seconds, then you're done. No spreadsheets to build, no curator emails to track down, no guessing which playlists might actually fit your vibe. While you go back to making music and enjoying your life, our team is analyzing your track's DNA: the genre, the subgenre, the tempo, the mood, the energy, even the vocal delivery style. We're matching your sound against thousands of curators in our network who are actively building playlists in your exact lane right now. This isn't guesswork. We know these curators personally, we know what they're adding this week, and we know exactly which ones are going to love your sound the second they hear it.
                </p>
                <button
                  onClick={scrollToTrackInput}
                  className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:from-[#14c0ff] hover:to-[#59e3a5] transition-all duration-300 inline-flex items-center sm:text-2xl"
                  style={{ fontSize: '1.375rem', marginTop: '2.5rem' }}
                >
                  Get My Placements Now →
                </button>
              </div>

              {/* Mobile Phone Mockup for Step 1 */}
              <div className="flex justify-center mb-16">
                {/* Background Glow Effect */}
                <div className="relative">
                  <div className="absolute inset-0 -m-8 bg-gradient-to-br from-[#59e3a5]/30 via-[#14c0ff]/40 to-[#8b5cf6]/30 rounded-full blur-3xl opacity-80 animate-pulse"></div>
                  
                  {/* Phone Frame */}
                  <div className="relative w-64 h-[480px] md:w-80 md:h-[600px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl border border-gray-700/50">
                    <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                      {/* Status Bar */}
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
                      
                      {/* App Header */}
                      <div className="px-4 md:px-8 py-4 border-b border-white/10">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <img src="/fasho-logo-wide.png" alt="Fasho" className="w-8 md:w-10 h-auto" />
                          <h3 className="text-white font-bold whitespace-nowrap text-xs md:text-lg" style={{ 
                            fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0.925rem'
                          }}>Find Your Song</h3>
                        </div>
                      </div>
                      
                      {/* Screen Content - Copied from Desktop */}
                      <div className="flex-1 relative">
                        <div style={{ padding: '20px 16px', overflow: 'visible' }}>
                          <div className="relative" style={{ overflow: 'visible' }}>
                            {/* Search Input Field */}
                            <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-gray-400 transition-all duration-300" style={{ padding: '12px', fontSize: '13px' }}>
                              {/* Animated typing effect */}
                              <div className="flex items-center">
                                <span className="text-white typing-animation" style={{minWidth: 0, fontSize: '13px'}}>The Weeknd</span>
                                <div style={{ marginLeft: '3px', width: '1.5px', height: '16px', backgroundColor: '#14c0ff' }} className="cursor-blink"></div>
                              </div>
                            </div>
                            {/* Animated search results */}
                            <div className="search-results" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div className="bg-white/5 rounded-lg border border-white/5 result-item result-card-clickable" style={{ padding: '12px' }}>
                                <div className="flex items-center" style={{ gap: '10px' }}>
                                  <img src="/weekend1.jpg" alt="Starboy" className="rounded-md object-cover" style={{ width: '40px', height: '40px' }} />
                                  <div className="flex-1">
                                    <div className="text-white font-medium" style={{ fontSize: '14px' }}>Starboy</div>
                                    <div className="text-gray-400" style={{ fontSize: '12px' }}>The Weeknd ft. Daft Punk</div>
                                  </div>
                                  {/* Green checkmark in corner */}
                                  <div className="bg-[#59e3a5] rounded-full flex items-center justify-center result-checkmark" style={{ width: '16px', height: '16px' }}>
                                    <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '10px', height: '10px' }}>
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white/5 rounded-lg border border-white/5 result-item" style={{ padding: '12px' }}>
                                <div className="flex items-center" style={{ gap: '10px' }}>
                                  <img src="/weekend2.jpg" alt="Can't Feel My Face" className="rounded-md object-cover" style={{ width: '40px', height: '40px' }} />
                                  <div className="flex-1">
                                    <div className="text-white font-medium" style={{ fontSize: '14px' }}>Can't Feel My Face</div>
                                    <div className="text-gray-400" style={{ fontSize: '12px' }}>The Weeknd</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Static Magnifying Glass Icon */}
                            <div className="flex justify-center" style={{ marginTop: '20px' }}>
                              <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center shadow-lg" style={{ width: '40px', height: '40px' }}>
                                <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
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

                        {/* Mobile Step 2 Section */}
              <section className="block lg:hidden py-16 px-4 relative z-20">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="font-black bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent mb-4" style={{ fontSize: '3rem', lineHeight: '1.2' }}>
                      STEP 2
                    </h2>
                <h3 className="text-[calc(1.5rem+0.4rem)] sm:text-2xl md:text-3xl font-black text-white mb-6" style={{ lineHeight: '1.2' }}>
                  Pick A Package
                </h3>
                <p className="text-[calc(1rem+0.2rem)] sm:text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                  Choose the campaign level that matches where you're at. If you just dropped your first single and need those crucial first placements to prove this is real—we got you. If you're sitting on 10K monthly listeners and ready to 10x that number—we got that too. Every package guarantees a range of results: playlist counts, stream estimates, follower reach. No vague promises, no "we'll try our best" nonsense. You'll see the splash your music will make before you pay a single dollar. Got an EP? Stack additional tracks and save 25% on each additional song. Got an album rollout planned? Run multiple campaigns and watch each release build on the last one's momentum like clockwork.
                </p>
                <button
                  onClick={scrollToTrackInput}
                  className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#14c0ff] transition-all duration-300 inline-flex items-center sm:text-2xl"
                  style={{ fontSize: '1.375rem', marginTop: '2.5rem' }}
                >
                  Show My Package Options →
                </button>
              </div>

              {/* Mobile Phone Mockup for Step 2 */}
              <div className="flex justify-center mb-16">
                <div className="relative">
                  <div className="absolute inset-0 -m-8 bg-gradient-to-br from-[#14c0ff]/30 via-[#8b5cf6]/40 to-[#59e3a5]/30 rounded-full blur-3xl opacity-80 animate-pulse"></div>
                  
                  <div className="relative w-64 h-[480px] md:w-80 md:h-[600px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl border border-gray-700/50">
                    <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                      {/* Status Bar */}
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
                      
                      {/* App Header */}
                      <div className="px-4 md:px-8 py-4 border-b border-white/10">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <img src="/fasho-logo-wide.png" alt="Fasho" className="w-8 md:w-10 h-auto" />
                          <h3 className="text-white font-bold whitespace-nowrap text-xs md:text-lg" style={{ 
                            fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0.925rem'
                          }}>Build Your Package</h3>
                        </div>
                      </div>
                      
                      {/* Screen Content - Copied from Desktop */}
                      <div className="flex-1 relative">
                        <div className="flex flex-col h-full" style={{ padding: '20px' }}>
                          {/* Song Info Card */}
                          <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-xl shadow-[0_8px_32px_0_rgba(20,192,255,0.35)] relative" style={{ padding: '1px', marginBottom: '20px' }}>
                            {/* 25% OFF Badge */}
                            <div className="absolute bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold rounded-md z-10" style={{ top: '-8px', right: '-8px', fontSize: '10px', padding: '3px 6px' }}>
                              25% OFF
                            </div>
                            <div className="flex items-center w-full bg-gradient-to-r from-[#23272f] to-[#1a1a2e] rounded-xl" style={{ padding: '12px', gap: '12px' }}>
                              <img src="/weekend1.jpg" alt="Starboy" className="rounded-lg object-cover shadow-md border border-white/10 flex-shrink-0" style={{ width: '48px', height: '48px' }} />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-white truncate text-left" style={{ fontSize: '14px' }}>Starboy</div>
                                <div className="text-gray-300 truncate text-left" style={{ fontSize: '12px' }}>The Weeknd ft. Daft Punk</div>
                              </div>
                            </div>
                          </div>
                          {/* Package Selection Mockup */}
                                                     <div className="flex flex-col" style={{ gap: '12px' }}>
                             <div className="bg-white/5 rounded-lg border border-white/10 flex flex-col items-center relative package-card-clickable" style={{ padding: '12px' }}>
                               <div className="text-white font-bold" style={{ fontSize: '14px', marginBottom: '3px' }}>MOMENTUM</div>
                               <div className="text-white font-black" style={{ fontSize: '18px', marginBottom: '3px' }}>$79</div>
                               <div className="text-white/80" style={{ fontSize: '11px' }}>7,500 - 8,500 Streams</div>
                               {/* Green checkmark in corner */}
                               <div className="absolute bg-[#59e3a5] rounded-full flex items-center justify-center package-checkmark" style={{ top: '8px', right: '8px', width: '14px', height: '14px' }}>
                                 <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '8px', height: '8px' }}>
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                 </svg>
                               </div>
                             </div>
                             <div className="bg-white/5 rounded-lg border border-white/10 flex flex-col items-center" style={{ padding: '12px' }}>
                               <div className="text-white font-bold" style={{ fontSize: '14px', marginBottom: '3px' }}>BREAKTHROUGH</div>
                               <div className="text-white font-black" style={{ fontSize: '18px', marginBottom: '3px' }}>$39</div>
                               <div className="text-white/80" style={{ fontSize: '11px' }}>3,000 - 3,500 Streams</div>
                             </div>
                            {/* Next Step Button */}
                            <button className="w-full bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200" style={{ padding: '12px', fontSize: '14px' }}>
                              Next Step
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

                        {/* Mobile Step 3 Section */}
              <section className="block lg:hidden py-8 px-4 relative z-20">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="font-black bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] bg-clip-text text-transparent mb-4" style={{ fontSize: '3rem', lineHeight: '1.2' }}>
                      STEP 3
                    </h2>
                <h3 className="text-[calc(1.5rem+0.4rem)] sm:text-2xl md:text-3xl font-black text-white mb-6" style={{ lineHeight: '1.2' }}>
                  Our Team Goes To Work
                </h3>
                <p className="text-[calc(1rem+0.2rem)] sm:text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                  Here's what happens behind the scenes while you wait: Our team starts reaching out to every curator in our network who matches your sound. We're not sending desperate cold emails that every artist has tried before. We're texting Marcus who runs that 340K follower R&B playlist. We're calling Jessica who curates three different lo-fi lists with 2M combined followers. We're DMing Nicky G. who's been asking us for more Latin trap. These people actually answer when we reach out because we've been delivering them quality music for over 10 years. "Hey, remember that artist we placed last month who's now at 50K monthly listeners? Got another one in that same lane." That's the conversation happening about YOUR song. Personal relationships, real credibility, curators who trust our taste because we've never wasted their time.
                </p>
                <button
                  onClick={scrollToTrackInput}
                  className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] hover:from-[#59e3a5] hover:to-[#8b5cf6] transition-all duration-300 inline-flex items-center sm:text-2xl"
                  style={{ fontSize: '1.375rem', marginTop: '2.5rem' }}
                >
                  Let's Build My Momentum →
                </button>
              </div>

              {/* Mobile Phone Mockup for Step 3 */}
              <div className="flex justify-center mb-16">
                <div className="relative">
                  <div className="absolute inset-0 -m-8 bg-gradient-to-br from-[#8b5cf6]/30 via-[#59e3a5]/40 to-[#14c0ff]/30 rounded-full blur-3xl opacity-80 animate-pulse"></div>
                  
                  <div className="relative w-64 h-[480px] md:w-80 md:h-[600px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl border border-gray-700/50">
                    <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                      {/* Status Bar */}
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
                      
                      {/* App Header */}
                      <div className="px-4 md:px-8 py-4 border-b border-white/10">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <img src="/fasho-logo-wide.png" alt="Fasho" className="w-8 md:w-10 h-auto" />
                          <h3 className="text-white font-bold whitespace-nowrap text-xs md:text-lg" style={{ 
                            fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0.925rem'
                          }}>We Get You Placed</h3>
                        </div>
                      </div>
                      
                      {/* Screen Content - Copied from Desktop */}
                      <div className="flex-1 relative">
                        <div className="flex flex-col h-full" style={{ padding: '4px', paddingBottom: '6px' }}>
                          {/* Lottie Animation - Large size positioned at very top */}
                          <div className="w-full flex items-start justify-center" style={{ marginBottom: '4px', marginTop: '-8px' }}>
                            {step3Lottie && (
                              <Lottie
                                autoplay
                                loop
                                animationData={step3Lottie}
                                style={{ width: '110%', height: '110%' }}
                                rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                              />
                            )}
                          </div>
                          
                          {/* Text content with gradient and drop shadow */}
                          <div className="text-center" style={{ marginTop: '8px' }}>
                            <p className="font-bold leading-relaxed bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))', fontSize: '12px' }}>
                              Direct access to curators of the world's biggest playlists. They know us, they trust us, and they love our artists.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Mobile Step 4 Section */}
          <section className="block lg:hidden py-8 px-4 relative z-20">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                                 <h2 className="font-black bg-gradient-to-r from-[#59e3a5] to-[#8b5cf6] bg-clip-text text-transparent mb-4" style={{ fontSize: '3rem', lineHeight: '1.2' }}>
                    STEP 4
                  </h2>
                <h3 className="text-[calc(1.5rem+0.3rem)] sm:text-2xl md:text-3xl font-black text-white mb-6" style={{ lineHeight: '1.2' }}>
                  Watch Your Career Explode
                </h3>
                <p className="text-[calc(1rem+0.2rem)] sm:text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                  48 to 72 hours after your campaign launches, everything changes. You wake up, open Spotify for Artists out of habit, and..... Your monthly listeners jumped like crazy overnight. You refresh. New playlist just added your track. Refresh again. Another one. That app that used to make you feel like something's missing? Now you're checking it six times a day just to watch the numbers climb. Your friends start texting you screenshots: "Yo I just heard your song on this playlist." Your TikTok video that used to get 340 views? Now it's getting 200K+ because new listeners are finding your socials. This is what actual momentum feels like—not hoping and manifesting and waiting for lightning to strike. You're watching your career move in real life, and for the first moment since you started this whole music thing, you're not wondering if you're wasting your time & energy. You're in the game now.
                </p>
                <button
                  onClick={scrollToTrackInput}
                  className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#59e3a5] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#59e3a5] transition-all duration-300 inline-flex items-center sm:text-2xl"
                  style={{ fontSize: '1.375rem', marginTop: '2.5rem' }}
                >
                  I'm Ready To Blow Up →
                </button>
              </div>

              {/* Mobile Phone Mockup for Step 4 */}
              <div className="flex justify-center mb-16">
                <div className="relative">
                  <div className="absolute inset-0 -m-8 bg-gradient-to-br from-[#59e3a5]/30 via-[#8b5cf6]/40 to-[#14c0ff]/30 rounded-full blur-3xl opacity-80 animate-pulse"></div>
                  
                  <div className="relative w-64 h-[480px] md:w-80 md:h-[600px] bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-[3rem] p-2 shadow-2xl border border-gray-700/50">
                    <div className="w-full h-full bg-gradient-to-br from-[#18192a] to-[#0a0a13] rounded-[2.5rem] relative overflow-hidden flex flex-col">
                      {/* Status Bar */}
                      <div className="flex justify-between items-center px-8 py-4 text-white text-sm relative">
                        <span>9:41</span>
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                          <div className="w-12 h-2 bg-white rounded-full" style={{marginBottom: '2px'}}></div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-6 h-3 border border-white rounded-sm">
                            <div className="w-4 h-1 bg-white rounded-sm m-0.5"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* App Header */}
                      <div className="px-4 md:px-8 py-4 border-b border-white/10">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <img src="/fasho-logo-wide.png" alt="Fasho" className="w-8 md:w-10 h-auto" />
                          <h3 className="text-white font-bold whitespace-nowrap text-xs md:text-lg" style={{ 
                            fontSize: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0.925rem'
                          }}>Watch Your Success</h3>
                        </div>
                      </div>
                      
                      {/* Screen Content - Copied from Desktop */}
                      <div className="flex-1 relative">
                        <div className="flex flex-col h-full" style={{ padding: '12px', paddingBottom: '6px' }}>
                          {/* Lottie Animation - Large size positioned at very top */}
                          <div className="w-full flex items-start justify-center" style={{ marginBottom: '12px' }}>
                            {step4Lottie && (
                              <Lottie
                                autoplay
                                loop
                                animationData={step4Lottie}
                                style={{ width: '110%', height: '110%' }}
                                rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                              />
                            )}
                          </div>
                          
                          {/* Chat Message Mockup */}
                          <div className="text-center" style={{ marginTop: '40px' }}>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl relative border border-white/20" style={{ padding: '12px', margin: '0 12px' }}>
                              {/* Chat bubble tail - single downward arrow */}
                              <div className="absolute bg-white/10 rotate-45 border-r border-b border-white/20" style={{ bottom: '-6px', left: '18px', width: '12px', height: '12px' }}></div>
                              
                              {/* Message content */}
                              <div className="flex items-center" style={{ marginBottom: '8px' }}>
                                {/* Avatar */}
                                <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0" style={{ width: '24px', height: '24px', marginRight: '8px' }}>
                                  <span className="text-white font-bold" style={{ fontSize: '11px' }}>J</span>
                                </div>
                                {/* Message Text */}
                                <div className="flex-1 text-left">
                                  <p className="text-white font-medium" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                                    Dude you're going<br />viral! 🔥
                                  </p>
                                </div>
                              </div>
                              
                              {/* Timestamp at bottom right */}
                              <div className="flex justify-end">
                                <span className="text-gray-400" style={{ fontSize: '9px' }}>just now</span>
                              </div>
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

          {/* Mobile CTA Section */}
          <section className="block lg:hidden py-16 px-4 relative z-20">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-[calc(1.25rem+0.25rem)] sm:text-xl md:text-2xl font-black text-white max-w-3xl mx-auto leading-relaxed mb-[calc(1rem+5px)] sm:mb-8 -mt-8 sm:-mt-4">
                You've been grinding for months with barely anything to show for it. That ends today. Submit your track, we activate our curators, and within 72hrs you're watching playlist placements stack up while your friends ask how the hell you're blowing up so fast.
              </h3>
              
              <button
                onClick={scrollToTrackInput}
                className="px-12 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-700 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-lg"
              >
                <span className="relative z-10">I'M READY TO BLOW UP</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          </section>

          {/* Track Your Success Section - Desktop Only */}
          <section className="hidden lg:block pb-24 px-4 relative z-10 pt-20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h3 
                  ref={forgetTextRef}
                  className={`text-[calc(1.5rem+0.25rem)] sm:text-2xl md:text-3xl lg:text-4xl font-black text-white max-w-3xl mx-auto leading-relaxed lg:leading-[1.5] ${forgetTextInView ? 'animate-fade-in-up' : 'opacity-0'} -mt-[10px] sm:mt-0 mb-[5px] sm:mb-0`}
                >
                  You've been grinding for months with barely anything to show for it. That ends today. Submit your track, we activate our curators, and within 72hrs you're watching playlist placements stack up while your friends ask how the hell you're blowing up so fast.
                </h3>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <button
                  ref={blowUpButtonRef as any}
                  onClick={scrollToTrackInput}
                  className={`px-12 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-lg ${blowUpButtonInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                >
                  <span className="relative z-10">I'M READY TO BLOW UP</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </div>
          </section>

          {/* Shape Divider After CTA Button */}
          <div className="relative z-10 pb-48" style={{ height: '200px', width: '110vw', left: '-5vw', position: 'relative', transform: 'rotate(8deg)', background: 'transparent', marginTop: '15px', marginBottom: '85px' }}>
            {/* All background elements removed for full transparency */}
            
            {/* Background foundation */}
            <div className="absolute inset-0 z-10" style={{ background: 'transparent' }}></div>
            
            {/* Base layer - darkest */}
            <svg
              className="absolute inset-0 w-full h-full z-10"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
              style={{ filter: 'drop-shadow(0 4px 20px rgba(20, 192, 255, 0.4))' }}
            >
              <defs>
                <linearGradient id="phoneShapeGradient5" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d="M-200,30 C100,120 300,10 500,90 C700,170 900,20 1100,100 C1300,180 1500,15 1640,70 L1640,150 C1500,120 1300,160 1100,140 C900,120 700,180 500,160 C300,140 100,190 -200,170 Z"
                fill="url(#phoneShapeGradient5)"
              />
            </svg>

            {/* Middle layer */}
            <svg
              className="absolute inset-0 w-full h-full z-10"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
              style={{ filter: 'drop-shadow(0 4px 16px rgba(89, 227, 165, 0.4))' }}
            >
              <defs>
                <linearGradient id="phoneShapeGradient6" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <path
                d="M-200,45 C150,140 400,15 650,110 C900,190 1150,25 1400,125 C1550,165 1640,55 1640,55 L1640,145 C1550,115 1400,185 1150,125 C900,75 650,195 400,145 C150,95 -200,195 -200,195 Z"
                fill="url(#phoneShapeGradient6)"
              />
            </svg>

            {/* Top layer - brightest */}
            <svg
              className="absolute inset-0 w-full h-full z-10"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
              style={{ filter: 'drop-shadow(0 2px 12px rgba(139, 92, 246, 0.5))' }}
            >
              <defs>
                <linearGradient id="phoneShapeGradient7" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M-200,65 C200,155 450,20 700,120 C950,185 1200,30 1450,135 C1600,175 1640,70 1640,70 L1640,125 C1600,95 1450,180 1200,125 C950,55 700,185 450,135 C200,75 -200,75 -200,75 Z"
                fill="url(#phoneShapeGradient7)"
              />
            </svg>

            {/* Additional accent layer */}
            <svg
              className="absolute inset-0 w-full h-full z-10"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
              style={{ filter: 'drop-shadow(0 1px 8px rgba(89, 227, 165, 0.3))' }}
            >
              <defs>
                <linearGradient id="phoneShapeGradient8" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.82" />
                  <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.82" />
                </linearGradient>
              </defs>
              <path
                d="M-200,55 C120,15 280,150 440,65 C600,20 760,165 920,75 C1080,25 1240,145 1400,85 C1520,55 1640,115 1640,115 L1640,165 C1520,135 1400,185 1240,165 C1080,135 920,195 760,175 C600,155 440,195 280,175 C120,155 -200,185 -200,185 Z"
                fill="url(#phoneShapeGradient8)"
              />
            </svg>

            {/* Enhanced sparkles layer - bright white/silver sparkles */}
            <svg
              className="absolute inset-0 w-full h-full z-10"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
            >
              <circle cx="200" cy="50" r="1.2" fill="#f5f5f5" opacity="0.9">
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="450" cy="80" r="0.8" fill="#ffffff" opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="680" cy="35" r="1.5" fill="#f5f5f5" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="920" cy="110" r="1.0" fill="#ffffff" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.15;0.6" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="1150" cy="45" r="0.9" fill="#f5f5f5" opacity="0.75">
                <animate attributeName="opacity" values="0.75;0.25;0.75" dur="1.9s" repeatCount="indefinite" />
              </circle>
              <circle cx="1320" cy="90" r="1.1" fill="#ffffff" opacity="0.65">
                <animate attributeName="opacity" values="0.65;0.05;0.65" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="350" cy="140" r="0.7" fill="#f5f5f5" opacity="0.55">
                <animate attributeName="opacity" values="0.55;0.1;0.55" dur="1.7s" repeatCount="indefinite" />
              </circle>
              <circle cx="600" cy="160" r="1.3" fill="#ffffff" opacity="0.85">
                <animate attributeName="opacity" values="0.85;0.3;0.85" dur="2.0s" repeatCount="indefinite" />
              </circle>
              <circle cx="850" cy="25" r="0.6" fill="#f5f5f5" opacity="0.5">
                <animate attributeName="opacity" values="0.5;0.08;0.5" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="1050" cy="170" r="1.4" fill="#ffffff" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="1250" cy="155" r="0.9" fill="#f5f5f5" opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.12;0.7" dur="2.3s" repeatCount="indefinite" />
              </circle>
              <circle cx="750" cy="120" r="0.8" fill="#ffffff" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.18;0.6" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="500" cy="185" r="1.0" fill="#f5f5f5" opacity="0.65">
                <animate attributeName="opacity" values="0.65;0.25;0.65" dur="2.1s" repeatCount="indefinite" />
              </circle>
              <circle cx="1120" cy="75" r="0.8" fill="#f5f5f5" opacity="0.44">
                <animate attributeName="opacity" values="0.44;0.13;0.44" dur="2.3s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Testimonials Section */}
          <section className="pt-12 md:pt-24 pb-24 md:pb-24 px-4 relative z-30 overflow-visible" style={{ background: 'transparent' }}>
            <div className="max-w-screen-2xl mx-auto overflow-visible">
              {/* Section Header */}
              <div className="text-center mb-12">
                <h2 
                  ref={testimonialsHeadingRef}
                  className={`text-4xl md:text-5xl lg:text-6xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent ${testimonialsHeadingInView ? 'animate-fade-in-up' : 'opacity-0'}`} 
                  style={{ 
                    lineHeight: '1.3', 
                    marginTop: typeof window !== 'undefined' && window.innerWidth < 640 ? '0px' : '-50px',
                    fontSize: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(2.25rem + 0.25rem)' : undefined
                  }}
                >
                  Real Artists. Real Results. Real Talk.
                </h2>
                <p 
                  ref={testimonialsSubheadingRef}
                  className={`text-[1.275rem] md:text-[1.4rem] text-gray-300 max-w-4xl mx-auto leading-relaxed font-bold ${testimonialsSubheadingInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                  style={{
                    fontSize: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(1.275rem - 0.15rem)' : undefined
                  }}
                >
                  Don't just take our word for it. Here's what creators who actually use FASHO.co have to say about their experience.
                </p>
              </div>

              {/* Testimonials Carousel */}
              <div className="relative overflow-visible mb-16 pr-8 pt-8 z-40">
                {/* Fixed Background Glow Layers - Stay in place while testimonials slide over */}
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                  {/* Create multiple gradient spots positioned at different locations - taller to match testimonial cards */}
                  <div className="absolute top-0 left-[10%] w-80 bg-gradient-to-br from-[#59e3a5]/30 to-[#14c0ff]/20 rounded-full blur-xl opacity-60" style={{ height: '544px' }}></div>
                  <div className="absolute top-0 left-[40%] w-80 bg-gradient-to-br from-[#8b5cf6]/25 to-[#59e3a5]/15 rounded-full blur-xl opacity-50" style={{ height: '496px' }}></div>
                  <div className="absolute top-0 left-[70%] w-80 bg-gradient-to-br from-[#14c0ff]/30 to-[#8b5cf6]/20 rounded-full blur-xl opacity-55" style={{ height: '488px' }}></div>
                  <div className="absolute top-0 left-[90%] w-80 bg-gradient-to-br from-[#59e3a5]/25 to-[#14c0ff]/15 rounded-full blur-xl opacity-45" style={{ height: '488px' }}></div>
                </div>
                
                <div 
                  className="testimonial-carousel flex transition-transform duration-[2000ms] ease-in-out relative"
                  style={{ 
                    transform: `translateX(-${currentTestimonialIndex * (isMobile ? 66.67 : 24.5)}vw)`,
                    width: `${(testimonials.length * 2) * (isMobile ? 66.67 : 24.5)}vw`,
                    zIndex: 2
                  }}
                >
                  {/* Render testimonials twice for seamless loop */}
                  {[...testimonials, ...testimonials].map((testimonial, index) => (
                    <div key={index} className="flex-shrink-0 px-2 w-[66.67vw] md:w-[24.5vw]">
                      <div 
                        className="relative group max-w-xs mx-auto"
                        onMouseEnter={() => {
                          // Clear any existing resume timeout
                          if (resumeTimeout) {
                            clearTimeout(resumeTimeout);
                            setResumeTimeout(null);
                          }
                          setIsCarouselPaused(true);
                        }}
                        onMouseLeave={() => {
                          // Resume after 250ms delay
                          const timeout = setTimeout(() => {
                            setIsCarouselPaused(false);
                            setResumeTimeout(null);
                          }, 250);
                          setResumeTimeout(timeout);
                        }}
                      >
                        <div className={`relative bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/90 to-[#0a0a13]/95 rounded-3xl p-4 border-2 border-white/10 backdrop-blur-sm hover:${testimonial.border} transition-all duration-500 group-hover:transform group-hover:scale-105 shadow-2xl`}>
                          {/* Large Profile Image */}
                          <div className="w-36 h-36 mx-auto mb-4 rounded-2xl overflow-hidden shadow-2xl">
                            <img 
                              src={testimonial.image}
                              alt={testimonial.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* 5-Star Rating - Gradient with Glow */}
                          <div className="flex justify-center mb-4 space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="relative">
                                <div className={`absolute inset-0 bg-gradient-to-r ${testimonial.starGradient} rounded-full blur-md opacity-60`}></div>
                                <svg className="relative w-6 h-6 fill-current drop-shadow-lg" viewBox="0 0 24 24">
                                  <defs>
                                    <linearGradient id={`starGradient${index}-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor={testimonial.starGradient.includes('59e3a5') ? '#59e3a5' : testimonial.starGradient.includes('8b5cf6') ? '#8b5cf6' : '#14c0ff'} />
                                      <stop offset="100%" stopColor={testimonial.starGradient.includes('14c0ff') ? '#14c0ff' : testimonial.starGradient.includes('59e3a5') ? '#59e3a5' : '#8b5cf6'} />
                                    </linearGradient>
                                  </defs>
                                  <path fill={`url(#starGradient${index}-${i})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              </div>
                            ))}
                          </div>

                          {/* Name and Title */}
                          <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-white mb-0.5">{testimonial.name}</h3>
                            <p className="text-gray-400 text-base">{testimonial.title}</p>
                          </div>

                          {/* Testimonial */}
                          <blockquote 
                            className="text-gray-300 leading-relaxed text-center italic" 
                            style={{ fontSize: isMobile ? '0.97rem' : '1.07rem' }}
                          >
                            "{testimonial.quote}"
                          </blockquote>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <div className="text-center mt-8 md:mt-12">
                <button
                  onClick={scrollToTrackInput}
                  className="px-16 py-5 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-xl"
                >
                  <span className="relative z-10">I'M READY TO BE NEXT!</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </div>
          </section>

          {/* Shape Divider - Under Testimonials CTA */}
          <div className="relative z-30 pb-16 mt-40 md:mt-0 -mb-20 md:mb-0" style={{ height: '200px', width: '120vw', left: '-10vw', position: 'relative', transform: typeof window !== 'undefined' && window.innerWidth < 640 ? 'rotate(-8deg) translateY(-120px)' : 'rotate(-8deg) translateY(5px)', background: 'transparent' }}>
            {/* All background elements removed for full transparency */}
            
            {/* Base layer - darkest */}
            <svg
              className="absolute inset-0 w-full h-full z-40"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
              style={{ filter: 'drop-shadow(0 4px 20px rgba(20, 192, 255, 0.4))' }}
            >
              <defs>
                <linearGradient id="testimonialShapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d="M-200,30 C100,120 300,10 500,90 C700,170 900,20 1100,100 C1300,180 1500,15 1640,70 L1640,150 C1500,120 1300,160 1100,140 C900,120 700,180 500,160 C300,140 100,190 -200,170 Z"
                fill="url(#testimonialShapeGradient1)"
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
                <linearGradient id="testimonialShapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <path
                d="M-200,45 C150,140 400,15 650,110 C900,190 1150,25 1400,125 C1550,165 1640,55 1640,55 L1640,145 C1550,115 1400,185 1150,125 C900,75 650,195 400,145 C150,95 -200,195 -200,195 Z"
                fill="url(#testimonialShapeGradient2)"
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
                <linearGradient id="testimonialShapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M-200,65 C200,155 450,20 700,120 C950,185 1200,30 1450,135 C1600,175 1640,70 1640,70 L1640,125 C1600,95 1450,180 1200,125 C950,55 700,185 450,135 C200,75 -200,75 -200,75 Z"
                fill="url(#testimonialShapeGradient3)"
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
                <linearGradient id="testimonialShapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.82" />
                  <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.82" />
                </linearGradient>
              </defs>
              <path
                d="M-200,55 C120,15 280,150 440,65 C600,20 760,165 920,75 C1080,25 1240,145 1400,85 C1520,55 1640,115 1640,115 L1640,165 C1520,135 1400,185 1240,165 C1080,135 920,195 760,175 C600,155 440,195 280,175 C120,155 -200,185 -200,185 Z"
                fill="url(#testimonialShapeGradient4)"
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
                <path d="M0,-2.5 L0.7,-0.7 L2.5,0 L0.7,0.7 L0,2.5 L-0.7,0.7 L-2.5,0 L-0.7,-0.7 Z" fill="#ffffff">
                  <animateTransform attributeName="transform" type="rotate" values="0;360" dur="12s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.57;0.26;0.57" dur="2.9s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1380,125)" opacity="0.53">
                <path d="M0,-2.1 L0.6,-0.6 L2.1,0 L0.6,0.6 L0,2.1 L-0.6,0.6 L-2.1,0 L-0.6,-0.6 Z" fill="#f8f8f8">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.53;0.2;0.53" dur="3.7s" repeatCount="indefinite" />
                </path>
              </g>

              {/* Animated star sparkles - exterior locations (reduced by 30%) */}
              <g transform="translate(120,25)" opacity="0.49">
                <path d="M0,-1.9 L0.55,-0.55 L1.9,0 L0.55,0.55 L0,1.9 L-0.55,0.55 L-1.9,0 L-0.55,-0.55 Z" fill="#f0f0f0">
                  <animateTransform attributeName="transform" type="rotate" values="0;360" dur="15s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.49;0.14;0.49" dur="4.2s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1450,35)" opacity="0.51">
                <path d="M0,-2.0 L0.6,-0.6 L2.0,0 L0.6,0.6 L0,2.0 L-0.6,0.6 L-2.0,0 L-0.6,-0.6 Z" fill="#ffffff">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="11s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.51;0.17;0.51" dur="3.8s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(80,185)" opacity="0.47">
                <path d="M0,-1.7 L0.5,-0.5 L1.7,0 L0.5,0.5 L0,1.7 L-0.5,0.5 L-1.7,0 L-0.5,-0.5 Z" fill="#f5f5f5">
                  <animateTransform attributeName="transform" type="rotate" values="0;360" dur="13s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.47;0.11;0.47" dur="4.5s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1380,190)" opacity="0.5">
                <path d="M0,-2.1 L0.6,-0.6 L2.1,0 L0.6,0.6 L0,2.1 L-0.6,0.6 L-2.1,0 L-0.6,-0.6 Z" fill="#ffffff">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3.1s" repeatCount="indefinite" />
                </path>
              </g>
            </svg>
          </div>

          {/* Dashboard Preview Section */}
          <section className="py-0 md:py-24 px-4 md:px-12 lg:px-20 pb-24 md:pb-48 relative z-15 overflow-hidden">
            {/* Extended gradient overlay that flows into next section */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#18192a] via-[#16213e] to-[#0a0a13] -z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent to-[#18192a] -z-5"></div>
            
            {/* Mobile-only smooth gradient transition overlay */}
            <div className="sm:hidden absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-[#0a0a13] z-20"></div>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-4 md:mb-16">
                <h2 
                  ref={commandCenterRef}
                  className={`text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mt-[25px] md:mt-0 pt-[10px] sm:pt-0 ${commandCenterInView ? 'animate-fade-in-up' : 'opacity-0'}`} 
                  style={{ lineHeight: '1.3' }}
                >
                  <span className="block sm:inline">Your Personal</span>
                  <span className="block sm:inline sm:ml-2">Command Center</span>
                </h2>
                <p 
                  ref={dashboardDescRef}
                  className={`text-xl lg:text-[1.4rem] text-gray-300 max-w-3xl mx-auto leading-relaxed ${dashboardDescInView ? 'animate-fade-in-up' : 'opacity-0'} mb-[25px] sm:mb-[10px]`}
                  style={{ 
                    hyphens: 'none', 
                    WebkitHyphens: 'none', 
                    MozHyphens: 'none', 
                    msHyphens: 'none', 
                    wordBreak: 'keep-all', 
                    overflowWrap: 'break-word' 
                  }}
                >
                  Everything you need in one clean dashboard. Launch campaigns, track your growth, and hit us up when you need anything. All from one elite platform.
                </p>
              </div>
              {/* Browser Window Mockup */}
              <div ref={dashboardRef} className="relative flex justify-center -mb-[700px] md:-mb-[25px]">
                {/* Background Glow Effect */}
                <div className="absolute inset-0 -m-16 rounded-3xl opacity-50 blur-3xl bg-gradient-to-r from-[#59e3a5]/30 via-[#14c0ff]/40 to-[#8b5cf6]/30 animate-pulse"></div>
                
                {/* Centering container for scaled mockup */}
                <div className="flex justify-center items-start w-full overflow-visible">
                  <div
                    suppressHydrationWarning={true}
                    className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-t-2xl shadow-2xl transition-transform duration-700 ease-out relative z-10"
                    style={{
                      transform: `scale(${dashboardScale})`,
                      width: '1200px',
                      minWidth: '1200px',
                      transformOrigin: 'top center',
                    }}
                  >
                    {/* Browser Header */}
                    <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-t-2xl border-b border-white/10" style={{ padding: '12px 16px' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center" style={{ gap: '8px' }}>
                          <div className="flex" style={{ gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%' }}></div>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#eab308', borderRadius: '50%' }}></div>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
                          </div>
                        </div>
                        <div className="flex-1" style={{ margin: '0 24px' }}>
                          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/20" style={{ padding: '6px 12px', textAlign: 'center' }}>
                            <span className="text-white font-mono" style={{ fontSize: '14px' }}>fasho.co/dashboard</span>
                          </div>
                        </div>
                        <div style={{ width: '80px' }}></div>
                      </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-b-2xl relative" style={{ padding: '1px' }}>
                      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-b-2xl relative" style={{ padding: '24px' }}>
                      
                        {/* Fade to transparent overlay for bottom 10% */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#16213e] via-[#16213e]/90 to-transparent rounded-b-2xl pointer-events-none z-10" style={{ height: '10%' }}></div>
                        
                        {/* Dashboard Header */}
                        <div className="flex items-center justify-between" style={{ marginBottom: '32px' }}>
                          <div className="flex items-center" style={{ gap: '16px' }}>
                            <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-xl flex items-center justify-center" style={{ width: '56px', height: '56px' }}>
                              <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-bold text-white" style={{ fontSize: '18px' }}>Campaign Dashboard</h3>
                              <p className="text-gray-400" style={{ fontSize: '12px' }}>Real-time performance metrics</p>
                            </div>
                          </div>
                          <div className="flex items-center" style={{ gap: '12px' }}>
                            <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white rounded-lg font-semibold animate-pulse" style={{ padding: '8px 16px', fontSize: '12px' }}>
                              LIVE
                            </div>
                          </div>
                        </div>

                        {/* Top Stats Grid - Only 3 cards now */}
                        <div className="flex" style={{ gap: '16px', marginBottom: '32px' }}>
                          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 backdrop-blur-sm" style={{ padding: '16px', width: '360px' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                              <div className="text-gray-400 font-medium" style={{ fontSize: '12px' }}>Estimated Streams</div>
                              <div className="bg-green-400 rounded-full animate-pulse" style={{ width: '8px', height: '8px' }}></div>
                            </div>
                            <div className="font-bold text-white" style={{ fontSize: '18px', marginBottom: '2px' }}>247,382</div>
                            <div className="flex items-center text-green-400" style={{ fontSize: '10px' }}>
                              <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '12px', height: '12px', marginRight: '4px' }}>
                                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              +23% this week
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 backdrop-blur-sm" style={{ padding: '16px', width: '360px' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                              <div className="text-gray-400 font-medium" style={{ fontSize: '12px' }}>Playlist Adds</div>
                              <div className="bg-blue-400 rounded-full animate-pulse" style={{ width: '8px', height: '8px' }}></div>
                            </div>
                            <div className="font-bold text-white" style={{ fontSize: '18px', marginBottom: '2px' }}>47</div>
                            <div className="flex items-center text-blue-400" style={{ fontSize: '10px' }}>
                              <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '12px', height: '12px', marginRight: '4px' }}>
                                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              +12 new placements
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 backdrop-blur-sm" style={{ padding: '16px', width: '360px' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                              <div className="text-gray-400 font-medium" style={{ fontSize: '12px' }}>Active Campaigns</div>
                              <div className="bg-purple-400 rounded-full animate-pulse" style={{ width: '8px', height: '8px' }}></div>
                            </div>
                            <div className="font-bold text-white" style={{ fontSize: '18px', marginBottom: '2px' }}>3</div>
                            <div className="flex items-center text-purple-400" style={{ fontSize: '10px' }}>
                              <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '12px', height: '12px', marginRight: '4px' }}>
                                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              2 launching soon
                            </div>
                          </div>
                        </div>

                      {/* Chart and Artist Profile Section */}
                      <div className="flex" style={{ gap: '24px', marginBottom: '24px' }}>
                        {/* Animated Chart Section - Takes 2/3 width */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 backdrop-blur-sm" style={{ padding: '24px', width: '776px' }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                            <h4 className="text-white font-semibold" style={{ fontSize: '16px' }}>Stream Growth Analytics</h4>
                            <div className="flex items-center" style={{ gap: '12px' }}>
                              <div className="flex items-center text-gray-400" style={{ gap: '8px', fontSize: '11px' }}>
                                <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full" style={{ width: '12px', height: '12px' }}></div>
                                <span>Streams</span>
                      </div>
                              <div className="flex items-center text-gray-400" style={{ gap: '8px', fontSize: '11px' }}>
                                <div className="bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-full" style={{ width: '12px', height: '12px' }}></div>
                                <span>Saves</span>
                    </div>
                  </div>
                </div>
                          
                          {/* Animated Line Chart with Bouncing Data Points */}
                          <div className="relative bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-lg overflow-hidden" style={{ height: '160px', padding: '16px' }}>
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
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 backdrop-blur-sm" style={{ padding: '24px', width: '352px' }}>
                          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                            <h4 className="text-white font-semibold" style={{ fontSize: '18px' }}>Artist Profile</h4>
                            <svg className="text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                          </div>
                          
                          {/* Artist Info */}
                          <div className="text-center" style={{ marginBottom: '24px' }}>
                            <img src="/weekend1.jpg" alt="The Weeknd" className="rounded-full mx-auto border-2 border-[#14c0ff]/50" style={{ width: '80px', height: '80px', marginBottom: '12px' }} />
                            <h5 className="text-white font-bold" style={{ fontSize: '18px' }}>The Weeknd</h5>
                            <p className="text-gray-400" style={{ fontSize: '14px' }}>Verified Artist</p>
                          </div>
                          
                          {/* Artist Stats */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400" style={{ fontSize: '14px' }}>Monthly Listeners</span>
                              <span className="text-white font-semibold">94.2M</span>
                          </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400" style={{ fontSize: '14px' }}>Followers</span>
                              <span className="text-white font-semibold">47.8M</span>
                        </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400" style={{ fontSize: '14px' }}>World Rank</span>
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

              {/* CTA Button */}
              <div className="relative z-50 text-center mt-12 lg:mt-16 cta-button-spacing show-packages-btn-z">
                <button
                  onClick={scrollToTrackInput}
                  className="px-12 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-700 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-lg sm:mt-[50px]"
                >
                  <span className="relative z-10">SHOW ME THE PACKAGES</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </div>
          </section>
          {/* Curator Connect+ Section */}
          <section className="py-0 md:py-24 px-4 md:px-12 lg:px-20 pb-0 md:pb-48 relative z-5 overflow-hidden" style={{ background: 'transparent' }}>
            {/* Extended gradient overlay that flows into next section */}
            <div className="absolute inset-0 bg-transparent -z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent to-[#0a0a13] -z-5"></div>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-[calc(1.875rem+0.15rem)] sm:text-3xl md:text-4xl lg:text-5xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent pt-[85px] sm:pt-0" style={{ lineHeight: '1.3' }}>
                  <span className="block sm:inline">650+ Indie Playlists</span>
                  <span className="block sm:inline sm:ml-2">At Your Fingertips</span>
                </h2>
                <p className="text-xl lg:text-[1.4rem] text-gray-300 max-w-4xl mx-auto leading-relaxed" style={{ 
                    hyphens: 'none', 
                    WebkitHyphens: 'none', 
                    MozHyphens: 'none', 
                    msHyphens: 'none', 
                    wordBreak: 'keep-all', 
                    overflowWrap: 'break-word' 
                }}>
                  Our campaigns are already designed to make you famous without you lifting a finger. But if you're ambitious and want to COMPOUND your results, <span className="bg-gradient-to-r from-[#8b5cf6] via-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent font-bold">Curator Connect+</span> gives you access to our handpicked database of 650+ curator contacts. A tool worth millions, 100% FREE for all members.
                </p>
              </div>

              {/* Browser Window Mockup - Curator Connect+ */}
              <div ref={curatorRef} className="relative flex justify-center -mb-[690px] md:-mb-[50px]">
                {/* Background Glow Effect */}
                <div className="absolute inset-0 -m-16 rounded-3xl opacity-50 blur-3xl bg-gradient-to-r from-[#8b5cf6]/30 via-[#59e3a5]/40 to-[#14c0ff]/30 animate-pulse"></div>
                
                {/* Centering container for scaled mockup */}
                <div className="flex justify-center items-start w-full overflow-visible">
                  <div
                    suppressHydrationWarning={true}
                    className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-t-2xl shadow-2xl transition-transform duration-700 ease-out relative z-10 curator-mockup-mobile-height"
                    style={{
                      transform: `scale(${curatorScale})`,
                      width: '1200px',
                      minWidth: '1200px',
                      transformOrigin: 'top center',
                    }}
                  >
                    {/* Browser Header */}
                    <div className="bg-gradient-to-r from-[#8b5cf6] via-[#59e3a5] to-[#14c0ff] rounded-t-2xl border-b border-white/10" style={{ padding: '12px 16px' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center" style={{ gap: '8px' }}>
                          <div className="flex" style={{ gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%' }}></div>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#eab308', borderRadius: '50%' }}></div>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
                          </div>
                        </div>
                        <div className="flex-1" style={{ margin: '0 24px' }}>
                          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/20" style={{ padding: '6px 12px', textAlign: 'center' }}>
                            <span className="text-white font-mono" style={{ fontSize: '14px' }}>fasho.co/dashboard</span>
                          </div>
                        </div>
                        <div style={{ width: '80px' }}></div>
                      </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="bg-gradient-to-r from-[#8b5cf6] via-[#59e3a5] to-[#14c0ff] rounded-b-2xl relative" style={{ padding: '1px' }}>
                      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-b-2xl relative curator-mockup-content-mobile-minh" style={{ padding: '24px' }}>
                        
                        {/* Fade to transparent overlay for bottom 10% */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#16213e] via-[#16213e]/90 to-transparent rounded-b-2xl pointer-events-none z-10" style={{ height: '10%' }}></div>
                        
                        {/* Curator Connect+ Header */}
                        <div className="flex items-center justify-between" style={{ marginBottom: '32px' }}>
                          <div className="flex items-center" style={{ gap: '16px' }}>
                            <div className="bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] rounded-xl flex items-center justify-center" style={{ width: '56px', height: '56px' }}>
                              <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-bold text-white" style={{ fontSize: '28px' }}>Curator Connect+</h3>
                            </div>
                          </div>
                            </div>

                        {/* Filters Section */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 backdrop-blur-sm" style={{ padding: '20px', marginBottom: '24px' }}>
                          <div className="grid grid-cols-4 gap-4">
                            {/* Search */}
                            <div>
                              <label className="block text-base font-medium text-gray-300 mb-2">Search Playlists</label>
                              <input
                                type="text"
                                placeholder="Search by name..."
                                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#59e3a5] text-sm"
                                style={{ fontSize: '14px' }}
                              />
                          </div>

                            {/* Genre Filter */}
                            <div>
                              <label className="block text-base font-medium text-gray-300 mb-2">Genre</label>
                              <button className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#59e3a5] flex items-center justify-between text-base">
                                <span className="text-gray-400">All Genres</span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                        </div>

                            {/* Min Followers */}
                            <div>
                              <label className="block text-base font-medium text-gray-300 mb-2">Min Followers</label>
                              <input
                                type="number"
                                placeholder="Minimum"
                                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#59e3a5] text-sm"
                                style={{ fontSize: '14px' }}
                              />
                            </div>

                            {/* Status Filter */}
                            <div>
                              <label className="block text-base font-medium text-gray-300 mb-2">Status</label>
                              <button className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#59e3a5] flex items-center justify-between text-base">
                                <span className="text-gray-400">All</span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Sort Controls */}
                          <div className="mt-4 flex gap-4 items-center">
                            <span className="text-base font-medium text-gray-300">Sort by:</span>
                            <button className="px-3 py-1 rounded-lg text-base font-medium bg-[#59e3a5] text-white">
                              Followers ↓
                            </button>
                            <button className="px-3 py-1 rounded-lg text-base font-medium bg-gray-700 text-gray-300 hover:bg-gray-600">
                              Name
                            </button>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-base text-gray-400">
                            Showing 15 of 650 curators
                            </div>
                          </div>
                          
                        {/* Curators Table */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 backdrop-blur-sm overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-800/50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Playlist</th>
                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Genre</th>
                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Followers</th>
                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800/30">
                                {/* Curator Row 1 */}
                                <tr className="hover:bg-gray-800/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#59e3a5] to-[#14c0ff] rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">🎵</span>
                            </div>
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-base">Morning Coffee Vibes ☕</div>
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-1.5 py-0.5 text-sm font-medium border border-gray-600 text-gray-300 rounded">
                                            View Playlist
                                          </span>
                            </div>
                          </div>
                        </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#59e3a5]/20 text-[#59e3a5]">
                                        Chill
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#14c0ff]/20 text-[#14c0ff]">
                                        Acoustic
                                      </span>
                      </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-white font-medium text-base">127.4K</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-400/20 text-green-400">
                                      Available
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-3 py-1 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200">
                                      Contact
                                    </button>
                                  </td>
                                </tr>

                                {/* Curator Row 2 */}
                                <tr className="hover:bg-gray-800/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#8b5cf6] to-[#59e3a5] rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">🔥</span>
                    </div>
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-base">Late Night Drive 🌙</div>
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-1.5 py-0.5 text-sm font-medium border border-gray-600 text-gray-300 rounded">
                                            View Playlist
                                          </span>
                  </div>
                </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#8b5cf6]/20 text-[#8b5cf6]">
                                        R&B
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#ec4899]/20 text-[#ec4899]">
                                        Chill
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-white font-medium text-base">89.2K</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-400">
                                      Available
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-3 py-1 rounded-lg text-xs font-medium hover:shadow-lg transition-all duration-200">
                                      Contact
                                    </button>
                                  </td>
                                </tr>

                                {/* Curator Row 3 */}
                                <tr className="hover:bg-gray-800/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#14c0ff] to-[#8b5cf6] rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">💎</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-base">Beach Party Bangers 🏖️</div>
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-1.5 py-0.5 text-sm font-medium border border-gray-600 text-gray-300 rounded">
                                            View Playlist
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#14c0ff]/20 text-[#14c0ff]">
                                        Electronic
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#8b5cf6]/20 text-[#8b5cf6]">
                                        Party
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-white font-medium text-base">203.7K</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-400/20 text-green-400">
                                      Available
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-3 py-1 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200">
                                      Contact
                                    </button>
                                  </td>
                                </tr>

                                {/* Curator Row 4 */}
                                <tr className="hover:bg-gray-800/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#ec4899] to-[#59e3a5] rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">🌙</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-base">Smooth R&B Sessions</div>
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-1.5 py-0.5 text-sm font-medium border border-gray-600 text-gray-300 rounded">
                                            View Playlist
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#ec4899]/20 text-[#ec4899]">
                                        R&B
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#59e3a5]/20 text-[#59e3a5]">
                                        Soul
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-white font-medium text-base">156.8K</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-400/20 text-green-400">
                                      Available
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-3 py-1 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200">
                                      Contact
                                    </button>
                                  </td>
                                </tr>

                                {/* Curator Row 5 */}
                                <tr className="hover:bg-gray-800/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#f59e0b] to-[#ec4899] rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">🎸</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-base">Workout Motivation 💪</div>
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-1.5 py-0.5 text-sm font-medium border border-gray-600 text-gray-300 rounded">
                                            View Playlist
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#f59e0b]/20 text-[#f59e0b]">
                                        Pop
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#ec4899]/20 text-[#ec4899]">
                                        Workout
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-white font-medium text-base">94.3K</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-400/20 text-green-400">
                                      Available
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-3 py-1 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200">
                                      Contact
                                    </button>
                                  </td>
                                </tr>

                                {/* Curator Row 6 */}
                                <tr className="hover:bg-gray-800/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#10b981] to-[#14c0ff] rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">🌊</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-base">Study Lounge ✨</div>
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-1.5 py-0.5 text-sm font-medium border border-gray-600 text-gray-300 rounded">
                                            View Playlist
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#10b981]/20 text-[#10b981]">
                                        Lo-Fi
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#14c0ff]/20 text-[#14c0ff]">
                                        Study
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-white font-medium text-base">178.2K</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-400/20 text-green-400">
                                      Available
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-3 py-1 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200">
                                      Contact
                                    </button>
                                  </td>
                                </tr>

                                {/* Curator Row 7 */}
                                <tr className="hover:bg-gray-800/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#ef4444] to-[#f59e0b] rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">🔊</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-base">TikTok Viral Hits 🔥</div>
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-1.5 py-0.5 text-sm font-medium border border-gray-600 text-gray-300 rounded">
                                            View Playlist
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#ef4444]/20 text-[#ef4444]">
                                        Pop
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-[#f59e0b]/20 text-[#f59e0b]">
                                        Viral
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-white font-medium text-base">312.5K</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-400/20 text-green-400">
                                      Available
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-3 py-1 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200">
                                      Contact
                                    </button>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Small spacer to make mockup look more like a proper browser window */}
                        <div className="w-full" style={{height: '4px'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="text-center mb-20 md:mb-0 mt-16 lg:mt-16" style={{ marginBottom: '180px' }}>
                <button
                  onClick={scrollToTrackInput}
                  className="px-12 py-4 bg-gradient-to-r from-[#8b5cf6] via-[#59e3a5] to-[#14c0ff] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#59e3a5]/30 transition-all duration-700 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-lg lg:mt-[110px] lg:mb-[130px] mt-0 sm:mt-0"
                >
                  <span className="relative z-10">ACCESS CURATOR CONNECT+</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </div>
          </section>
          {/* Shape Divider - Copy of the one under Start Your Campaign */}
          <div className="relative z-30 pb-16 mt-40 md:mt-0 -mb-20 md:mb-0" style={{ height: '200px', width: '120vw', left: '-10vw', position: 'relative', transform: 'rotate(-8deg) translateY(-280px)', background: 'transparent' }}>
            {/* All background elements removed for full transparency */}
            
            {/* Base layer - darkest */}
            <svg
              className="absolute inset-0 w-full h-full z-40"
              viewBox="0 0 1440 200"
              preserveAspectRatio="none"
              style={{ filter: 'drop-shadow(0 4px 20px rgba(20, 192, 255, 0.4))' }}
            >
              <defs>
                <linearGradient id="genreShapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d="M-200,30 C100,120 300,10 500,90 C700,170 900,20 1100,100 C1300,180 1500,15 1640,70 L1640,150 C1500,120 1300,160 1100,140 C900,120 700,180 500,160 C300,140 100,190 -200,170 Z"
                fill="url(#genreShapeGradient1)"
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
                <linearGradient id="genreShapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <path
                d="M-200,45 C150,140 400,15 650,110 C900,190 1150,25 1400,125 C1550,165 1640,55 1640,55 L1640,145 C1550,115 1400,185 1150,125 C900,75 650,195 400,145 C150,95 -200,195 -200,195 Z"
                fill="url(#genreShapeGradient2)"
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
                <linearGradient id="genreShapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M-200,65 C200,155 450,20 700,120 C950,185 1200,30 1450,135 C1600,175 1640,70 1640,70 L1640,125 C1600,95 1450,180 1200,125 C950,55 700,185 450,135 C200,75 -200,75 -200,75 Z"
                fill="url(#genreShapeGradient3)"
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
                <linearGradient id="genreShapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.82" />
                  <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.82" />
                </linearGradient>
              </defs>
              <path
                d="M-200,55 C120,15 280,150 440,65 C600,20 760,165 920,75 C1080,25 1240,145 1400,85 C1520,55 1640,115 1640,115 L1640,165 C1520,135 1400,185 1240,165 C1080,135 920,195 760,175 C600,155 440,195 280,175 C120,155 -200,185 -200,185 Z"
                fill="url(#genreShapeGradient4)"
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
                <path d="M0,-2.5 L0.7,-0.7 L2.5,0 L0.7,0.7 L0,2.5 L-0.7,0.7 L-2.5,0 L-0.7,-0.7 Z" fill="#ffffff">
                  <animateTransform attributeName="transform" type="rotate" values="0;360" dur="12s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.57;0.26;0.57" dur="2.9s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1380,125)" opacity="0.53">
                <path d="M0,-2.1 L0.6,-0.6 L2.1,0 L0.6,0.6 L0,2.1 L-0.6,0.6 L-2.1,0 L-0.6,-0.6 Z" fill="#f8f8f8">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.53;0.2;0.53" dur="3.7s" repeatCount="indefinite" />
                </path>
              </g>

              {/* Animated star sparkles - exterior locations (reduced by 30%) */}
              <g transform="translate(120,25)" opacity="0.49">
                <path d="M0,-1.9 L0.55,-0.55 L1.9,0 L0.55,0.55 L0,1.9 L-0.55,0.55 L-1.9,0 L-0.55,-0.55 Z" fill="#f0f0f0">
                  <animateTransform attributeName="transform" type="rotate" values="0;360" dur="15s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.49;0.14;0.49" dur="4.2s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1450,35)" opacity="0.51">
                <path d="M0,-2.0 L0.6,-0.6 L2.0,0 L0.6,0.6 L0,2.0 L-0.6,0.6 L-2.0,0 L-0.6,-0.6 Z" fill="#ffffff">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="11s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.51;0.17;0.51" dur="3.8s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(80,185)" opacity="0.47">
                <path d="M0,-1.7 L0.5,-0.5 L1.7,0 L0.5,0.5 L0,1.7 L-0.5,0.5 L-1.7,0 L-0.5,-0.5 Z" fill="#f5f5f5">
                  <animateTransform attributeName="transform" type="rotate" values="0;360" dur="13s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.47;0.11;0.47" dur="4.5s" repeatCount="indefinite" />
                </path>
              </g>
              <g transform="translate(1380,190)" opacity="0.5">
                <path d="M0,-2.1 L0.6,-0.6 L2.1,0 L0.6,0.6 L0,2.1 L-0.6,0.6 L-2.1,0 L-0.6,-0.6 Z" fill="#ffffff">
                  <animateTransform attributeName="transform" type="rotate" values="360;0" dur="9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3.1s" repeatCount="indefinite" />
                </path>
              </g>
            </svg>
          </div>

          {/* Genre Coverage Section */}
          <section className="pt-2 pb-24 px-4 relative z-20 -mt-52 md:mt-0 lg:-mt-20" style={{ 
            background: 'transparent'
          }}>
            <div className="max-w-7xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-8 lg:mt-[15px]">
                <h2 
                  ref={genreHeadingRef}
                  className={`text-3xl md:text-4xl lg:text-5xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent ${genreHeadingInView ? 'animate-fade-in-up' : 'opacity-0'}`} 
                  style={{ lineHeight: '1.3' }}
                >
                  " Wait, But I Make [Insert Genre Here] "
                </h2>
                <h3 
                  ref={genreSubheadingRef}
                  className={`text-xl md:text-2xl lg:text-3xl font-black text-white max-w-3xl mx-auto leading-relaxed ${genreSubheadingInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                >
                  Say less. We work with playlists in EVERY genre known to mankind.
                </h3>
              </div>

              {/* Three Column Genre Lists */}
              <div 
                ref={genreListContainerRef}
                className={`mb-16 max-w-6xl mx-auto ${genreListContainerInView ? 'animate-fade-in-up' : 'opacity-0'}`}
              >
                <div className="relative">
                  {/* Subtle gradient glow behind container */}
                  <div className="absolute inset-0 -m-4 bg-gradient-to-br from-[#59e3a5]/20 via-[#14c0ff]/15 to-[#8b5cf6]/20 rounded-3xl blur-xl -z-20"></div>
                  
                  <GlareHover
                    width="100%"
                    height="auto"
                    background="linear-gradient(135deg, rgba(0,0,0,0.95), rgba(55,55,55,0.9), rgba(0,0,0,0.95))"
                    borderRadius="24px"
                    borderColor="rgba(255, 255, 255, 0.2)"
                    glareColor="#59e3a5"
                    glareOpacity={0.1}
                    glareAngle={-30}
                    glareSize={200}
                    transitionDuration={1000}
                    playOnce={true}
                    className={`border-2 backdrop-blur-sm shadow-2xl shadow-black/20 p-6 md:p-12 transition-all duration-700 ${genreListContainerInView ? 'animate-grow-in' : 'opacity-0'}`}
                  >
                    {/* Desktop 3-column layout */}
                    <div className="hidden md:grid grid-cols-3 gap-12 justify-items-center relative ">
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

                    {/* Mobile 2-column layout */}
                    <div className="md:hidden w-full max-w-lg mx-auto pr-2 pl-[15px] relative">
                      <div className="grid grid-cols-2 gap-5 items-start">
                        {/* First Column - Mobile */}
                        <div ref={genreRow1Ref} className="space-y-4 w-full">
                          {[
                            'Hip-Hop',
                            'Pop', 
                            'R&B',
                            'EDM',
                            'Rock',
                            'Indie',
                            'Latin',
                            'Country',
                            'Jazz',
                            'Classical',
                            'Reggaeton',
                            'K-Pop',
                            'Afrobeats',
                            'House'
                          ].map((genre, index) => (
                            <div key={index} className={`flex items-center space-x-2 w-full transition-all duration-700 ${genreRow1InView ? `animate-slide-left animation-delay-${index * 25}` : 'opacity-0'}`}>
                              {/* Green Gradient Checkmark - Smaller */}
                              <div className="w-4 h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
                                <svg className="w-2.5 h-2.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                          </div>
                              <span 
                                className="text-white font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] flex-1 min-w-0"
                                style={{ 
                                  fontSize: '1.235rem',
                                  hyphens: 'none', 
                                  WebkitHyphens: 'none', 
                                  MozHyphens: 'none', 
                                  msHyphens: 'none', 
                                  wordBreak: 'keep-all', 
                                  overflowWrap: 'break-word',
                                  lineHeight: '1.4'
                                }}
                              >
                                {genre}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Second Column - Mobile */}
                        <div ref={genreRow2Ref} className="space-y-4 w-full pl-[15px]">
                          {[
                            'Trap',
                            'Lo-fi',
                            'Punk',
                            'Metal',
                            'Folk',
                            'Soul',
                            'Funk',
                            'Reggae',
                            'Gospel',
                            'Blues',
                            'Podcasts',
                            'Meditation',
                            'Workout',
                            'Study Music'
                          ].map((genre, index) => (
                            <div key={index} className={`flex items-center space-x-2 w-full transition-all duration-700 ${genreRow2InView ? `animate-slide-right animation-delay-${index * 25}` : 'opacity-0'}`}>
                              {/* Green Gradient Checkmark - Smaller */}
                              <div className="w-4 h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                                <svg className="w-2.5 h-2.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                              </div>
                              <span 
                                className="text-white font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] flex-1 min-w-0"
                                style={{ 
                                  fontSize: '1.235rem',
                                  hyphens: 'none', 
                                  WebkitHyphens: 'none', 
                                  MozHyphens: 'none', 
                                  msHyphens: 'none', 
                                  wordBreak: 'keep-all', 
                                  overflowWrap: 'break-word',
                                  lineHeight: '1.4'
                                }}
                              >
                                {genre}
                              </span>
                            </div>
                          ))}
                        </div>
                </div>
                  </div>
                </GlareHover>
                            </div>
                          </div>
                          
              {/* Bottom Subheading */}
              <div className="text-center mb-12">
                <h3 
                  ref={experimentalTextRef}
                  className={`text-2xl md:text-3xl lg:text-4xl font-black text-white max-w-4xl mx-auto leading-relaxed ${experimentalTextInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                >
                  Do you make experimental ambient-folk-trap-piano-blitz? Yup, we've got playlists for that too.
                </h3>
                            </div>

              {/* CTA Button */}
              <div className="text-center">
                <button
                  ref={campaignButtonRef as any}
                  onClick={scrollToTrackInput}
                  className={`px-12 py-4 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-lg ${campaignButtonInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                >
                  <span className="relative z-10">LET'S START MY CAMPAIGN</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
                            </div>
                          </div>
          </section>
          {/* What Playlists We Have Section */}
          <section className="py-32 px-4 pb-48 relative overflow-visible">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a13] via-[#16213e] to-[#1a1a2e]"></div>
            
            {/* Primary gradient overlay - matches main page gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#18192a] via-[#16213e] to-[#0a0a13] -z-10"></div>
            
            {/* Transition overlay - smooth blend at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent to-[#0a0a13] -z-5"></div>
            
            {/* Floating Music Note Particles */}
            <div className="absolute top-10 left-10 text-3xl text-[#59e3a5] opacity-60 animate-bounce" style={{ animationDelay: '0s' }}>♪</div>
            <div className="absolute top-32 right-5 text-4xl text-[#14c0ff] opacity-40 animate-bounce" style={{ animationDelay: '1s' }}>♫</div>
            <div className="absolute bottom-20 left-32 text-2xl text-[#8b5cf6] opacity-50 animate-bounce" style={{ animationDelay: '2s' }}>♪</div>
            <div className="absolute bottom-40 right-10 text-3xl text-[#59e3a5] opacity-30 animate-bounce" style={{ animationDelay: '0.5s' }}>♫</div>
            
            {/* Massive Glow Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-[#8b5cf6]/15 to-[#59e3a5]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="relative z-10 max-w-7xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-20">
                <h2 
                  ref={playlistsHeadingRef}
                  className={`md:text-6xl lg:text-6xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent drop-shadow-2xl ${playlistsHeadingInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                  style={{ lineHeight: '1.2', fontSize: 'clamp(2.6rem, 8vw, 4rem)' }}
                >
                  The Playlists That Actually Matter
                </h2>
                <p 
                  ref={playlistsSubheadingRef}
                  className={`text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-bold ${playlistsSubheadingInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                >
                  We have direct relationships with curators who control the world's biggest playlists.
                </p>
                            </div>

              {/* Playlist Grid with Creative Layout */}
              <div 
                ref={playlistsGridRef}
                className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 mb-16 relative z-20 opacity-100 md:opacity-100 ${playlistsGridInView ? 'animate-fade-in-up' : 'md:opacity-0'}`}
                style={{ minHeight: '200px' }}
              >
                {[
                  { name: 'RapCaviar', followers: '11M+ followers', gradient: 'from-[#e6d3b7] to-[#d4c5a9]', icon: '🎤' },
                  { name: "Today's Top Hits", followers: '33M+ followers', gradient: 'from-[#feca57] to-[#ff9ff3]', icon: '🔥' },
                  { name: 'Viva Latino', followers: '11M+ followers', gradient: 'from-[#48dbfb] to-[#0abde3]', icon: '💃' },
                  { name: 'Hot Country', followers: '7M+ followers', gradient: 'from-[#f0932b] to-[#eb4d4b]', icon: '🤠' },
                  { name: 'Beast Mode', followers: '5M+ followers', gradient: 'from-[#6c5ce7] to-[#a29bfe]', icon: '💪' },
                  { name: 'mint', followers: '6M+ followers', gradient: 'from-[#00b894] to-[#00cec9]', icon: '🌿' },
                  { name: 'Are & Be', followers: '3M+ followers', gradient: 'from-[#fd79a8] to-[#fdcb6e]', icon: '✨' },
                  { name: 'Chill Hits', followers: '6M+ followers', gradient: 'from-[#74b9ff] to-[#0984e3]', icon: '😌' },
                  { name: 'Anti Pop', followers: '2M+ followers', gradient: 'from-[#a0a0a0] to-[#ffffff]', icon: '🎸' },
                  { name: 'Jazz Vibes', followers: '3M+ followers', gradient: 'from-[#fdcb6e] to-[#e17055]', icon: '🎷' },
                  { name: 'Indie Pop', followers: '4M+ followers', gradient: 'from-[#fd79a8] to-[#6c5cf6]', icon: '🎹' },
                  { name: 'New Music Friday', followers: '6M+ followers', gradient: 'from-[#55a3ff] to-[#003d82]', icon: '🆕' },
                  { name: 'Rock This', followers: '5M+ followers', gradient: 'from-[#ff4757] to-[#c44569]', icon: '🤘' },
                  { name: 'Power Gaming', followers: '4M+ followers', gradient: 'from-[#7bed9f] to-[#2ed573]', icon: '🎮' },
                  { name: 'Mood Booster', followers: '5M+ followers', gradient: 'from-[#ffa502] to-[#ff6348]', icon: '☀️' },
                  { name: 'Mega Hit Mix', followers: '7M+ followers', gradient: 'from-[#ff3838] to-[#ff9500]', icon: '💥' }
                ].map((playlist, index) => (
                  <div key={index} className="relative group w-full max-w-sm mx-auto">
                    {/* Glow Effect Background */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${playlist.gradient} rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-all duration-500 transform group-hover:scale-110`}></div>
                    
                    {/* Card Content */}
                    <div className="relative bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/90 to-[#0a0a13]/95 rounded-2xl p-4 md:p-6 border-2 border-white/10 backdrop-blur-sm hover:border-white/30 transition-all duration-500 group-hover:transform group-hover:scale-105 shadow-2xl min-h-[180px] flex flex-col justify-center">
                      {/* Playlist Icon */}
                      <div className="text-3xl md:text-4xl mb-3 md:mb-4 text-center">{playlist.icon}</div>
                      
                      {/* Playlist Name */}
                      <h3 className={`${playlist.name === 'New Music Friday' || playlist.name === "Today's Top Hits" ? 'text-lg md:text-2xl' : 'text-xl md:text-3xl'} font-black text-center mb-2 bg-gradient-to-r ${playlist.gradient} bg-clip-text text-transparent leading-tight`}>
                        {playlist.name}
                      </h3>
                      
                      {/* Follower Count */}
                      <p className="text-gray-300 text-center font-bold text-sm md:text-lg">
                        {playlist.followers}
                      </p>
                      
                      {/* Animated Pulse Dot */}
                      <div className="flex justify-center mt-4">
                        <div className={`w-3 h-3 bg-gradient-to-r ${playlist.gradient} rounded-full animate-pulse`}></div>
                            </div>
                          </div>
                        </div>
                ))}
                      </div>

              {/* "Thousands More" Statement */}
              <div 
                ref={thousandsMoreRef}
                className={`text-center mb-16 mt-5 ${thousandsMoreInView ? 'animate-fade-in-up' : 'opacity-0'}`}
              >
                <div className="relative inline-block">
                  {/* Glow Effect Behind Text - Hidden on mobile */}
                  <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] blur-xl" style={{ 
                    opacity: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.04' : '0.2'
                  }}></div>
                  
                  <p 
                    className="relative text-[1.575rem] lg:text-[2.925rem] font-black text-white leading-relaxed lg:mt-[15px] lg:mb-[15px]"
                  >
                    + Literally{' '}
                    <span className="bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent drop-shadow-lg animate-pulse">
                      THOUSANDS
                    </span>
                    {' '}more!
                  </p>
                    </div>
                  </div>

              {/* CTA Button */}
              <div 
                ref={playlistsButtonRef}
                className={`text-center ${playlistsButtonInView ? 'animate-fade-in-up' : 'opacity-0'}`}
              >
                <button
                  onClick={scrollToTrackInput}
                  className="px-16 py-5 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-xl"
                >
                  <span className="relative z-10">PUT ME ON PLAYLISTS</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
                </div>
              </div>
            
            {/* Additional Floating Elements */}
            <div className="absolute top-1/2 left-5 w-4 h-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full opacity-40 animate-ping"></div>
            <div className="absolute top-1/3 right-8 w-6 h-6 bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] rounded-full opacity-30 animate-ping" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-1/3 left-1/4 w-5 h-5 bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] rounded-full opacity-35 animate-ping" style={{ animationDelay: '2s' }}></div>
          </section>

          {/* Shape Divider - Copied from phoneShapeGradient */}
          <div className="relative z-30 pb-48" style={{ height: '200px', width: '110vw', left: '-5vw', position: 'relative', transform: 'rotate(8deg)', background: 'transparent', marginTop: '-60px', marginBottom: '85px' }}>
            {/* All background elements removed for full transparency */}
            
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
                <linearGradient id="playlistShapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d="M-200,30 C100,120 300,10 500,90 C700,170 900,20 1100,100 C1300,180 1500,15 1640,70 L1640,150 C1500,120 1300,160 1100,140 C900,120 700,180 500,160 C300,140 100,190 -200,170 Z"
                fill="url(#playlistShapeGradient1)"
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
                <linearGradient id="playlistShapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <path
                d="M-200,45 C150,140 400,15 650,110 C900,190 1150,25 1400,125 C1550,165 1640,55 1640,55 L1640,145 C1550,115 1400,185 1150,125 C900,75 650,195 400,145 C150,95 -200,195 -200,195 Z"
                fill="url(#playlistShapeGradient2)"
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
                <linearGradient id="playlistShapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M-200,65 C200,155 450,20 700,120 C950,185 1200,30 1450,135 C1600,175 1640,70 1640,70 L1640,125 C1600,95 1450,180 1200,125 C950,55 700,185 450,135 C200,75 -200,75 -200,75 Z"
                fill="url(#playlistShapeGradient3)"
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
                <linearGradient id="playlistShapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.82" />
                  <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.82" />
                </linearGradient>
              </defs>
              <path
                d="M-200,55 C120,15 280,150 440,65 C600,20 760,165 920,75 C1080,25 1240,145 1400,85 C1520,55 1640,115 1640,115 L1640,165 C1520,135 1400,185 1240,165 C1080,135 920,195 760,175 C600,155 440,195 280,175 C120,155 -200,185 -200,185 Z"
                fill="url(#playlistShapeGradient4)"
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
          {/* Authenticity Guaranteed Section */}
          <section className="py-24 px-4 relative z-20 -mt-24" style={{ background: 'transparent' }}>
            <div className="max-w-7xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-16 auth-header-container relative">
                <h2 
                  ref={authenticityHeadingRef}
                  className={`text-[2.9rem] md:text-5xl lg:text-6xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent flex items-center justify-center ${authenticityHeadingInView ? 'animate-fade-in-up' : 'opacity-0'}`} 
                  style={{ 
                    lineHeight: '1.3', 
                    gap: typeof window !== 'undefined' && window.innerWidth < 640 ? '0px' : '20px',
                    marginRight: typeof window !== 'undefined' && window.innerWidth < 640 ? '-50px' : '0px',
                    paddingRight: typeof window !== 'undefined' && window.innerWidth < 640 ? '40px' : '0px'
                  }}
                >
                  Authenticity Guaranteed
                  {/* Desktop Checkmark - Hidden on Mobile, Shows on Desktop with 15px left margin */}
                  <div 
                    className="auth-checkmark-desktop bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_12px_rgba(89,227,165,0.4)]"
                    style={{ 
                      width: typeof window !== 'undefined' && window.innerWidth < 640 ? '56px' : '48px', 
                      height: typeof window !== 'undefined' && window.innerWidth < 640 ? '56px' : '48px', 
                      minWidth: typeof window !== 'undefined' && window.innerWidth < 640 ? '56px' : '48px', 
                      minHeight: typeof window !== 'undefined' && window.innerWidth < 640 ? '56px' : '48px',
                      marginLeft: typeof window !== 'undefined' && window.innerWidth < 640 ? '-20px' : '0px',
                      marginRight: typeof window !== 'undefined' && window.innerWidth < 640 ? '50px' : '0px'
                    }}
                  >
                    <svg 
                      className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      style={{ 
                        width: typeof window !== 'undefined' && window.innerWidth < 640 ? '36px' : '30px', 
                        height: typeof window !== 'undefined' && window.innerWidth < 640 ? '36px' : '30px' 
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </h2>
                
                <h3 
                  ref={authenticitySubheadingRef}
                  className={`text-[1.8rem] md:text-3xl lg:text-4xl font-black text-white max-w-4xl mx-auto leading-relaxed mb-0 md:mb-12 auth-skeptical-text ${authenticitySubheadingInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                  style={{
                    marginBottom: typeof window !== 'undefined' && window.innerWidth < 640 ? '-25px' : undefined
                  }}
                >
                  <span className="block sm:inline">We know you're skeptical.</span>
                  <span className="block sm:inline"> You should be.</span>
                </h3>
              </div>

              {/* Main Content Container with Unique Design */}
              <div className="relative max-w-6xl mx-auto auth-content-container">
                {/* Background Design Elements */}
                <div className="absolute inset-0 -m-8 rounded-3xl opacity-30 blur-2xl bg-gradient-to-br from-[#59e3a5]/20 via-[#14c0ff]/30 to-[#8b5cf6]/20 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/90 to-[#0a0a13]/95 rounded-2xl backdrop-blur-sm border-2 border-white/10 shadow-2xl"></div>
                
                {/* Content */}
                <div className="relative z-10 p-8 md:p-12">
                  {/* Opening Paragraph */}
                  <div className="text-center mb-12">
                    <p 
                      ref={authenticityIntroRef}
                      className={`text-[1.4rem] md:text-2xl text-gray-300 leading-relaxed mb-8 font-bold ${authenticityIntroInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                    >
                      The Spotify marketing world is full of companies running bot farms from their mom's basement. They promise millions, deliver garbage, and disappear with your money.
                    </p>
                    <p 
                      ref={authenticityOperatesRef}
                      className={`text-[1.8rem] md:text-4xl font-black text-white leading-relaxed auth-operates-text ${authenticityOperatesInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                      style={{
                        fontSize: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(1.8rem - 0.25rem)' : undefined,
                        marginBottom: typeof window !== 'undefined' && window.innerWidth < 640 ? '-20px' : undefined
                      }}
                    >
                      FASHO Operates Differently:
                    </p>
                  </div>

                  {/* Icon List with Unique Layout */}
                  <div 
                    ref={authenticityListRef}
                    className={`grid md:grid-cols-2 gap-8 mb-12 ${authenticityListInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                  >
                    {[
                      { text: 'playlist curators who we\'ve worked with for years', real: 'REAL' },
                      { text: 'listeners who actually save and replay your music', real: 'REAL' },
                      { text: 'growth that Spotify\'s algorithm recognizes and rewards', real: 'REAL' },
                      { text: 'results you can verify in your Spotify for Artists app', real: 'REAL' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-4 p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 backdrop-blur-sm hover:from-white/10 hover:to-white/5 transition-all duration-300 group">
                        {/* Animated Check Icon */}
                        <div className="w-8 h-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-[0_4px_8px_rgba(89,227,165,0.3)] group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-white text-2xl font-bold leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:text-[#59e3a5] transition-colors duration-300">
                          <span className="font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{item.real}</span> {item.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Closing Statements */}
                  <div className="text-center space-y-8">
                    <p 
                      ref={authenticityClosingRef}
                      className={`text-xl md:text-2xl text-gray-300 leading-relaxed font-bold ${authenticityClosingInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                      style={{
                        fontSize: isMobile ? 'calc(1.25rem + 0.20rem + 0.10rem - 0.04rem - 0.10rem)' : undefined
                      }}
                      suppressHydrationWarning={true}
                    >
                      NO bots. NO fake streams. NO sketchy tactics that risk your account.
                    </p>
                    
                    <p 
                      ref={authenticityHighlightRef}
                      className={`text-xl md:text-2xl text-gray-300 leading-relaxed font-bold ${authenticityHighlightInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                      style={{
                        fontSize: isMobile ? 'calc(1.25rem + 0.20rem + 0.10rem - 0.04rem - 0.10rem)' : undefined
                      }}
                      suppressHydrationWarning={true}
                    >
                      Just legitimate playlist placements that put your music in front of people who actually want to hear it.
                        </p>

                    <p 
                      ref={authenticityGuaranteeRef}
                      className={`text-3xl md:text-4xl font-black text-white leading-relaxed ${authenticityGuaranteeInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                      style={{
                        fontSize: isMobile ? 'calc(1.875rem - 0.25rem - 0.25rem + 0.08rem)' : undefined
                      }}
                      suppressHydrationWarning={true}
                    >
                      That's not just marketing. That's a guarantee.
                    </p>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-1/2 -right-4 w-16 h-16 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-14 h-14 bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] rounded-full opacity-20 animate-pulse" style={{ animationDelay: '2.5s' }}></div>
                
                {/* Floating Sparkles */}
                <div className="absolute top-8 left-8 w-2 h-2 bg-white rounded-full opacity-60 animate-ping"></div>
                <div className="absolute top-1/3 right-8 w-3 h-3 bg-[#14c0ff] rounded-full opacity-40 animate-ping" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-[#59e3a5] rounded-full opacity-50 animate-ping" style={{ animationDelay: '3s' }}></div>
              </div>
            </div>
          </section>

          {/* What You Get Section */}
          <section className="py-16 lg:py-20 pt-24 lg:pt-16 pb-48 px-4 relative overflow-hidden -mt-24">
            {/* Epic Background with Multiple Gradient Layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a13] via-[#16213e] to-[#1a1a2e]"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-[#8b5cf6]/20 via-transparent to-[#14c0ff]/20"></div>
            <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-[#59e3a5]/10 to-transparent"></div>
            
            {/* Top Gradient Transition Overlay */}
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#0a0a13] via-[#16213e]/80 to-transparent -z-10"></div>
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0a0a13] to-transparent -z-5"></div>
            
            {/* Bottom Gradient Transition Overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0a0a13] via-[#16213e]/80 to-transparent -z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a13] to-transparent -z-5"></div>
            {/* Floating Particles and Glow Effects */}
            <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-[#8b5cf6]/30 to-[#59e3a5]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-[#14c0ff]/25 to-[#8b5cf6]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }}></div>
            
            {/* Animated Sparkles */}
            <div className="absolute top-32 right-32 text-2xl text-[#8b5cf6] opacity-60 animate-bounce" style={{ animationDelay: '1s' }}>✨</div>
            <div className="absolute bottom-32 left-32 text-xl text-[#14c0ff] opacity-50 animate-bounce" style={{ animationDelay: '3s' }}>⭐</div>
            <div className="absolute top-1/2 right-1/4 text-lg text-[#59e3a5] opacity-40 animate-bounce" style={{ animationDelay: '5s' }}>💫</div>
            
            <div className="relative z-10 max-w-7xl mx-auto">
              <div className="flex flex-col lg:grid lg:grid-cols-[45%_55%] gap-12 items-center">
                
                {/* Left Side - Kendrick Image */}
                <div className={`relative group order-2 lg:order-1 ${isMobile ? '-mb-[30px]' : ''}`}>
                  {/* Epic Glow Behind Image */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6]/50 via-[#14c0ff]/60 to-[#59e3a5]/50 rounded-3xl blur-2xl opacity-70 group-hover:opacity-90 transition-opacity duration-700 transform group-hover:scale-110"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#59e3a5]/40 via-[#8b5cf6]/50 to-[#14c0ff]/40 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-700 transform group-hover:scale-105"></div>
                  
                  {/* Image Container with Animated Border */}
                  <div className="relative bg-gradient-to-r from-[#8b5cf6] via-[#14c0ff] to-[#59e3a5] p-1 rounded-3xl shadow-2xl group-hover:shadow-[#8b5cf6]/50 transition-all duration-700 transform group-hover:scale-[1.02]">
                    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0a0a13] rounded-3xl overflow-hidden relative">
                      <img 
                        src="/kendr.jpg" 
                        alt="Kendrick Lamar - FASHO Success Story" 
                        className="w-full aspect-square lg:aspect-[3/4] object-cover object-top transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = "/fasho-logo-wide.png";
                        }}
                      />
                      
                      {/* Overlay Gradient for Text Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      
                      {/* Bottom Fade to Black Shadow */}
                      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                      
                      {/* Client Badge */}
                      <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                        <div className="text-left">
                          <div className="text-2xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Kendrick Lamar</div>
                          <div className="text-lg text-gray-300 font-bold">FASHO.co Client</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating Elements Around Image */}
                  <div className="absolute -top-4 -right-4 w-14 h-14 bg-gradient-to-r from-[#8b5cf6] to-[#14c0ff] rounded-full opacity-80 animate-pulse"></div>
                  <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                
                {/* Right Side - Content */}
                <div className="space-y-8 pr-[4vw] sm:pr-[3vw] md:pr-[2.5vw] lg:pr-[2vw] xl:pr-8 pl-2 order-1 lg:order-2">
                  {/* Header */}
                  <div className="space-y-6">
                    <h2 
                      className="font-black leading-tight text-center -mt-[95px] md:mt-0" 
                      style={{ fontSize: isMobile ? 'calc(1.64rem + 0.25rem + 0.25rem)' : 'calc(1.25rem + 1.4rem + 0.25rem)' }}
                    >
                      <span className="bg-gradient-to-r from-[#8b5cf6] via-[#14c0ff] to-[#59e3a5] bg-clip-text text-transparent drop-shadow-2xl">
                        What's Inside?
                      </span>
                      <br />
                      <span 
                        className="text-white" 
                        style={{ fontSize: isMobile ? '1.8rem' : 'inherit' }}
                      >
                        Let's Break It Down.
                      </span>
                    </h2>
                    <div className="w-24 h-1 bg-gradient-to-r from-[#8b5cf6] to-[#14c0ff] rounded-full mx-auto"></div>
                  </div>
                  
                  {/* Features List - Single Card */}
                  <div className="group relative">
                    {/* Epic Glow Behind Card */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6] to-[#14c0ff] rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#59e3a5] to-[#8b5cf6] rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                    
                    {/* Main Card Container */}
                    <div className="relative bg-gradient-to-r from-[#8b5cf6] via-[#14c0ff] to-[#59e3a5] p-0.5 rounded-3xl shadow-2xl">
                      <div className={`bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/90 to-[#0a0a13]/95 rounded-3xl ${isMobile ? 'p-8' : 'p-10'} border border-white/10 backdrop-blur-sm`}>
                        
                        {/* Features List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className={`${isMobile ? 'space-y-8' : 'space-y-6'}`}>
                            <div className="flex items-center space-x-4">
                              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                                <span>⚡</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-white mb-0.5" style={{ fontSize: isMobile ? 'calc(1.125rem - 0.07rem + 0.1rem)' : 'calc(1.125rem - 0.07rem)' }}>Lightning Fast Pitching</h4>
                                <p className="text-gray-300" style={{ fontSize: isMobile ? 'calc(0.875rem + 0.075rem + 0.1rem)' : 'calc(0.875rem + 0.075rem)' }}>Your track hits curator inboxes within 24 hours of launch</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                                <span>🎯</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-white mb-0.5" style={{ fontSize: isMobile ? 'calc(1.125rem - 0.07rem + 0.1rem)' : 'calc(1.125rem - 0.07rem)' }}>Guaranteed Playlisting</h4>
                                <p className="text-gray-300" style={{ fontSize: isMobile ? 'calc(0.875rem + 0.075rem + 0.1rem)' : 'calc(0.875rem + 0.075rem)' }}>We don't "try" or "hope". You absolutely WILL land on major playlists</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                                <span>👥</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-white mb-0.5" style={{ fontSize: isMobile ? 'calc(1.125rem - 0.07rem + 0.1rem)' : 'calc(1.125rem - 0.07rem)' }}>Real Human Listeners</h4>
                                <p className="text-gray-300" style={{ fontSize: isMobile ? 'calc(0.875rem + 0.075rem + 0.1rem)' : 'calc(0.875rem + 0.075rem)' }}>People who actually save your music, follow you, and come back for more</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-r from-[#59e3a5] to-[#8b5cf6] rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                                <span>🔍</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-white mb-0.5" style={{ fontSize: isMobile ? 'calc(1.125rem - 0.07rem + 0.1rem)' : 'calc(1.125rem - 0.07rem)' }}>Complete Transparency</h4>
                                <p className="text-gray-300" style={{ fontSize: isMobile ? 'calc(0.875rem + 0.075rem + 0.1rem)' : 'calc(0.875rem + 0.075rem)' }}>Know exactly which playlists added you (no mysterious "private playlists")</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className={`${isMobile ? 'space-y-8' : 'space-y-6'}`}>
                            <div className="flex items-center space-x-4">
                              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                                <span>📱</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-white mb-0.5" style={{ fontSize: isMobile ? 'calc(1.125rem - 0.07rem + 0.1rem)' : 'calc(1.125rem - 0.07rem)' }}>Your Own Dashboard</h4>
                                <p className="text-gray-300" style={{ fontSize: isMobile ? 'calc(0.875rem + 0.075rem + 0.1rem)' : 'calc(0.875rem + 0.075rem)' }}>Track everything 24/7. Even from your phone at 3am (we know you will)</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-r from-[#8b5cf6] to-[#14c0ff] rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                                <span>🏆</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-white mb-0.5" style={{ fontSize: isMobile ? 'calc(1.125rem - 0.07rem + 0.1rem)' : 'calc(1.125rem - 0.07rem)' }}>Industry Veterans</h4>
                                <p className="text-gray-300" style={{ fontSize: isMobile ? 'calc(0.875rem + 0.075rem + 0.1rem)' : 'calc(0.875rem + 0.075rem)' }}>Our team built careers for artists you listen to daily</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-r from-[#59e3a5] to-[#8b5cf6] rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                                <span>🎵</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-white mb-0.5" style={{ fontSize: isMobile ? 'calc(1.125rem - 0.07rem + 0.1rem)' : 'calc(1.125rem - 0.07rem)' }}>Every Genre Covered</h4>
                                <p className="text-gray-300" style={{ fontSize: isMobile ? 'calc(0.875rem + 0.075rem + 0.1rem)' : 'calc(0.875rem + 0.075rem)' }}>Trap metal? Lo-fi jazz? Meditation podcasts? We have playlists for everything</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                                <span>⏰</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-white mb-0.5" style={{ fontSize: isMobile ? 'calc(1.125rem - 0.07rem + 0.1rem)' : 'calc(1.125rem - 0.07rem)' }}>Results in 48-72 Hours</h4>
                                <p className="text-gray-300" style={{ fontSize: isMobile ? 'calc(0.875rem + 0.075rem + 0.1rem)' : 'calc(0.875rem + 0.075rem)' }}>Watch your first placements roll in while other services are still "processing"</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* CTA Button with Purple Gradient */}
                  <div className="-mt-8">
                    <button
                      onClick={scrollToTrackInput}
                      className="w-full py-6 bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#9333ea] text-white font-black rounded-2xl hover:shadow-2xl hover:shadow-[#8b5cf6]/40 transition-all duration-500 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-xl border border-[#8b5cf6]/30"
                    >
                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      
                      {/* Button Text */}
                      <span className="relative z-10 flex items-center justify-center space-x-3">
                        <span>GET MY MUSIC HEARD</span>
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </span>
                      
                      {/* Pulsing Glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Floating Elements */}
            <div className="absolute top-1/4 right-10 w-4 h-4 bg-gradient-to-r from-[#8b5cf6] to-[#14c0ff] rounded-full opacity-60 animate-ping"></div>
            <div className="absolute bottom-1/4 left-10 w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#8b5cf6] rounded-full opacity-40 animate-ping" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-gradient-to-r from-[#14c0ff] to-[#59e3a5] rounded-full opacity-50 animate-ping" style={{ animationDelay: '4s' }}></div>
          </section>

          {/* Shape Divider After What You Get */}
          <div className="relative z-30 -mt-24" style={{ height: '200px', width: '110vw', left: '-5vw', transform: 'rotate(-3deg)', background: 'transparent', marginTop: '-35px' }}>
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
                <linearGradient id="whatYouGetShapeGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.67" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path
                d="M-200,30 C100,120 300,10 500,90 C700,170 900,20 1100,100 C1300,180 1500,15 1640,70 L1640,150 C1500,120 1300,160 1100,140 C900,120 700,180 500,160 C300,140 100,190 -200,170 Z"
                fill="url(#whatYouGetShapeGradient1)"
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
                <linearGradient id="whatYouGetShapeGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <path
                d="M-200,45 C150,140 400,15 650,110 C900,190 1150,25 1400,125 C1550,165 1640,55 1640,55 L1640,145 C1550,115 1400,185 1150,125 C900,75 650,195 400,145 C150,95 -200,195 -200,195 Z"
                fill="url(#whatYouGetShapeGradient2)"
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
                <linearGradient id="whatYouGetShapeGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#59e3a5" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#14c0ff" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <path
                d="M-200,65 C200,155 450,20 700,120 C950,185 1200,30 1450,135 C1600,175 1640,70 1640,70 L1640,125 C1600,95 1450,180 1200,125 C950,55 700,185 450,135 C200,75 -200,75 -200,75 Z"
                fill="url(#whatYouGetShapeGradient3)"
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
                <linearGradient id="whatYouGetShapeGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.68" />
                  <stop offset="50%" stopColor="#59e3a5" stopOpacity="0.72" />
                  <stop offset="100%" stopColor="#14c0ff" stopOpacity="0.68" />
                </linearGradient>
              </defs>
              <path
                d="M-200,55 C120,15 280,150 440,65 C600,20 760,165 920,75 C1080,25 1240,145 1400,85 C1520,55 1640,115 1640,115 L1640,165 C1520,135 1400,185 1240,165 C1080,135 920,195 760,175 C600,155 440,195 280,175 C120,155 -200,185 -200,185 Z"
                fill="url(#whatYouGetShapeGradient4)"
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

          {/* FAQ Section */}
          <section id="faq" className="py-24 px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              {/* FAQ Header */}
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 text-white" style={{ lineHeight: '1.1' }}>
                  Frequently Asked Questions
                </h2>
              </div>

              {/* FAQ Cards */}
              <div className="space-y-5">
                {[
                  {
                    question: "⚡ How fast will my music be placed on playlists?",
                    answer: "Our team goes to work IMMEDIATELY after you order, and you'll see your first playlist placements within 48-72 hours. That's right - we don't mess around. Some tracks get placed even faster because our curators are HUNGRY for fresh music, but we guarantee results within that lightning-fast timeframe!"
                  },
                  {
                    question: "🎵 When will my music start receiving streams?",
                    answer: "The SECOND your track lands on a playlist, it starts getting streams! These aren't just any playlists - we're talking about playlists with MASSIVE followings that have listeners streaming 24/7. Your plays will start rolling in immediately and continue growing as we place you on more and more playlists throughout your campaign."
                  },
                  {
                    question: "⏰ How long does the campaign last?",
                    answer: "Your campaign lasts for a maximum of 30 days, but most campaigns are completed much sooner - typically within just 7-10 days. Once we deliver the estimated plays included in your package tier, the campaign automatically stops. We guarantee you'll reach your estimated stream count within the 30-day window, but in most cases, you'll see your full results delivered within the first week to 10 days of your campaign starting."
                  },
                  {
                    question: "👀 How do I track which playlists featured my music?",
                    answer: "Download Spotify's official \"Spotify for Artists\" app (if you haven't already - seriously, get it NOW!). This shows you EVERYTHING - which playlists added your music, your streaming stats, listener demographics, and more. You'll be able to watch your success in real-time!"
                  },
                  {
                    question: "✈️ Do you work with artists worldwide?",
                    answer: "YES! We work with musicians, podcasters, and record labels from EVERY country on the planet. Our playlist network spans globally, so whether you're in Nashville, London, Tokyo, or anywhere else - we've got playlists that will LOVE your sound!"
                  },
                  {
                    question: "🎶 What genres do you cover?",
                    answer: "EVERY. SINGLE. GENRE. Hip-hop, pop, rock, country, EDM, jazz, classical, indie, metal, folk, reggae, Latin, K-pop - you name it, we've got playlists for it. We have curators specializing in every genre imaginable, plus all the sub-genres and fusion styles. There's literally NO music we can't promote!"
                  },
                  {
                    question: "💎 Will I make money from the streams?",
                    answer: "ABSOLUTELY! Every stream generates royalties that go directly to you through Spotify's payment system. Many of our clients see their campaigns pay for themselves within months, then it's pure profit! The more playlists we get you on, the more streams you get, the more money you make. It's that simple!"
                  },
                  {
                    question: "🎤 Do you work with podcasts too?",
                    answer: "Absolutely! We work with podcast curators who specialize in playlists across every topic and format you can imagine. The process is identical to music - we'll match your podcast with the perfect playlist curators in your niche and get you the exposure you deserve. Same guaranteed results, same lightning-fast delivery!"
                  },
                  {
                    question: "🔒 Is this safe for my Spotify account?",
                    answer: "100% SAFE! We work exclusively with REAL playlists run by genuine music lovers - no bots, no fake streams, no shady tactics. We're talking about legitimate playlists with organic followers who actually listen to music. Spotify LOVES what we do because we help them discover great new music for their users!"
                  },
                  {
                    question: "🏆 What makes FASHO.co different from other companies?",
                    answer: "We're the ONLY company with 10+ year relationships with the biggest playlist curators in the world. While other companies send spam emails or buy fake plays, we make PERSONAL phone calls to curators who trust our taste in music. We've worked with curators from Rap Caviar, Today's Top Hits, and hundreds of other major playlists. Our success rate is UNMATCHED in the industry!"
                  },
                  {
                    question: "🚀 What's your success rate?",
                    answer: "Our artists have a 99%+ placement rate because of our personal relationships with curators. When FASHO.co recommends an artist, curators listen! We've helped create chart-toppers, viral hits, and launched countless careers. Your success is our success!"
                  },
                  {
                    question: "🎧 What if my song is not on Spotify yet? Can you get me on Spotify?",
                    answer: "We can only market music that's already live on Spotify - we don't offer distribution services (though we will in the very near future!). To get your music on Spotify, we recommend using a distribution service like DistroKid, CD Baby, or TuneCore. Once your track is live on Spotify, we can immediately start getting it placed on massive playlists!"
                  },
                  {
                    question: "📞 How can I contact support?",
                    answer: "Hit us up at support@fasho.co and our team will get back to you within 24 hours (usually much faster!). We're here to help you succeed, so don't hesitate to reach out with ANY questions about your campaign or account."
                  }
                ].map((faq, index) => (
                  <FAQCard key={index} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          </section>
          {/* Final CTA Section */}
          <section className="px-4 relative z-10" style={{ marginTop: '-60px', paddingTop: '24px', paddingBottom: '24px', marginBottom: '205px' }}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent" style={{ lineHeight: '1.3' }}>
                Ready to Go Viral?
                </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                Join thousands of artists who've already gone from unknown to unstoppable with FASHO. Your career changing moment is waiting - let's make it happen.
              </p>
                <button
                  onClick={() => {
                    // Track CTA click for Google Ads
                    gtag.trackEvent('click', {
                      event_category: 'engagement',
                      event_label: 'Launch Campaign CTA',
                      value: 1
                    });
                    scrollToTrackInput();
                  }}
                className="px-16 py-5 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 active:scale-95 relative overflow-hidden group text-xl"
              >
                <span className="relative z-10">Launch Your Campaign Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
            </div>
          </section>

        </div> {/* End Content Container */}

          {/* Footer */}
          <Footer />

                {/* Desktop Search Results Portal */}
        {isMounted && !isMobile && showSearchResults && (
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

        {/* Desktop Preview Track Portal */}
        {isMounted && !isMobile && previewTrack && !isSpotifyUrlCheck(url) && (
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