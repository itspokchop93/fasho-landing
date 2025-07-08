import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';

interface HeaderProps {
  transparent?: boolean;
  hideSignUp?: boolean;
}

export default function Header({ transparent = false, hideSignUp = false }: HeaderProps = {}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const supabase = createClient();

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
      } catch (err) {
        console.error('🔐 HEADER: Exception in checkUser:', err);
        setCurrentUser(null);
      }
    };
    
    checkUser();

    // Listen for auth changes
    console.log('🔐 HEADER: Setting up onAuthStateChange listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 HEADER: Auth state changed:', event, session?.user?.email || 'No user');
        console.log('🔐 HEADER: Full session object:', session);
        setCurrentUser(session?.user ?? null);
      }
    );

    return () => {
      console.log('🔐 HEADER: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Handle scroll for background change
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine header background based on transparent prop and scroll state
  const getHeaderClasses = () => {
    if (transparent && !isScrolled) {
      return 'bg-transparent';
    }
    return 'bg-black/90 backdrop-blur-sm border-b border-white/20';
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${getHeaderClasses()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="hover:opacity-90 transition-opacity">
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
            
            {/* Cart Icon Button */}
            <Link href="/checkout" className="text-white hover:text-[#59e3a5] transition-colors p-2 relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6.5m0 0h9m-9 0a1 1 0 100 2 1 1 0 000-2z" />
              </svg>
              {/* Cart badge - you can add item count here later */}
              <span className="absolute -top-1 -right-1 bg-[#59e3a5] text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                0
              </span>
            </Link>
            
            {/* Sign Up Button or User Profile */}
            {!hideSignUp && (
              currentUser ? (
                <Link href="/dashboard" className="w-10 h-10 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
                  <span className="text-black font-bold text-sm">
                    {currentUser.email.substring(0, 2).toUpperCase()}
                  </span>
                </Link>
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
              
              <div className="flex items-center justify-between px-3 py-2">
                {/* Cart Icon Button */}
                <Link href="/checkout" className="text-white hover:text-[#59e3a5] transition-colors p-2 relative">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6.5m0 0h9m-9 0a1 1 0 100 2 1 1 0 000-2z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 bg-[#59e3a5] text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    0
                  </span>
                </Link>
                
                {/* Sign Up Button or User Profile */}
                {!hideSignUp && (
                  currentUser ? (
                    <Link href="/dashboard" className="w-10 h-10 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
                      <span className="text-black font-bold text-sm">
                        {currentUser.email.substring(0, 2).toUpperCase()}
                      </span>
                    </Link>
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
    </header>
  );
} 