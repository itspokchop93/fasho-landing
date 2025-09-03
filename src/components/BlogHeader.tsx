import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '../utils/supabase/client';
import { userProfileService, ArtistProfile } from '../utils/userProfile';
import { useAuth } from '../utils/authContext';

// Utility function to preserve tracking parameters in navigation
const preserveTrackingParams = (href: string): string => {
  if (typeof window === 'undefined') return href;
  
  const currentParams = new URLSearchParams(window.location.search);
  const trackingParams = new URLSearchParams();
  
  // Preserve important tracking parameters
  ['gclid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
    const value = currentParams.get(param);
    if (value) {
      trackingParams.set(param, value);
    }
  });
  
  if (trackingParams.toString()) {
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}${trackingParams.toString()}`;
  }
  
  return href;
};

export default function BlogHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string>('User');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();
  
  // Use the auth context
  const { user: currentUser, loading: authLoading } = useAuth();

  // Debug: Log when userFirstName changes
  useEffect(() => {
    console.log('🔐 BLOG HEADER: userFirstName state changed to:', userFirstName);
  }, [userFirstName]);

  // Listen for profile updates to refresh the name
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('🔐 BLOG HEADER: Profile update event received, refreshing name...');
      if (currentUser) {
        fetchUserFirstName(currentUser);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, [currentUser]);

  // Helper functions for profile display
  const getUserInitials = (user: any) => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  // Fetch user's first name from API
  const fetchUserFirstName = async (user: any) => {
    console.log('🔐 BLOG HEADER: fetchUserFirstName called with user:', user?.email);
    if (!user?.email) {
      console.log('🔐 BLOG HEADER: No user email, setting to User');
      setUserFirstName('User');
      return;
    }

    // FIRST PRIORITY: Always try to get first name from API (user_profiles table)
    try {
      console.log('🔐 BLOG HEADER: Fetching user first name from API (user_profiles)...');
      const response = await fetch('/api/get-user-first-name');
      console.log('🔐 BLOG HEADER: API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔐 BLOG HEADER: API response data:', data);
        setUserFirstName(data.firstName);
        console.log('🔐 BLOG HEADER: ✅ Using name from API:', data.firstName);
        return; // Exit early if API call succeeds
      } else {
        console.log('🔐 BLOG HEADER: ❌ API failed, trying fallback methods...');
      }
    } catch (error) {
      console.error('🔐 BLOG HEADER: ❌ Error fetching user first name from API:', error);
    }

    // FALLBACK 1: Try to get first name from user metadata (signup)
    console.log('🔐 BLOG HEADER: User metadata:', user.user_metadata);
    console.log('🔐 BLOG HEADER: User full_name from metadata:', user.user_metadata?.full_name);

    if (user.user_metadata?.full_name) {
      const fullName = user.user_metadata.full_name;
      console.log('🔐 BLOG HEADER: Found full_name in metadata:', fullName);
      // Extract first name from full name
      const nameParts = fullName.trim().split(' ');
      if (nameParts.length > 0) {
        const firstName = nameParts[0];
        console.log('🔐 BLOG HEADER: Setting firstName from metadata:', firstName);
        setUserFirstName(firstName);
        return;
      }
    }

    // FALLBACK 2: Email-based extraction
    console.log('🔐 BLOG HEADER: No metadata found, falling back to email extraction');
    const emailPart = user.email.split('@')[0];
    const cleanName = emailPart.replace(/[0-9]/g, '').replace(/[._]/g, '');
    setUserFirstName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
  };

  const getUserProfileImage = () => {
    return artistProfile?.artist_image_url || null;
  };

  const renderProfileAvatar = () => {
    const profileImageUrl = getUserProfileImage();
    
    if (profileImageUrl) {
      return (
        <img 
          src={profileImageUrl} 
          alt="Profile" 
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
    
    return (
      <span className="text-black font-bold text-sm">
        {getUserInitials(currentUser)}
      </span>
    );
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log('🔐 BLOG HEADER: Starting sign out process');
      
      // Call server-side sign-out API first for comprehensive logout
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('🔐 BLOG HEADER: Server-side sign out failed');
      }
      
      // Client-side logout
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('🔐 BLOG HEADER: Client-side sign out error:', error);
      }
      
      // Clear any additional localStorage items
      localStorage.removeItem('userProfileImage');
      sessionStorage.clear();
      
      // Force page reload to ensure complete logout
      window.location.href = '/';
      
    } catch (error) {
      console.error('🔐 BLOG HEADER: Sign out error:', error);
      // Fallback: still try to reload even if logout fails
      window.location.href = '/';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking inside desktop or mobile dropdown
      const isInsideDesktopDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      const isInsideMobileDropdown = mobileDropdownRef.current && mobileDropdownRef.current.contains(target);
      
      if (!isInsideDesktopDropdown && !isInsideMobileDropdown) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch artist profile when user changes
  const fetchArtistProfile = async (user?: any) => {
    if (!user) {
      setArtistProfile(null);
      return;
    }
    
    try {
      const response = await fetch('/api/user-artist-profile');
      const data = await response.json();
      
      if (data.profile) {
        setArtistProfile(data.profile);
      } else {
        setArtistProfile(null);
      }
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      setArtistProfile(null);
    }
  };

  // Respond to authentication changes from auth context
  useEffect(() => {
    console.log('🔐 BLOG HEADER: Auth context changed - user:', currentUser?.email || 'null', 'loading:', authLoading);
    
    if (currentUser && !authLoading) {
      console.log('🔐 BLOG HEADER: User authenticated, fetching profile data...');
      fetchArtistProfile(currentUser);
      fetchUserFirstName(currentUser);
    } else if (!currentUser && !authLoading) {
      console.log('🔐 BLOG HEADER: No user, clearing profile data...');
      setArtistProfile(null);
      setUserFirstName('User');
    }
  }, [currentUser, authLoading]);

  // Render sign-out confirmation modal
  const renderSignOutModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign Out</h3>
        <p className="text-gray-600 mb-6">Are you sure you want to sign out?</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowSignOutModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  // Profile dropdown menu
  const renderProfileDropdown = () => (
    <div className="absolute right-0 top-full mt-2 w-52 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/50 py-3 z-[9999]">
      <div className="px-4 py-2 border-b border-gray-700/50 mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Account</p>
      </div>
      
      <button 
        onClick={() => {
          setShowProfileDropdown(false);
          window.location.href = '/dashboard';
        }}
        className="block w-full text-left px-4 py-3 text-gray-200 hover:bg-gradient-to-r hover:from-[#59e3a5]/10 hover:to-[#14c0ff]/10 hover:text-white transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md flex items-center justify-center">
            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
            </svg>
          </div>
          <span className="font-medium">Dashboard</span>
        </div>
      </button>
      
      <button 
        onClick={() => {
          setShowProfileDropdown(false);
          window.location.href = '/dashboard#campaigns';
        }}
        className="block w-full text-left px-4 py-3 text-gray-200 hover:bg-gradient-to-r hover:from-[#59e3a5]/10 hover:to-[#14c0ff]/10 hover:text-white transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md flex items-center justify-center">
            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-medium">My Campaigns</span>
        </div>
      </button>
      
      <button 
        onClick={() => {
          setShowProfileDropdown(false);
          window.location.href = '/dashboard#curator-connect';
        }}
        className="block w-full text-left px-4 py-3 text-gray-200 hover:bg-gradient-to-r hover:from-[#59e3a5]/10 hover:to-[#14c0ff]/10 hover:text-white transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md flex items-center justify-center">
            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="font-medium">Curator Connect+</span>
        </div>
      </button>
      
      <button 
        onClick={() => {
          setShowProfileDropdown(false);
          window.location.href = '/dashboard#contact';
        }}
        className="block w-full text-left px-4 py-3 text-gray-200 hover:bg-gradient-to-r hover:from-[#59e3a5]/10 hover:to-[#14c0ff]/10 hover:text-white transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md flex items-center justify-center">
            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-medium">Get Help</span>
        </div>
      </button>
      
      <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-3 mx-4"></div>
      
      <button
        onClick={() => {
          setShowProfileDropdown(false);
          setShowSignOutModal(true);
        }}
        className="block w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-red-500/20 rounded-md flex items-center justify-center">
            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <span className="font-medium">Sign Out</span>
        </div>
      </button>
    </div>
  );

  return (
    <header 
      className="fixed w-full top-0 z-[9998] transition-all duration-300 bg-[#18192a]/95 backdrop-blur-sm border-b border-white/10" 
      suppressHydrationWarning={true}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between h-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Logo */}
          <div className="flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <Link href={preserveTrackingParams("/")} className="block transition-transform duration-300 ease-in-out hover:scale-105">
              <img 
                src="/fasho-logo-wide.png" 
                alt="FASHO" 
                className="h-8 w-auto object-contain filter brightness-110 hover:brightness-125 transition-all duration-300"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link href={preserveTrackingParams("/blog")} className="text-white hover:text-[#59e3a5] transition-all duration-300 ease-in-out font-medium px-4 py-2 rounded-lg hover:bg-white/5 hover:scale-105 transform backdrop-blur-sm border border-transparent hover:border-white/10">
              Blog
            </Link>
            <Link href={preserveTrackingParams("/pricing")} className="text-white hover:text-[#59e3a5] transition-all duration-300 ease-in-out font-medium px-4 py-2 rounded-lg hover:bg-white/5 hover:scale-105 transform backdrop-blur-sm border border-transparent hover:border-white/10">
              Pricing
            </Link>
            <Link href={preserveTrackingParams("/#faq")} className="text-white hover:text-[#59e3a5] transition-all duration-300 ease-in-out font-medium px-4 py-2 rounded-lg hover:bg-white/5 hover:scale-105 transform backdrop-blur-sm border border-transparent hover:border-white/10">
              FAQ
            </Link>
            <Link href={preserveTrackingParams("/about")} className="text-white hover:text-[#59e3a5] transition-all duration-300 ease-in-out font-medium px-4 py-2 rounded-lg hover:bg-white/5 hover:scale-105 transform backdrop-blur-sm border border-transparent hover:border-white/10">
              About
            </Link>
            <Link href={preserveTrackingParams("/contact")} className="text-white hover:text-[#59e3a5] transition-all duration-300 ease-in-out font-medium px-4 py-2 rounded-lg hover:bg-white/5 hover:scale-105 transform backdrop-blur-sm border border-transparent hover:border-white/10">
              Contact
            </Link>
            {!currentUser && !authLoading && (
              <Link href="/signup" className="text-white hover:text-[#59e3a5] transition-all duration-300 ease-in-out font-medium px-4 py-2 rounded-lg hover:bg-white/5 hover:scale-105 transform backdrop-blur-sm border border-transparent hover:border-white/10">
                Login
              </Link>
            )}
            
            {/* Sign Up Button or User Profile */}
            {!authLoading && (
              <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                {currentUser ? (
                  <div className="relative profile-dropdown-container" ref={dropdownRef}>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10 backdrop-blur-sm" ref={profileButtonRef}>
                      <button
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        className="text-white font-medium hover:text-[#59e3a5] transition-all duration-300 cursor-pointer"
                      >
                        Hey, {userFirstName}!
                      </button>
                      <button
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        className="w-10 h-10 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg"
                      >
                        {renderProfileAvatar()}
                      </button>
                    </div>
                    {showProfileDropdown && renderProfileDropdown()}
                  </div>
                ) : (
                  <Link href="/#start-campaign" className="bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-bold px-3 py-2 rounded-lg hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg backdrop-blur-sm border border-white/20">
                    START CAMPAIGN
                  </Link>
                )}
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-[#59e3a5] transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden absolute top-full left-0 w-full bg-gradient-to-b from-[#18192a]/70 via-[#16213e]/80 to-[#0a0a13]/85 backdrop-blur-xl shadow-2xl border-t border-white/20 animate-fade-in-down" 
            style={{ zIndex: 9999 }}
            suppressHydrationWarning={true}
          >
            <div className="px-4 pt-4 pb-4 space-y-1 text-center">
              <Link href={preserveTrackingParams("/pricing")} className="flex items-center justify-center gap-3 px-4 py-4 mx-2 text-white hover:text-[#59e3a5] hover:bg-white/5 transition-all duration-300 ease-in-out font-medium rounded-xl backdrop-blur-sm border border-transparent hover:border-white/10 transform hover:scale-[1.02] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <svg className="w-5 h-5" fill="none" stroke="url(#gradient1)" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#59e3a5" />
                      <stop offset="100%" stopColor="#14c0ff" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="10" strokeWidth={2}/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M9.5 9a2.5 2.5 0 715 0M9.5 15a2.5 2.5 0 005 0"/>
                </svg>
                Pricing
              </Link>
              {currentUser && !authLoading && (
                <Link href="/dashboard" className="flex items-center justify-center gap-3 px-4 py-4 mx-2 text-white hover:text-[#59e3a5] hover:bg-white/5 transition-all duration-300 ease-in-out font-medium rounded-xl backdrop-blur-sm border border-transparent hover:border-white/10 transform hover:scale-[1.02] animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                  <svg className="w-5 h-5" fill="none" stroke="url(#gradientDashboard)" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="gradientDashboard" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#59e3a5" />
                        <stop offset="100%" stopColor="#14c0ff" />
                      </linearGradient>
                    </defs>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                  Dashboard
                </Link>
              )}
              <Link 
                href={preserveTrackingParams("/#faq")} 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-3 px-4 py-4 mx-2 text-white hover:text-[#59e3a5] hover:bg-white/5 transition-all duration-300 ease-in-out font-medium rounded-xl backdrop-blur-sm border border-transparent hover:border-white/10 transform hover:scale-[1.02] animate-fade-in-up" 
                style={{ animationDelay: '0.2s' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="url(#gradient2)" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#59e3a5" />
                      <stop offset="100%" stopColor="#14c0ff" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                FAQ
              </Link>
              <Link href={preserveTrackingParams("/about")} className="flex items-center justify-center gap-3 px-4 py-4 mx-2 text-white hover:text-[#59e3a5] hover:bg-white/5 transition-all duration-300 ease-in-out font-medium rounded-xl backdrop-blur-sm border border-transparent hover:border-white/10 transform hover:scale-[1.02] animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                <svg className="w-5 h-5" fill="none" stroke="url(#gradient3)" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#59e3a5" />
                      <stop offset="100%" stopColor="#14c0ff" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About
              </Link>
              <Link href={preserveTrackingParams("/contact")} className="flex items-center justify-center gap-3 px-4 py-4 mx-2 text-white hover:text-[#59e3a5] hover:bg-white/5 transition-all duration-300 ease-in-out font-medium rounded-xl backdrop-blur-sm border border-transparent hover:border-white/10 transform hover:scale-[1.02] animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <svg className="w-5 h-5" fill="none" stroke="url(#gradient4)" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#59e3a5" />
                      <stop offset="100%" stopColor="#14c0ff" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact
              </Link>
              {!currentUser && !authLoading && (
                <Link href="/signup" className="flex items-center justify-center gap-3 px-4 py-4 mx-2 text-white hover:text-[#59e3a5] hover:bg-white/5 transition-all duration-300 ease-in-out font-medium rounded-xl backdrop-blur-sm border border-transparent hover:border-white/10 transform hover:scale-[1.02] animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                  <svg className="w-5 h-5" fill="none" stroke="url(#gradient5)" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#59e3a5" />
                        <stop offset="100%" stopColor="#14c0ff" />
                      </linearGradient>
                    </defs>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Login
                </Link>
              )}
              
              <div className="flex items-center justify-center px-4 py-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                {/* Sign Up Button or User Profile */}
                {currentUser && !authLoading ? (
                  <div className="relative w-full" ref={mobileDropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex flex-col items-center gap-3 px-4 py-4 mx-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 ease-in-out transform hover:scale-[1.02] w-full"
                      style={{ touchAction: 'manipulation', cursor: 'pointer' }}
                    >
                      <span className="text-white font-medium text-sm hover:text-[#59e3a5] transition-colors">
                        Hey, {userFirstName}!
                      </span>
                      <div className="w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg">
                        {renderProfileAvatar()}
                      </div>
                    </button>
                    {showProfileDropdown && (
                      <div 
                        className="absolute left-0 right-0 top-full mt-2 mx-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/50 py-3 z-[99999]"
                        style={{ 
                          zIndex: 99999, 
                          position: 'absolute',
                          pointerEvents: 'auto',
                          backgroundColor: 'rgba(17, 24, 39, 0.95)'
                        }}
                      >
                        {/* 2x2 Grid for main menu items */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <button 
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsMobileMenuOpen(false);
                              window.location.href = '/dashboard';
                            }}
                            className="flex flex-col items-center text-center p-3 text-gray-200 hover:bg-gradient-to-r hover:from-[#59e3a5]/10 hover:to-[#14c0ff]/10 hover:text-white transition-all duration-200 rounded-lg"
                            style={{ touchAction: 'manipulation', cursor: 'pointer' }}
                          >
                            <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md flex items-center justify-center mb-2">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                            </svg>
                            </div>
                            <span className="font-medium text-sm">Dashboard</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsMobileMenuOpen(false);
                              window.location.href = '/dashboard#campaigns';
                            }}
                            className="flex flex-col items-center text-center p-3 text-gray-200 hover:bg-gradient-to-r hover:from-[#59e3a5]/10 hover:to-[#14c0ff]/10 hover:text-white transition-all duration-200 rounded-lg"
                            style={{ touchAction: 'manipulation', cursor: 'pointer' }}
                          >
                            <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md flex items-center justify-center mb-2">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            </div>
                            <span className="font-medium text-sm">My Campaigns</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsMobileMenuOpen(false);
                              window.location.href = '/dashboard#curator-connect';
                            }}
                            className="flex flex-col items-center text-center p-3 text-gray-200 hover:bg-gradient-to-r hover:from-[#59e3a5]/10 hover:to-[#14c0ff]/10 hover:text-white transition-all duration-200 rounded-lg"
                            style={{ touchAction: 'manipulation', cursor: 'pointer' }}
                          >
                            <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md flex items-center justify-center mb-2">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <span className="font-medium text-sm">Curator Connect+</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsMobileMenuOpen(false);
                              window.location.href = '/dashboard#contact';
                            }}
                            className="flex flex-col items-center text-center p-3 text-gray-200 hover:bg-gradient-to-r hover:from-[#59e3a5]/10 hover:to-[#14c0ff]/10 hover:text-white transition-all duration-200 rounded-lg"
                            style={{ touchAction: 'manipulation', cursor: 'pointer' }}
                          >
                            <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-md flex items-center justify-center mb-2">
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            </div>
                            <span className="font-medium text-sm">Get Help</span>
                          </button>
                        </div>
                        
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2 mx-4"></div>
                        
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            setIsMobileMenuOpen(false);
                            setShowSignOutModal(true);
                          }}
                          className="block w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
                          style={{ touchAction: 'manipulation', cursor: 'pointer' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-red-500/20 rounded-md flex items-center justify-center">
                              <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            </div>
                            <span className="font-medium">Sign Out</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                ) : !authLoading ? (
                  <Link 
                    href="/#start-campaign" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full mx-2 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-bold px-3 py-4 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-300 text-center shadow-lg"
                  >
                    START CAMPAIGN
                  </Link>
                ) : (
                  <div className="w-full mx-2 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-bold px-3 py-4 rounded-lg opacity-50 text-center">
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Sign Out Modal */}
      {showSignOutModal && renderSignOutModal()}
    </header>
  );
}
