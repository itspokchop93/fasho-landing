import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '../utils/supabase/client';
import { userProfileService, ArtistProfile } from '../utils/userProfile';

interface HeaderProps {
  transparent?: boolean;
  hideSignUp?: boolean;
}

export default function Header({ transparent = false, hideSignUp = false }: HeaderProps = {}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Helper functions for profile display
  const getUserInitials = (user: any) => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getUserFirstName = (user: any) => {
    if (!user?.email) return 'User';
    // Extract first name from email (part before @ and any numbers/dots)
    const emailPart = user.email.split('@')[0];
    const cleanName = emailPart.replace(/[0-9]/g, '').replace(/[._]/g, '');
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
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
      console.log('🔐 HEADER: Starting sign out process');
      
      // Call server-side sign-out API first for comprehensive logout
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('🔐 HEADER: Server-side sign out failed');
      }
      
      // Client-side logout
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('🔐 HEADER: Client-side sign out error:', error);
      }
      
      // Clear any additional localStorage items
      localStorage.removeItem('userProfileImage');
      sessionStorage.clear();
      
      // Force page reload to ensure complete logout
      window.location.href = '/';
      
    } catch (error) {
      console.error('🔐 HEADER: Sign out error:', error);
      // Fallback: still try to reload even if logout fails
      window.location.href = '/';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  // Check if user is logged in
  useEffect(() => {
    console.log('🔐 HEADER: useEffect started - checking auth');
    
    const checkUser = async () => {
      try {
        console.log('🔐 HEADER: About to call supabase.auth.getUser()');
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('🔐 HEADER: supabase.auth.getUser() response:', { user: user?.email || null, error });
        
        if (error) {
          console.error('🔐 HEADER: Error in getUser:', error);
        }
        
        console.log('🔐 HEADER: Setting currentUser to:', user?.email || 'No user');
        setCurrentUser(user);
        fetchArtistProfile(user);
      } catch (err) {
        console.error('🔐 HEADER: Exception in checkUser:', err);
        setCurrentUser(null);
        setArtistProfile(null);
      }
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 HEADER: Auth state changed:', event, session?.user?.email || 'No user');
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setArtistProfile(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user);
        fetchArtistProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getHeaderClasses = () => {
    const baseClasses = 'fixed w-full top-0 z-50 transition-all duration-300';
    
    if (transparent) {
      return `${baseClasses} ${isScrolled ? 'bg-[#18192a]/95 backdrop-blur-sm' : 'bg-transparent'}`;
    }
    
    return `${baseClasses} bg-[#18192a]/95 backdrop-blur-sm`;
  };

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
    <header className={getHeaderClasses()}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/">
              <img 
                src="/fasho-logo-wide.png" 
                alt="FASHO" 
                className="h-7 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className={`hidden md:flex items-center space-x-8 ${hideSignUp ? 'pr-16' : ''}`}>
            <Link href="/song-promotion" className="text-white hover:text-[#59e3a5] transition-colors font-medium">
              Song Promotion
            </Link>
            <Link href="/about" className="text-white hover:text-[#59e3a5] transition-colors font-medium">
              About Us
            </Link>
            <Link href="/faq" className="text-white hover:text-[#59e3a5] transition-colors font-medium">
              FAQ
            </Link>
            <Link href="/contact" className="text-white hover:text-[#59e3a5] transition-colors font-medium">
              Contact Us
            </Link>
            
            {/* Sign Up Button or User Profile */}
            {!hideSignUp && (
              currentUser ? (
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="text-white font-medium hover:text-[#59e3a5] transition-colors cursor-pointer"
                    >
                      Hey, {getUserFirstName(currentUser)}!
                    </button>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="w-10 h-10 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      {renderProfileAvatar()}
                    </button>
                  </div>
                  {showProfileDropdown && renderProfileDropdown()}
                </div>
              ) : (
                <Link href="/signup" className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-6 py-2 rounded-md hover:opacity-90 transition-opacity">
                  Sign Up
                </Link>
              )
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
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-white/10">
              <Link href="/song-promotion" className="block px-3 py-2 text-white hover:text-[#59e3a5] transition-colors font-medium">
                Song Promotion
              </Link>
              <Link href="/about" className="block px-3 py-2 text-white hover:text-[#59e3a5] transition-colors font-medium">
                About Us
              </Link>
              <Link href="/faq" className="block px-3 py-2 text-white hover:text-[#59e3a5] transition-colors font-medium">
                FAQ
              </Link>
              <Link href="/contact" className="block px-3 py-2 text-white hover:text-[#59e3a5] transition-colors font-medium">
                Contact Us
              </Link>
              
              <div className="flex items-center justify-center px-3 py-2">
                {/* Sign Up Button or User Profile */}
                {!hideSignUp && (
                  currentUser ? (
                    <div className="relative">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                          className="text-white font-medium text-sm hover:text-[#59e3a5] transition-colors cursor-pointer"
                        >
                          Hey, {getUserFirstName(currentUser)}!
                        </button>
                        <button
                          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                          className="w-10 h-10 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                          {renderProfileAvatar()}
                        </button>
                      </div>
                      {showProfileDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[9999]">
                          <Link 
                            href="/dashboard" 
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                              </svg>
                              Dashboard
                            </div>
                          </Link>
                          
                          <Link 
                            href="/dashboard#campaigns" 
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              My Campaigns
                            </div>
                          </Link>
                          
                          <Link 
                            href="/dashboard#help" 
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Get Help
                            </div>
                    </Link>
                          
                          <hr className="my-2 border-gray-200" />
                          
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsMobileMenuOpen(false);
                              setShowSignOutModal(true);
                            }}
                            className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Sign Out
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link href="/signup" className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-6 py-2 rounded-md hover:opacity-90 transition-opacity">
                      Sign Up
                    </Link>
                  )
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