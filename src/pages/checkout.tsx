import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { Track } from '../types/track';
import Header from '../components/Header';
import { createClient } from '../utils/supabase/client';

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
    id: "starter",
    name: "Starter",
    price: 39,
    plays: "1k Plays",
    placements: "35 Playlist Placements",
    description: "Perfect for getting started"
  },
  {
    id: "advanced", 
    name: "Advanced",
    price: 89,
    plays: "5k Plays",
    placements: "75 Playlist Placements",
    description: "Great for growing artists"
  },
  {
    id: "diamond",
    name: "Diamond", 
    price: 249,
    plays: "15k Plays",
    placements: "115 Playlist Placements",
    description: "Professional promotion"
  },
  {
    id: "ultra",
    name: "Ultra",
    price: 499,
    plays: "50k Plays", 
    placements: "250 Playlist Placements",
    description: "Maximum exposure"
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

  // Update totals including add-ons
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
    const finalTotal = totalSubtotal - totalDiscount;
    
    setSubtotal(totalSubtotal);
    setDiscount(totalDiscount);
    setTotal(finalTotal);
  };

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
    // If user is logged in, only need billing info
    if (currentUser) {
      return billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             billingData.state && 
             billingData.zip;
    }
    
    // If not logged in, need account info + billing info
    if (isLoginMode) {
      // Login mode - need email and password
      return formData.email && 
             formData.password &&
             billingData.firstName && 
             billingData.lastName && 
             billingData.address && 
             billingData.city && 
             billingData.state && 
             billingData.zip;
    } else {
      // Signup mode - need all account fields + billing + no field errors
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
          element.focus();
        }
        
        // Customize error message based on missing field
        if (['email', 'password', 'confirmPassword'].includes(firstMissingField)) {
          errorMessage = 'Please complete your account information before continuing.';
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

      await supabase.auth.signOut();
      
      // Refresh page to show logged out state
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle payment form submission

  // Handle successful payment response
  const handleSuccessfulPayment = async (response: any) => {
    try {
      console.log('🚀 CHECKOUT: handleSuccessfulPayment called with response:', response);
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
          console.error('Error creating account:', authError);
          // Don't fail the entire checkout if account creation fails
        } else {
          newAccountCreated = true;
          userId = authData.user?.id || null;
        }
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
        userId: userId
      };

      console.log('🚀 CHECKOUT: Creating order in database:', orderPayload);
      
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const orderResult = await orderResponse.json();

      if (!orderResult.success) {
        console.error('Error creating order:', orderResult.message);
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
        createdAt: new Date().toISOString(),
        paymentToken: data.token
      };

      // Store pending order data
      sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));
      
      // Create user account after successful payment token generation (only if not already signed in)
      if (!currentUser) {
        // First check if user already exists to prevent duplicate account creation
        const checkResponse = await fetch('/api/check-user-exists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });
        
        const checkData = await checkResponse.json();
        
        if (checkData.exists) {
          // User already exists, try to sign them in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          
          if (signInError) {
            // Password is wrong - show error and stop checkout
            setFormError('An account with this email already exists. Please use the correct password or sign in first.');
            return;
          }
          
          // Successfully signed in - continue with checkout
          console.log('User signed in successfully during checkout');
        } else {
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
            console.error('Error creating account:', authError);
            
            // Handle specific signup errors
            if (authError.message?.includes('User already registered')) {
              // This shouldn't happen since we checked, but handle it anyway
              setFormError('An account with this email already exists. Please sign in first.');
              return;
            } else {
              // Other signup errors - don't fail the entire checkout
              console.log('Account creation failed but continuing with checkout:', authError.message);
            }
          } else {
            // Account created successfully
            console.log('New account created successfully');
          }
        }
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
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Complete Your Order</h1>
              <p className="text-white/70">Secure checkout powered by Authorize.net</p>
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
                      <div className="w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center">
                        <span className="text-black font-bold text-lg">
                          {currentUser.email.substring(0, 2).toUpperCase()}
                        </span>
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

              {/* Trust indicators */}
              <div className="text-center text-sm text-white/60 mt-6">
                <p className="mb-2">🔒 Secure checkout powered by Authorize.net</p>
                <p>💳 All major credit cards accepted</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 