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
    company: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phoneNumber: ''
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

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError(error.message);
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
  const handlePaymentSubmit = async () => {
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

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

      // Store order data for thank you page
      const orderData = {
        items: orderItems,
        subtotal,
        discount,
        total,
        customerEmail: currentUser ? currentUser.email : formData.email,
        customerName: currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : `${billingData.firstName} ${billingData.lastName}`,
        billingInfo: billingData,
        createdAt: new Date().toISOString()
      };

      sessionStorage.setItem('completedOrder', JSON.stringify(orderData));
      
      // Redirect to thank you page
      router.push('/thank-you');
      
    } catch (error) {
      console.error('Error processing payment:', error);
      setError('Payment processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
                          {isLoginMode ? 'Email' : 'Email - We\'ll send you a receipt'}
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
                      </div>
                      
                      <div>
                        <label htmlFor="password" className="block text-sm text-white/70 mb-2">
                          Password
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
                            Confirm Password
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
                      <label htmlFor="company" className="block text-sm text-white/70 mb-2">
                        Company (Optional)
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={billingData.company}
                        onChange={handleBillingChange}
                        className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                        placeholder="Your company name"
                      />
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
                    
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm text-white/70 mb-2">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={billingData.phoneNumber}
                        onChange={handleBillingChange}
                        className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                        placeholder="(123) 456-7890"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Form */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h2 className="text-lg font-semibold mb-4">Payment</h2>
                  <p className="text-sm text-white/60 mb-6">
                    All transactions are secure and encrypted.
                  </p>
                  
                  <form onSubmit={isLoginMode ? handleLogin : handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label htmlFor="cardNumber" className="block text-sm text-white/70 mb-2">
                          Card number
                        </label>
                        <input
                          type="text"
                          id="cardNumber"
                          name="cardNumber"
                          placeholder="1234 1234 1234 1234"
                          maxLength={19}
                          onChange={(e) => e.target.value = formatCardNumber(e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="expiryDate" className="block text-sm text-white/70 mb-2">
                            Expiration date
                          </label>
                          <input
                            type="text"
                            id="expiryDate"
                            name="expiryDate"
                            placeholder="MM / YY"
                            maxLength={7}
                            onChange={(e) => e.target.value = formatExpiryDate(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="securityCode" className="block text-sm text-white/70 mb-2">
                            Security code
                          </label>
                          <input
                            type="text"
                            id="securityCode"
                            name="securityCode"
                            placeholder="CVC"
                            maxLength={4}
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="country" className="block text-sm text-white/70 mb-2">
                            Country
                          </label>
                          <select
                            id="country"
                            name="country"
                            defaultValue="United States"
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                          >
                            <option value="United States">United States</option>
                            <option value="Canada">Canada</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Australia">Australia</option>
                          </select>
                        </div>
                        
                        <div>
                          <label htmlFor="zipCode" className="block text-sm text-white/70 mb-2">
                            ZIP code
                          </label>
                          <input
                            type="text"
                            id="zipCode"
                            name="zipCode"
                            placeholder="12345"
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}
                    
                    <div className="border-t border-white/20 pt-6 mt-6">
                      <p className="text-sm text-white/60 mb-4">
                        By providing your card information, you allow Boost Collective Inc. to charge
                        your card for future payments in accordance with their terms.
                      </p>
                      
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Processing...' : `Complete Checkout · $${total}`}
                      </button>
                    </div>
                  </form>
                  
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