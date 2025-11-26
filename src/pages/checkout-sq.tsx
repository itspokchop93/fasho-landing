import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Script from 'next/script';
import { Track } from '../types/track';
import Header from '../components/Header';
import StepIndicator from '../components/StepIndicator';
import SalesBanner from '../components/SalesBanner';
import { createClient } from '../utils/supabase/client';
import { userProfileService, UserProfileData, ArtistProfile } from '../utils/userProfile';
import { MUSIC_GENRES } from '../constants/genres';
import LegalModal from '../components/LegalModal';
import SpotlightCard from '../components/SpotlightCard';
import { useAuth } from '../utils/authContext';

// Square SDK types
declare global {
  interface Window {
    Square?: any;
  }
}

interface Package {
  id: string;
  name: string;
  price: number;
  plays: string;
  placements: string;
  description: string;
}

interface OrderItem {
  track: Track;
  package: Package;
  originalPrice: number;
  discountedPrice: number;
  isDiscounted: boolean;
}

interface AddOnProduct {
  id: string;
  name: string;
  description: string[];
  originalPrice: number;
  salePrice: number;
  emoji: string;
  color: string;
  borderColor: string;
  bgGradient: string;
}

interface AddOnOrderItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  originalPrice: number;
  isOnSale: boolean;
}

const packages: Package[] = [
  {
    id: "test",
    name: "TEST",
    price: 1,
    plays: "Test Package",
    placements: "For Testing Only",
    description: "🧪 $1 test package for payment testing"
  },
  {
    id: "legendary",
    name: "LEGENDARY",
    price: 479,
    plays: "125,000 - 150,000 Streams", 
    placements: "375 - 400 Playlist Pitches",
    description: "Legendary status"
  },
  {
    id: "unstoppable",
    name: "UNSTOPPABLE",
    price: 259,
    plays: "45,000 - 50,000 Streams", 
    placements: "150 - 170 Playlist Pitches",
    description: "Become unstoppable"
  },
  {
    id: "dominate",
    name: "DOMINATE", 
    price: 149,
    plays: "18,000 - 20,000 Streams",
    placements: "60 - 70 Playlist Pitches",
    description: "Dominate the charts"
  },
  {
    id: "momentum", 
    name: "MOMENTUM",
    price: 79,
    plays: "7,500 - 8,500 Streams",
    placements: "25 - 30 Playlist Pitches",
    description: "Build your momentum"
  },
  {
    id: "breakthrough",
    name: "BREAKTHROUGH",
    price: 39,
    plays: "3,000 - 3,500 Streams",
    placements: "10 - 12 Playlist Pitches",
    description: "Perfect for getting started"
  }
];

const addOnProducts: AddOnProduct[] = [
  {
    id: "express-launch",
    name: "EXPRESS: 8hr Rapid Launch",
    description: ["Get your campaign launched within only 8 hours instead of the standard 24-48hr turnaround. INSTANT placements for INSTANT results."],
    originalPrice: 28,
    salePrice: 14,
    emoji: "⚡️",
    color: "text-yellow-400",
    borderColor: "border-yellow-500/50",
    bgGradient: "bg-gradient-to-r from-yellow-500/10 to-orange-500/10"
  },
  {
    id: "discover-weekly-push",
    name: "Guaranteed 'Discover Weekly' Push",
    description: ["Priority playlist targeting to maximize chances at Spotify's algorithmic playlists (Discover Weekly/Release Radar)."],
    originalPrice: 38,
    salePrice: 19,
    emoji: "🔥",
    color: "text-red-400",
    borderColor: "border-red-500/50",
    bgGradient: "bg-gradient-to-r from-red-500/10 to-pink-500/10"
  }
];

export default function CheckoutSquarePage() {
  const router = useRouter();
  const { tracks: tracksParam, selectedPackages: selectedPackagesParam } = router.query;
  const supabase = createClient();
  
  // Use the auth context instead of managing our own auth state
  const { user: currentUser, loading: authLoading } = useAuth();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<{[key: number]: string}>({});
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [addOnOrderItems, setAddOnOrderItems] = useState<AddOnOrderItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'flat';
    discount_value: number;
    calculated_discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [emailStatus, setEmailStatus] = useState<null | 'available' | 'exists' | 'invalid' | 'error'>(null);
  const [loginInfoMessage, setLoginInfoMessage] = useState<string | null>(null);

  const [lastSessionId, setLastSessionId] = useState<string>('');
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showProcessingPopup, setShowProcessingPopup] = useState(false);

  // Square SDK states
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [card, setCard] = useState<any>(null);
  const [cardError, setCardError] = useState('');
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  // Debug log helper function (logs to console only in production)
  const addDebugLog = (type: string, message: string) => {
    console.log(`[SQUARE-${type}] ${message}`);
  };

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Billing info state
  const [billingData, setBillingData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    countryCode: '+1',
    phoneNumber: '',
    musicGenre: ''
  });

  // Terms agreement state
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Modal states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Get Square application ID from environment
  const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
  const isSquareSandbox = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT !== 'production';

  // Helper functions for profile avatar
  const getUserInitials = (user: any) => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0].toUpperCase()
    }
    return user?.email ? user.email.substring(0, 2).toUpperCase() : 'U'
  }

  const getUserProfileImage = () => {
    if (artistProfile?.artist_image_url) {
      return artistProfile.artist_image_url
    }
    return null
  }

  const renderProfileAvatar = () => {
    const profileImage = getUserProfileImage()
    
    if (profileImage) {
      return (
        <div className="relative">
          <img
            src={profileImage}
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover border-2 border-green-500/50"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const fallback = target.nextElementSibling as HTMLElement
              if (fallback) fallback.style.display = 'flex'
            }}
          />
          <div className="w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center absolute top-0 left-0 hidden">
            <span className="text-black font-bold text-lg">
              {getUserInitials(currentUser)}
            </span>
          </div>
        </div>
      )
    }
    
    return (
      <div className="w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
        <span className="text-black font-bold text-lg">
          {getUserInitials(currentUser)}
        </span>
      </div>
    )
  }

  // Fetch artist profile for current user
  const fetchArtistProfile = async (user?: any) => {
    const userToUse = user || currentUser
    if (!userToUse?.id) return
    
    try {
      const profile = await userProfileService.fetchArtistProfile(userToUse.id)
      setArtistProfile(profile)
    } catch (error) {
      console.error('Failed to fetch artist profile:', error)
    }
  }

  // Password validation function
  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasUpperCase && hasNumber;
  };

  // Get password requirements status
  const getPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };
  };

  // Calculate discounted price (25% off, rounded up)
  const getDiscountedPrice = (originalPrice: number) => {
    const discounted = originalPrice * 0.75;
    return Math.ceil(discounted);
  };

  // Handle add-on selection
  const toggleAddOn = (addOnId: string) => {
    const newSelectedAddOns = new Set(selectedAddOns);
    const addOn = addOnProducts.find(p => p.id === addOnId);
    
    if (!addOn) return;
    
    if (newSelectedAddOns.has(addOnId)) {
      newSelectedAddOns.delete(addOnId);
      setAddOnOrderItems(prev => prev.filter(item => item.id !== addOnId));
    } else {
      newSelectedAddOns.add(addOnId);
      const addOnOrderItem: AddOnOrderItem = {
        id: addOn.id,
        name: addOn.name,
        emoji: addOn.emoji,
        price: addOn.salePrice,
        originalPrice: addOn.originalPrice,
        isOnSale: addOn.salePrice < addOn.originalPrice
      };
      setAddOnOrderItems(prev => [...prev, addOnOrderItem]);
    }
    
    setSelectedAddOns(newSelectedAddOns);
    localStorage.setItem('selectedAddOns', JSON.stringify(Array.from(newSelectedAddOns)));
    updateTotals();
  };

  // Remove add-on from line items
  const removeAddOn = (addOnId: string) => {
    const newSelectedAddOns = new Set(selectedAddOns);
    newSelectedAddOns.delete(addOnId);
    setSelectedAddOns(newSelectedAddOns);
    setAddOnOrderItems(prev => prev.filter(item => item.id !== addOnId));
    localStorage.setItem('selectedAddOns', JSON.stringify(Array.from(newSelectedAddOns)));
    updateTotals();
  };

  // Handle changing a song
  const changeSong = (trackIndex: number) => {
    const remainingTracks = tracks.filter((_, index) => index !== trackIndex);
    const remainingPackages: {[key: number]: string} = {};
    
    let newIndex = 0;
    Object.entries(selectedPackages).forEach(([oldIndex, packageId]) => {
      if (parseInt(oldIndex) !== trackIndex) {
        remainingPackages[newIndex] = packageId;
        newIndex++;
      }
    });

    if (remainingTracks.length > 0) {
      const cartData = {
        tracks: JSON.stringify(remainingTracks),
        selectedPackages: JSON.stringify(remainingPackages)
      };
      localStorage.setItem('checkoutCart', JSON.stringify(cartData));
    } else {
      localStorage.removeItem('checkoutCart');
    }

    router.push('/add');
  };

  // Update totals including add-ons and coupons
  const updateTotals = () => {
    let mainSubtotal = 0;
    let mainDiscount = 0;
    
    orderItems.forEach(item => {
      mainSubtotal += item.originalPrice;
      if (item.isDiscounted) {
        mainDiscount += (item.originalPrice - item.discountedPrice);
      }
    });
    
    let addOnSubtotal = 0;
    let addOnDiscount = 0;
    
    addOnOrderItems.forEach(item => {
      addOnSubtotal += item.originalPrice;
      if (item.isOnSale) {
        addOnDiscount += (item.originalPrice - item.price);
      }
    });
    
    const totalSubtotal = mainSubtotal + addOnSubtotal;
    const totalDiscount = mainDiscount + addOnDiscount;
    
    let finalTotal = totalSubtotal - totalDiscount;
    let couponDiscount = 0;
    
    if (appliedCoupon) {
      couponDiscount = appliedCoupon.calculated_discount;
      finalTotal = Math.max(0, finalTotal - couponDiscount);
    }
    
    setSubtotal(totalSubtotal);
    setDiscount(totalDiscount);
    setTotal(finalTotal);
  };

  // Apply coupon code
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');

    try {
      const preCouponTotal = subtotal - discount;
      
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_code: couponCode.trim(),
          order_amount: preCouponTotal
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply coupon');
      }

      setAppliedCoupon({
        id: data.coupon.id,
        code: couponCode.trim().toUpperCase(),
        discount_type: data.coupon.discount_type,
        discount_value: data.coupon.discount_value,
        calculated_discount: data.coupon.calculated_discount
      });

      setCouponCode('');
      
    } catch (err: any) {
      setCouponError(err.message || 'Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Remove applied coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  // Update totals when coupon changes
  useEffect(() => {
    updateTotals();
  }, [appliedCoupon, orderItems, addOnOrderItems]);

  // Initialize Square Web Payments SDK
  const initializeSquare = async (): Promise<boolean> => {
    if (card) return true;
    if (!window.Square) {
      console.log('[SQUARE] window.Square not available');
      return false;
    }
    if (!squareAppId || !squareLocationId) {
      console.log('[SQUARE] Missing credentials');
      setCardError('Payment configuration error. Please contact support.');
      return false;
    }

    const container = document.getElementById('square-card-container');
    if (!container) {
      console.log('[SQUARE] Container not in DOM');
      return false;
    }

    try {
      console.log('[SQUARE] Initializing payments...');
      const payments = window.Square.payments(squareAppId, squareLocationId);
      
      console.log('[SQUARE] Creating card instance...');
      const cardInstance = await payments.card();
      
      console.log('[SQUARE] Attaching to container...');
      await cardInstance.attach('#square-card-container');
      setCard(cardInstance);
      setSquareLoaded(true);
      console.log('[SQUARE] ✅ Card attached successfully');
      return true;
    } catch (error: any) {
      console.error('[SQUARE] Failed to initialize:', error?.message || error);
      return false;
    }
  };

  // Poll for window.Square availability and initialize
  useEffect(() => {
    if (card) return; // Already initialized

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 50; // 50 * 200ms = 10 seconds max

    const pollAndInit = async () => {
      if (cancelled || card) return;
      
      pollCount++;
      console.log(`[SQUARE] Poll #${pollCount} - checking window.Square:`, !!window.Square);
      
      // Check if Square SDK is available on window
      if (window.Square) {
        console.log('[SQUARE] SDK detected on window, attempting init...');
        const success = await initializeSquare();
        if (success) {
          console.log('[SQUARE] ✅ Successfully initialized');
          return;
        }
      }
      
      // Keep polling if not successful and under max attempts
      if (pollCount < maxPolls && !cancelled && !card) {
        setTimeout(pollAndInit, 200);
      } else if (pollCount >= maxPolls && !card) {
        console.log('[SQUARE] ❌ Max polls reached, showing refresh button');
        setShowRefreshButton(true);
        setCardError('Payment form took too long to load. Please refresh.');
      }
    };

    // Start polling after a short delay to let the page render
    const startDelay = setTimeout(() => {
      pollAndInit();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(startDelay);
    };
  }, [card, squareAppId, squareLocationId]);

  // Validate checkout session and load data
  useEffect(() => {
    const validateSession = async () => {
      if (!router.isReady) return;

      const { sessionId: sessionIdParam, tracks: tracksParam, selectedPackages: selectedPackagesParam } = router.query;
      
      // Check for legacy URL parameters (backward compatibility)
      if (tracksParam && selectedPackagesParam && !sessionIdParam) {
        try {
          const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tracks: JSON.parse(tracksParam as string),
              selectedPackages: JSON.parse(selectedPackagesParam as string),
              userId: null
            }),
          });

          if (response.ok) {
            const { sessionId: newSessionId } = await response.json();
            router.replace({
              pathname: '/checkout-sq',
              query: { sessionId: newSessionId }
            });
            return;
          }
        } catch (error) {
          console.error('Failed to create session for legacy URL:', error);
        }
      }

      if (!sessionIdParam) {
        console.error('No session ID provided');
        router.push('/add');
        return;
      }

      try {
        const response = await fetch('/api/validate-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdParam }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Session validation failed:', errorData);
          
          if (errorData.reason === 'already_used') {
            setError('already_completed');
            setTimeout(() => {
              router.push('/dashboard');
            }, 2500);
            return;
          } 
          
          if (errorData.reason === 'expired' || errorData.reason === 'session_not_found') {
            try {
              const recoveryResponse = await fetch('/api/recover-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: currentUser?.id,
                  expiredSessionId: sessionIdParam
                }),
              });

              if (recoveryResponse.ok) {
                const { sessionId: newSessionId } = await recoveryResponse.json();
                router.push({
                  pathname: '/checkout-sq',
                  query: { sessionId: newSessionId }
                });
                return;
              }
            } catch (recoveryError) {
              console.error('Session recovery failed:', recoveryError);
            }
            
            setError('Your checkout session has expired. Redirecting you to start a new checkout...');
            setTimeout(() => {
              router.push('/add');
            }, 3000);
            return;
          }
          
          setError('Invalid checkout session. Please start a new checkout.');
          setTimeout(() => {
            router.push('/add');
          }, 3000);
          return;
        }

        const { sessionData } = await response.json();
        
        let sessionTracks: Track[];
        let sessionPackages: {[key: number]: string};
        
        if (sessionData) {
          sessionTracks = sessionData.tracks;
          sessionPackages = sessionData.selectedPackages;
        } else {
          if (tracksParam && selectedPackagesParam) {
            sessionTracks = JSON.parse(tracksParam as string);
            sessionPackages = JSON.parse(selectedPackagesParam as string);
          } else {
            throw new Error('No session data available');
          }
        }
        
        setTracks(sessionTracks);
        setSelectedPackages(sessionPackages);
        
        const cartData = {
          tracks: JSON.stringify(sessionTracks),
          selectedPackages: JSON.stringify(sessionPackages)
        };
        localStorage.setItem('checkoutCart', JSON.stringify(cartData));
        
        setSessionId(sessionIdParam as string);
        
        if (lastSessionId && lastSessionId !== sessionIdParam) {
          localStorage.removeItem('selectedAddOns');
          setSelectedAddOns(new Set());
          setAddOnOrderItems([]);
        }
        setLastSessionId(sessionIdParam as string);
        
        if (!lastSessionId || lastSessionId === sessionIdParam) {
          const storedAddOns = localStorage.getItem('selectedAddOns');
          if (storedAddOns) {
            try {
              const parsedAddOns = JSON.parse(storedAddOns) as string[];
              const addOnSet = new Set(parsedAddOns);
              const addOnItems: AddOnOrderItem[] = [];
              
              parsedAddOns.forEach(addOnId => {
                const addOn = addOnProducts.find(p => p.id === addOnId);
                if (addOn) {
                  addOnItems.push({
                    id: addOn.id,
                    name: addOn.name,
                    emoji: addOn.emoji,
                    price: addOn.salePrice,
                    originalPrice: addOn.originalPrice,
                    isOnSale: addOn.salePrice < addOn.originalPrice
                  });
                }
              });
              
              setSelectedAddOns(addOnSet);
              setAddOnOrderItems(addOnItems);
            } catch (error) {
              console.error('Failed to restore add-ons from localStorage:', error);
              localStorage.removeItem('selectedAddOns');
            }
          }
        }
        
        const items: OrderItem[] = [];
        let calculatedSubtotal = 0;
        let calculatedDiscount = 0;
        
        sessionTracks.forEach((track: Track, index: number) => {
          const packageId = sessionPackages[index];
          const selectedPackage = packages.find(p => p.id === packageId);
          
          if (selectedPackage) {
            const isDiscounted = index > 0;
            const originalPrice = selectedPackage.price;
            const finalPrice = isDiscounted ? getDiscountedPrice(originalPrice) : originalPrice;
            
            items.push({
              track,
              package: selectedPackage,
              originalPrice,
              discountedPrice: finalPrice,
              isDiscounted
            });
            
            calculatedSubtotal += originalPrice;
            if (isDiscounted) {
              calculatedDiscount += (originalPrice - finalPrice);
            }
          }
        });
        
        setOrderItems(items);
        setSubtotal(calculatedSubtotal);
        setDiscount(calculatedDiscount);
        setTotal(calculatedSubtotal - calculatedDiscount);
        
      } catch (error) {
        console.error('Error validating session:', error);
        setError('Failed to load checkout session. Please try again.');
        setTimeout(() => {
          router.push('/add');
        }, 3000);
      }
    };

    validateSession();
  }, [router.isReady, router.query]);

  // Update totals when add-ons change
  useEffect(() => {
    updateTotals();
  }, [orderItems, addOnOrderItems]);

  // Debounced email validation effect
  useEffect(() => {
    if (!formData.email || isLoginMode) {
      setEmailStatus(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkEmailExists(formData.email);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.email, isLoginMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
    
    if (loginError) {
      setLoginError('');
    }
    
    if (formError) {
      setFormError('');
    }
  };

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.name === 'state' && value.length > 2) {
      value = value.slice(0, 2).toUpperCase();
    }
    if (e.target.name === 'country' && value.length > 2) {
      value = value.slice(0, 2).toUpperCase();
    }
    setBillingData(prev => ({
      ...prev,
      [e.target.name]: value
    }));
    
    if (formError) {
      setFormError('');
    }
  };

  // Handle field validation on blur
  const handleFieldBlur = (field: string, value: string) => {
    let error = '';
    
    if (field === 'password' && value) {
      if (value.length < 6) {
        error = 'Password must be at least 6 characters long';
      } else if (!validatePassword(value)) {
        error = 'Passwords require 1 Uppercase Letter and 1 Number';
      }
    }
    
    if (field === 'confirmPassword' && value && formData.password) {
      if (value !== formData.password) {
        error = 'Passwords do not match';
      }
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Check if email exists
  const checkEmailExists = async (email: string) => {
    setEmailStatus(null);
    if (!email || !email.includes('@')) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('invalid');
      return;
    }
    
    setIsCheckingEmail(true);
    setFieldErrors(prev => ({ ...prev, email: '' }));
    
    try {
      const response = await fetch('/api/check-user-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      if (response.ok) {
        if (data.exists) {
          setEmailStatus('exists');
        } else {
          setEmailStatus('available');
        }
      } else {
        setEmailStatus('error');
      }
    } catch (error) {
      setEmailStatus('error');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Validate if form is ready for payment
  const isFormValid = () => {
    if (currentUser) {
      return billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             billingData.state && 
             billingData.zip &&
             billingData.phoneNumber &&
             billingData.musicGenre &&
             termsAgreed;
    }
    
    if (isLoginMode) {
      return formData.email && 
             formData.password &&
             billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             billingData.state && 
             billingData.zip &&
             billingData.phoneNumber &&
             billingData.musicGenre &&
             termsAgreed;
    } else {
      return formData.email && 
             formData.password && 
             formData.confirmPassword &&
             formData.password === formData.confirmPassword &&
             formData.password.length >= 6 &&
             validatePassword(formData.password) &&
             billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             billingData.state && 
             billingData.zip &&
             billingData.phoneNumber &&
             billingData.musicGenre &&
             termsAgreed &&
             (emailStatus === 'available') &&
             !fieldErrors.password &&
             !fieldErrors.confirmPassword;
    }
  };

  // Get the first missing field for error messaging
  const getFirstMissingField = () => {
    if (!currentUser && !isLoginMode) {
      if (!formData.email) return 'email';
      if (emailStatus && emailStatus !== 'available') return 'email';
      if (!formData.password) return 'password';
      if (fieldErrors.password) return 'password';
      if (!formData.confirmPassword) return 'confirmPassword';
      if (fieldErrors.confirmPassword) return 'confirmPassword';
    } else if (!currentUser && isLoginMode) {
      if (!formData.email) return 'email';
      if (!formData.password) return 'password';
    }
    
    if (!billingData.firstName) return 'firstName';
    if (!billingData.lastName) return 'lastName';
    if (!billingData.address) return 'address';
    if (!billingData.city) return 'city';
    if (!billingData.state) return 'state';
    if (!billingData.zip) return 'zip';
    if (!billingData.phoneNumber) return 'phoneNumber';
    if (!billingData.musicGenre) return 'musicGenre';
    
    if (!termsAgreed) return 'termsAgreed';
    
    return null;
  };

  // Function to fetch user profile and autofill billing data
  const autofillUserProfile = async (userId: string) => {
    try {
      const response = await fetch('/api/user-profile');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.profile) {
          const profile = data.profile;
          
          setBillingData(prev => ({
            ...prev,
            firstName: profile.first_name || prev.firstName,
            lastName: profile.last_name || prev.lastName,
            address: profile.billing_address_line1 || prev.address,
            address2: profile.billing_address_line2 || prev.address2,
            city: profile.billing_city || prev.city,
            state: profile.billing_state || prev.state,
            zip: profile.billing_zip || prev.zip,
            country: profile.billing_country || prev.country,
            phoneNumber: profile.billing_phone || prev.phoneNumber
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Respond to authentication changes
  useEffect(() => {
    if (currentUser && !authLoading) {
      if (currentUser?.id) {
        autofillUserProfile(currentUser.id);
      }
      
      if (currentUser?.id) {
        fetchArtistProfile(currentUser);
      }
      
      if (currentUser?.email) {
        setFormData(prev => ({
          ...prev,
          email: currentUser.email || ''
        }));
      }
    } else if (!currentUser && !authLoading) {
      setArtistProfile(null);
    }
  }, [currentUser, authLoading]);

  // Handle login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setLoginError('Login credentials do not match our records. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      const cartData = {
        tracks: tracksParam,
        selectedPackages: selectedPackagesParam
      };
      localStorage.setItem('checkoutCart', JSON.stringify(cartData));

      window.location.reload();
      setLoginInfoMessage(null);
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const cartData = {
        tracks: tracksParam,
        selectedPackages: selectedPackagesParam
      };
      localStorage.setItem('checkoutCart', JSON.stringify(cartData));

      const { sessionId: currentSessionId } = router.query;

      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      await supabase.auth.signOut();
      
      localStorage.removeItem('userProfileImage');
      sessionStorage.clear();
      
      if (currentSessionId) {
        window.location.href = `/checkout-sq?sessionId=${currentSessionId}`;
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.reload();
    }
  };

  // Handle successful payment
  const handleSuccessfulPayment = async (paymentResult: any) => {
    console.log('🟩 SQUARE-CHECKOUT: Payment successful:', paymentResult);
    
    try {
      const orderPayload = {
        items: orderItems.map(item => ({
          track: {
            id: item.track.id,
            title: item.track.title,
            artist: item.track.artist,
            imageUrl: item.track.imageUrl,
            url: item.track.url,
            artistProfileUrl: item.track.artistProfileUrl
          },
          package: item.package,
          originalPrice: item.originalPrice,
          discountedPrice: item.discountedPrice,
          isDiscounted: item.isDiscounted
        })),
        addOnItems: addOnOrderItems,
        subtotal,
        discount,
        total,
        customerEmail: currentUser ? currentUser.email : formData.email,
        customerName: `${billingData.firstName} ${billingData.lastName}`,
        billingInfo: billingData,
        paymentData: {
          transactionId: paymentResult.transactionId,
          authorization: paymentResult.status,
          accountNumber: 'Square Payment',
          accountType: 'card',
        },
        coupon: appliedCoupon,
        userId: currentUser?.id || null
      };

      console.log('🟩 SQUARE-CHECKOUT: Creating order with payload...');
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const orderResult = await orderResponse.json();
      console.log('🟩 SQUARE-CHECKOUT: Order creation response:', orderResult);

      if (!orderResult.success) {
        console.error('Order creation failed:', orderResult.message);
        setError('Payment was successful but there was an error saving your order. Please contact support with your transaction ID: ' + paymentResult.transactionId);
        setShowProcessingPopup(false);
        return;
      }

      // Mark checkout session as completed
      if (sessionId) {
        try {
          await fetch('/api/complete-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
        } catch (error) {
          console.error('Error marking session as completed:', error);
        }
      }
      
      // Store order data for thank you page
      const orderData = {
        items: orderItems,
        addOnItems: addOnOrderItems,
        subtotal,
        discount,
        total,
        customerEmail: currentUser ? currentUser.email : formData.email,
        customerName: `${billingData.firstName} ${billingData.lastName}`,
        newAccountCreated: !currentUser,
        orderNumber: orderResult.order.orderNumber,
        orderId: orderResult.order.id,
        paymentData: {
          transactionId: paymentResult.transactionId,
          authorization: paymentResult.status,
          accountNumber: 'Square Payment',
          accountType: 'card',
        },
        createdAt: orderResult.order.createdAt,
        couponId: appliedCoupon?.id || null,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: appliedCoupon?.calculated_discount || null,
      };
      sessionStorage.setItem('completedOrder', JSON.stringify(orderData));
      
      // Clean up
      sessionStorage.removeItem('pendingOrder');
      localStorage.removeItem('selectedAddOns');
      
      setShowProcessingPopup(false);
      
      // Redirect to thank you page
      router.push(`/thank-you?order=${orderResult.order.orderNumber}`);
      
    } catch (error) {
      console.error('Error processing order:', error);
      setError('Payment was successful but there was an error processing your order. Please contact support.');
      setShowProcessingPopup(false);
    }
  };

  // Handle form submission with Square payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addDebugLog('INFO', '===== FORM SUBMISSION STARTED =====');
    addDebugLog('INFO', `Total amount: $${total}`);
    addDebugLog('INFO', `User: ${currentUser?.email || formData.email || 'Not logged in'}`);
    addDebugLog('INFO', `Square card ready: ${!!card}`);
    addDebugLog('INFO', `Square SDK loaded: ${squareLoaded}`);
    
    setIsLoading(true);
    setFormError('');
    setCardError('');

    // Check if form is valid
    if (!isFormValid()) {
      const firstMissingField = getFirstMissingField();
      let errorMessage = 'Please complete all required fields before continuing.';
      
      if (firstMissingField) {
        const element = document.getElementById(firstMissingField);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
        
        if (['email', 'password', 'confirmPassword'].includes(firstMissingField)) {
          errorMessage = 'Please complete your account information before continuing.';
        } else if (firstMissingField === 'termsAgreed') {
          errorMessage = 'Please agree to the Terms & Conditions, Privacy Policy, Disclaimer, and Refund Policy before continuing.';
        } else if (firstMissingField === 'musicGenre') {
          errorMessage = 'Please select your music genre before continuing.';
        } else {
          errorMessage = 'Please complete your billing information before continuing.';
        }
      }
      
      setFormError(errorMessage);
      setIsLoading(false);
      return;
    }

    // Check if Square card is ready
    if (!card) {
      setCardError('Payment form not loaded. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    // Create user account if needed (before payment)
    let userId = currentUser?.id || null;
    
    if (!currentUser) {
      try {
        // Check if user exists
        const checkResponse = await fetch('/api/check-user-exists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });
        
        const checkData = await checkResponse.json();
        
        if (checkData.exists) {
          // User exists, try to sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          
          if (signInError) {
            setFormError('An account with this email already exists. Please use the correct password or sign in first.');
            setIsLoading(false);
            return;
          }
          
          userId = signInData.user?.id || null;
        } else {
          // Create new account
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: `${billingData.firstName} ${billingData.lastName}`,
              },
            },
          });

          if (authData.user && !authError) {
            userId = authData.user.id;
            
            // Sync user data to user_profiles table
            await fetch('/api/sync-user-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: authData.user.id,
                email: formData.email,
                first_name: billingData.firstName,
                last_name: billingData.lastName,
                full_name: `${billingData.firstName} ${billingData.lastName}`,
                billing_address_line1: billingData.address,
                billing_city: billingData.city,
                billing_state: billingData.state,
                billing_zip: billingData.zip,
                billing_country: billingData.country,
                billing_phone: billingData.phoneNumber,
                music_genre: billingData.musicGenre,
                source: 'checkout'
              })
            });

            // Auto-confirm the user
            await fetch('/api/auto-confirm-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email }),
            });
          }
        }
      } catch (error) {
        console.error('Error handling user account:', error);
        // Continue with payment even if account creation fails
      }
    }

    // Process payment with Square
    try {
      setShowProcessingPopup(true);
      addDebugLog('INFO', 'Tokenizing card with Square...');
      
      const tokenResult = await card.tokenize();
      addDebugLog('INFO', `Tokenization result status: ${tokenResult.status}`);
      
      if (tokenResult.status === 'OK') {
        addDebugLog('SUCCESS', `Card tokenized successfully. Token: ${tokenResult.token?.substring(0, 20)}...`);
        
        // Prepare order items for payment API
        const paymentOrderItems = orderItems.map(item => ({
          name: `${item.track.title} - ${item.package.name}`,
          price: item.discountedPrice
        }));
        
        const addOnPaymentItems = addOnOrderItems.map(item => ({
          name: `${item.emoji} ${item.name.replace(/ \(.*\)/, '')}`,
          price: item.price
        }));
        
        const allPaymentItems = [...paymentOrderItems, ...addOnPaymentItems];
        
        // Call Square payment API
        addDebugLog('INFO', `Calling /api/square-payment with amount: $${total}`);
        const paymentResponse = await fetch('/api/square-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: tokenResult.token,
            amount: total,
            orderItems: allPaymentItems,
            customerEmail: currentUser ? currentUser.email : formData.email,
            billingInfo: {
              ...billingData,
              state: billingData.state.slice(0, 2).toUpperCase(),
              country: billingData.country.slice(0, 2).toUpperCase()
            }
          }),
        });

        addDebugLog('INFO', `API Response status: ${paymentResponse.status}`);
        
        // Check if response is JSON
        const contentType = paymentResponse.headers.get('content-type');
        addDebugLog('INFO', `Response content-type: ${contentType}`);
        
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await paymentResponse.text();
          addDebugLog('ERROR', `Non-JSON response: ${textResponse.substring(0, 200)}...`);
          setCardError('Server error. Please try again or contact support.');
          setShowProcessingPopup(false);
          setIsLoading(false);
          return;
        }
        
        const paymentResult = await paymentResponse.json();
        addDebugLog('INFO', `Payment result: ${JSON.stringify(paymentResult).substring(0, 200)}`);
        if (paymentResult.success) {
          addDebugLog('SUCCESS', 'Payment completed successfully!');
          await handleSuccessfulPayment(paymentResult.payment);
        } else {
          addDebugLog('ERROR', `Payment failed: ${paymentResult.message}`);
          setCardError(paymentResult.message || 'Payment failed. Please try again.');
          setShowProcessingPopup(false);
        }
      } else {
        addDebugLog('ERROR', `Tokenization failed: ${JSON.stringify(tokenResult.errors)}`);
        let errorMessage = 'Please check your card details and try again.';
        
        if (tokenResult.errors && tokenResult.errors.length > 0) {
          const firstError = tokenResult.errors[0];
          if (firstError.message) {
            errorMessage = firstError.message;
          }
        }
        
        setCardError(errorMessage);
        setShowProcessingPopup(false);
      }
    } catch (error: any) {
      addDebugLog('ERROR', `Payment exception: ${error?.message || error}`);
      setCardError(error?.message || 'Payment processing failed. Please try again.');
      setShowProcessingPopup(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!router.isReady || authLoading || (orderItems.length === 0 && !error)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Display session validation errors
  if (error && (error === 'already_completed' || error.includes('checkout session') || error.includes('session'))) {
    const isAlreadyCompleted = error === 'already_completed';
    
    return (
      <>
        <Head>
          <title>{isAlreadyCompleted ? 'Payment Complete' : 'Checkout Error'} - FASHO</title>
        </Head>
        <SalesBanner />
        <Header />
        
        <main className="min-h-screen relative text-white pt-24 pb-12">
          <div className="fixed inset-0 bg-black z-0"></div>
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20 z-10"
            style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
          ></div>
          
          <div className="relative z-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                {isAlreadyCompleted ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 mb-8">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-4 text-green-400">You already completed this checkout! 😊</h1>
                    <div className="flex items-center justify-center space-x-3 text-white/60 text-sm mb-6">
                      <div className="w-4 h-4 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin"></div>
                      <span>Redirecting you to your dashboard...</span>
                    </div>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 mb-8">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-4 text-red-400">Checkout Session Error</h1>
                    <p className="text-white/80 mb-6 max-w-2xl mx-auto">{error}</p>
                    <p className="text-white/60 text-sm mb-6">You will be redirected to start a new checkout in a few seconds...</p>
                    <button
                      onClick={() => router.push('/add')}
                      className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Start New Checkout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Square SDK URL based on environment
  const squareSdkUrl = isSquareSandbox 
    ? 'https://sandbox.web.squarecdn.com/v1/square.js'
    : 'https://web.squarecdn.com/v1/square.js';

  return (
    <>
      <Head>
        <title>Checkout - FASHO</title>
        <meta name="description" content="Complete your music promotion order" />
      </Head>

      {/* Load Square Web Payments SDK */}
      <Script 
        src={squareSdkUrl}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[SQUARE] Script onLoad fired');
          setSquareLoaded(true);
        }}
        onReady={() => {
          console.log('[SQUARE] Script onReady fired, window.Square:', !!window.Square);
          setSquareLoaded(true);
        }}
        onError={(e) => {
          console.error('[SQUARE] Script failed to load:', e);
          setCardError('Failed to load payment form. Please refresh the page.');
        }}
      />

      <SalesBanner />
      <Header />
      
      <main className="min-h-screen relative text-white pt-24 pb-12">
        {/* Background layers */}
        <div className="fixed inset-0 bg-black z-0"></div>
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20 z-10"
          style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
        ></div>
        
        <div className="relative z-20">
          <StepIndicator currentStep={3} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 mt-[-38px] sm:mt-[-30px] bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">🚀 Complete Your Order</h1>
              <p className="text-lg text-gray-300 mt-3">This is where your career changes forever!</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Account & Billing */}
                <div className="space-y-6">
                  {/* Account Details or Signed In Status */}
                  {currentUser && !authLoading ? (
                    <div className="bg-white/5 rounded-xl pt-4 px-6 pb-6 sm:p-6 border border-white/20">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Account</h2>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="text-white/60 hover:text-white text-sm transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                      <div className="flex items-center space-x-4">
                        {renderProfileAvatar()}
                        <div>
                          <p className="text-white font-medium">You are currently signed in</p>
                          <p className="text-white/60 text-sm">{currentUser.email}</p>
                        </div>
                      </div>
                    </div>
                  ) : !authLoading ? (
                    <div className="bg-white/5 rounded-xl pt-4 px-6 pb-6 sm:p-6 border border-white/20">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold">
                          {isLoginMode ? 'Sign In' : 'Account Details'}
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            setIsLoginMode(!isLoginMode);
                            setError('');
                            setFormError('');
                            setFieldErrors({});
                            setLoginInfoMessage(null);
                            setEmailStatus(null);
                          }}
                          className="text-[#59e3a5] hover:text-[#14c0ff] text-sm transition-colors"
                        >
                          {isLoginMode ? 'Create Account' : 'Sign in to my account'}
                        </button>
                      </div>
                      
                      <p className="text-sm text-white/60 mb-6">
                        {isLoginMode 
                          ? 'Sign in to your existing account'
                          : 'Create your account so you can track your campaigns and access exclusive features.'
                        }
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="email" className="block text-sm text-white/70 mb-2">
                            Email {!isLoginMode && <span className="text-red-400">*</span>}
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                            placeholder="your@email.com"
                          />
                          {emailStatus === 'exists' && (
                            <p className="text-red-400 text-sm mt-1">
                              You already have an account with us! Please{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsLoginMode(true);
                                  setEmailStatus(null);
                                }}
                                className="text-[#59e3a5] hover:text-[#14c0ff] underline transition-colors"
                              >
                                LOGIN
                              </button>{' '}
                              instead
                            </p>
                          )}
                          {emailStatus === 'available' && (
                            <div className="flex items-center text-green-400 text-sm mt-1">
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Email is available!
                            </div>
                          )}
                          {emailStatus === 'invalid' && (
                            <p className="text-red-400 text-sm mt-1">Please enter a valid email address</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="password" className="block text-sm text-white/70 mb-2">
                            Password {!isLoginMode && <span className="text-red-400">*</span>}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              id="password"
                              name="password"
                              value={formData.password}
                              onChange={handleInputChange}
                              onFocus={() => !isLoginMode && setShowPasswordRequirements(true)}
                              onBlur={(e) => {
                                if (!isLoginMode) {
                                  handleFieldBlur('password', e.target.value);
                                  setShowPasswordRequirements(false);
                                }
                              }}
                              required
                              className={`w-full bg-white/10 border rounded-lg py-3 px-4 pr-12 text-white placeholder-white/50 focus:outline-none transition-colors ${
                                fieldErrors.password ? 'border-red-500' : 'border-white/20 focus:border-[#59e3a5]'
                              }`}
                              placeholder={isLoginMode ? 'Enter your password' : 'Create a password'}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                            >
                              {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.242 4.242M12 12l6.878 6.878" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                          {fieldErrors.password && !isLoginMode && (
                            <p className="text-red-400 text-sm mt-1">{fieldErrors.password}</p>
                          )}
                          
                          {!isLoginMode && showPasswordRequirements && (
                            <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                              <p className="text-white/80 text-sm mb-2 font-medium">Password requirements:</p>
                              {(() => {
                                const requirements = getPasswordRequirements(formData.password);
                                return (
                                  <div className="space-y-1">
                                    <div className={`flex items-center text-sm ${requirements.minLength ? 'text-green-400' : 'text-white/60'}`}>
                                      <svg className={`w-3 h-3 mr-2 ${requirements.minLength ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                      </svg>
                                      Minimum 8 characters
                                    </div>
                                    <div className={`flex items-center text-sm ${requirements.hasUpperCase ? 'text-green-400' : 'text-white/60'}`}>
                                      <svg className={`w-3 h-3 mr-2 ${requirements.hasUpperCase ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                      </svg>
                                      At least 1 uppercase letter
                                    </div>
                                    <div className={`flex items-center text-sm ${requirements.hasLowerCase ? 'text-green-400' : 'text-white/60'}`}>
                                      <svg className={`w-3 h-3 mr-2 ${requirements.hasLowerCase ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                      </svg>
                                      At least 1 lowercase letter
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        
                        {!isLoginMode && (
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm text-white/70 mb-2">
                              Confirm Password <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                                required
                                className={`w-full bg-white/10 border rounded-lg py-3 px-4 pr-12 text-white placeholder-white/50 focus:outline-none transition-colors ${
                                  fieldErrors.confirmPassword ? 'border-red-500' : 'border-white/20 focus:border-[#59e3a5]'
                                }`}
                                placeholder="Confirm your password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                              >
                                {showConfirmPassword ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.242 4.242M12 12l6.878 6.878" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                              <p className="text-red-400 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {isLoginMode && (
                        <div className="mt-6">
                          {loginError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                              <p className="text-red-400 text-sm">{loginError}</p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? 'Logging in...' : 'Login'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mr-3"></div>
                        <span className="text-white/80">Loading account...</span>
                      </div>
                    </div>
                  )}

                  {/* Billing Information */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold">Billing Information</h2>
                      {(billingData.firstName || billingData.lastName || billingData.address || 
                        billingData.city || billingData.state || billingData.zip || billingData.phoneNumber) && (
                        <button
                          type="button"
                          onClick={() => setBillingData({
                            firstName: '',
                            lastName: '',
                            address: '',
                            address2: '',
                            city: '',
                            state: '',
                            zip: '',
                            country: 'US',
                            countryCode: '+1',
                            phoneNumber: '',
                            musicGenre: ''
                          })}
                          className="text-red-400 hover:text-red-300 text-sm transition-colors"
                        >
                          Clear billing form
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-white/60 mb-6">Enter your billing information</p>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="firstName" className="block text-sm text-white/70 mb-2">
                            First Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={billingData.firstName}
                            onChange={handleBillingChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                            placeholder="John"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="lastName" className="block text-sm text-white/70 mb-2">
                            Last Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={billingData.lastName}
                            onChange={handleBillingChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="address" className="block text-sm text-white/70 mb-2">
                          Street Address <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          id="address"
                          name="address"
                          value={billingData.address}
                          onChange={handleBillingChange}
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                          placeholder="123 Main Street"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="address2" className="block text-sm text-white/70 mb-2">
                          Address Line 2 (Optional)
                        </label>
                        <input
                          type="text"
                          id="address2"
                          name="address2"
                          value={billingData.address2}
                          onChange={handleBillingChange}
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                          placeholder="Apt, suite, etc."
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="city" className="block text-sm text-white/70 mb-2">
                            City <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            id="city"
                            name="city"
                            value={billingData.city}
                            onChange={handleBillingChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                            placeholder="New York"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="state" className="block text-sm text-white/70 mb-2">
                            State <span className="text-red-400">*</span>
                          </label>
                          <select
                            id="state"
                            name="state"
                            value={billingData.state}
                            onChange={handleBillingChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                          >
                            <option value="">Select State</option>
                            <option value="AL">Alabama</option>
                            <option value="AK">Alaska</option>
                            <option value="AZ">Arizona</option>
                            <option value="AR">Arkansas</option>
                            <option value="CA">California</option>
                            <option value="CO">Colorado</option>
                            <option value="CT">Connecticut</option>
                            <option value="DE">Delaware</option>
                            <option value="FL">Florida</option>
                            <option value="GA">Georgia</option>
                            <option value="HI">Hawaii</option>
                            <option value="ID">Idaho</option>
                            <option value="IL">Illinois</option>
                            <option value="IN">Indiana</option>
                            <option value="IA">Iowa</option>
                            <option value="KS">Kansas</option>
                            <option value="KY">Kentucky</option>
                            <option value="LA">Louisiana</option>
                            <option value="ME">Maine</option>
                            <option value="MD">Maryland</option>
                            <option value="MA">Massachusetts</option>
                            <option value="MI">Michigan</option>
                            <option value="MN">Minnesota</option>
                            <option value="MS">Mississippi</option>
                            <option value="MO">Missouri</option>
                            <option value="MT">Montana</option>
                            <option value="NE">Nebraska</option>
                            <option value="NV">Nevada</option>
                            <option value="NH">New Hampshire</option>
                            <option value="NJ">New Jersey</option>
                            <option value="NM">New Mexico</option>
                            <option value="NY">New York</option>
                            <option value="NC">North Carolina</option>
                            <option value="ND">North Dakota</option>
                            <option value="OH">Ohio</option>
                            <option value="OK">Oklahoma</option>
                            <option value="OR">Oregon</option>
                            <option value="PA">Pennsylvania</option>
                            <option value="RI">Rhode Island</option>
                            <option value="SC">South Carolina</option>
                            <option value="SD">South Dakota</option>
                            <option value="TN">Tennessee</option>
                            <option value="TX">Texas</option>
                            <option value="UT">Utah</option>
                            <option value="VT">Vermont</option>
                            <option value="VA">Virginia</option>
                            <option value="WA">Washington</option>
                            <option value="WV">West Virginia</option>
                            <option value="WI">Wisconsin</option>
                            <option value="WY">Wyoming</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="zip" className="block text-sm text-white/70 mb-2">
                            ZIP Code <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            id="zip"
                            name="zip"
                            value={billingData.zip}
                            onChange={handleBillingChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                            placeholder="12345"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="billingCountry" className="block text-sm text-white/70 mb-2">
                            Country <span className="text-red-400">*</span>
                          </label>
                          <select
                            id="billingCountry"
                            name="country"
                            value={billingData.country}
                            onChange={handleBillingChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="GB">United Kingdom</option>
                            <option value="AU">Australia</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="phoneNumber" className="block text-sm text-white/70 mb-2">
                          Phone Number <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            id="countryCode"
                            name="countryCode"
                            value={billingData.countryCode}
                            onChange={handleBillingChange}
                            required
                            className="bg-white/10 border border-white/20 rounded-lg py-3 px-3 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                            style={{ minWidth: '120px' }}
                          >
                            <option value="+1">US +1</option>
                            <option value="+1">CA +1</option>
                            <option value="+44">UK +44</option>
                            <option value="+61">AU +61</option>
                          </select>
                          <input
                            type="tel"
                            id="phoneNumber"
                            name="phoneNumber"
                            value={billingData.phoneNumber}
                            onChange={handleBillingChange}
                            required
                            className="flex-1 bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Genre Selection & Terms Agreement Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                      <h2 className="text-lg font-semibold mb-2">Your Genre <span className="text-red-400">*</span></h2>
                      <p className="text-sm text-white/60 mb-4">Select the genre that best describes your music style</p>
                      
                      <div>
                        <select
                          id="musicGenre"
                          name="musicGenre"
                          value={billingData.musicGenre}
                          onChange={handleBillingChange}
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                        >
                          <option value="" className="bg-gray-800 text-white">Select a genre...</option>
                          {MUSIC_GENRES.map(genre => (
                            <option key={genre} value={genre} className="bg-gray-800 text-white">
                              {genre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                      <h2 className="text-lg font-semibold mb-2">Agreement</h2>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="termsAgreed"
                          name="termsAgreed"
                          checked={termsAgreed}
                          onChange={(e) => setTermsAgreed(e.target.checked)}
                          required
                          className="mt-1 w-4 h-4 bg-white/10 border border-white/20 rounded focus:ring-[#59e3a5] focus:ring-2 text-[#59e3a5] transition-colors"
                        />
                        <label htmlFor="termsAgreed" className="text-sm text-white/70 leading-relaxed">
                          I have read and understand the{' '}
                          <button 
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-[#59e3a5] hover:text-[#4bc995] underline transition-colors"
                          >
                            Terms & Conditions
                          </button>
                          ,{' '}
                          <button 
                            type="button"
                            onClick={() => setShowPrivacyModal(true)}
                            className="text-[#59e3a5] hover:text-[#4bc995] underline transition-colors"
                          >
                            Privacy Policy
                          </button>
                          ,{' '}
                          <button 
                            type="button"
                            onClick={() => setShowDisclaimerModal(true)}
                            className="text-[#59e3a5] hover:text-[#4bc995] underline transition-colors"
                          >
                            Disclaimer
                          </button>
                          , and{' '}
                          <button 
                            type="button"
                            onClick={() => setShowRefundModal(true)}
                            className="text-[#59e3a5] hover:text-[#4bc995] underline transition-colors"
                          >
                            Refund Policy
                          </button>
                          . <span className="text-red-400">*</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Order Summary & Payment */}
                <div className="space-y-6">
                  {/* Order Items */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <h2 className="text-lg font-semibold mb-6">Your Order</h2>
                    
                    <div className={`space-y-4 ${(orderItems.length + addOnOrderItems.length) > 2 ? 'max-h-[240px] overflow-y-auto pr-4 pl-2 pt-2 pb-2' : ''}`}>
                      {orderItems.map((item, index) => (
                        <div key={index} className="flex items-center space-x-4 p-5 bg-white/5 rounded-lg relative min-h-[100px]">
                          <button
                            type="button"
                            onClick={() => changeSong(index)}
                            className="absolute -top-1 -right-1 bg-blue-500/50 hover:bg-blue-600/70 text-white text-xs px-2 py-1 rounded-full transition-colors shadow-lg border-2 border-white/50 z-30"
                            style={{ fontSize: '0.625rem' }}
                          >
                            Change Song
                          </button>
                          
                          {item.isDiscounted && (
                            <div className="absolute top-2 left-2 bg-[#59e3a5] text-black text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap z-20">
                              25% OFF
                            </div>
                          )}
                          
                          <div className="relative">
                            <Image
                              src={item.track.imageUrl}
                              alt={item.track.title}
                              width={60}
                              height={60}
                              className="rounded-lg"
                              unoptimized
                            />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{item.track.title}</h3>
                            <p className="text-white/60 text-sm">{item.track.artist}</p>
                            <p className="text-[#59e3a5] text-sm font-medium">{item.package.name}</p>
                            <p className="text-white/50 text-xs">{item.package.plays} • {item.package.placements}</p>
                          </div>
                          
                          <div className="text-right">
                            {item.isDiscounted ? (
                              <div>
                                <div className="text-white/50 text-sm line-through">${item.originalPrice}</div>
                                <div className="text-[#59e3a5] font-semibold">${item.discountedPrice}</div>
                              </div>
                            ) : (
                              <div className="font-semibold">${item.discountedPrice}</div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {addOnOrderItems.map((item, index) => (
                        <div key={`addon-${index}`} className="flex items-center space-x-3 p-4 bg-white/5 rounded-lg relative">
                          <button
                            type="button"
                            onClick={() => removeAddOn(item.id)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/50 hover:bg-red-600/70 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-30 border-2 border-white/50"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          
                          {item.isOnSale && (
                            <div className="absolute top-2 left-2 bg-[#59e3a5] text-black text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap z-20">
                              50% OFF
                            </div>
                          )}
                          
                          <div className="relative">
                            <div className="w-[60px] h-[60px] bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center text-2xl border border-white/10">
                              {item.emoji}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight">{item.name.replace(/ \(.*\)/, '')}</h3>
                            <p className="text-[#59e3a5] text-sm font-medium">Premium Add-on</p>
                          </div>
                          
                          <div className="text-right">
                            {item.isOnSale ? (
                              <div>
                                <div className="text-white/50 text-sm line-through">${item.originalPrice}</div>
                                <div className="text-[#59e3a5] font-semibold">${item.price}</div>
                              </div>
                            ) : (
                              <div className="font-semibold">${item.price}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Coupon Code */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold mb-4">Coupon Code</h3>
                    
                    {!appliedCoupon ? (
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyCoupon();
                              }
                            }}
                            placeholder="Enter coupon code"
                            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#59e3a5] focus:border-[#59e3a5]"
                            disabled={isApplyingCoupon}
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={isApplyingCoupon || !couponCode.trim()}
                            className="px-4 py-2 bg-[#59e3a5] text-black font-medium rounded-lg hover:bg-[#4bc995] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isApplyingCoupon ? 'Applying...' : 'Apply'}
                          </button>
                        </div>
                        
                        {couponError && (
                          <div className="text-red-400 text-sm">{couponError}</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">✅</span>
                          <span className="text-white font-medium">{appliedCoupon.code}</span>
                          <span className="text-green-400 text-sm">
                            ({appliedCoupon.discount_type === 'percentage' 
                              ? `${appliedCoupon.discount_value}% off` 
                              : `$${appliedCoupon.discount_value} off`})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-red-400 hover:text-red-300 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Price Summary */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-white/70">Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      
                      {discount > 0 && (
                        <div className="flex justify-between text-[#59e3a5]">
                          <span>Discounts</span>
                          <span>-${discount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {appliedCoupon && (
                        <div className="flex justify-between text-[#14c0ff]">
                          <span>Coupon ({appliedCoupon.code})</span>
                          <span>-${appliedCoupon.calculated_discount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="border-t border-white/20 pt-3">
                        <div className="flex justify-between text-xl font-bold">
                          <span>Total</span>
                          <span className="text-[#59e3a5]">${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Popular Add-ons */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold mb-4">Level Up Your Launch 🔥</h3>
                    
                    <div className="space-y-4">
                      {addOnProducts.map((addOn, index) => (
                        <SpotlightCard 
                          key={`spotlight-${addOn.id}-${index}`} 
                          className={`border ${addOn.borderColor} pt-3 pl-3 pr-4 pb-4 ${addOn.bgGradient} rounded-lg !border-opacity-100`}
                          spotlightColor={addOn.id === 'express-launch' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(220, 53, 69, 0.3)'}
                        >
                          <div className="flex items-start justify-between mb-2 pointer-events-none">
                            <div className="pr-4 flex-1">
                              <h4 className={`font-semibold ${addOn.color}`}>{addOn.emoji} {addOn.name}</h4>
                              <div className="text-sm text-white/70 mt-1 pr-8">
                                <p>{addOn.description[0]}</p>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => toggleAddOn(addOn.id)}
                              className={`p-2 rounded-lg transition-colors flex-shrink-0 pointer-events-auto ${
                                selectedAddOns.has(addOn.id) 
                                ? 'bg-[#59e3a5] text-black hover:bg-[#4bc995]' 
                                : 'bg-white/20 hover:bg-white/30 text-white'
                              }`}
                            >
                              {selectedAddOns.has(addOn.id) ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              )}
                            </button>
                          </div>
                          <div className="flex items-center space-x-2 pointer-events-none">
                            <span className="text-white/50 line-through">${addOn.originalPrice}</span>
                            <span className={`font-bold ${addOn.color}`}>${addOn.salePrice}</span>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-xs font-bold px-2 py-1 rounded-full pointer-events-none">
                            50% OFF
                          </div>
                        </SpotlightCard>
                      ))}
                    </div>
                  </div>

                  {/* Square Card Payment Section */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-semibold mb-4">Payment Details 💳</h3>
                    
                    {/* Square Card Container - Dark themed */}
                    <div 
                      id="square-card-container" 
                      ref={cardContainerRef}
                      className="mb-4 min-h-[90px] bg-[#1a1a2e] rounded-lg p-3 border border-white/20"
                    ></div>
                    
                    {/* Square Card Styling */}
                    <style jsx global>{`
                      #square-card-container iframe {
                        min-height: 80px !important;
                      }
                      .sq-card-wrapper {
                        background-color: #1a1a2e !important;
                      }
                      .sq-card-message-no-error {
                        color: rgba(255, 255, 255, 0.7) !important;
                      }
                      @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                      .animate-fade-in {
                        animation: fadeIn 0.3s ease-out forwards;
                      }
                    `}</style>
                    
                    {(!squareLoaded || !card) && (
                      <div className="flex flex-col items-center justify-center py-4 space-y-3">
                        <div className="flex items-center">
                          <div className="w-6 h-6 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mr-3"></div>
                          <span className="text-white/70">Loading payment form...</span>
                        </div>
                        {showRefreshButton && (
                          <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="animate-fade-in px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs rounded border border-white/20 transition-all duration-200 flex items-center space-x-1.5"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Refresh checkout form</span>
                          </button>
                        )}
                      </div>
                    )}
                    
                    {cardError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-red-400 font-medium text-sm">Payment Declined</p>
                            <p className="text-red-300/80 text-sm mt-1">{cardError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Submit Button - Right under card fields */}
                    {formError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                        <p className="text-red-400 text-sm">{formError}</p>
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isLoading || !squareLoaded}
                      className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-3"></div>
                          Processing Payment...
                        </span>
                      ) : (
                        `Complete Purchase · $${total.toFixed(2)}`
                      )}
                    </button>
                    
                    <div className="mt-4 text-center text-sm text-white/60">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Securely processed by Square</span>
                      </div>
                      <div className="flex items-center justify-center mt-3">
                        <svg className="h-7 w-auto mr-2" viewBox="0 0 290 216" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="41" y="21" width="208" height="134" rx="24" fill="#1434CB"/>
                          <rect x="40.5" y="20.5" width="209" height="135" rx="24.5" stroke="#D6DCE5"/>
                          <path d="M143.728 66.1627L134.027 111.514H122.295L131.998 66.1627H143.728Z" fill="white"/>
                        </svg>
                        <svg className="h-7 w-auto mr-2" viewBox="0 0 290 216" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="41" y="21" width="208" height="134" rx="24" fill="#FFEFE5"/>
                          <rect x="40.5" y="20.5" width="209" height="135" rx="24.5" stroke="#D6DCE5"/>
                          <path d="M159.941 61.483H129.316V116.517H159.941V61.483Z" fill="#FF5F00"/>
                          <path d="M131.261 89C131.256 83.6998 132.457 78.468 134.773 73.7006C137.089 68.9333 140.46 64.7553 144.629 61.483C139.466 57.4246 133.265 54.9007 126.735 54.1999C120.205 53.499 113.61 54.6495 107.703 57.5197C101.796 60.39 96.8161 64.8642 93.3319 70.4311C89.8477 75.9979 88 82.4327 88 89C88 95.5673 89.8477 102.002 93.3319 107.569C96.8161 113.136 101.796 117.61 107.703 120.48C113.61 123.351 120.205 124.501 126.735 123.8C133.265 123.099 139.466 120.575 144.629 116.517C140.46 113.245 137.089 109.067 134.773 104.299C132.457 99.532 131.256 94.3002 131.261 89Z" fill="#EB001B"/>
                          <path d="M201.256 89C201.256 95.5672 199.409 102.002 195.925 107.569C192.441 113.136 187.461 117.61 181.554 120.48C175.647 123.35 169.052 124.501 162.523 123.8C155.993 123.099 149.792 120.575 144.629 116.517C148.795 113.241 152.162 109.063 154.478 104.296C156.794 99.5295 157.997 94.2993 157.997 89C157.997 83.7007 156.794 78.4705 154.478 73.7039C152.162 68.9373 148.795 64.7586 144.629 61.483C149.792 57.4246 155.993 54.9007 162.523 54.1999C169.052 53.499 175.647 54.6495 181.554 57.5198C187.461 60.3901 192.441 64.8643 195.925 70.4312C199.409 75.998 201.256 82.4328 201.256 89Z" fill="#F79E1B"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Legal Modals */}
      <LegalModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms & Conditions"
      >
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
          <p className="text-gray-300">Please review our Terms & Conditions at fasho.co/terms</p>
        </div>
      </LegalModal>

      <LegalModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
      >
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
          <p className="text-gray-300">Please review our Privacy Policy at fasho.co/privacy</p>
        </div>
      </LegalModal>

      <LegalModal
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
        title="Disclaimer"
      >
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
          <p className="text-gray-300">Please review our Disclaimer at fasho.co/disclaimer</p>
        </div>
      </LegalModal>

      <LegalModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Refund Policy"
      >
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
          <p className="text-gray-300">Please review our Refund Policy at fasho.co/refund</p>
        </div>
      </LegalModal>

      {/* Processing Payment Popup */}
      {showProcessingPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-600 rounded-full animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#59e3a5] rounded-full animate-spin"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Processing Payment...</h3>
                <p className="text-gray-300 text-sm">Please wait while we process your payment securely. Do not close this window.</p>
              </div>
              
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-[#59e3a5] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#59e3a5] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-[#59e3a5] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
