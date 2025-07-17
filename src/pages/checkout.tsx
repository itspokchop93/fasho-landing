import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { Track } from '../types/track';
import Header from '../components/Header';
import { createClient } from '../utils/supabase/client';
import { userProfileService, UserProfileData, ArtistProfile } from '../utils/userProfile';
import LegalModal from '../components/LegalModal';

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
    id: "apple-music",
    name: "Promote on Apple Music (50% OFF)",
    description: ["🔴 Get added to an Apple Music playlist", "🎵 Apple Music add-on reduced if not placed in 7 days"],
    originalPrice: 94,
    salePrice: 47,
    emoji: "🍎",
    color: "text-pink-400",
    borderColor: "border-pink-500/50",
    bgGradient: "bg-gradient-to-r from-pink-500/10 to-purple-500/10"
  }
];

export default function CheckoutPage() {
  const router = useRouter();
  const { tracks: tracksParam, selectedPackages: selectedPackagesParam } = router.query;
  const supabase = createClient();

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string>('');
  const [paymentFormUrl, setPaymentFormUrl] = useState<string>('');
  const [loginError, setLoginError] = useState('');
  const [emailStatus, setEmailStatus] = useState<null | 'available' | 'exists' | 'unverified' | 'invalid' | 'error'>(null);
  const [loginInfoMessage, setLoginInfoMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string>('');
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);

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
    country: 'US' // 2-letter code only
  });

  // Terms agreement state
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Modal states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

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
    router.push('/add');
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

  // Update totals when coupon changes
  useEffect(() => {
    updateTotals();
  }, [appliedCoupon, orderItems, addOnOrderItems]);

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
        router.push('/add');
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
          } else if (errorData.reason === 'expired') {
            setError('This checkout session has expired. Please start a new checkout.');
          } else {
            setError('Invalid checkout session. Please start a new checkout.');
          }
          
          // Redirect after appropriate time
          setTimeout(() => {
            if (errorData.reason === 'already_used') {
              router.push('/dashboard');
            } else {
              router.push('/add');
            }
          }, errorData.reason === 'already_used' ? 2500 : 3000);
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
    // Defensive: Only allow 2-letter codes for state and country
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
          if (data.verified) {
            setEmailStatus('exists');
          } else {
            setEmailStatus('unverified');
          }
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
    // If user is logged in, only need billing info + terms agreement
    if (currentUser) {
      return billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             billingData.state && 
             billingData.zip &&
             termsAgreed;
    }
    
    // If not logged in, need account info + billing info + terms agreement
    if (isLoginMode) {
      // Login mode - need email and password
      return formData.email && 
             formData.password &&
             billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             billingData.state && 
             billingData.zip &&
             termsAgreed;
    } else {
      // Signup mode - need all account fields + billing + terms agreement + no field errors
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
    if (!billingData.state) return 'state';
    if (!billingData.zip) return 'zip';
    
    // Terms agreement validation
    if (!termsAgreed) return 'termsAgreed';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    // Check if form is valid
    if (!isFormValid()) {
      const firstMissingField = getFirstMissingField();
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
        } else {
          errorMessage = 'Please complete your billing information before continuing.';
        }
      }
      
      setFormError(errorMessage);
      setIsLoading(false);
      return;
    }

    // Process payment directly
    await handlePaymentSubmit();
  };

  // Check if user is already logged in
  useEffect(() => {
    console.log('🔐 CHECKOUT: Starting authentication check...');
    
    const checkUser = async () => {
      try {
        console.log('🔐 CHECKOUT: About to call supabase.auth.getUser()');
        
        // Try multiple methods to get the user
        let user: any = null;
        let authMethod = 'none';
        
        // Method 1: getUser()
        try {
          const { data: { user: userData }, error } = await supabase.auth.getUser();
          if (userData && !error) {
            user = userData;
            authMethod = 'getUser';
          } else if (error) {
            console.log('🔐 CHECKOUT: getUser() failed:', error.message);
          }
        } catch (err) {
          console.log('🔐 CHECKOUT: getUser() exception:', err);
        }
        
        // Method 2: getSession() fallback
        if (!user) {
          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (session?.user && !sessionError) {
              user = session.user;
              authMethod = 'getSession';
            } else if (sessionError) {
              console.log('🔐 CHECKOUT: getSession() failed:', sessionError.message);
            }
          } catch (err) {
            console.log('🔐 CHECKOUT: getSession() exception:', err);
          }
        }
        
        // Method 3: Server-side auth check as final fallback
        if (!user) {
          try {
            const response = await fetch('/api/test-auth', {
              method: 'GET',
              credentials: 'include'
            });
            const authData = await response.json();
            if (authData.authenticated && authData.user) {
              user = authData.user;
              authMethod = 'serverCheck';
            } else {
              console.log('🔐 CHECKOUT: Server auth check failed:', authData.error);
            }
          } catch (err) {
            console.log('🔐 CHECKOUT: Server auth check exception:', err);
          }
        }
        
        console.log('🔐 CHECKOUT: Final auth result:', {
          hasUser: !!user,
          email: user?.email || 'none',
          method: authMethod
        });
        
        setCurrentUser(user);
        
        // Fetch artist profile if user is authenticated
        if (user?.id) {
          fetchArtistProfile(user);
        }
        
        // If user is found, also update the form email field
        if (user?.email) {
          console.log('🔐 CHECKOUT: Pre-filling email field with user email:', user.email);
          setFormData(prev => ({
            ...prev,
            email: user.email || ''
          }));
        }
      } catch (err) {
        console.error('🔐 CHECKOUT: Exception in checkUser:', err);
        setCurrentUser(null);
      }
    };
    
    checkUser();

    // Listen for auth changes to ensure we detect login/logout events
    console.log('🔐 CHECKOUT: Setting up onAuthStateChange listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 CHECKOUT: Auth state changed:', event, 'User:', session?.user?.email || 'None');
        console.log('🔐 CHECKOUT: Full session object:', session);
        setCurrentUser(session?.user ?? null);
        
        // Fetch artist profile if user is authenticated
        if (session?.user?.id) {
          fetchArtistProfile(session.user);
        }
        
        // Update email field when user logs in
        if (session?.user?.email) {
          console.log('🔐 CHECKOUT: Auth change - updating email field:', session.user.email);
          setFormData(prev => ({
            ...prev,
            email: session.user.email || ''
          }));
        }
      }
    );

    return () => {
      console.log('🔐 CHECKOUT: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Fetch artist profile when user changes
  useEffect(() => {
    if (currentUser) {
      fetchArtistProfile();
    } else {
      setArtistProfile(null);
    }
  }, [currentUser]);

  // Listen for iframe communication messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('🎯 PARENT PAGE: Received message from iframe:', event);
      console.log('🎯 PARENT PAGE: Message origin:', event.origin);
      console.log('🎯 PARENT PAGE: Message data:', event.data);
      // TEMP: Remove origin check for debugging
      // const allowedOrigins = [
      //   'https://fasho-landing.vercel.app',
      //   window.location.origin
      // ];
      // if (!allowedOrigins.includes(event.origin)) {
      //   console.log('🚫 PARENT PAGE: Message origin not allowed. Expected one of:', allowedOrigins, 'Got:', event.origin);
      //   return;
      // }
      // console.log('✅ PARENT PAGE: Message origin check passed. Origin:', event.origin);
      const data = event.data;
      console.log('🎯 PARENT PAGE: Processing message type:', data?.type, '| typeof:', typeof data, '| Full data:', data);
      switch (data.type) {
        case 'PAYMENT_COMPLETE':
          console.log('🚀 PARENT PAGE: Payment completed, processing response:', data.response);
          // Use ref to always get latest function
          const response = data.response;
          console.log('🔍 PAYMENT: Iframe response received:', response);

          if (!response || typeof response !== 'object') {
            console.error('🔍 PAYMENT: Invalid response format');
            setError('No payment response received. Please try again.');
            setIsLoading(false);
            setShowPaymentForm(false);
            return;
          }

          console.log('🔍 PAYMENT: Response code:', response.responseCode);
          console.log('🔍 PAYMENT: Response reason:', response.responseReasonText);

          if (response.responseCode === '1') {
            // Transaction successful
            console.log('🔍 PAYMENT: Transaction approved');
            handleSuccessfulPaymentRef.current(response);
          } else {
            // Transaction failed - provide more specific error messages
            console.error('🔍 PAYMENT: Transaction failed with code:', response.responseCode);
            let errorMessage = 'Payment failed. Please try again.';
            
            // Provide specific error messages based on response code
            if (response.responseCode === '2') {
              errorMessage = 'Payment was declined. Please check your card details and try again.';
            } else if (response.responseCode === '3') {
              errorMessage = 'Payment error occurred. Please verify your card information and try again.';
            } else if (response.responseCode === '4') {
              errorMessage = 'Payment is being reviewed. You will receive an email confirmation shortly.';
            } else if (response.responseReasonText) {
              // Use the specific reason text if available
              errorMessage = `Payment failed: ${response.responseReasonText}`;
            }
            
            setError(errorMessage);
            setIsLoading(false);
            setShowPaymentForm(false);
          }
          break;
        case 'PAYMENT_CANCELLED':
          console.log('❌ PARENT PAGE: Payment was cancelled');
          setError('Payment was cancelled');
          setIsLoading(false);
          setShowPaymentForm(false);
          break;
        case 'PAYMENT_SUCCESS':
          console.log('✅ PARENT PAGE: Payment success event received');
          // Handle successful save if needed
          break;
        case 'RESIZE_IFRAME':
          console.log('📏 PARENT PAGE: Resize iframe request:', data.width, 'x', data.height);
          // Resize iframe if needed
          const iframe = document.getElementById('paymentIframe') as HTMLIFrameElement;
          if (iframe && data.width && data.height) {
            iframe.style.width = data.width + 'px';
            iframe.style.height = data.height + 'px';
          }
          break;
        case 'IFRAME_LOADED':
          console.log('🔧 PARENT PAGE: Iframe communicator loaded successfully:', data.message);
          break;
        default:
          console.log('❓ PARENT PAGE: Unknown message type:', data.type, '| Full data:', data);
      }
    };

    // Add a global message listener to catch ALL messages for debugging
    const debugMessageHandler = (event: MessageEvent) => {
      console.log('🔍 DEBUG: ANY message received:', {
        origin: event.origin,
        data: event.data,
        source: event.source,
        type: typeof event.data
      });
    };
    
    window.addEventListener('message', handleMessage);
    window.addEventListener('message', debugMessageHandler);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('message', debugMessageHandler);
    };
  }, []);

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
        
        if (authError) {
          console.error('🚨 CHECKOUT: Error creating account after payment:', authError);
          console.error('🚨 CHECKOUT: Auth error details:', JSON.stringify(authError, null, 2));
          // Don't fail the entire checkout if account creation fails - payment was successful
        } else {
          console.log('✅ CHECKOUT: Account created successfully after payment');
          console.log('✅ CHECKOUT: New user data:', {
            userId: authData.user?.id,
            email: authData.user?.email,
            emailConfirmed: authData.user?.email_confirmed_at
          });
          newAccountCreated = true;
          userId = authData.user?.id || null;
        }
      } else {
        console.log('✅ CHECKOUT: User already authenticated, using existing account:', {
          userId: currentUser.id,
          email: currentUser.email
        });
      }
      
      // Create order in database
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
        return;
      }

      console.log('🚀 CHECKOUT: Order created successfully:', orderResult.order);
      
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
      };
      console.log('🚀 CHECKOUT: Storing completedOrder in sessionStorage:', orderData);
      sessionStorage.setItem('completedOrder', JSON.stringify(orderData));
      
      // Clean up pending order and add-ons
      sessionStorage.removeItem('pendingOrder');
      localStorage.removeItem('selectedAddOns');
      
      console.log('🚀 CHECKOUT: completedOrder stored, redirecting to thank-you with order number');
      // Redirect to thank you page with order number for persistence
      router.push(`/thank-you?order=${orderResult.order.orderNumber}`);
    } catch (error) {
      console.error('Error processing successful payment:', error);
      setError('Payment was successful but there was an error processing your order. Please contact support.');
    }
  };

  // Payment form submission function
  const submitTokenToIframe = () => {
    if (!paymentToken) {
      console.error('No payment token available');
      return;
    }
    
    console.log('Submitting token to iframe:', paymentToken.substring(0, 20) + '...');
    
    const form = document.getElementById('paymentIframeForm') as HTMLFormElement;
    if (form) {
      console.log('Submitting form to iframe');
      form.submit();
      
      // Hide loading overlay after form submission
      setTimeout(() => {
        const loader = document.getElementById('iframeLoader');
        if (loader) {
          loader.style.display = 'none';
        }
      }, 3000);
    } else {
      console.error('Payment iframe form not found');
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
      console.log('Payment token response:', data);

      if (!data.success) {
        console.error('Payment token generation failed:', data);
        console.error('Debug info:', data.debug);
        setFormError(data.message || 'Payment setup failed');
        return;
      }

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
          }
        }
      } else {
        console.log('✅ CHECKOUT: User already authenticated, skipping account creation:', {
          userId: currentUser.id,
          email: currentUser.email
        });
      }

      // Show payment iframe with the token
      setPaymentToken(data.token);
      setPaymentFormUrl(data.paymentFormUrl);
      setShowPaymentForm(true);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      setFormError(error instanceof Error ? error.message : 'Payment processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  useEffect(() => {
    // Global debug listener for ALL messages
    const globalDebugListener = (event: MessageEvent) => {
      console.log('GLOBAL DEBUG: Parent received message:', event);
    };
    window.addEventListener('message', globalDebugListener);
    return () => {
      window.removeEventListener('message', globalDebugListener);
    };
  }, []);

  const handleSuccessfulPaymentRef = useRef(handleSuccessfulPayment);
  useEffect(() => {
    handleSuccessfulPaymentRef.current = handleSuccessfulPayment;
  }, [handleSuccessfulPayment]);

  // Auto-submit the payment form when token is available
  useEffect(() => {
    if (paymentToken && showPaymentForm) {
      console.log('Auto-submitting payment form with token');
      setTimeout(() => {
        submitTokenToIframe();
      }, 500); // Small delay to ensure iframe is ready
    }
  }, [paymentToken, showPaymentForm]);

  if (!router.isReady || (orderItems.length === 0 && !error)) {
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
        <Header />
        
        <main className="min-h-screen relative text-white pt-20 pb-12">
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

  return (
    <>
      <Head>
        <title>Checkout - FASHO</title>
        <meta name="description" content="Complete your music promotion order" />
      </Head>
      <Header />
      
      <main className="min-h-screen relative text-white pt-20 pb-12">
        {/* Background layers */}
        <div className="fixed inset-0 bg-black z-0"></div>
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20 z-10"
          style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
        ></div>
        
        <div className="relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
                          <h1 className="text-3xl md:text-4xl font-bold mb-2 mt-2 sm:mt-[10px] bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Complete Your Order</h1>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Account & Payment */}
              <div className="space-y-6">
                {/* Account Details or Signed In Status */}
                {currentUser ? (
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
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
                ) : (
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
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
                          setResendError(null);
                          setResendLoading(false);
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
                          onBlur={(e) => !isLoginMode && checkEmailExists(e.target.value)}
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
                        {emailStatus === 'unverified' && !loginInfoMessage && (
                          <div className="text-red-400 flex flex-col gap-2">
                            <span>You have an account but haven't verified your email yet!</span>
                            <button
                              type="button"
                              disabled={resendLoading}
                              onClick={async () => {
                                setResendLoading(true);
                                setResendError(null);
                                try {
                                  const { error } = await supabase.auth.resend({
                                    type: 'signup',
                                    email: formData.email,
                                  });
                                  if (!error) {
                                    setLoginInfoMessage('Verification Email sent!');
                                    setIsLoginMode(true);
                                    setResendError(null);
                                    setEmailStatus(null);
                                  } else {
                                    setResendError(error.message || 'Failed to resend verification email. Please try again.');
                                  }
                                } catch (error: any) {
                                  setResendError(error?.message || 'Failed to resend verification email. Please try again.');
                                } finally {
                                  setResendLoading(false);
                                }
                              }}
                              className="text-[#59e3a5] hover:text-[#14c0ff] underline transition-colors w-fit disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {resendLoading ? 'Sending...' : 'Resend Verification'}
                            </button>
                            {resendError && <span className="text-red-400 text-xs mt-1">{resendError}</span>}
                          </div>
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
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          onBlur={(e) => !isLoginMode && handleFieldBlur('password', e.target.value)}
                          required
                          className={`w-full bg-white/10 border rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none transition-colors ${
                            fieldErrors.password ? 'border-red-500' : 'border-white/20 focus:border-[#59e3a5]'
                          }`}
                          placeholder={isLoginMode ? 'Enter your password' : 'Create a password'}
                        />
                        {fieldErrors.password && !isLoginMode && (
                          <p className="text-red-400 text-sm mt-1">{fieldErrors.password}</p>
                        )}
                      </div>
                      
                      {!isLoginMode && (
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm text-white/70 mb-2">
                            Confirm Password <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                            required
                            className={`w-full bg-white/10 border rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none transition-colors ${
                              fieldErrors.confirmPassword ? 'border-red-500' : 'border-white/20 focus:border-[#59e3a5]'
                            }`}
                            placeholder="Confirm your password"
                          />
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
                )}

                {/* Billing Information */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h2 className="text-lg font-semibold mb-2">Billing Information</h2>
                  <p className="text-sm text-white/60 mb-6">
                    Enter your billing address for payment verification.
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
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
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
                          className="absolute -top-1 -right-1 bg-blue-500/50 hover:bg-blue-600/70 text-white text-xs px-2 py-1 rounded-full transition-colors shadow-lg border-2 border-white/50 z-20 text-xs"
                          title="Change this song"
                          style={{ fontSize: '10px' }}
                        >
                          Change Song
                        </button>
                        
                        <div className="relative">
                          <Image
                            src={item.track.imageUrl}
                            alt={item.track.title}
                            width={60}
                            height={60}
                            className="rounded-lg"
                            unoptimized
                          />
                          {item.isDiscounted && (
                            <div className="absolute -top-2 -right-2 bg-[#59e3a5] text-black text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                              25% OFF
                            </div>
                          )}
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
                      <div key={`addon-${index}`} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg relative">
                        {/* Remove Add-on Button */}
                        <button
                          onClick={() => removeAddOn(item.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/50 hover:bg-red-600/70 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-20 border-2 border-white/50"
                          title="Remove add-on"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        
                        <div className="relative">
                          <div className="w-[60px] h-[60px] bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center text-2xl border border-white/10">
                            {item.emoji}
                          </div>
                          {item.isOnSale && (
                            <div className="absolute -top-2 -right-2 bg-[#59e3a5] text-black text-xs font-bold px-2 py-1 rounded-full">
                              SALE
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{item.name.replace(/ \(.*\)/, '')}</h3>
                          <p className="text-white/60 text-sm">Add-on Service</p>
                          <p className="text-[#59e3a5] text-sm font-medium">Premium Add-on</p>
                          <p className="text-white/50 text-xs">Enhanced promotion package</p>
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

                {/* Price Summary */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/70">Subtotal</span>
                      <span>${subtotal}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex justify-between text-[#59e3a5]">
                        <span>Multi-song discount (25% off)</span>
                        <span>-${discount}</span>
                      </div>
                    )}
                    
                    {appliedCoupon && (
                      <div className="flex justify-between text-[#59e3a5]">
                        <span>Coupon discount ({appliedCoupon.code})</span>
                        <span>-${appliedCoupon.calculated_discount.toFixed(2)}</span>
                      </div>
                    )}

                    
                    <div className="border-t border-white/20 pt-3">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span className="text-[#59e3a5]">${total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popular Add-ons */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold mb-4">Popular add-ons 🔥</h3>
                  
                  <div className="space-y-4">
                    <div className="border border-pink-500/50 rounded-lg p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-pink-400">Promote on Apple Music (50% OFF)</h4>
                          <div className="text-sm text-white/70">
                            <p>🔴 Get added to an Apple Music playlist</p>
                            <p>🎵 Apple Music add-on reduced if not placed in 7 days</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleAddOn('apple-music')}
                          className={`p-2 rounded-lg transition-colors ${
                            selectedAddOns.has('apple-music') 
                              ? 'bg-[#59e3a5] text-black hover:bg-[#4bc995]' 
                              : 'bg-white/20 hover:bg-white/30 text-white'
                          }`}
                        >
                          {selectedAddOns.has('apple-music') ? (
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
                      <div className="flex items-center space-x-2">
                        <span className="text-white/50 line-through">$94</span>
                        <span className="font-bold text-pink-400">$47</span>
                      </div>
                    </div>


                  </div>
                </div>
              </div>
            </div>

            {/* Full-Width Payment Section */}
            <div className="mt-8">
              <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                
                {!showPaymentForm ? (
                  // Account validation form (before payment)
                  <div className="max-w-md mx-auto">
                    <form onSubmit={isLoginMode ? handleLogin : handleSubmit} className="space-y-4">
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
                          className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Processing...' : `Continue to Payment · $${total}`}
                        </button>
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
                      action={paymentFormUrl || "https://test.authorize.net/payment/payment"} 
                      target="paymentIframe" 
                      style={{ display: 'none' }}
                    >
                      <input type="hidden" name="token" value={paymentToken || ''} />
                    </form>
                    
                    {/* Payment iframe container - Adjusted size: 85% width, 475px height */}
                    <div className="payment-iframe-container relative w-[85%] bg-white/[0.02] rounded-xl overflow-hidden mx-auto">
                      <iframe 
                        name="paymentIframe" 
                        id="paymentIframe"
                        src="about:blank"
                        width="100%" 
                        height="475px"
                        frameBorder="0" 
                        scrolling="auto"
                        onLoad={(e) => {
                          console.log('Iframe loaded');
                          const iframe = e.target as HTMLIFrameElement;
                          try {
                            console.log('Iframe URL:', iframe.contentWindow?.location.href);
                          } catch (err) {
                            console.log('Cannot access iframe URL (cross-origin)');
                          }
                          
                          // Hide the loading overlay
                          const loader = document.getElementById('iframeLoader');
                          if (loader) {
                            loader.style.display = 'none';
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
                        }}
                        className="text-white/60 hover:text-white text-sm transition-colors"
                      >
                        ← Back to checkout
                      </button>
                      
                      {/* Debug button - remove in production */}
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Manual submit triggered');
                          submitTokenToIframe();
                        }}
                        className="text-[#59e3a5] hover:text-[#14c0ff] text-sm transition-colors"
                      >
                        🔄 Reload Payment Form
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 text-center text-sm text-white/60">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">VISA</div>
                      <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">MC</div>
                      <div className="w-8 h-5 bg-blue-800 rounded text-white text-xs flex items-center justify-center font-bold">AMEX</div>
                      <div className="w-8 h-5 bg-orange-600 rounded text-white text-xs flex items-center justify-center font-bold">DISC</div>
                    </div>
                  </div>
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
    </>
  );
} 