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

export default function CheckoutPage() {
  const router = useRouter();
  const { tracks: tracksParam, selectedPackages: selectedPackagesParam } = router.query;
  const supabase = createClient();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<{[key: number]: string}>({});
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string>('');

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
    country: 'US'
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

  // Initialize data from URL params or localStorage
  useEffect(() => {
    if (!router.isReady) return;
    
    let finalTracksParam = tracksParam;
    let finalSelectedPackagesParam = selectedPackagesParam;
    
    // Check if we have stored cart data from login/logout
    const storedCart = localStorage.getItem('checkoutCart');
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        finalTracksParam = parsedCart.tracks;
        finalSelectedPackagesParam = parsedCart.selectedPackages;
        localStorage.removeItem('checkoutCart'); // Clean up
      } catch (error) {
        console.error('Failed to parse stored cart:', error);
      }
    }
    
    if (finalTracksParam && finalSelectedPackagesParam && typeof finalTracksParam === 'string' && typeof finalSelectedPackagesParam === 'string') {
      try {
        const parsedTracks = JSON.parse(finalTracksParam) as Track[];
        const parsedPackages = JSON.parse(finalSelectedPackagesParam) as {[key: number]: string};
        
        setTracks(parsedTracks);
        setSelectedPackages(parsedPackages);
        
        // Build order items
        const items: OrderItem[] = [];
        let calculatedSubtotal = 0;
        let calculatedDiscount = 0;
        
        parsedTracks.forEach((track, index) => {
          const packageId = parsedPackages[index];
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
        console.error("Failed to parse checkout data:", error);
        router.push('/add');
      }
    } else {
      router.push('/add');
    }
  }, [router.isReady, tracksParam, selectedPackagesParam]);

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
  };

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBillingData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate form only if user is not already signed in and not in login mode
    if (!currentUser && !isLoginMode) {
      if (!formData.email || !billingData.firstName || !billingData.lastName || !billingData.address || !billingData.city || !billingData.state || !billingData.zip) {
        setError('Please fill in all required billing information fields');
        setIsLoading(false);
        return;
      }

      if (formData.password && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      if (formData.password && formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }

      if (formData.password && !validatePassword(formData.password)) {
        setError('Passwords require 1 Uppercase Letter and 1 Number');
        setIsLoading(false);
        return;
      }
    }

    // Validate billing information for all users
    if (!billingData.firstName || !billingData.lastName || !billingData.address || !billingData.city || !billingData.state || !billingData.zip) {
      setError('Please fill in all required billing information fields');
      setIsLoading(false);
      return;
    }

    // Process payment directly
    await handlePaymentSubmit();
  };

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    checkUser();
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
          handleIframeMessage(data.response);
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

  // Check if email exists and user verification status
  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setIsCheckingEmail(true);
    setFieldErrors(prev => ({ ...prev, email: '' }));
    
    try {
      // Try to trigger a password reset to check if user exists
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      
      // If no error, user exists
      if (!error) {
        // Check if user is confirmed by attempting a sign in with a fake password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: 'fake-password-to-check-status'
        });
        
        if (signInError?.message?.includes('Invalid login credentials')) {
          // User exists and is verified (got invalid credentials error)
          setFieldErrors(prev => ({ 
            ...prev, 
            email: 'You already have an account with us! Please LOGIN instead' 
          }));
        } else if (signInError?.message?.includes('Email not confirmed')) {
          // User exists but not verified
          setFieldErrors(prev => ({ 
            ...prev, 
            email: 'You already have an account with us but haven\'t verified it yet! Resend Verification Email' 
          }));
        }
      }
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Handle resending verification email
  const handleResendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });
      
      if (!error) {
        setFieldErrors(prev => ({ 
          ...prev, 
          email: 'Verification email sent! Please check your inbox.' 
        }));
      }
    } catch (error) {
      console.error('Error resending verification:', error);
    }
  };

  // Handle login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        // Generic error message for security
        setError('Login credentials do not match our records. Please check your email and password.');
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
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
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
  // Handle iframe communication from Authorize.net
  const handleIframeMessage = (response: any) => {
    console.log('Iframe response:', response);

    if (!response || typeof response !== 'object') {
      setError('No payment response received.');
      setIsLoading(false);
      setShowPaymentForm(false);
      return;
    }

    if (response.responseCode === '1') {
      // Transaction successful
      handleSuccessfulPayment(response);
    } else {
      // Transaction failed
      setError(`Payment failed: ${response.responseReasonText || 'Unknown error'}`);
      setIsLoading(false);
      setShowPaymentForm(false);
    }
  };

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
        }
      }
      
      // Store order data for thank you page using the pending order data
      const orderData = {
        items: pendingOrder.items,
        subtotal: pendingOrder.subtotal,
        discount: pendingOrder.discount,
        total: pendingOrder.total,
        customerEmail: pendingOrder.customerEmail,
        customerName: pendingOrder.customerName,
        paymentData: {
          transactionId: response.transId,
          authorization: response.authorization,
          accountNumber: response.accountNumber,
          accountType: response.accountType,
        },
        createdAt: new Date().toISOString(),
      };
      console.log('🚀 CHECKOUT: Storing completedOrder in sessionStorage:', orderData);
      sessionStorage.setItem('completedOrder', JSON.stringify(orderData));
      
      // Clean up pending order
      sessionStorage.removeItem('pendingOrder');
      
      console.log('🚀 CHECKOUT: completedOrder stored, redirecting to thank-you');
      // Redirect to thank you page
      router.push('/thank-you');
    } catch (error) {
      console.error('Error processing successful payment:', error);
      setError('Payment was successful but there was an error processing your order. Please contact support.');
    }
  };

  // Submit token to iframe
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
      // Prepare order items for payment API
      const paymentOrderItems = orderItems.map(item => ({
        name: `${item.track.title} - ${item.package.name}`,
        price: item.discountedPrice
      }));

      // Generate payment token from Authorize.net
      const response = await fetch('/api/generate-payment-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          orderItems: paymentOrderItems,
          customerEmail: currentUser ? currentUser.email : formData.email,
          billingInfo: billingData
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Payment setup failed');
      }

      // Store order data for after payment completion
      const orderData = {
        items: orderItems,
        subtotal,
        discount,
        total,
        customerEmail: currentUser ? currentUser.email : formData.email,
        customerName: currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : `${billingData.firstName} ${billingData.lastName}`,
        billingInfo: billingData,
        createdAt: new Date().toISOString(),
        paymentToken: data.token
      };

      // Store pending order data
      sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));
      
      // Create user account after successful payment token generation (only if not already signed in)
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
        }
      }

      // Show payment iframe with the token
      setPaymentToken(data.token);
      setShowPaymentForm(true);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      setError(error instanceof Error ? error.message : 'Payment processing failed. Please try again.');
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

  if (!router.isReady || orderItems.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout – Fasho.co</title>
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
                          setFieldErrors({});
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
                        {/* Email validation feedback */}
                        {fieldErrors.email && (
                          <div className="mt-2 text-sm">
                            {fieldErrors.email.includes('LOGIN instead') ? (
                              <p className="text-red-400">
                                You already have an account with us! Please{' '}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsLoginMode(true);
                                    setFieldErrors(prev => ({ ...prev, email: '' }));
                                  }}
                                  className="text-[#59e3a5] hover:text-[#14c0ff] underline transition-colors"
                                >
                                  LOGIN
                                </button>{' '}
                                instead
                              </p>
                            ) : fieldErrors.email.includes('Resend Verification Email') ? (
                              <p className="text-red-400">
                                You already have an account with us but haven't verified it yet!{' '}
                                <button
                                  type="button"
                                  onClick={handleResendVerification}
                                  className="text-[#59e3a5] hover:text-[#14c0ff] underline transition-colors"
                                >
                                  Resend Verification Email
                                </button>
                              </p>
                            ) : (
                              <p className="text-green-400">{fieldErrors.email}</p>
                            )}
                          </div>
                        )}
                        {isCheckingEmail && (
                          <div className="mt-2 text-sm text-white/60 flex items-center">
                            <div className="w-4 h-4 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mr-2"></div>
                            Checking email...
                          </div>
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
                  
                  <div className="space-y-4">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
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
                            <div className="absolute -top-2 -right-2 bg-[#59e3a5] text-black text-xs font-bold px-2 py-1 rounded-full">
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

                {/* Payment Form */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h2 className="text-lg font-semibold mb-4">Payment</h2>
                  <p className="text-sm text-white/60 mb-6">
                    All transactions are secure and encrypted.
                  </p>
                  
                  {!showPaymentForm ? (
                    // Account validation form (before payment)
                    <form onSubmit={isLoginMode ? handleLogin : handleSubmit} className="space-y-4">
                      {/* Error Message */}
                      {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                          <p className="text-red-400 text-sm">{error}</p>
                        </div>
                      )}
                      
                      <div className="border-t border-white/20 pt-6">
                        <p className="text-sm text-white/60 mb-4">
                          By providing your card information, you allow Boost Collective Inc. to charge
                          your card for future payments in accordance with their terms.
                        </p>
                        
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Processing...' : `Continue to Payment · $${total}`}
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Authorize.net iframe payment form
                    <div>
                      <div className="mb-4">
                        <p className="text-sm text-white/60">
                          Enter your payment details below. Your information is secure and encrypted.
                        </p>
                      </div>
                      
                      {/* Hidden form to submit token to iframe */}
                      <form 
                        id="paymentIframeForm" 
                        method="post" 
                        action="https://test.authorize.net/payment/payment" 
                        target="paymentIframe" 
                        style={{ display: 'none' }}
                      >
                        <input type="hidden" name="token" value={paymentToken || ''} />
                      </form>
                      
                      {/* Payment iframe container */}
                      <div className="payment-iframe-container relative">
                        <iframe 
                          name="paymentIframe" 
                          id="paymentIframe"
                          src="about:blank"
                          width="100%" 
                          height="600px"
                          frameBorder="0" 
                          scrolling="no"
                          onLoad={(e) => {
                            console.log('Iframe loaded');
                            const iframe = e.target as HTMLIFrameElement;
                            try {
                              console.log('Iframe URL:', iframe.contentWindow?.location.href);
                            } catch (err) {
                              console.log('Cannot access iframe URL (cross-origin)');
                            }
                          }}
                          className="rounded-lg border border-white/20"
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
                        <button className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white/50 line-through">$94</span>
                        <span className="font-bold text-pink-400">$47</span>
                      </div>
                    </div>

                    <div className="border border-purple-500/50 rounded-lg p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-purple-400">Campaign upgrade (80% OFF)</h4>
                          <div className="text-sm text-white/70">
                            <p>✅ Pitch to 2x more playlists ($150 value)</p>
                            <p>✅ Stay on playlists 2x longer ($100 value)</p>
                            <p>✅ Priority placements in 24 hours</p>
                          </div>
                        </div>
                        <button className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white/50 line-through">$250</span>
                        <span className="font-bold text-purple-400">$49</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust indicators */}
                <div className="text-center text-sm text-white/60">
                  <p className="mb-2">🔒 Secure checkout powered by Authorize.net</p>
                  <p>💳 All major credit cards accepted</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 