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
  const [paymentFormToken, setPaymentFormToken] = useState<string>('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  // Calculate discounted price (25% off, rounded up)
  const getDiscountedPrice = (originalPrice: number) => {
    const discounted = originalPrice * 0.75; // 25% off
    return Math.ceil(discounted); // Round up
  };

  // Initialize data from URL params
  useEffect(() => {
    if (!router.isReady) return;
    
    if (tracksParam && selectedPackagesParam && typeof tracksParam === 'string' && typeof selectedPackagesParam === 'string') {
      try {
        const parsedTracks = JSON.parse(tracksParam) as Track[];
        const parsedPackages = JSON.parse(selectedPackagesParam) as {[key: number]: string};
        
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate form
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
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

    // Generate payment token and show payment form
    await generatePaymentToken();
    setIsLoading(false);
  };

  // Generate Authorize.net payment form token
  const generatePaymentToken = async () => {
    try {
      const response = await fetch('/api/generate-payment-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          orderItems: orderItems.map(item => ({
            name: `${item.package.name} - ${item.track.title}`,
            price: item.discountedPrice
          })),
          customerEmail: formData.email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate payment token');
      }

      const data = await response.json();
      setPaymentFormToken(data.token);
      setShowPaymentForm(true);
    } catch (error) {
      console.error('Error generating payment token:', error);
      setError('Failed to initialize payment form. Please try again.');
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
              {/* Left Column - Forms */}
              <div className="space-y-6">
                {/* Express Checkout */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h2 className="text-lg font-semibold mb-4 text-center">Express checkout</h2>
                  
                  <div className="space-y-3">
                    <button className="w-full bg-black text-white rounded-lg py-3 px-4 flex items-center justify-center space-x-2 border border-white/20 hover:bg-white/5 transition-colors">
                      <span className="text-xl">🍎</span>
                      <span className="font-medium">Pay</span>
                    </button>
                    
                    <button className="w-full bg-white text-black rounded-lg py-3 px-4 flex items-center justify-center space-x-2 hover:bg-gray-100 transition-colors">
                      <span className="text-xl">G</span>
                      <span className="font-medium">Pay</span>
                      <div className="flex items-center space-x-1 ml-2">
                        <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">VISA</div>
                        <span className="text-sm">•••• 5640</span>
                      </div>
                    </button>
                    
                    <button className="w-full bg-[#00d4aa] text-white rounded-lg py-3 px-4 flex items-center justify-center space-x-2 hover:bg-[#00c199] transition-colors">
                      <span className="font-medium">Pay with</span>
                      <span className="font-bold">⚡ link</span>
                    </button>
                  </div>
                  
                  <div className="text-center text-sm text-white/60 mt-4">
                    By using express checkout, we will use email address of that provider.
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="flex-1 border-t border-white/20"></div>
                  <div className="px-4 text-white/60 text-sm">OR</div>
                  <div className="flex-1 border-t border-white/20"></div>
                </div>

                {/* Contact Information */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <h2 className="text-lg font-semibold mb-4">Contact</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="email" className="block text-sm text-white/70 mb-2">
                          Email - We'll send you a receipt
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
                      
                      <p className="text-sm text-white/60">
                        Your subscription will be linked to this email.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="firstName" className="block text-sm text-white/70 mb-2">
                            First name
                          </label>
                          <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors autofill-override"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="lastName" className="block text-sm text-white/70 mb-2">
                            Last name
                          </label>
                          <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors autofill-override"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Creation */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <h2 className="text-lg font-semibold mb-4">Create Account (Optional)</h2>
                    <p className="text-sm text-white/60 mb-4">
                      Create an account to track your campaigns and access exclusive features.
                    </p>
                    
                    <div className="space-y-4">
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
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                          placeholder="Create a password (optional)"
                        />
                      </div>
                      
                      {formData.password && (
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
                            className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                            placeholder="Confirm your password"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  {!showPaymentForm && (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Processing...' : 'Continue to Payment'}
                    </button>
                  )}
                </form>

                {/* Authorize.net Payment Form */}
                {showPaymentForm && paymentFormToken && (
                  <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                    <h2 className="text-lg font-semibold mb-4">Payment</h2>
                    <p className="text-sm text-white/60 mb-4">
                      All transactions are secure and encrypted.
                    </p>
                    
                    <div id="authorizeNetContainer">
                      {/* The Authorize.net Accept Hosted form will be embedded here */}
                      <iframe
                        id="load_payment"
                        src={`https://test.authorize.net/payment/payment?token=${paymentFormToken}`}
                        width="100%"
                        height="500"
                        frameBorder="0"
                        scrolling="no"
                        className="rounded-lg"
                      ></iframe>
                    </div>
                  </div>
                )}
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