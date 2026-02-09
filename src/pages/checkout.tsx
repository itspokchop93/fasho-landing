import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
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
import { analytics } from "../utils/analytics";
import FashokensSection from '../components/FashokensSection';
import { getCountryConfig, isStateRequired, getPhoneCode, COUNTRY_CONFIGS } from '../utils/countryConfig';
import { useExchangeRates } from '../hooks/useExchangeRates';

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
    name: "TEST PACKAGE",
    price: 0.10,
    plays: "1 - 5 Streams",
    placements: "1 - 2 Playlist Pitches",
    description: "Test package for development and checkout testing purposes"
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

export default function CheckoutPage() {
  const router = useRouter();
  const { tracks: tracksParam, selectedPackages: selectedPackagesParam } = router.query;
  const supabase = createClient();
  
  // Use the auth context instead of managing our own auth state
  const { user: currentUser, loading: authLoading } = useAuth();
  
  // Exchange rates for currency conversion display
  const { getConversionDisplay } = useExchangeRates();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<{[key: number]: string}>({});
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [addOnOrderItems, setAddOnOrderItems] = useState<AddOnOrderItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalBeforeFashokens, setTotalBeforeFashokens] = useState(0); // Cart total after coupon but before fashokens
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string>('');
  const [paymentFormUrl, setPaymentFormUrl] = useState<string>('');
  const [loginError, setLoginError] = useState('');
  const [emailStatus, setEmailStatus] = useState<null | 'available' | 'exists' | 'invalid' | 'error'>(null);
  const [loginInfoMessage, setLoginInfoMessage] = useState<string | null>(null);
  const hasTrackedCheckoutView = useRef(false);

  const [lastSessionId, setLastSessionId] = useState<string>('');
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Prevent duplicate processing
  const [processedTransactionIds, setProcessedTransactionIds] = useState<Set<string>>(new Set()); // Track processed transactions
  const [showProcessingPopup, setShowProcessingPopup] = useState(false); // Show processing payment popup
  const [hasShownProcessingPopup, setHasShownProcessingPopup] = useState(false); // Track if popup has been shown

  // FASHOKENS loyalty state
  const [appliedFashokens, setAppliedFashokens] = useState(0);
  const [fashokensDiscount, setFashokensDiscount] = useState(0);
  const [tokensPerDollar, setTokensPerDollar] = useState(100); // For calculating earned tokens

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
    state: '', // 2-letter code only
    zip: '',
    country: 'US', // 2-letter code only
    countryCode: '+1', // Default to US country code
    phoneNumber: '',
    musicGenre: '' // User's preferred music genre
  });

  // Get country-specific configuration for dynamic form rendering
  const countryConfig = useMemo(() => getCountryConfig(billingData.country), [billingData.country]);

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
              // Fallback to initials if image fails to load
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

  // Password validation function (same as signup page)
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
    const discounted = originalPrice * 0.75; // 25% off
    return Math.ceil(discounted); // Round up
  };

  // Handle add-on selection
  const toggleAddOn = (addOnId: string) => {
    const newSelectedAddOns = new Set(selectedAddOns);
    const addOn = addOnProducts.find(p => p.id === addOnId);
    
    if (!addOn) return;
    
    if (newSelectedAddOns.has(addOnId)) {
      // Remove add-on
      newSelectedAddOns.delete(addOnId);
      setAddOnOrderItems(prev => prev.filter(item => item.id !== addOnId));
    } else {
      // Add add-on
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
    
    // Save to localStorage for persistence
    localStorage.setItem('selectedAddOns', JSON.stringify(Array.from(newSelectedAddOns)));
    
    updateTotals();
  };

  // Remove add-on from line items
  const removeAddOn = (addOnId: string) => {
    const newSelectedAddOns = new Set(selectedAddOns);
    newSelectedAddOns.delete(addOnId);
    setSelectedAddOns(newSelectedAddOns);
    setAddOnOrderItems(prev => prev.filter(item => item.id !== addOnId));
    
    // Save to localStorage for persistence
    localStorage.setItem('selectedAddOns', JSON.stringify(Array.from(newSelectedAddOns)));
    
    updateTotals();
  };

  // Handle changing a song - redirect to /add page with remaining songs
  const changeSong = (trackIndex: number) => {
    // Remove the selected track and its package
    const remainingTracks = tracks.filter((_, index) => index !== trackIndex);
    const remainingPackages: {[key: number]: string} = {};
    
    // Reindex the remaining packages
    let newIndex = 0;
    Object.entries(selectedPackages).forEach(([oldIndex, packageId]) => {
      if (parseInt(oldIndex) !== trackIndex) {
        remainingPackages[newIndex] = packageId;
        newIndex++;
      }
    });

    // Store remaining cart data for when they return
    if (remainingTracks.length > 0) {
      const cartData = {
        tracks: JSON.stringify(remainingTracks),
        selectedPackages: JSON.stringify(remainingPackages)
      };
      localStorage.setItem('checkoutCart', JSON.stringify(cartData));
    } else {
      localStorage.removeItem('checkoutCart');
    }

    // Redirect to /add page
    router.push( '/add');
  };

  // Update totals including add-ons and coupons
  const updateTotals = () => {
    // Calculate main items totals
    let mainSubtotal = 0;
    let mainDiscount = 0;
    
    orderItems.forEach(item => {
      mainSubtotal += item.originalPrice;
      if (item.isDiscounted) {
        mainDiscount += (item.originalPrice - item.discountedPrice);
      }
    });
    
    // Calculate add-on totals
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
    
    // Calculate final total with coupon discount
    let finalTotal = totalSubtotal - totalDiscount;
    let couponDiscount = 0;
    
    if (appliedCoupon) {
      couponDiscount = appliedCoupon.calculated_discount;
      finalTotal = Math.max(0, finalTotal - couponDiscount); // Don't allow negative totals
    }
    
    // Store total before fashokens (for FashokensSection to recalculate max)
    const totalAfterCouponBeforeFashokens = finalTotal;
    
    // Apply FASHOKENS discount
    if (fashokensDiscount > 0) {
      finalTotal = Math.max(1, finalTotal - fashokensDiscount); // Don't allow below $1 minimum
    }
    
    setSubtotal(totalSubtotal);
    setDiscount(totalDiscount);
    setTotalBeforeFashokens(totalAfterCouponBeforeFashokens);
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
      console.log('🎫 CHECKOUT: Applying coupon:', couponCode);
      
      // Calculate the pre-coupon total for validation
      const preCouponTotal = subtotal - discount;
      
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coupon_code: couponCode.trim(),
          order_amount: preCouponTotal
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply coupon');
      }

      console.log('🎫 CHECKOUT: Coupon applied successfully:', data.coupon);

      // Set the applied coupon
      setAppliedCoupon({
        id: data.coupon.id,
        code: couponCode.trim().toUpperCase(),
        discount_type: data.coupon.discount_type,
        discount_value: data.coupon.discount_value,
        calculated_discount: data.coupon.calculated_discount
      });

      // Show success message
      const successElement = document.createElement('div');
      successElement.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
      successElement.innerHTML = `
        <div class="flex items-center">
          <span class="mr-2">✅</span>
          <span>${data.message}</span>
        </div>
      `;
      document.body.appendChild(successElement);
      
      setTimeout(() => {
        if (document.body.contains(successElement)) {
          document.body.removeChild(successElement);
        }
      }, 5000);

      // Clear the input field and update totals
      setCouponCode('');
      
    } catch (err: any) {
      console.error('🎫 CHECKOUT: Error applying coupon:', err);
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

  // Update totals when coupon or fashokens changes
  useEffect(() => {
    updateTotals();
  }, [appliedCoupon, orderItems, addOnOrderItems, fashokensDiscount]);

  // Validate checkout session and load data
  useEffect(() => {
    const validateSession = async () => {
      if (!router.isReady) return;

      const { sessionId: sessionIdParam, tracks: tracksParam, selectedPackages: selectedPackagesParam } = router.query;
      
      // Check for legacy URL parameters (backward compatibility)
      if (tracksParam && selectedPackagesParam && !sessionIdParam) {
        // Handle old-style checkout URLs by redirecting to session-based approach
        try {
          const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tracks: JSON.parse(tracksParam as string),
              selectedPackages: JSON.parse(selectedPackagesParam as string),
              userId: null
            }),
          });

          if (response.ok) {
            const { sessionId: newSessionId } = await response.json();
            router.replace({
              pathname: '/checkout',
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
        router.push( '/add');
        return;
      }

      try {
        // Validate session
        const response = await fetch('/api/validate-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: sessionIdParam }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Session validation failed:', errorData);
          
          if (errorData.reason === 'already_used') {
            setError('already_completed');
            // Redirect after appropriate time
            setTimeout(() => {
              router.push( '/dashboard');
            }, 2500);
            return;
          } 
          
          // For expired or invalid sessions, try to recover automatically
          if (errorData.reason === 'expired' || errorData.reason === 'session_not_found') {
            console.log('🔄 CHECKOUT: Attempting automatic session recovery...');
            
            try {
              const recoveryResponse = await fetch('/api/recover-checkout-session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: currentUser?.id,
                  expiredSessionId: sessionIdParam
                }),
              });

              if (recoveryResponse.ok) {
                const { sessionId: newSessionId } = await recoveryResponse.json();
                console.log('🔄 CHECKOUT: Session recovered successfully, redirecting to new session:', newSessionId);
                
                // Redirect to checkout with new session ID
                router.push( {
                  pathname: '/checkout',
                  query: { sessionId: newSessionId }
                });
                return;
              }
            } catch (recoveryError) {
              console.error('🔄 CHECKOUT: Session recovery failed:', recoveryError);
            }
            
            // If recovery fails, show user-friendly error and redirect
            setError('Your checkout session has expired. Redirecting you to start a new checkout...');
            setTimeout(() => {
              router.push( '/add');
            }, 3000);
            return;
          }
          
          // For other errors, show generic message
          setError('Invalid checkout session. Please start a new checkout.');
          setTimeout(() => {
            router.push( '/add');
          }, 3000);
          return;
        }

        const { sessionData } = await response.json();
        
        // For development: if no sessionData, fall back to URL params
        let sessionTracks: Track[];
        let sessionPackages: {[key: number]: string};
        
        if (sessionData) {
          sessionTracks = sessionData.tracks;
          sessionPackages = sessionData.selectedPackages;
        } else {
          // Fall back to URL parameters for development
          if (tracksParam && selectedPackagesParam) {
            sessionTracks = JSON.parse(tracksParam as string);
            sessionPackages = JSON.parse(selectedPackagesParam as string);
          } else {
            throw new Error('No session data available');
          }
        }
        
        setTracks(sessionTracks);
        setSelectedPackages(sessionPackages);
        
        // Store cart data in localStorage for step navigation
        const cartData = {
          tracks: JSON.stringify(sessionTracks),
          selectedPackages: JSON.stringify(sessionPackages)
        };
        localStorage.setItem('checkoutCart', JSON.stringify(cartData));
        
        // Store session ID for later use
        setSessionId(sessionIdParam as string);
        
        // Only clear add-ons when session ID changes (not on refresh of same session)
        if (lastSessionId && lastSessionId !== sessionIdParam) {
          localStorage.removeItem('selectedAddOns');
          setSelectedAddOns(new Set());
          setAddOnOrderItems([]);
        }
        setLastSessionId(sessionIdParam as string);
        
        // Restore add-ons from localStorage if they exist (and it's the same session)
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
        
        // Build order items
        const items: OrderItem[] = [];
        let calculatedSubtotal = 0;
        let calculatedDiscount = 0;
        
        sessionTracks.forEach((track: Track, index: number) => {
          const packageId = sessionPackages[index];
          const selectedPackage = packages.find(p => p.id === packageId);
          
          if (selectedPackage) {
            const isDiscounted = index > 0; // First song is full price, rest are 25% off
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
          router.push( '/add');
        }, 3000);
      }
    };

    validateSession();
  }, [router.isReady, router.query]);

  // Fetch loyalty settings for earning rate
  useEffect(() => {
    const fetchLoyaltySettings = async () => {
      try {
        const res = await fetch('/api/loyalty/settings');
        const data = await res.json();
        if (data.success && data.settings?.tokens_per_dollar) {
          setTokensPerDollar(data.settings.tokens_per_dollar);
        }
      } catch (err) {
        console.error('Error fetching loyalty settings:', err);
      }
    };
    fetchLoyaltySettings();
  }, []);

  // Update totals when add-ons change
  useEffect(() => {
    updateTotals();
  }, [orderItems, addOnOrderItems]);

  useEffect(() => {
    if (hasTrackedCheckoutView.current) return;
    if (orderItems.length === 0) return;
    analytics.track("checkout_viewed", {
      song_count: orderItems.length,
      order_total_estimated: total,
      currency: "USD",
    });
    hasTrackedCheckoutView.current = true;
  }, [orderItems.length, total]);

  // Debounced email validation effect
  useEffect(() => {
    if (!formData.email || isLoginMode) {
      setEmailStatus(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkEmailExists(formData.email);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.email, isLoginMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
    
    // Clear login error when user starts typing
    if (loginError) {
      setLoginError('');
    }
    
    // Clear form error when user starts typing
    if (formError) {
      setFormError('');
    }
  };

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    const fieldName = e.target.name;
    
    // Defensive: Only allow 2-letter codes for country
    if (fieldName === 'country' && value.length > 2) {
      value = value.slice(0, 2).toUpperCase();
    }
    
    // When country changes, update phone code and clear state if country doesn't use states
    if (fieldName === 'country') {
      const newCountryConfig = getCountryConfig(value);
      setBillingData(prev => ({
        ...prev,
        country: value,
        countryCode: newCountryConfig.phoneCode,
        // Clear state if the new country doesn't require it
        state: newCountryConfig.hasStates ? prev.state : ''
      }));
    } else {
      setBillingData(prev => ({
        ...prev,
        [fieldName]: value
      }));
    }
    
    // Clear form error when user starts typing
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

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? ' / ' + v.substring(2, 4) : '');
    }
    return v;
  };

  // Check if email exists and user verification status
  const checkEmailExists = async (email: string) => {
    setEmailStatus(null);
    if (!email || !email.includes('@')) return;
    
    // Basic email format validation first
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
        headers: {
          'Content-Type': 'application/json',
        },
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
    // Check if state is required based on selected country
    const stateValid = countryConfig.hasStates ? !!billingData.state : true;
    
    // If user is logged in, only need billing info + music genre + terms agreement
    if (currentUser) {
      return billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             stateValid && 
             billingData.zip &&
             billingData.phoneNumber &&
             billingData.musicGenre &&
             termsAgreed;
    }
    
    // If not logged in, need account info + billing info + terms agreement
    if (isLoginMode) {
      // Login mode - need email and password + billing info + music genre
      return formData.email && 
             formData.password &&
             billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             stateValid && 
             billingData.zip &&
             billingData.phoneNumber &&
             billingData.musicGenre &&
             termsAgreed;
    } else {
      // Signup mode - need all account fields + billing + music genre + terms agreement + no field errors
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
             stateValid && 
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
      // Signup mode validation
      if (!formData.email) return 'email';
      if (emailStatus && emailStatus !== 'available') return 'email';
      if (!formData.password) return 'password';
      if (fieldErrors.password) return 'password';
      if (!formData.confirmPassword) return 'confirmPassword';
      if (fieldErrors.confirmPassword) return 'confirmPassword';
    } else if (!currentUser && isLoginMode) {
      // Login mode validation
      if (!formData.email) return 'email';
      if (!formData.password) return 'password';
    }
    
    // Billing validation for all users
    if (!billingData.firstName) return 'firstName';
    if (!billingData.lastName) return 'lastName';
    if (!billingData.address) return 'address';
    if (!billingData.city) return 'city';
    // Only require state if country uses states
    if (countryConfig.hasStates && !billingData.state) return 'state';
    if (!billingData.zip) return 'zip';
    if (!billingData.phoneNumber) return 'phoneNumber';
    if (!billingData.musicGenre) return 'musicGenre';
    
    // Terms agreement validation
    if (!termsAgreed) return 'termsAgreed';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 CHECKOUT: ===== FORM SUBMISSION ATTEMPTED =====');
    console.log('🚀 CHECKOUT: Event type:', e.type);
    console.log('🚀 CHECKOUT: Event target:', e.target);
    console.log('🚀 CHECKOUT: Current user exists:', !!currentUser);
    console.log('🚀 CHECKOUT: Order items count:', orderItems.length);
    console.log('🚀 CHECKOUT: Billing data exists:', !!billingData);
    
    e.preventDefault();
    console.log('🚀 CHECKOUT: ===== FORM SUBMISSION STARTED =====');
    console.log('🚀 CHECKOUT: Form validation:', isFormValid());
    console.log('🚀 CHECKOUT: Current user:', currentUser);
    console.log('🚀 CHECKOUT: Order items:', orderItems);
    console.log('🚀 CHECKOUT: Billing info:', billingData);
    console.log('🚀 CHECKOUT: About to start payment processing...');
    setIsLoading(true);
    setFormError('');

    // Check if form is valid
    console.log('🚀 CHECKOUT: Checking form validation...');
    if (!isFormValid()) {
      console.log('🚀 CHECKOUT: Form validation failed!');
      const firstMissingField = getFirstMissingField();
      console.log('🚀 CHECKOUT: First missing field:', firstMissingField);
      let errorMessage = 'Please complete all required fields before continuing.';
      
      // Scroll to the first missing field
      if (firstMissingField) {
        const element = document.getElementById(firstMissingField);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (firstMissingField === 'termsAgreed') {
            // For checkbox, focus and add visual indication
            element.focus();
          } else {
            element.focus();
          }
        }
        
        // Customize error message based on missing field
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
      analytics.track("validation_error_shown", {
        field: firstMissingField || "checkout_form",
        message_id: firstMissingField ? `missing_${firstMissingField}` : "checkout_validation_failed",
        step: "checkout",
      });
      setIsLoading(false);
      return;
    }

    // Process payment directly
    console.log('🚀 CHECKOUT: About to call handlePaymentSubmit...');
    analytics.track("checkout_submitted", {
      song_count: orderItems.length,
      packages_count: orderItems.length,
      order_total: total,
      currency: "USD",
    });
    await handlePaymentSubmit();
    console.log('🚀 CHECKOUT: handlePaymentSubmit completed');
  };

  // Function to fetch user profile and autofill billing data
  const autofillUserProfile = async (userId: string) => {
    try {
      console.log('🔐 CHECKOUT: Fetching user profile for autofill...');
      const response = await fetch('/api/user-profile');
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔐 CHECKOUT: User profile data received:', data);
        
        if (data.profile) {
          const profile = data.profile;
          
          // Autofill billing data from user profile
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
          
          console.log('🔐 CHECKOUT: ✅ Billing data autofilled from user profile');
        } else {
          console.log('🔐 CHECKOUT: No profile data found');
        }
      } else {
        console.log('🔐 CHECKOUT: Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('🔐 CHECKOUT: Error fetching user profile:', error);
    }
  };

  // Respond to authentication changes from auth context
  useEffect(() => {
    console.log('🔐 CHECKOUT: Auth context changed - user:', currentUser?.email || 'null', 'loading:', authLoading);
    
    if (currentUser && !authLoading) {
      console.log('🔐 CHECKOUT: User authenticated, fetching profile data...');
      
      // Autofill billing data if user is authenticated
      if (currentUser?.id) {
        autofillUserProfile(currentUser.id);
      }
      
      // Fetch artist profile if user is authenticated
      if (currentUser?.id) {
        fetchArtistProfile(currentUser);
      }
      
      // Pre-fill email field with user email
      if (currentUser?.email) {
        console.log('🔐 CHECKOUT: Pre-filling email field with user email:', currentUser.email);
        setFormData(prev => ({
          ...prev,
          email: currentUser.email || ''
        }));
      }
    } else if (!currentUser && !authLoading) {
      console.log('🔐 CHECKOUT: No user, clearing profile data...');
      setArtistProfile(null);
      // Don't clear form data here as user might be in the middle of filling it out
    }
  }, [currentUser, authLoading]);



  // Message listener is now defined after stableHandleSuccessfulPayment function

  // Handle payment form display and submission
  useEffect(() => {
    if (showPaymentForm && paymentToken) {
      console.log('Payment form is shown with token:', paymentToken.substring(0, 20) + '...');
      
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => {
        submitTokenToIframe();
      }, 1000);
      
      // Set a timeout to check if payment is stuck
      const paymentTimeout = setTimeout(() => {
        console.log('Payment timeout reached - no response received');
        // You can uncomment the lines below if you want automatic timeout handling
        // setError('Payment processing timed out. Please try again or contact support.');
        // setShowPaymentForm(false);
        // setIsLoading(false);
      }, 300000); // 5 minutes timeout
      
      return () => {
        clearTimeout(timer);
        clearTimeout(paymentTimeout);
      };
    }
  }, [showPaymentForm, paymentToken]);

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
        // Generic error message for security
        setLoginError('Login credentials do not match our records. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      // Store cart data in localStorage before refresh
      const cartData = {
        tracks: tracksParam,
        selectedPackages: selectedPackagesParam
      };
      localStorage.setItem('checkoutCart', JSON.stringify(cartData));

      // Refresh page to show logged in state
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
      // Store cart data in localStorage before logout
      const cartData = {
        tracks: tracksParam,
        selectedPackages: selectedPackagesParam
      };
      localStorage.setItem('checkoutCart', JSON.stringify(cartData));

      // Get current sessionId to preserve it after logout
      const { sessionId: currentSessionId } = router.query;

      // Call server-side sign-out API first for comprehensive logout
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Client-side logout
      await supabase.auth.signOut();
      
      // Clear any cached user data
      localStorage.removeItem('userProfileImage');
      sessionStorage.clear();
      
      // Preserve sessionId in URL and refresh to show logged out state
      if (currentSessionId) {
        window.location.href = `/checkout?sessionId=${currentSessionId}`;
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: still try to reload even if logout fails
      window.location.reload();
    }
  };

  // Handle payment form submission

  // Handle successful payment response
  const handleSuccessfulPayment = async (response: any) => {
    console.log('🚨 CHECKOUT: ===== handleSuccessfulPayment CALLED =====');
    console.log('🚨 CHECKOUT: Call stack:', new Error().stack);
    console.log('🚨 CHECKOUT: Transaction ID:', response?.transId);
    console.log('🚨 CHECKOUT: Current orderProcessingFlag:', orderProcessingFlag.current);
    console.log('🚨 CHECKOUT: Processed transaction IDs:', Array.from(processedTransactionIdsRef.current));
    console.log('🚨 CHECKOUT: Current user state:', { hasUser: !!currentUser, email: currentUser?.email, id: currentUser?.id });
    console.log('🚨 CHECKOUT: Router ready:', router.isReady);
    console.log('🚨 CHECKOUT: Auth loading:', authLoading);
    
    // AGGRESSIVE duplicate prevention using refs (not React state)
    if (orderProcessingFlag.current) {
      console.log('🚫 CHECKOUT: Order already being processed (ref flag), ignoring duplicate call');
      console.log('🚫 CHECKOUT: This call will be IGNORED - RETURNING IMMEDIATELY');
      return;
    }
    
    // Check if this transaction has already been processed
    const transactionId = response?.transId;
    if (transactionId && processedTransactionIdsRef.current.has(transactionId)) {
      console.log('🚫 CHECKOUT: Transaction', transactionId, 'already processed (ref check), ignoring duplicate');
      console.log('🚫 CHECKOUT: This call will be IGNORED - RETURNING IMMEDIATELY');
      return;
    }
    
    // Lock processing immediately using refs
    orderProcessingFlag.current = true;
    if (transactionId) {
      processedTransactionIdsRef.current.add(transactionId);
      console.log('🔒 CHECKOUT: LOCKED order processing with ref flags for transaction:', transactionId);
    } else {
      console.log('🔒 CHECKOUT: LOCKED order processing with ref flags (no transaction ID)');
    }
    
    console.log('🚨 CHECKOUT: PROCEEDING WITH ORDER CREATION...');
    console.log('🚨 CHECKOUT: Starting main try-catch block for order processing');
    
    let hasTrackedPaymentSuccess = false;
    let trackPaymentSuccess: (orderId?: string | null) => void = () => {};

    try {
      console.log('🚀 CHECKOUT: handleSuccessfulPayment called with response:', response);
      console.log('🚀 CHECKOUT: Current user state:', { 
        hasCurrentUser: !!currentUser, 
        currentUserEmail: currentUser?.email, 
        currentUserId: currentUser?.id 
      });
      console.log('🚀 CHECKOUT: Form data:', { 
        email: formData.email, 
        hasPassword: !!formData.password 
      });
      console.log('🚀 CHECKOUT: Current orderItems:', orderItems);
      console.log('🚀 CHECKOUT: Current totals - subtotal:', subtotal, 'discount:', discount, 'total:', total);
      
      // Get the pending order data from sessionStorage since state may have been cleared
      const pendingOrderData = sessionStorage.getItem('pendingOrder');
      if (!pendingOrderData) {
        console.error('No pending order data found in sessionStorage');
        setError('Order data not found. Please try again.');
        return;
      }
      
      const pendingOrder = JSON.parse(pendingOrderData);
      console.log('🚀 CHECKOUT: Retrieved pendingOrder data:', pendingOrder);
      trackPaymentSuccess = (orderId?: string | null) => {
        if (hasTrackedPaymentSuccess) return;
        analytics.track("checkout_payment_succeeded", {
          order_id: orderId || null,
          order_total: pendingOrder?.total ?? total,
          currency: "USD",
          payment_provider: "authorize_net",
          song_count: pendingOrder?.items?.length ?? orderItems.length,
        });
        hasTrackedPaymentSuccess = true;
      };
      
      // Track if we created a new account
      let newAccountCreated = false;
      let userId = currentUser?.id || null;
      
      // Create user account after successful payment (only if not already signed in)
      if (!currentUser) {
        console.log('🔍 CHECKOUT: Creating new user account after successful payment');
        console.log('🔍 CHECKOUT: Account details:', {
          email: formData.email,
          fullName: `${billingData.firstName} ${billingData.lastName}`
        });
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: `${billingData.firstName} ${billingData.lastName}`,
            },
          },
        });

        // Sync user data to user_profiles table after account creation
        if (authData.user && !authError) {
          try {
            console.log('🔄 CHECKOUT: Syncing new user data to user_profiles...');
            
            const syncResponse = await fetch('/api/sync-user-profile', {
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
              }),
            });
            console.log('🔄 CHECKOUT: User profile sync response:', syncResponse);
          } catch (syncError) {
            console.error('🔄 CHECKOUT: Error syncing user profile:', syncError);
          }
        } else {
          console.error('🔍 CHECKOUT: Error creating user account:', authError);
        }
      }

      // Proceed with order creation
      console.log('🚀 CHECKOUT: Proceeding with order creation...');
      const orderPayload = {
        items: pendingOrder.items,
        addOnItems: pendingOrder.addOnItems || [], // Include add-on items
        subtotal: pendingOrder.subtotal,
        discount: pendingOrder.discount,
        total: pendingOrder.total,
        customerEmail: pendingOrder.customerEmail,
        customerName: pendingOrder.customerName,
        billingInfo: pendingOrder.billingInfo,
        paymentData: {
          transactionId: response.transId,
          authorization: response.authorization,
          accountNumber: response.accountNumber,
          accountType: response.accountType,
        },
        coupon: appliedCoupon,
        userId: userId
      };

      console.log('🚀 CHECKOUT: Creating order in database with payload:', orderPayload);
      console.log('🚀 CHECKOUT: Order creation details:', {
        hasUserId: !!orderPayload.userId,
        userId: orderPayload.userId,
        customerEmail: orderPayload.customerEmail,
        itemsCount: orderPayload.items.length,
        addOnItemsCount: orderPayload.addOnItems.length,
        total: orderPayload.total
      });
      
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const orderResult = await orderResponse.json();
      console.log('🚀 CHECKOUT: Order creation response:', orderResult);

      if (!orderResult.success) {
        console.error('🚨 CHECKOUT: Error creating order:', orderResult.message);
        console.error('🚨 CHECKOUT: Order error details:', JSON.stringify(orderResult, null, 2));
        setError('Payment was successful but there was an error saving your order. Please contact support with your transaction ID: ' + response.transId);
        trackPaymentSuccess(null);
        return;
      }

      console.log('🚀 CHECKOUT: Order created successfully:', orderResult.order);
      trackPaymentSuccess(orderResult.order?.id);

      // ── PostHog: Rich purchase tracking for Growth Accounting ────────
      try {
        const firstItem = pendingOrder.items?.[0];
        analytics.trackPurchase({
          order_id: orderResult.order?.id,
          order_number: orderResult.order?.orderNumber,
          total: pendingOrder.total,
          subtotal: pendingOrder.subtotal,
          discount: pendingOrder.discount || 0,
          coupon_code: pendingOrder.coupon?.code || undefined,
          package_name: firstItem?.packageName || firstItem?.package_name,
          package_id: firstItem?.packageId || firstItem?.package_id,
          track_title: firstItem?.trackTitle || firstItem?.track_title,
          track_artist: firstItem?.trackArtist || firstItem?.track_artist,
          item_count: pendingOrder.items?.length || 0,
          is_first_purchase: !currentUser, // new account = first purchase
        });
      } catch (purchaseTrackError) {
        console.error('PostHog purchase tracking error:', purchaseTrackError);
      }
      
      // Mark checkout session as completed
      if (sessionId) {
        try {
          await fetch('/api/complete-checkout-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              sessionId
            }),
          });
          console.log('🚀 CHECKOUT: Session marked as completed');
        } catch (error) {
          console.error('Error marking session as completed:', error);
          // Don't fail the entire process if session completion fails
        }
      }
      
      // Process FASHOKENS loyalty tokens (spending and earning)
      let loyaltyResult = null;
      try {
        console.log('🪙 CHECKOUT: Processing loyalty tokens...');
        const loyaltyResponse = await fetch('/api/loyalty/process-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            orderId: orderResult.order.id,
            orderNumber: orderResult.order.orderNumber,
            orderTotal: pendingOrder.total,
            couponDiscount: pendingOrder.coupon?.calculated_discount || 0,
            fashokensSpent: pendingOrder.fashokens?.spent || 0,
            fashokensDiscount: pendingOrder.fashokens?.discount || 0
          }),
        });
        loyaltyResult = await loyaltyResponse.json();
        console.log('🪙 CHECKOUT: Loyalty processing result:', loyaltyResult);
      } catch (loyaltyError) {
        console.error('🪙 CHECKOUT: Error processing loyalty tokens:', loyaltyError);
        // Don't fail the order if loyalty processing fails
      }
      
      // Store order data for thank you page using the pending order data + order number
      const orderData = {
        items: pendingOrder.items,
        addOnItems: pendingOrder.addOnItems || [], // Include add-on items for thank you page
        subtotal: pendingOrder.subtotal,
        discount: pendingOrder.discount,
        total: pendingOrder.total,
        customerEmail: pendingOrder.customerEmail,
        customerName: pendingOrder.customerName,
        newAccountCreated: newAccountCreated,
        orderNumber: orderResult.order.orderNumber,
        orderId: orderResult.order.id,
        paymentData: {
          transactionId: response.transId,
          authorization: response.authorization,
          accountNumber: response.accountNumber,
          accountType: response.accountType,
        },
        createdAt: orderResult.order.createdAt,
        couponId: pendingOrder.coupon?.id || null,
        couponCode: pendingOrder.coupon?.code || null,
        couponDiscount: pendingOrder.coupon?.calculated_discount || null,
        // FASHOKENS loyalty data
        fashokensSpent: loyaltyResult?.fashokens_spent || pendingOrder.fashokens?.spent || 0,
        fashokensEarned: loyaltyResult?.fashokens_earned || 0,
        fashokensDiscount: pendingOrder.fashokens?.discount || 0,
        fashokensNewBalance: loyaltyResult?.new_balance || 0,
      };
      console.log('🚀 CHECKOUT: Storing completedOrder in sessionStorage:', orderData);
      sessionStorage.setItem('completedOrder', JSON.stringify(orderData));
      
      // Clean up pending order and add-ons
      sessionStorage.removeItem('pendingOrder');
      localStorage.removeItem('selectedAddOns');
      
      console.log('🚀 CHECKOUT: completedOrder stored successfully');
      
      // Hide processing popup before redirect
      setShowProcessingPopup(false);
      console.log('🚀 CHECKOUT: Processing popup hidden');
      
      // Redirect to thank you page with order number for persistence
      console.log('🚀 CHECKOUT: About to redirect to thank you page with order:', orderResult.order.orderNumber);
      
      try {
        await router.push( `/thank-you?order=${orderResult.order.orderNumber}`);
        console.log('🔓 CHECKOUT: Payment processing completed successfully - redirect initiated');
      } catch (redirectError) {
        console.error('🔓 CHECKOUT: Router.push failed:', redirectError);
        // Fallback to window.location if router fails
        window.location.href = `/thank-you?order=${orderResult.order.orderNumber}`;
        console.log('🔓 CHECKOUT: Fallback redirect using window.location');
      }
    } catch (error) {
      console.error('🚨 CHECKOUT: ===== ERROR IN handleSuccessfulPayment =====');
      console.error('🚨 CHECKOUT: Error details:', error);
      console.error('🚨 CHECKOUT: Error message:', (error as Error)?.message || 'Unknown error');
      console.error('🚨 CHECKOUT: Error stack:', (error as Error)?.stack || 'No stack trace');
      console.error('🚨 CHECKOUT: Error name:', (error as Error)?.name || 'Unknown error type');
      console.log('🚨 CHECKOUT: Payment was successful but order processing failed');
      
      trackPaymentSuccess(null);
      setError('Payment was successful but there was an error processing your order. Please contact support.');
      orderProcessingFlag.current = false; // Unlock on error using ref
      console.log('🔓 CHECKOUT: Order processing unlocked due to error (ref flag reset)');
      
      // Hide processing popup on error
      setShowProcessingPopup(false);
      console.log('🚀 CHECKOUT: Processing popup hidden due to error');
      
      // Force redirect to thank you page even if order creation failed, since payment was successful
      console.log('🚨 CHECKOUT: Attempting emergency redirect since payment was successful');
      try {
        window.location.href = `/thank-you?error=processing&transId=${response?.transId}`;
      } catch (redirectError) {
        console.error('🚨 CHECKOUT: Emergency redirect also failed:', redirectError);
      }
    }
  };

  // Payment form submission function
  const submitTokenToIframe = () => {
    if (!paymentToken) {
      console.error('🎯 CHECKOUT: No payment token available');
      return;
    }
    
    console.log('🎯 CHECKOUT: Submitting token to iframe:', paymentToken.substring(0, 20) + '...');
    console.log('🎯 CHECKOUT: Payment form URL:', paymentFormUrl);
    
    const form = document.getElementById('paymentIframeForm') as HTMLFormElement;
    if (form) {
      console.log('🎯 CHECKOUT: Form found, submitting to iframe');
      console.log('🎯 CHECKOUT: Form action:', form.action);
      console.log('🎯 CHECKOUT: Form target:', form.target);
      console.log('🎯 CHECKOUT: Form method:', form.method);
      
      // Debug the iframe state
      const iframe = document.getElementById('paymentIframe') as HTMLIFrameElement;
      if (iframe) {
        console.log('🎯 CHECKOUT: Iframe found:', {
          name: iframe.name,
          id: iframe.id,
          src: iframe.src,
          width: iframe.width,
          height: iframe.height
        });
      } else {
        console.error('🎯 CHECKOUT: Iframe not found!');
      }
      
      // Check if token is actually in the form
      const tokenInput = form.querySelector('input[name="token"]') as HTMLInputElement;
      if (tokenInput) {
        console.log('🎯 CHECKOUT: Token input found, value length:', tokenInput.value.length);
      } else {
        console.error('🎯 CHECKOUT: Token input not found in form!');
      }
      
      form.submit();
      console.log('🎯 CHECKOUT: Form submitted successfully');
      
      // Hide loading overlay after form submission
      setTimeout(() => {
        const loader = document.getElementById('iframeLoader');
        if (loader) {
          loader.style.display = 'none';
        }
        console.log('🎯 CHECKOUT: Loading overlay hidden');
      }, 3000);
    } else {
      console.error('🎯 CHECKOUT: Payment iframe form not found in DOM!');
      // Debug: List all forms in the document
      const allForms = document.querySelectorAll('form');
      console.log('🎯 CHECKOUT: All forms found:', Array.from(allForms).map(f => ({ id: f.id, action: f.action })));
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      // Defensive: Ensure state and country are 2-letter codes before submitting
      const safeBillingData = {
        ...billingData,
        state: billingData.state.slice(0, 2).toUpperCase(),
        country: billingData.country.slice(0, 2).toUpperCase()
      };
      // Prepare order items for payment API
      const paymentOrderItems = orderItems.map(item => ({
        name: `${item.track.title} - ${item.package.name}`,
        price: item.discountedPrice
      }));
      
      // Add add-on items to payment order items
      const addOnPaymentItems = addOnOrderItems.map(item => ({
        name: `${item.emoji} ${item.name.replace(/ \(.*\)/, '')}`,
        price: item.price
      }));
      
      const allPaymentItems = [...paymentOrderItems, ...addOnPaymentItems];
      
      // Log the data being sent to the payment API
      const paymentData = {
        amount: total,
        orderItems: allPaymentItems,
        customerEmail: currentUser ? currentUser.email : formData.email,
        billingInfo: safeBillingData
      };
      console.log('Sending payment data:', paymentData);
      
      // Generate payment token from Authorize.net
      const response = await fetch('/api/generate-payment-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();
      console.log('🔍 CHECKOUT: Payment token response received:', data);
      console.log('🔍 CHECKOUT: Response success property:', data.success);
      console.log('🔍 CHECKOUT: Response has token:', !!data.token);
      console.log('🔍 CHECKOUT: Response has paymentFormUrl:', !!data.paymentFormUrl);

      if (!data.success) {
        console.error('Payment token generation failed:', data);
        console.error('Debug info:', data.debug);
        setFormError(data.message || 'Payment setup failed');
        return;
      }

      console.log('✅ CHECKOUT: Payment token generation successful, proceeding to show form');

      // Store order data for after payment completion
      const orderData = {
        items: orderItems,
        addOnItems: addOnOrderItems,
        subtotal,
        discount,
        total,
        customerEmail: currentUser ? currentUser.email : formData.email,
        customerName: `${billingData.firstName} ${billingData.lastName}`,
        billingInfo: billingData,
        coupon: appliedCoupon ? {
          id: appliedCoupon.id,
          code: appliedCoupon.code,
          discount_type: appliedCoupon.discount_type,
          discount_value: appliedCoupon.discount_value,
          calculated_discount: appliedCoupon.calculated_discount
        } : null,
        // FASHOKENS loyalty data
        fashokens: {
          spent: appliedFashokens,
          discount: fashokensDiscount
        },
        createdAt: new Date().toISOString(),
        paymentToken: data.token
      };

      // Store pending order data
      sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));
      
      // Create user account after successful payment token generation (only if not already signed in)
      if (!currentUser) {
        console.log('🔍 CHECKOUT: User not authenticated, checking if account exists for:', formData.email);
        
        // First check if user already exists to prevent duplicate account creation
        const checkResponse = await fetch('/api/check-user-exists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });
        
        const checkData = await checkResponse.json();
        console.log('🔍 CHECKOUT: User existence check result:', checkData);
        
        if (checkData.exists) {
          console.log('🔍 CHECKOUT: User exists, attempting sign in...');
          // User already exists, try to sign them in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          
          if (signInError) {
            console.error('🚨 CHECKOUT: Sign-in failed during checkout:', signInError);
            // Password is wrong - show error and stop checkout
            setFormError('An account with this email already exists. Please use the correct password or sign in first.');
            return;
          }
          
          // Successfully signed in - continue with checkout
          console.log('✅ CHECKOUT: User signed in successfully during checkout:', {
            userId: signInData.user?.id,
            email: signInData.user?.email
          });
        } else {
          console.log('🔍 CHECKOUT: User does not exist, creating new account...');
          // User doesn't exist, create new account
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: `${billingData.firstName} ${billingData.lastName}`,
              },
            },
          });

          // Sync user data to user_profiles table after account creation
          if (authData.user && !authError) {
            try {
              console.log('🔄 CHECKOUT: Syncing new account data to user_profiles...');
              
              const syncResponse = await fetch('/api/sync-user-profile', {
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

              if (syncResponse.ok) {
                console.log('🔄 CHECKOUT: ✅ New account profile synced successfully');
              } else {
                console.log('🔄 CHECKOUT: ❌ New account profile sync failed');
              }
            } catch (syncError) {
              console.error('🔄 CHECKOUT: ❌ Error syncing new account profile:', syncError);
            }
          }

          if (authError) {
            console.error('🚨 CHECKOUT: Error creating account during checkout:', authError);
            console.error('🚨 CHECKOUT: Auth error details:', JSON.stringify(authError, null, 2));
            
            // Handle specific signup errors
            if (authError.message?.includes('User already registered')) {
              // This shouldn't happen since we checked, but handle it anyway
              setFormError('An account with this email already exists. Please sign in first.');
              return;
            } else {
              // Other signup errors - don't fail the entire checkout
              console.log('⚠️ CHECKOUT: Account creation failed but continuing with checkout:', authError.message);
            }
          } else {
            // Account created successfully
            console.log('✅ CHECKOUT: New account created successfully during checkout:', {
              userId: authData.user?.id,
              email: authData.user?.email,
              emailConfirmed: authData.user?.email_confirmed_at
            });
            
            // Auto-confirm the user to bypass email verification
            try {
              console.log('🔧 CHECKOUT: Auto-confirming user email...');
              const confirmResponse = await fetch('/api/auto-confirm-user', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: formData.email }),
              });

              const confirmResult = await confirmResponse.json();
              
              if (confirmResponse.ok) {
                console.log('🔧 CHECKOUT: ✅ User auto-confirmed successfully');
              } else {
                console.error('🔧 CHECKOUT: ❌ Auto-confirm failed:', confirmResult);
              }
            } catch (confirmError) {
              console.error('🔧 CHECKOUT: ❌ Error auto-confirming user:', confirmError);
            }
          }
        }
      } else {
        console.log('✅ CHECKOUT: User already authenticated, skipping account creation:', {
          userId: currentUser.id,
          email: currentUser.email
        });
      }

      // Show payment iframe with the token
      console.log('🚀 CHECKOUT: Setting payment token and showing form');
      console.log('🚀 CHECKOUT: Payment form URL:', data.paymentFormUrl);
      console.log('🚀 CHECKOUT: Token length:', data.token.length);
      setPaymentToken(data.token);
      setPaymentFormUrl(data.paymentFormUrl);
      setShowPaymentForm(true);
      setHasShownProcessingPopup(false); // Reset popup flag when showing new payment form
      console.log('🚀 CHECKOUT: Form state variables set, showPaymentForm should be true now');
      
      // Add debugging for iframe load
      setTimeout(() => {
        const iframe = document.getElementById('paymentIframe') as HTMLIFrameElement;
        if (iframe) {
          console.log('🔍 CHECKOUT: Iframe element found:', iframe);
          console.log('🔍 CHECKOUT: Iframe src:', iframe.src);
          console.log('🔍 CHECKOUT: Iframe loaded state:', iframe.contentWindow ? 'Loaded' : 'Not loaded');
        } else {
          console.error('🔍 CHECKOUT: Iframe element not found!');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ CHECKOUT: Error processing payment:', error);
      console.error('❌ CHECKOUT: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error
      });
      setFormError(error instanceof Error ? error.message : 'Payment processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  // Removed duplicate global debug listener to prevent double message processing

  // Create a singleton order processing flag outside of React state
  const orderProcessingFlag = useRef(false);
  const processedTransactionIdsRef = useRef(new Set<string>());

  const handleSuccessfulPaymentRef = useRef(handleSuccessfulPayment);
  
  // Update the ref whenever the function changes, but add logging to track updates
  useEffect(() => {
    console.log('🔧 CHECKOUT: Updating handleSuccessfulPaymentRef - function recreated');
    handleSuccessfulPaymentRef.current = handleSuccessfulPayment;
  }, [handleSuccessfulPayment]);
  
  // Create a stable wrapper function that always calls the latest version
  const stableHandleSuccessfulPayment = useCallback(async (response: any) => {
    console.log('🔧 CHECKOUT: stableHandleSuccessfulPayment called, delegating to current ref');
    if (handleSuccessfulPaymentRef.current) {
      return handleSuccessfulPaymentRef.current(response);
    } else {
      console.error('🔧 CHECKOUT: handleSuccessfulPaymentRef.current is null!');
    }
  }, []); // No dependencies - this function never changes

  // Listen for iframe communication messages - MOVED AFTER stableHandleSuccessfulPayment
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('🎯 PARENT PAGE: ===== MESSAGE RECEIVED =====');
      console.log('🎯 PARENT PAGE: Received message from iframe:', event);
      console.log('🎯 PARENT PAGE: Message origin:', event.origin);
      console.log('🎯 PARENT PAGE: Message data:', event.data);
      console.log('🎯 PARENT PAGE: Current window location:', window.location.href);
      console.log('🎯 PARENT PAGE: Message data type:', typeof event.data);
      console.log('🎯 PARENT PAGE: Message data.type:', event.data?.type);
      console.log('🎯 PARENT PAGE: FULL MESSAGE EVENT OBJECT:', JSON.stringify({
        origin: event.origin,
        data: event.data,
        type: event.type,
        timeStamp: event.timeStamp
      }));
      
      // Accept messages from allowed origins
      const allowedOrigins = [
        'https://www.fasho.co',
        'https://fasho-landing.vercel.app',
        window.location.origin,
        'http://localhost:3000',
        'http://localhost:3001',
        'https://test.authorize.net',
        'https://accept.authorize.net'
      ];
      
      // For development, accept all origins but log everything
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 PARENT PAGE: Development mode - accepting all origins. Origin:', event.origin);
      } else {
        if (!allowedOrigins.includes(event.origin)) {
          console.log('🚫 PARENT PAGE: Message origin not allowed. Expected one of:', allowedOrigins, 'Got:', event.origin);
          return;
        }
      }
      console.log('✅ PARENT PAGE: Message origin check passed. Origin:', event.origin);
      
      const data = event.data;
      console.log('🎯 PARENT PAGE: Processing message type:', data?.type, '| typeof:', typeof data, '| Full data:', data);
      console.log('🎯 PARENT PAGE: Stringified data:', JSON.stringify(data, null, 2));
      console.log('🎯 PARENT PAGE: data.type exact value:', JSON.stringify(data?.type));
      console.log('🎯 PARENT PAGE: Checking against PAYMENT_COMPLETE:', data?.type === 'PAYMENT_COMPLETE');
      
      switch (data.type) {
        case 'IFRAME_COMMUNICATOR_READY':
          console.log('🧪 MESSAGE: ===== IFRAME COMMUNICATOR READY TEST MESSAGE =====');
          console.log('🧪 MESSAGE: Iframe communicator is loaded and can communicate with parent page');
          console.log('🧪 MESSAGE: Test message:', data.message);
          console.log('🧪 MESSAGE: Timestamp:', data.timestamp);
          console.log('🧪 MESSAGE: This proves iframe communication is working!');
          break;
          
        case 'PAYMENT_COMPLETE':
          console.log('🚨 MESSAGE: ===== PAYMENT_COMPLETE MESSAGE RECEIVED =====');
          console.log('🚨 MESSAGE: Message event origin:', event.origin);
          console.log('🚨 MESSAGE: Message timestamp:', new Date().toISOString());
          console.log('🚨 MESSAGE: Payment completed, processing response:', data.response);
          console.log('🚨 MESSAGE: stableHandleSuccessfulPayment exists:', !!stableHandleSuccessfulPayment);
          
          // Show processing popup only once when payment is submitted
          if (!hasShownProcessingPopup) {
            console.log('🔄 PARENT PAGE: Showing processing popup for first time');
            setShowProcessingPopup(true);
            setHasShownProcessingPopup(true);
          }
          
          // Use the stable function
          const response = data.response;
          console.log('🔍 PAYMENT: Iframe response received:', response);

          if (!response || typeof response !== 'object') {
            console.error('🔍 PAYMENT: Invalid response format');
            setError('No payment response received. Please try again.');
            setIsLoading(false);
            setShowPaymentForm(false);
            setShowProcessingPopup(false);
            return;
          }

          console.log('🔍 PAYMENT: Response code:', response.responseCode);
          console.log('🔍 PAYMENT: Response reason:', response.responseReasonText);

          if (response.responseCode === '1') {
            console.log('✅ PAYMENT: Transaction approved, processing success');
                      console.log('🚨 MESSAGE: ABOUT TO CALL stableHandleSuccessfulPayment WITH:', response?.transId);
          console.log('🚨 MESSAGE: Full response object:', response);
          console.log('🚨 MESSAGE: stableHandleSuccessfulPayment function exists:', !!stableHandleSuccessfulPayment);
          
                    try {
            console.log('🚨 MESSAGE: ===== CALLING stableHandleSuccessfulPayment =====');
            // Call the function and handle it asynchronously 
            const paymentPromise = stableHandleSuccessfulPayment(response);
            if (paymentPromise && typeof paymentPromise.then === 'function') {
              paymentPromise.then((result) => {
                console.log('🚨 MESSAGE: stableHandleSuccessfulPayment completed successfully:', result);
              }).catch((error) => {
                console.error('🚨 MESSAGE: ===== ERROR in stableHandleSuccessfulPayment =====');
                console.error('🔍 PAYMENT: Error in stableHandleSuccessfulPayment:', error);
                setError('Payment was successful but there was an error processing your order. Please contact support.');
                setShowProcessingPopup(false);
              });
            } else {
              console.log('🚨 MESSAGE: stableHandleSuccessfulPayment returned synchronously:', paymentPromise);
            }
          } catch (error) {
            console.error('🚨 MESSAGE: ===== SYNC ERROR in stableHandleSuccessfulPayment =====');
            console.error('🔍 PAYMENT: Sync Error in stableHandleSuccessfulPayment:', error);
          }
          } else {
            console.error('🔍 PAYMENT: Transaction declined or error:', response.responseReasonText);
            analytics.track("checkout_payment_failed", {
              payment_provider: "authorize_net",
              reason: response.responseReasonText || "payment_declined",
              error_code: response.responseReasonCode || response.responseCode,
              step: "payment",
            });
            setError(`Payment failed: ${response.responseReasonText}`);
            setIsLoading(false);
            setShowPaymentForm(false);
            setShowProcessingPopup(false);
          }
          break;

        case 'PAYMENT_CANCELLED':
          console.log('❌ PARENT PAGE: Payment was cancelled');
          analytics.track("checkout_payment_failed", {
            payment_provider: "authorize_net",
            reason: "cancelled",
            error_code: "cancelled",
            step: "payment",
          });
          setError('Payment was cancelled');
          setIsLoading(false);
          setShowPaymentForm(false);
          setShowProcessingPopup(false);
          break;
        case 'PAYMENT_SUCCESS':
          console.log('✅ PARENT PAGE: Payment success event received');
          break;

        case 'RESIZE_IFRAME':
          console.log('📏 PARENT PAGE: Resize iframe request:', data.width, 'x', data.height);
          const iframe = document.getElementById('paymentIframe') as HTMLIFrameElement;
          if (iframe && data.width && data.height) {
            iframe.style.width = data.width + 'px';
            iframe.style.height = data.height + 'px';
          }
          break;
        case 'IFRAME_LOADED':
          console.log('🔧 PARENT PAGE: Iframe communicator loaded successfully:', data.message);
          break;
        case 'TEST_MESSAGE':
          console.log('🔧 PARENT PAGE: Test message received:', data.message);
          break;
        case 'IFRAME_COMMUNICATOR_LOADED':
          console.log('🔧 PARENT PAGE: ===== IFRAME COMMUNICATOR LOADED =====');
          console.log('🔧 PARENT PAGE: Message:', data.message);
          console.log('🔧 PARENT PAGE: Iframe communicator is loaded and ready');
          break;
        default:
          console.log('❓ PARENT PAGE: Unknown message type:', data.type, '| Full data:', data);
          
          // EMERGENCY: Check if this unknown message contains payment data
          if (data && data.response && data.response.responseCode) {
            console.log('🚨 EMERGENCY: Found payment data in unknown message type!');
            console.log('🚨 EMERGENCY: Response code:', data.response.responseCode);
            console.log('🚨 EMERGENCY: Processing as payment complete...');
            
            if (data.response.responseCode === '1') {
              console.log('🚨 EMERGENCY: Payment successful, calling handleSuccessfulPayment directly');
              try {
                const paymentPromise = stableHandleSuccessfulPayment(data.response);
                if (paymentPromise && typeof paymentPromise.then === 'function') {
                  paymentPromise.then((result) => {
                    console.log('🚨 EMERGENCY: Payment processed successfully:', result);
                  }).catch((error) => {
                    console.error('🚨 EMERGENCY: Error processing payment:', error);
                  });
                }
              } catch (error) {
                console.error('🚨 EMERGENCY: Sync error processing payment:', error);
              }
            }
          }
      }
    };

    console.log('🎯 PARENT PAGE: Setting up message listener (CORRECT POSITION)');
    console.log('🎯 PARENT PAGE: handleMessage function exists:', !!handleMessage);
    console.log('🎯 PARENT PAGE: typeof handleMessage:', typeof handleMessage);
    window.addEventListener('message', handleMessage);
    console.log('🎯 PARENT PAGE: Message listener added successfully');
    
    // Test message listener after a delay
    setTimeout(() => {
      console.log('🎯 PARENT PAGE: Testing message listener with test message');
      window.postMessage({
        type: 'TEST_MESSAGE',
        message: 'Test from parent window'
      }, window.location.origin);
    }, 3000);
    
    return () => {
      console.log('🎯 PARENT PAGE: Cleaning up message listener (CORRECT POSITION)');
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Empty dependency array is fine here

  // Auto-submit the payment form when token is available
  useEffect(() => {
    if (paymentToken && showPaymentForm) {
      console.log('🚀 CHECKOUT: Auto-submitting payment form with token');
      console.log('🚀 CHECKOUT: Token available:', !!paymentToken);
      console.log('🚀 CHECKOUT: Show payment form:', showPaymentForm);
      console.log('🚀 CHECKOUT: Payment form URL:', paymentFormUrl);
      setTimeout(() => {
        console.log('🚀 CHECKOUT: Calling submitTokenToIframe...');
        submitTokenToIframe();
      }, 1000); // Increased delay to ensure iframe is ready
    }
  }, [paymentToken, showPaymentForm]);

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

  // Display session validation errors (only for session-specific issues)
  if (error && (error === 'already_completed' || error.includes('checkout session') || error.includes('session'))) {
    const isAlreadyCompleted = error === 'already_completed';
    
    return (
      <>
        <Head>
          <title>{isAlreadyCompleted ? 'Payment Complete' : 'Checkout Error'} - FASHO</title>
          <meta name="description" content={isAlreadyCompleted ? 'Payment already completed' : 'Checkout session error'} />
        </Head>
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
                      onClick={() => router.push( '/dashboard')}
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
                      onClick={() => router.push( '/add')}
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

  return (
    <>
      <Head>
        <title>Checkout - FASHO</title>
        <meta name="description" content="Complete your music promotion order" />
        
        {/* Bing Ads Enhanced Conversion - Checkout Page */}
        {((currentUser?.email) || formData.email) && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Enhanced conversion for checkout page
                window.uetq = window.uetq || [];
                window.uetq.push('set', { 
                  'pid': {
                    'em': '${currentUser?.email || formData.email}',
                    'ph': ''
                  } 
                });
              `,
            }}
          />
        )}
      </Head>
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
          {/* Step Indicator - Inside main content */}
          <StepIndicator currentStep={3} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
                          <h1 className="text-3xl md:text-4xl font-bold mb-2 mt-[-38px] sm:mt-[-30px] bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">🚀 Complete Your Order</h1>
                          <p className="text-lg text-gray-300 mt-3">This is where your career changes forever!</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Account & Payment */}
              <div className="space-y-6">
                {/* Account Details or Signed In Status */}
                {currentUser && !authLoading ? (
                  <div className="bg-white/5 rounded-xl pt-4 px-6 pb-6 sm:p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Account</h2>
                      <button
                        onClick={handleLogout}
                        className="text-white/60 hover:text-white text-sm transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      {renderProfileAvatar()}
                      <div className="hidden">
                        <div className="w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
                          <span className="text-black font-bold text-lg">
                            {getUserInitials(currentUser)}
                          </span>
                        </div>
                      </div>
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
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors autofill-override"
                          placeholder="your@email.com"
                        />
                        {loginInfoMessage && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                            <p className="text-green-400 text-sm">{loginInfoMessage}</p>
                          </div>
                        )}
                        {emailStatus === 'exists' && (
                          <p className="text-red-400">
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
                          <div className="flex items-center text-green-400">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Email is available!
                          </div>
                        )}
                        {emailStatus === 'invalid' && (
                          <p className="text-red-400">Please enter a valid email address</p>
                        )}
                        {emailStatus === 'error' && (
                          <p className="text-red-400">Error checking email. Please try again.</p>
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
                        
                        {/* Password requirements checklist */}
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
                                  <div className={`flex items-center text-sm ${requirements.hasSpecialChar ? 'text-green-400' : 'text-white/60'}`}>
                                    <svg className={`w-3 h-3 mr-2 ${requirements.hasSpecialChar ? 'text-green-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                    </svg>
                                    At least 1 special character (@, $, !, %, *, ?, &)
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

                    {/* Login Button - Only show in login mode */}
                    {isLoginMode && (
                      <div className="mt-6">
                        {/* Login Error Message */}
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
                    {/* Clear billing form link - only show if form has values */}
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
                  <p className="text-sm text-white/60 mb-6">
                    Enter your billing information
                  </p>
                  
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
                      
                      {/* Dynamic State/Province field - only show if country requires it */}
                      {countryConfig.hasStates ? (
                        <div>
                          <label htmlFor="state" className="block text-sm text-white/70 mb-2">
                            {countryConfig.stateLabel} <span className="text-red-400">*</span>
                          </label>
                          <select
                            id="state"
                            name="state"
                            value={billingData.state}
                            onChange={handleBillingChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                          >
                            <option value="">Select {countryConfig.stateLabel}</option>
                            {countryConfig.states?.map(state => (
                              <option key={state.code} value={state.code}>{state.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="state" className="block text-sm text-white/70 mb-2">
                            {countryConfig.stateLabel}
                          </label>
                          <input
                            type="text"
                            id="state"
                            name="state"
                            value={billingData.state}
                            onChange={handleBillingChange}
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                            placeholder={`Enter ${countryConfig.stateLabel.toLowerCase().replace(' (optional)', '')}`}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="zip" className="block text-sm text-white/70 mb-2">
                          {countryConfig.postalCodeLabel} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          id="zip"
                          name="zip"
                          value={billingData.zip}
                          onChange={handleBillingChange}
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                          placeholder={countryConfig.postalCodePlaceholder}
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
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                          <option value="IT">Italy</option>
                          <option value="ES">Spain</option>
                          <option value="NL">Netherlands</option>
                          <option value="BE">Belgium</option>
                          <option value="CH">Switzerland</option>
                          <option value="AT">Austria</option>
                          <option value="SE">Sweden</option>
                          <option value="NO">Norway</option>
                          <option value="DK">Denmark</option>
                          <option value="FI">Finland</option>
                          <option value="IE">Ireland</option>
                          <option value="PT">Portugal</option>
                          <option value="PL">Poland</option>
                          <option value="CZ">Czech Republic</option>
                          <option value="HU">Hungary</option>
                          <option value="GR">Greece</option>
                          <option value="JP">Japan</option>
                          <option value="KR">South Korea</option>
                          <option value="SG">Singapore</option>
                          <option value="HK">Hong Kong</option>
                          <option value="NZ">New Zealand</option>
                          <option value="BR">Brazil</option>
                          <option value="MX">Mexico</option>
                          <option value="AR">Argentina</option>
                          <option value="CL">Chile</option>
                          <option value="CO">Colombia</option>
                          <option value="PE">Peru</option>
                          <option value="ZA">South Africa</option>
                          <option value="EG">Egypt</option>
                          <option value="AE">United Arab Emirates</option>
                          <option value="SA">Saudi Arabia</option>
                          <option value="IL">Israel</option>
                          <option value="TR">Turkey</option>
                          <option value="IN">India</option>
                          <option value="CN">China</option>
                          <option value="TH">Thailand</option>
                          <option value="MY">Malaysia</option>
                          <option value="ID">Indonesia</option>
                          <option value="PH">Philippines</option>
                          <option value="VN">Vietnam</option>
                          <option value="TW">Taiwan</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Phone Number Field */}
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
                          <option value="+49">DE +49</option>
                          <option value="+33">FR +33</option>
                          <option value="+39">IT +39</option>
                          <option value="+34">ES +34</option>
                          <option value="+31">NL +31</option>
                          <option value="+32">BE +32</option>
                          <option value="+41">CH +41</option>
                          <option value="+43">AT +43</option>
                          <option value="+46">SE +46</option>
                          <option value="+47">NO +47</option>
                          <option value="+45">DK +45</option>
                          <option value="+358">FI +358</option>
                          <option value="+353">IE +353</option>
                          <option value="+351">PT +351</option>
                          <option value="+48">PL +48</option>
                          <option value="+420">CZ +420</option>
                          <option value="+36">HU +36</option>
                          <option value="+30">GR +30</option>
                          <option value="+81">JP +81</option>
                          <option value="+82">KR +82</option>
                          <option value="+65">SG +65</option>
                          <option value="+852">HK +852</option>
                          <option value="+64">NZ +64</option>
                          <option value="+55">BR +55</option>
                          <option value="+52">MX +52</option>
                          <option value="+54">AR +54</option>
                          <option value="+56">CL +56</option>
                          <option value="+57">CO +57</option>
                          <option value="+51">PE +51</option>
                          <option value="+27">ZA +27</option>
                          <option value="+20">EG +20</option>
                          <option value="+971">AE +971</option>
                          <option value="+966">SA +966</option>
                          <option value="+972">IL +972</option>
                          <option value="+90">TR +90</option>
                          <option value="+91">IN +91</option>
                          <option value="+86">CN +86</option>
                          <option value="+66">TH +66</option>
                          <option value="+60">MY +60</option>
                          <option value="+62">ID +62</option>
                          <option value="+63">PH +63</option>
                          <option value="+84">VN +84</option>
                          <option value="+886">TW +886</option>
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

                {/* Genre Selection & Terms Agreement Row - Desktop: Side by side, Mobile: Stacked */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Music Genre Selection */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <h2 className="text-lg font-semibold mb-2">Your Genre <span className="text-red-400">*</span></h2>
                    <p className="text-sm text-white/60 mb-4">
                      Select the genre that best describes your music style
                    </p>
                    
                    <div>
                      <select
                        id="musicGenre"
                        name="musicGenre"
                        value={billingData.musicGenre}
                        onChange={handleBillingChange}
                        required
                        className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                        style={{ zIndex: 10 }}
                        suppressHydrationWarning={true}
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

                  {/* Terms Agreement */}
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

              {/* Right Column - Order Summary */}
              <div className="space-y-6">
                {/* Order Items */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h2 className="text-lg font-semibold mb-6">Your Order</h2>
                  
                  <div className={`space-y-4 ${(orderItems.length + addOnOrderItems.length) > 2 ? 'max-h-[240px] overflow-y-auto pr-4 pl-2 pt-2 pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent' : ''}`}>
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center space-x-4 p-5 bg-white/5 rounded-lg relative min-h-[100px]">
                        {/* Change Song Button */}
                        <button
                          onClick={() => changeSong(index)}
                          className="absolute -top-1 -right-1 bg-blue-500/50 hover:bg-blue-600/70 text-white text-xs px-2 py-1 rounded-full transition-colors shadow-lg border-2 border-white/50 z-30 text-xs"
                          title="Change this song"
                          style={{ fontSize: '10px' }}
                        >
                          Change Song
                        </button>
                        
                        {/* 25% OFF Flag */}
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
                    
                    {/* Add-on Items */}
                    {addOnOrderItems.map((item, index) => (
                      <div key={`addon-${index}`} className="flex items-center space-x-3 p-4 bg-white/5 rounded-lg relative">
                        {/* Remove Add-on Button */}
                        <button
                          onClick={() => removeAddOn(item.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/50 hover:bg-red-600/70 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-30 border-2 border-white/50"
                          title="Remove add-on"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        
                        {/* 50% OFF Flag */}
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
                          <p className="text-white/50 text-xs">
                            {item.id === 'express-launch' ? 'Express campaign launch' : 
                             item.id === 'discover-weekly-push' ? 'Algorithmic playlist targeting' : 
                             'Premium add-on service'}
                          </p>
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
                        onClick={handleRemoveCoupon}
                        className="text-red-400 hover:text-red-300 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* FASHOKENS Loyalty Section */}
                <FashokensSection
                  userId={currentUser?.id || null}
                  cartTotal={totalBeforeFashokens} // Pass total after coupon but before fashokens
                  onApplyTokens={(tokens, discount) => {
                    setAppliedFashokens(tokens);
                    setFashokensDiscount(discount);
                  }}
                  onRemoveTokens={() => {
                    setAppliedFashokens(0);
                    setFashokensDiscount(0);
                  }}
                  appliedTokens={appliedFashokens}
                  appliedDiscount={fashokensDiscount}
                />

                {/* Price Summary */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/70">Subtotal</span>
                      <span>
                        ${subtotal.toFixed(2)}
                        {getConversionDisplay(subtotal, billingData.country) && (
                          <span className="text-white/50 text-sm ml-1">
                            {getConversionDisplay(subtotal, billingData.country)}
                          </span>
                        )}
                      </span>
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

                    {appliedFashokens > 0 && (
                      <div className="flex justify-between items-center text-[#59e3a5]">
                        <span className="flex items-center space-x-1">
                          <img src="/fashoken.png" alt="FASHOKEN" className="w-4 h-4" />
                          <span>FASHOKENS ({appliedFashokens.toLocaleString()} applied)</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <span>-${fashokensDiscount.toFixed(2)}</span>
                          <button
                            onClick={() => {
                              setAppliedFashokens(0);
                              setFashokensDiscount(0);
                            }}
                            className="text-white/50 hover:text-white text-xs underline"
                          >
                            Unapply
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-white/20 pt-3">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <div className="text-right">
                          <span className="text-[#59e3a5]">${total.toFixed(2)}</span>
                          {getConversionDisplay(total, billingData.country) && (
                            <div className="text-white/50 text-sm font-normal">
                              {getConversionDisplay(total, billingData.country)}
                            </div>
                          )}
                        </div>
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
                        {/* 50% OFF badge in bottom right corner */}
                        <div className="absolute bottom-2 right-2 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black text-xs font-bold px-2 py-1 rounded-full pointer-events-none">
                          50% OFF
                    </div>
                      </SpotlightCard>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Width Payment Section */}
            <div className="mt-8">
              <div className="bg-white/5 rounded-xl px-2 py-6 md:p-6 border border-white/20">
                
                {!showPaymentForm ? (
                  // Account validation form (before payment)
                  <div className="max-w-md mx-auto">
                    <form onSubmit={currentUser ? handleSubmit : (isLoginMode ? handleLogin : handleSubmit)} className="space-y-4">
                      {/* Error Message */}
                      {formError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                          <p className="text-red-400 text-sm">{formError}</p>
                        </div>
                      )}
                      
                                            <div>
                          <button
                          type="submit"
                          disabled={isLoading}
                          className="w-[calc(100%-1rem)] md:w-full mx-auto block bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Processing...' : `Continue to Payment · $${total.toFixed(2)}`}
                        </button>
                        
                        {/* FASHOKENS Earning Badge */}
                        {currentUser && total > 0 && (
                          <div className="mt-3 flex items-center justify-center space-x-2 bg-[#59e3a5]/10 border border-[#59e3a5]/30 rounded-lg py-2 px-3">
                            <img src="/fashoken.png" alt="FASHOKEN" className="w-4 h-4" />
                            <span className="text-[#59e3a5] text-sm font-medium">
                              You're earning {Math.floor(total * tokensPerDollar).toLocaleString()} FASHOkens from this order!
                            </span>
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                ) : (
                  // Authorize.net iframe payment form
                  <div>
                    {/* Step 3 Header with animated green dot */}
                    <div className="mb-6 text-center">
                      <h3 className="text-xl font-semibold mb-2">
                        <span className="text-[#59e3a5]">Step 3:</span> Submit Your Payment
                      </h3>
                      <div className="flex items-center justify-center space-x-3">
                        <div className="relative">
                          <div className="w-3 h-3 bg-[#59e3a5] rounded-full"></div>
                          <div className="absolute inset-0 w-3 h-3 bg-[#59e3a5] rounded-full animate-ping opacity-75"></div>
                        </div>
                        <p className="text-base font-semibold text-white/80">
                          Waiting for successful payment...
                        </p>
                      </div>
                    </div>
                    
                    {/* Hidden form to submit token to iframe */}
                    <form 
                      id="paymentIframeForm" 
                      method="post" 
                      action={paymentFormUrl || "https://accept.authorize.net/payment/payment"} 
                      target="paymentIframe" 
                      style={{ display: 'none' }}
                    >
                      <input type="hidden" name="token" value={paymentToken || ''} />
                    </form>
                    
                    {/* Payment iframe container - Adjusted size: 85% width, 475px height */}
                    <div className="payment-iframe-container relative w-full md:w-[85%] bg-white/[0.02] rounded-xl overflow-hidden mx-auto">
                      <iframe 
                        name="paymentIframe" 
                        id="paymentIframe"
                        src="about:blank"
                        width="100%" 
                        height="475px"
                        frameBorder="0" 
                        scrolling="auto"
                        onLoad={(e) => {
                          console.log('🎯 CHECKOUT: Iframe onLoad event triggered');
                          const iframe = e.target as HTMLIFrameElement;
                          console.log('🎯 CHECKOUT: Iframe element:', iframe);
                          console.log('🎯 CHECKOUT: Iframe src:', iframe.src);
                          console.log('🎯 CHECKOUT: Iframe name:', iframe.name);
                          
                          try {
                            console.log('🎯 CHECKOUT: Iframe URL:', iframe.contentWindow?.location.href);
                          } catch (err) {
                            console.log('🎯 CHECKOUT: Cannot access iframe URL (cross-origin)');
                          }
                          
                          // Hide the loading overlay
                          const loader = document.getElementById('iframeLoader');
                          if (loader) {
                            loader.style.display = 'none';
                            console.log('🎯 CHECKOUT: Loading overlay hidden');
                          }
                        }}
                        className="rounded-lg border border-white/20 w-full block bg-white"
                        style={{
                          maxWidth: '100%',
                          overflow: 'hidden',
                          border: 'none'
                        }}
                      />
                      
                      {/* Loading overlay */}
                      <div className="absolute inset-0 bg-white/5 rounded-lg flex items-center justify-center" id="iframeLoader">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-white/70">Loading secure payment form...</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center space-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentForm(false);
                          setPaymentToken('');
                          setError('');
                          setShowProcessingPopup(false);
                        }}
                        className="text-white/60 hover:text-white text-sm transition-colors"
                      >
                        ← Back to checkout
                      </button>
                      
                      {/* Debug button - remove in production */}
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Page refresh triggered');
                          window.location.reload();
                        }}
                        className="text-[#59e3a5] hover:text-[#14c0ff] text-sm transition-colors"
                      >
                        🔄 Reload Payment Form
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 text-center text-sm text-white/60">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center">
                      {/* Visa */}
                      <svg className="h-9 w-auto" viewBox="0 0 290 216" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="41" y="21" width="208" height="134" rx="24" fill="#1434CB"/>
                        <rect x="40.5" y="20.5" width="209" height="135" rx="24.5" stroke="#D6DCE5"/>
                        <path d="M143.728 66.1627L134.027 111.514H122.295L131.998 66.1627H143.728ZM193.087 95.4462L199.264 78.4152L202.818 95.4462H193.087ZM206.177 111.514H217.028L207.559 66.1627H197.543C195.292 66.1627 193.393 67.4717 192.548 69.4899L174.947 111.514H187.267L189.713 104.742H204.764L206.177 111.514ZM175.558 96.7064C175.608 84.7367 159.005 84.0778 159.12 78.731C159.155 77.1018 160.706 75.3736 164.095 74.9301C165.779 74.7104 170.408 74.5425 175.664 76.9611L177.723 67.344C174.899 66.3191 171.266 65.333 166.748 65.333C155.153 65.333 146.991 71.498 146.922 80.3257C146.849 86.8539 152.748 90.4969 157.194 92.6672C161.764 94.8907 163.3 96.3146 163.28 98.3026C163.25 101.347 159.634 102.688 156.261 102.741C150.361 102.834 146.938 101.149 144.209 99.8772L142.083 109.814C144.824 111.073 149.883 112.167 155.133 112.223C167.455 112.223 175.518 106.134 175.558 96.7064ZM126.964 66.1627L107.957 111.514H95.5537L86.2007 75.3205C85.6323 73.0913 85.1385 72.276 83.4117 71.3358C80.594 69.8071 75.9362 68.3703 71.8381 67.4804L72.118 66.1627H92.08C94.6236 66.1627 96.913 67.8564 97.49 70.7861L102.431 97.0308L114.639 66.1627H126.964Z" fill="white"/>
                      </svg>
                      
                      {/* Mastercard */}
                      <svg className="h-9 w-auto" viewBox="0 0 290 216" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="41" y="21" width="208" height="134" rx="24" fill="#FFEFE5"/>
                        <rect x="40.5" y="20.5" width="209" height="135" rx="24.5" stroke="#D6DCE5"/>
                        <path d="M159.941 61.483H129.316V116.517H159.941V61.483Z" fill="#FF5F00"/>
                        <path d="M131.261 89C131.256 83.6998 132.457 78.468 134.773 73.7006C137.089 68.9333 140.46 64.7553 144.629 61.483C139.466 57.4246 133.265 54.9007 126.735 54.1999C120.205 53.499 113.61 54.6495 107.703 57.5197C101.796 60.39 96.8161 64.8642 93.3319 70.4311C89.8477 75.9979 88 82.4327 88 89C88 95.5673 89.8477 102.002 93.3319 107.569C96.8161 113.136 101.796 117.61 107.703 120.48C113.61 123.351 120.205 124.501 126.735 123.8C133.265 123.099 139.466 120.575 144.629 116.517C140.46 113.245 137.089 109.067 134.773 104.299C132.457 99.532 131.256 94.3002 131.261 89Z" fill="#EB001B"/>
                        <path d="M201.256 89C201.256 95.5672 199.409 102.002 195.925 107.569C192.441 113.136 187.461 117.61 181.554 120.48C175.647 123.35 169.052 124.501 162.523 123.8C155.993 123.099 149.792 120.575 144.629 116.517C148.795 113.241 152.162 109.063 154.478 104.296C156.794 99.5295 157.997 94.2993 157.997 89C157.997 83.7007 156.794 78.4705 154.478 73.7039C152.162 68.9373 148.795 64.7586 144.629 61.483C149.792 57.4246 155.993 54.9007 162.523 54.1999C169.052 53.499 175.647 54.6495 181.554 57.5198C187.461 60.3901 192.441 64.8643 195.925 70.4312C199.409 75.998 201.256 82.4328 201.256 89Z" fill="#F79E1B"/>
                      </svg>
                      
                      {/* American Express */}
                      <svg className="h-9 w-auto" viewBox="0 0 290 216" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="41" y="21" width="208" height="134" rx="24" fill="#E5F1FA"/>
                        <rect x="40.5" y="20.5" width="209" height="135" rx="24.5" stroke="#D6DCE5"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M249.079 45.2613H231.862L222.863 71.0859L213.473 45.2613H195.865V85.4722L177.866 45.2613H163.39L145.391 86.3451H157.911L161.433 78.1288H180.214L183.736 86.3451H207.212V57.7817L217.777 86.3451H227.558L238.123 57.7817V86.3451H249.079V92.6053H234.601L222.863 105.518L210.734 92.6053H161.042V133.689H210.343L222.472 120.386L234.601 133.689H249.079V138.775H231.862L222.472 128.602L213.081 138.775H154.782V91.8226H136L159.477 39H182.17L190.387 56.9991V39H218.559L223.254 52.695L227.95 39H249.079V45.2613ZM249.079 101.604L238.515 112.951L249.079 124.298V133.689L229.906 112.951L249.079 92.6053V101.604ZM195.865 133.689V123.907H172.389V117.647H195.474V108.256H172.389V101.996H195.865V92.6053L215.429 112.951L195.865 133.689ZM164.954 69.1287L170.433 55.8256L175.91 69.1287H164.954Z" fill="#006FCF"/>
                      </svg>
                      
                      {/* Discover */}
                      <svg className="h-9 w-auto" viewBox="0 0 290 216" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="discoverGradient" x1="106.438" y1="21.0002" x2="186.634" y2="156.712" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#E05026"/>
                            <stop offset="1" stopColor="#F9A020"/>
                          </linearGradient>
                        </defs>
                        <rect x="41" y="21.0002" width="208" height="134" rx="24" fill="url(#discoverGradient)"/>
                        <rect x="40.5" y="20.5002" width="209" height="135" rx="24.5" stroke="#D6DCE5"/>
                        <path d="M44 44C44 32.9543 52.9543 24 64 24H173C208.346 24 237 52.6538 237 88C237 123.346 208.346 152 173 152H64C52.9543 152 44 143.046 44 132V44Z" fill="white"/>
                        <path d="M106.846 88.0817C106.846 95.9509 113.026 102.051 120.975 102.051C123.224 102.051 125.147 101.608 127.521 100.492V94.3463C125.434 96.4331 123.585 97.2765 121.217 97.2765C115.958 97.2765 112.226 93.464 112.226 88.0427C112.226 82.9047 116.079 78.8501 120.975 78.8501C123.466 78.8501 125.352 79.7367 127.521 81.8603V75.7167C125.231 74.5555 123.345 74.0732 121.098 74.0732C113.188 74.0732 106.846 80.299 106.846 88.0817Z" fill="#251F1F"/>
                        <path d="M93.4447 81.5813C93.4447 83.0258 94.3659 83.7913 97.4993 84.9504C103.44 87.1237 105.2 89.0483 105.2 93.3019C105.2 98.4831 101.392 102.09 95.9661 102.09C91.9937 102.09 89.1046 100.527 86.6978 96.9953L90.0712 93.7473C91.2736 96.072 93.2803 97.3175 95.7693 97.3175C98.1005 97.3175 99.824 95.7108 99.824 93.5419C99.824 92.4174 99.3006 91.4508 98.2583 90.7718C97.7329 90.4496 96.6927 89.9673 94.6492 89.2472C89.7447 87.4827 88.0623 85.5948 88.0623 81.9057C88.0623 77.5245 91.6758 74.2354 96.4116 74.2354C99.3461 74.2354 102.032 75.2388 104.279 77.2045L101.545 80.7812C100.185 79.2567 98.9006 78.6123 97.335 78.6123C95.0838 78.6123 93.4447 79.8946 93.4447 81.5813Z" fill="#251F1F"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M62.7377 74.6788H55.0718V101.448H62.6966C66.7491 101.448 69.6792 100.492 72.2482 98.3577C75.3016 95.8298 77.1073 92.0196 77.1073 88.0817C77.1073 80.1822 71.2038 74.6788 62.7377 74.6788ZM68.8359 94.7897C67.1946 96.2688 65.0645 96.9154 61.6911 96.9154H60.2898V79.2156H61.6911C65.0645 79.2156 67.1102 79.8168 68.8359 81.3802C70.6437 82.987 71.7271 85.4781 71.7271 88.0428C71.7271 90.6118 70.6437 93.183 68.8359 94.7897Z" fill="#251F1F"/>
                        <path d="M84.7322 74.6788H79.5098V101.448H84.7322V74.6788Z" fill="#251F1F"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mt-2">Securely processed by Authorize.net</p>
                </div>
              </div>


            </div>
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
          <div>
            <p className="text-gray-400 text-lg mb-4">Effective Date: 05/12/2025</p>
            <p className="text-gray-300 leading-relaxed">
              Welcome to FASHO.co, operated by FASHO Inc. ("FASHO," "we," "us," or "our"). Please read these Terms & Conditions ("Terms") carefully before accessing or using our website and services. By registering for an account or purchasing any services from FASHO.co, you agree to be bound by these Terms.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              If you do not agree with any part of these Terms, please do not use our website or services.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">1. COMPANY INFORMATION</h2>
            <div className="text-gray-300 leading-relaxed">
              <p>FASHO Inc.</p>
              <p>PO Box 407</p>
              <p>Los Angeles, CA 95001</p>
              <p>Contact: <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">2. ELIGIBILITY & USER ACCOUNTS</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>You must be at least 18 years old and complete registration to use any services offered on FASHO.co. By registering, you certify that all information provided is accurate and kept up to date.</p>
              <p>You are responsible for maintaining the confidentiality of your account login details and for all activities under your account.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">3. SERVICES PROVIDED</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>FASHO provides Spotify promotion and digital marketing services, pitching users' music to third-party playlist curators worldwide.</p>
              <p>We do not guarantee placement or specific results; final decisions rest with external playlist owners.</p>
              <p>We reserve the right to modify, refuse, or discontinue services at any time at our sole discretion.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">4. PAYMENTS & REFUNDS</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>All purchases are one-time payments made via major credit or debit cards (no PayPal or other payment methods accepted).</p>
              <div>
                <p className="font-semibold text-white mb-2">Refund Policy:</p>
                <p>If you are unhappy with your results, you may request a refund within thirty (30) days from the start of your campaign. Refunds will only be issued if requested within this window.</p>
                <p className="mt-2">To request a refund, contact us at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a> with your order details.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">5. INTELLECTUAL PROPERTY</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>All content on FASHO.co—including but not limited to text, graphics, logos, images, videos, and software—is the exclusive property of FASHO Inc., protected by U.S. and international copyright laws.</p>
              <p>Our company name ("FASHO"), logo, and associated trademarks are protected intellectual property of FASHO Inc.</p>
              <p>You may not reproduce, distribute, modify, transmit, reuse, download, repost, copy, or use any content from our site without our prior written consent.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">6. USER CONTENT</h2>
            <p className="text-gray-300 leading-relaxed">
              FASHO.co does not allow user-generated content on its website or platforms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">7. DISCLAIMERS & LIMITATION OF LIABILITY</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <div>
                <p className="font-semibold text-white">No Guarantee of Results:</p>
                <p>We strive to facilitate placements but cannot guarantee specific outcomes from playlist submissions; all placement decisions are made by third-party playlist curators.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Third-Party Services:</p>
                <p>We are not responsible for actions or decisions made by external playlist owners.</p>
              </div>
              <div>
                <p className="font-semibold text-white">No Warranties:</p>
                <p>Our website and services are provided "as-is" without warranties of any kind.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Limitation of Liability:</p>
                <p>To the maximum extent permitted by law, FASHO Inc., its officers, directors, employees, agents, or affiliates shall not be liable for any direct, indirect, incidental, special, consequential or punitive damages resulting from your access to or use of (or inability to access or use) our website or services.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">8. GOVERNING LAW</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of California, USA without regard to its conflict of law principles.</p>
              <p>Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of courts located in California.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">9. CHANGES TO TERMS</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>We reserve the right to update or modify these Terms at any time without prior notice. It is your responsibility to review this page periodically for updates.</p>
              <p>Continued use of our website or services after changes constitutes acceptance of those changes.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">10. CONTACT US</h2>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>For questions about these Terms & Conditions or your account with us:</p>
              <p>Email: <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a></p>
              <p>Mailing Address: PO Box 407, Los Angeles CA 95001</p>
            </div>
          </section>

          <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-xl p-6 border border-white/10 mt-8">
            <p className="text-white font-medium text-center">
              By using FASHO.co's website and services you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
            </p>
          </div>
        </div>
      </LegalModal>

      <LegalModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
      >
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
          <div>
            <p className="text-gray-400 text-lg mb-4">Effective Date: 05/12/2025</p>
            <p className="text-gray-300 leading-relaxed">
              FASHO Inc. ("FASHO," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you visit FASHO.co or use our services.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              By accessing or using our website or services, you consent to the practices described in this Privacy Policy.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">1. INFORMATION WE COLLECT</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>We may collect the following types of information from you:</p>
              
              <div>
                <p className="font-semibold text-white mb-2">Personal Information:</p>
                <p>When you register or purchase services, we may collect your name, email address, payment information (processed securely by third-party payment processors), and other information necessary to provide our services.</p>
              </div>
              
              <div>
                <p className="font-semibold text-white mb-2">Technical Information:</p>
                <p>We collect information about your device and interaction with our website (such as IP address, browser type, operating system, pages visited, and referring URLs) via cookies and analytics tools.</p>
              </div>
              
              <div>
                <p className="font-semibold text-white mb-2">Communication:</p>
                <p>Any correspondence sent to us (such as support emails) may be stored for record-keeping and customer service purposes.</p>
              </div>
              
              <p className="font-medium text-white">We do not knowingly collect information from anyone under 18 years of age.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">2. HOW WE USE YOUR INFORMATION</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>Your information may be used to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Process transactions and deliver services you request</li>
                <li>Communicate with you regarding your account or orders</li>
                <li>Respond to customer service inquiries</li>
                <li>Improve our website and services through analytics</li>
                <li>Comply with legal requirements</li>
              </ul>
              <p className="font-medium text-white">We will never sell or rent your personal information to third parties.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">3. HOW WE SHARE YOUR INFORMATION</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>We may share your information only in the following circumstances:</p>
              
              <div>
                <p className="font-semibold text-white mb-2">Service Providers:</p>
                <p>With trusted third-party vendors who assist in operating our website and processing payments. These providers are bound by confidentiality obligations.</p>
              </div>
              
              <div>
                <p className="font-semibold text-white mb-2">Legal Compliance:</p>
                <p>If required by law or subpoena, or to protect our rights or the rights of others.</p>
              </div>
              
              <div>
                <p className="font-semibold text-white mb-2">Business Transfers:</p>
                <p>In the event FASHO is involved in a merger, acquisition, or asset sale, your data may be transferred as part of that transaction.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">4. COOKIES & TRACKING TECHNOLOGIES</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Improve website functionality and performance</li>
                <li>Analyze how users interact with FASHO.co</li>
                <li>Tailor content and marketing</li>
              </ul>
              <p>You can control cookie preferences through your browser settings; however, disabling cookies may affect your experience.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">5. DATA SECURITY</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>We implement industry-standard security measures to protect your personal information against unauthorized access, alteration, disclosure or destruction.</p>
              <p>However, no method of transmission over the internet or electronic storage is 100% secure—use our services at your own risk.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">6. INTERNATIONAL USERS</h2>
            <p className="text-gray-300 leading-relaxed">
              FASHO.co is operated from the United States but is available worldwide. By using our site from outside the US, you consent to the transfer and processing of your information in the US.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">7. YOUR RIGHTS & CHOICES</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>Depending on your location (e.g., California residents under CCPA; EU/UK users under GDPR), you may have rights regarding your personal data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access the personal data we hold about you</li>
                <li>Request correction or deletion of your data</li>
                <li>Opt out of certain data uses (such as marketing emails)</li>
                <li>Request restriction or object to certain processing</li>
                <li>Receive a copy of your data in a portable format</li>
              </ul>
              <p>To exercise these rights, contact us at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a>.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">8. THIRD-PARTY LINKS</h2>
            <p className="text-gray-300 leading-relaxed">
              Our website may contain links to third-party websites not controlled by FASHO Inc. We are not responsible for their privacy practices; please review their policies separately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">9. CHANGES TO THIS PRIVACY POLICY</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>We reserve the right to update this Privacy Policy at any time. Changes take effect once posted on this page; it is your responsibility to review periodically.</p>
              <p>Your continued use of our website/services after changes constitutes acceptance of those changes.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">10. CONTACT US</h2>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>For questions about this Privacy Policy or to exercise your rights:</p>
              <p>Email: <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a></p>
              <p>Mailing Address: PO Box 407, Los Angeles CA 95001</p>
            </div>
          </section>

          <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-xl p-6 border border-white/10 mt-8">
            <p className="text-white font-medium text-center">
              By using FASHO.co's website and services you acknowledge that you have read, understood, and agree to this Privacy Policy.
            </p>
          </div>
        </div>
      </LegalModal>

      <LegalModal
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
        title="Disclaimer"
      >
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
          <div>
            <p className="text-gray-400 text-lg mb-4">Effective Date: 05/12/2025</p>
            <p className="text-gray-300 leading-relaxed text-lg">
              At FASHO.co, we believe in being upfront and real with you—just like we'd want for ourselves.
            </p>
            <p className="text-gray-300 leading-relaxed text-lg mt-4">
              When it comes to marketing your music, here's the truth: Like any authentic marketing service, we don't guarantee results. No real company can ever promise exact outcomes, because every song, artist, and campaign is unique—and so are the tastes of playlist curators and listeners.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">Why We Don't Guarantee Results (And Why That's a Good Thing)</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>Let's be honest: if you ever run into a company promising you "guaranteed streams" or "guaranteed placements" no matter what… <span className="text-white font-semibold">run for the hills!</span> That usually means bots, fake plays, or shady methods that put your music career at risk.</p>
              <p>At FASHO.co, our job is to get your music in front of real playlist curators who make their own choices. We pitch your song directly to genuine decision-makers. What happens next depends on the quality of your track and what those curators are looking for at the time.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">We Know What We're Doing</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>While we can't make promises about specific numbers or placements, what we can promise is this:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                <li>We've been doing this for years and have built a massive network of trusted playlist curators.</li>
                <li>Our artists have seen incredible results—many have reached new fans and achieved huge milestones with our help.</li>
                <li>Your campaign will always be handled by experienced professionals who care about your growth.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">About Those Numbers</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>Any streams or placements mentioned on our website are estimates only. They're based on real data from past campaigns, but your results may differ.</p>
              <p>We always strive for the best possible outcome, but music is an art—<span className="text-white font-semibold">not a science!</span></p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">Bottom Line</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>You're paying us to pitch your music to real Spotify playlist owners—not for guaranteed numbers. The rest depends on how your music connects with curators and audiences.</p>
              <p>If you have questions about how our process works or want honest feedback about what to expect for your campaign, reach out anytime at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors font-semibold">support@fasho.co</a>. We'll always keep it real with you.</p>
              <p className="text-white font-semibold text-lg">Thanks for trusting us with your music. Let's chase greatness together—the right way!</p>
            </div>
          </section>

          <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-xl p-6 border border-white/10 mt-8">
            <p className="text-white font-medium text-center">
              By using FASHO.co's website and services you acknowledge that you have read and understood this Disclaimer.
            </p>
          </div>
        </div>
      </LegalModal>

      <LegalModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Refund Policy"
      >
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
          <div>
            <p className="text-gray-400 text-lg mb-4">Effective Date: 05/12/2025</p>
            <p className="text-gray-300 leading-relaxed text-lg">
              At FASHO.co, we want you to feel confident and happy about your investment in your music career. We're committed to giving every artist the best shot at success—but if things don't turn out the way you hoped, we've got your back.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">30-Day Satisfaction Guarantee</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p className="text-lg">If you're not satisfied with your results, you can request a <span className="text-white font-semibold">full refund within 30 days</span> of your campaign starting—no hassle, no hard feelings.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">How It Works:</h2>
            <div className="text-gray-300 leading-relaxed space-y-6">
              
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Campaigns Start Fast:</h3>
                <p>Most campaigns begin within 24 hours of your purchase. Your 30-day refund period starts the moment your campaign officially kicks off (not when you purchase).</p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Simple Process:</h3>
                <p>If you'd like a refund for any reason, just email us at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors font-semibold">support@fasho.co</a> within 30 days of your campaign start date. Include your order details and let us know why you're not satisfied—so we can keep improving our service for everyone.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Full Refund:</h3>
                <p>If your request meets these simple conditions, we'll process your full refund back to your original payment method. <span className="text-white font-semibold">No hoops to jump through.</span></p>
              </div>
              
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">A Few Things to Note</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <ul className="list-disc list-inside space-y-3 ml-4 text-gray-300">
                <li>Refund requests made after the 30-day window cannot be processed.</li>
                <li>Only the original purchaser is eligible for a refund.</li>
                <li>We can only refund payments made directly through FASHO.co using a valid credit or debit card.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">Questions?</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>If you're unsure about your campaign's start date or eligibility for a refund—or just want to talk to a real human—reach out anytime at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors font-semibold">support@fasho.co</a>. We're here to help!</p>
              <p className="text-white font-semibold text-lg">We appreciate every artist who trusts us with their music. If it's not working out, we'll make it right.</p>
            </div>
          </section>

          <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-xl p-6 border border-white/10 mt-8">
            <p className="text-white font-medium text-center text-lg">
              Your satisfaction is our priority. We're confident in our service, but we believe you should be too.
            </p>
          </div>
        </div>
      </LegalModal>

      {/* Processing Payment Popup */}
      {showProcessingPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center space-y-6">
              {/* Animated Spinner */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-600 rounded-full animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#59e3a5] rounded-full animate-spin"></div>
                </div>
              </div>
              
              {/* Text */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Processing Payment...</h3>
                <p className="text-gray-300 text-sm">Please wait while we process your payment securely. Do not close this window.</p>
              </div>
              
              {/* Progress dots */}
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