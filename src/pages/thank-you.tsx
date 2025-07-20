import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Lottie from 'lottie-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import IntakeFormModal from '../components/IntakeFormModal';
import * as gtag from '../utils/gtag';

interface OrderItem {
  track: {
    id: string;
    title: string;
    artist: string;
    imageUrl: string;
    url: string;
  };
  package: {
    id: string;
    name: string;
    price: number;
    plays: string;
    placements: string;
    description: string;
  };
  originalPrice: number;
  discountedPrice: number;
  isDiscounted: boolean;
}

interface AddOnOrderItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  originalPrice: number;
  isOnSale: boolean;
}

interface OrderData {
  items: OrderItem[];
  addOnItems?: AddOnOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  customerEmail: string;
  customerName: string;
  newAccountCreated?: boolean;
  orderNumber?: string;
  orderId?: string;
  paymentData?: any;
  createdAt: string;
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
}

// Function to track purchase event for Google Ads
const trackPurchaseEvent = (orderData: OrderData) => {
  if (!orderData) return;

  try {
    // Prepare tracking data - ensure no Spotify data is sent
    const trackingItems = orderData.items.map((item, index) => ({
      id: `${item.track.id}_${item.package.id}`,
      packageName: item.package.name,
      price: item.isDiscounted ? item.discountedPrice : item.originalPrice,
      quantity: 1
    }));

    // Add addon items if they exist
    if (orderData.addOnItems && orderData.addOnItems.length > 0) {
      orderData.addOnItems.forEach(addon => {
        trackingItems.push({
          id: addon.id,
          packageName: addon.name,
          price: addon.price,
          quantity: 1
        });
      });
    }

    // Track the purchase
    gtag.trackPurchase({
      orderId: orderData.orderNumber || orderData.orderId || `order_${Date.now()}`,
      totalAmount: orderData.total,
      items: trackingItems
    });

    console.log('🎯 GOOGLE ADS: Purchase tracked successfully', {
      orderId: orderData.orderNumber || orderData.orderId,
      total: orderData.total,
      itemCount: trackingItems.length
    });
  } catch (error) {
    console.error('🎯 GOOGLE ADS: Error tracking purchase:', error);
  }
};

export default function ThankYouPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confettiAnimationData, setConfettiAnimationData] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [checkingIntakeStatus, setCheckingIntakeStatus] = useState(true);

  useEffect(() => {
    const loadOrderData = async () => {
      if (!router.isReady) return;

      const { order: orderNumber } = router.query;

      console.log('🔍 THANK YOU PAGE: Router ready, checking for order data...');
      console.log('🔍 THANK YOU PAGE: Order number from URL:', orderNumber);

      // Try URL parameter first (new persistent method)
      if (orderNumber && typeof orderNumber === 'string') {
        try {
          console.log('🔍 THANK YOU PAGE: Fetching order details from API for:', orderNumber);
          
          const response = await fetch(`/api/get-order-details?orderNumber=${encodeURIComponent(orderNumber)}`);
          const data = await response.json();

          if (response.ok && data.success) {
            console.log('🔍 THANK YOU PAGE: Order details loaded from API:', data.orderDetails);
            
            // Transform API response to match expected format
            const apiOrderData: OrderData = {
              items: data.orderDetails.items,
              addOnItems: data.orderDetails.addOnItems,
              subtotal: data.orderDetails.subtotal,
              discount: data.orderDetails.discount,
              total: data.orderDetails.total,
              customerEmail: data.orderDetails.customerEmail,
              customerName: data.orderDetails.customerName,
              orderNumber: data.orderDetails.orderNumber,
              orderId: data.orderDetails.id,
              createdAt: data.orderDetails.createdAt,
              couponId: data.orderDetails.couponId,
              couponCode: data.orderDetails.couponCode,
              couponDiscount: data.orderDetails.couponDiscount,
              newAccountCreated: false // We can't determine this from the API, but it's not critical for display
            };

            setOrderData(apiOrderData);
            setTimeRemaining(data.timeRemaining || 0);
            
            // Track purchase for Google Ads
            trackPurchaseEvent(apiOrderData);
            
            setIsLoading(false);
            return;
          } else if (response.status === 410 || data.expired) {
            console.log('🔍 THANK YOU PAGE: Order has expired (> 10 minutes)');
            setError('This thank you page has expired. Order details are only available for 10 minutes after completion.');
            setIsLoading(false);
            return;
          } else if (response.status === 404) {
            console.log('🔍 THANK YOU PAGE: Order not found via API');
            setError('Order not found. Please check your order number or contact support.');
            setIsLoading(false);
            return;
          } else {
            console.error('🔍 THANK YOU PAGE: API error:', data);
            // Fall through to sessionStorage check
          }
        } catch (error) {
          console.error('🔍 THANK YOU PAGE: Error fetching order details:', error);
          // Fall through to sessionStorage check
        }
      }

      // Fallback to sessionStorage (legacy method for immediate redirects)
      console.log('🔍 THANK YOU PAGE: Checking sessionStorage for order data...');
      
      // Check for completed order first
      let storedOrder = sessionStorage.getItem('completedOrder');
      console.log('🔍 THANK YOU PAGE: completedOrder from sessionStorage:', storedOrder);
      
      // If no completed order, check for pending order (from Authorize.net redirect)
      if (!storedOrder) {
        const pendingOrder = sessionStorage.getItem('pendingOrder');
        console.log('🔍 THANK YOU PAGE: pendingOrder from sessionStorage:', pendingOrder);
        if (pendingOrder) {
          // Move pending order to completed order
          sessionStorage.setItem('completedOrder', pendingOrder);
          sessionStorage.removeItem('pendingOrder');
          storedOrder = pendingOrder;
        }
      }
      
      if (storedOrder) {
        try {
          const parsedOrder = JSON.parse(storedOrder) as OrderData;
          console.log('🔍 THANK YOU PAGE: Parsed order data from sessionStorage:', parsedOrder);
          setOrderData(parsedOrder);
          
          // Track purchase for Google Ads
          trackPurchaseEvent(parsedOrder);
          
          // If we have an order number, update the URL for persistence
          if (parsedOrder.orderNumber) {
            console.log('🔍 THANK YOU PAGE: Updating URL with order number for persistence');
            router.replace(`/thank-you?order=${parsedOrder.orderNumber}`, undefined, { shallow: true });
          }
          
          // Clear the stored order data after using it
          sessionStorage.removeItem('completedOrder');
        } catch (error) {
          console.error('🔍 THANK YOU PAGE: Error parsing order data:', error);
          setError('Invalid order data. Please contact support.');
        }
      } else {
        console.log('🔍 THANK YOU PAGE: No order data found anywhere');
        setError('No order data found. Please check your order confirmation email or contact support.');
      }
      
      setIsLoading(false);
    };

    loadOrderData();
  }, [router.isReady, router.query]);

  // Load confetti animation data
  useEffect(() => {
    const loadConfettiAnimation = async () => {
      try {
        const response = await fetch('https://lottie.host/359e2bdd-246e-4994-b254-a73507f7e401/Q3QeSbbiMb.json');
        const animationData = await response.json();
        setConfettiAnimationData(animationData);
        console.log('🎉 CONFETTI: Animation data loaded successfully');
      } catch (error) {
        console.error('🎉 CONFETTI: Error loading animation data:', error);
      }
    };

    loadConfettiAnimation();
  }, []);

  // Check intake form status when order data is loaded
  useEffect(() => {
    const checkIntakeFormStatus = async () => {
      if (!orderData || isLoading) return;

      console.log('📋 THANK-YOU: Checking intake form status...');
      setCheckingIntakeStatus(true);

      try {
        const response = await fetch('/api/intake-form/check-status');
        const data = await response.json();

        if (response.ok && data.success) {
          console.log('📋 THANK-YOU: Intake form status:', { completed: data.completed });
          
          if (!data.completed) {
            console.log('📋 THANK-YOU: Showing intake form modal');
            setShowIntakeForm(true);
          } else {
            console.log('📋 THANK-YOU: User has already completed intake form');
          }
        } else {
          console.error('📋 THANK-YOU: Failed to check intake form status:', data);
          // Don't show the form if we can't check the status
        }
      } catch (error) {
        console.error('📋 THANK-YOU: Error checking intake form status:', error);
        // Don't show the form if there's an error
      } finally {
        setCheckingIntakeStatus(false);
      }
    };

    checkIntakeFormStatus();
  }, [orderData, isLoading]);

  // Trigger confetti animation when order data is loaded (only if no intake form needed)
  useEffect(() => {
    if (orderData && confettiAnimationData && !isLoading && !showIntakeForm && !checkingIntakeStatus) {
      console.log('🎉 CONFETTI: Triggering confetti animation (no intake form needed)');
      setShowConfetti(true);
      
      // Hide confetti after animation completes (approximately 5 seconds)
      const timer = setTimeout(() => {
        setShowConfetti(false);
        console.log('🎉 CONFETTI: Animation completed, hiding confetti');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [orderData, confettiAnimationData, isLoading, showIntakeForm, checkingIntakeStatus]);

  // Handle intake form completion
  const handleIntakeFormComplete = (responses: Record<string, any>) => {
    console.log('📋 THANK-YOU: Intake form completed:', responses);
    setShowIntakeForm(false);
    
    // Trigger confetti when form closes
    if (confettiAnimationData) {
      console.log('🎉 CONFETTI: Triggering confetti after form completion');
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Thank You – Fasho.co</title>
        </Head>
        <Header hideSignUp={true} />
        
        <main className="min-h-screen relative text-white pt-20 pb-12">
          {/* Background layers */}
          <div className="fixed inset-0 bg-black z-0"></div>
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20 z-10"
            style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
          ></div>
          
          <div className="relative z-40">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-bold mb-4">
                  {error.includes('expired') ? 'Thank You Page Expired' : 'Order Not Found'}
                </h1>
                
                <p className="text-white/70 mb-6 max-w-2xl mx-auto">{error}</p>
                
                {error.includes('expired') ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
                    <h3 className="text-yellow-400 font-semibold mb-2">⏰ What happened?</h3>
                    <p className="text-white/70 text-sm mb-4">
                      For security reasons, order thank you pages are only available for 10 minutes after completion.
                      Your order was successfully processed and you should have received a confirmation email.
                    </p>
                    <p className="text-white/70 text-sm">
                      You can view your order details anytime in your dashboard.
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
                    <h3 className="text-blue-400 font-semibold mb-2">💡 What to do next?</h3>
                    <p className="text-white/70 text-sm mb-4">
                      If you just completed an order, check your email for a confirmation message.
                      You can also view all your orders in your dashboard.
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/dashboard" className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
                    View Dashboard
                  </Link>
                  <Link href="/" className="border border-white/20 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/5 transition-colors">
                    Go Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Order Details</h1>
          <div className="w-8 h-8 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Thank You – Fasho.co</title>
      </Head>
      
      <Header hideSignUp={true} />
      
      <main className="min-h-screen relative text-white pt-20 pb-12">
        {/* Confetti Animation - Full Screen */}
        {showConfetti && confettiAnimationData && (
          <div className="fixed inset-0 w-full h-full pointer-events-none z-30">
            <Lottie
              animationData={confettiAnimationData}
              loop={false}
              autoplay={true}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none'
              }}
              onComplete={() => {
                console.log('🎉 CONFETTI: Animation completed via onComplete callback');
                setShowConfetti(false);
              }}
            />
          </div>
        )}

        {/* Background layers */}
        <div className="fixed inset-0 bg-black z-0"></div>
        {/* Gradient glow background - on top of black layer */}
        <div 
          className="fixed inset-0"
          style={{
            background: 'radial-gradient(ellipse 100% 60% at 50% 30%, rgba(89, 227, 165, 0.15) 0%, rgba(20, 192, 255, 0.1) 40%, rgba(89, 227, 165, 0.05) 70%, transparent 100%)',
            zIndex: 5
          }}
        ></div>
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20 z-10"
          style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
        ></div>
        
        <div className="relative z-40">{/* Increased z-index to be above confetti */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Success Header */}
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Success! 🎉</h1>
              <p className="text-xl text-white/70 mb-2">Welcome to the FASHO.co family!</p>
                            {orderData.orderNumber && (
                <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 border border-[#59e3a5]/20 rounded-lg p-4 mb-4 mt-3">
                  <p className="text-[#59e3a5] font-black text-2xl">Order #{orderData.orderNumber}</p>
                  <p className="text-white/60 text-xs mt-2">The charge on your card will show as *Focused Founders LLC*</p>
                </div>
              )}
              {orderData.newAccountCreated && (
                <>
                  <p className="text-white/60 mb-4">Your account has been created! Please check your email for a verification link so you can login to track your campaigns.</p>
                  <div className="bg-[#59e3a5]/10 border border-[#59e3a5]/20 rounded-lg p-4 text-center">
                    <p className="text-[#59e3a5] font-semibold">📧 Verification Email Sent!</p>
                    <p className="text-white/70 text-sm mt-1">Check your inbox and click the verification link to activate your account</p>
                  </div>
                </>
              )}
              {!orderData.newAccountCreated && (
                <p className="text-white mb-4">Your campaign is officially in the works, and we're excited to be part of your journey.</p>
              )}
            </div>

            {/* What Happens Next Section */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-center">🎯 What Happens Next</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center text-xl">
                    🔍
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Within 24 Hours</h3>
                    <p className="text-white/70 text-sm">Our team reviews your content and crafts your personalized marketing strategy</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center text-xl">
                    🚀
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">24-48 Hours</h3>
                    <p className="text-white/70 text-sm">Your campaign goes LIVE and we start contacting playlist curators</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center text-xl">
                    🎵
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">48-72 Hours</h3>
                    <p className="text-white/70 text-sm">You'll see your first playlist placements and streams start rolling in</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center text-xl">
                    ✅
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">7-10 Days</h3>
                    <p className="text-white/70 text-sm">Campaign complete with all estimated streams delivered</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Track Your Campaign Section */}
            <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 border border-[#59e3a5]/20 rounded-xl p-6 mb-8 text-center">
              <h2 className="text-2xl font-bold mb-4">📱 Track Your Campaign</h2>
              <p className="text-white/70 mb-4 text-lg"><strong>Check your email right away!</strong> We just sent you a confirmation email that you'll need to click to activate your account. Once you confirm, you can login to your dashboard using the email and password you created during checkout.</p>
              <p className="text-white/70 mb-6 text-lg">Your personal dashboard is locked and loaded! Monitor your progress, launch new campaigns, and see your success happen in real-time.</p>
              <Link href="/dashboard" className="inline-block bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity">
                GO TO DASHBOARD
              </Link>
            </div>

            {/* Order Summary */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20 mb-8">
              <h2 className="text-xl font-semibold mb-6">Your Campaign Details</h2>
              
              <div className="space-y-4 mb-6">
                {orderData.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
                    <div className="relative">
                      <Image
                        src={item.track.imageUrl || '/auto1.jpg'}
                        alt={`${item.track.title} album cover`}
                        width={60}
                        height={60}
                        className="rounded-lg"
                        unoptimized
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{item.track.title}</h3>
                      <p className="text-white/60 text-sm">{item.track.artist}</p>
                      <p className="text-[#59e3a5] text-sm font-medium">{item.package.name} Package</p>
                      <p className="text-white/50 text-xs">{item.package.plays} • {item.package.placements}</p>
                    </div>
                    
                    <div className="text-right">
                      {item.isDiscounted ? (
                        <div>
                          <div className="text-white/50 text-sm line-through">${item.originalPrice}</div>
                          <div className="font-semibold text-[#59e3a5]">${item.discountedPrice}</div>
                          <div className="text-xs text-[#59e3a5]">25% OFF</div>
                        </div>
                      ) : (
                        <div className="font-semibold">${item.discountedPrice}</div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add-on Items */}
                {orderData.addOnItems && orderData.addOnItems.length > 0 && (
                  <>
                    <div className="border-t border-white/10 pt-4 mt-4">
                      <h3 className="text-lg font-semibold mb-3 text-[#59e3a5]">Add-on Services</h3>
                    </div>
                    {orderData.addOnItems.map((item, index) => (
                      <div key={`addon-${index}`} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
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
                          <p className="text-white/60 text-sm">Additional promotion service</p>
                        </div>
                        
                        <div className="text-right">
                          {item.isOnSale ? (
                            <div>
                              <div className="text-white/50 text-sm line-through">${item.originalPrice}</div>
                              <div className="font-semibold text-[#59e3a5]">${item.price}</div>
                              <div className="text-xs text-[#59e3a5]">ON SALE</div>
                            </div>
                          ) : (
                            <div className="font-semibold">${item.price}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Price Summary */}
              <div className="border-t border-white/20 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Subtotal</span>
                    <span>${Number(orderData.subtotal).toFixed(2)}</span>
                  </div>
                  
                  {orderData.discount > 0 && (
                    <div className="flex justify-between text-[#59e3a5]">
                      <span>Multi-song discount (25% off)</span>
                      <span>-${Number(orderData.discount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {orderData.couponCode && orderData.couponDiscount && Number(orderData.couponDiscount) > 0 && (
                    <div className="flex justify-between text-[#59e3a5]">
                      <span>Coupon discount ({orderData.couponCode})</span>
                      <span>-${Number(orderData.couponDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-white/20 pt-2">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total Paid</span>
                      <span className="text-[#59e3a5]">${Number(orderData.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information Sections */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Check Your Email */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/20 text-center">
                <div className="text-4xl mb-4">📧</div>
                <h3 className="text-xl font-semibold mb-3">Check Your Email</h3>
                <p className="text-white/70 text-base">We've sent you a detailed welcome email with everything you need to know about your campaign. Make sure to check your inbox (and spam folder) for important updates!</p>
              </div>

              {/* Download Spotify for Artists */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/20 text-center">
                <div className="text-4xl mb-4">🎵</div>
                <h3 className="font-semibold mb-3" style={{ fontSize: 'calc(1.25rem - 0.10rem)' }}>Get Spotify for Artists</h3>
                <p className="text-white/70 text-base">If you haven't already, download the official Spotify for Artists app on your phone. This is how you'll see which playlists add your music and track your streaming numbers in real-time.</p>
              </div>

              {/* Need Help */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/20 text-center">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-xl font-semibold mb-3">Need Help?</h3>
                <p className="text-white/70 text-base">Got questions? We're here for you! Email us at <a href="mailto:support@fasho.co" className="text-[#59e3a5] hover:text-[#4bc995] underline">support@fasho.co</a> and our team will respond within 24 hours.</p>
              </div>
            </div>

            {/* Final Welcome Message */}
            <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 border border-[#59e3a5]/20 rounded-xl p-6 mb-8 text-center">
              <p className="text-3xl font-black mb-5 text-white">Welcome to the FASHO.co family!</p>
              <p className="text-white mb-6 text-xl">Your breakthrough moment is coming. 🚀</p>
              <Link href="/dashboard" className="inline-block bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity">
                GO TO DASHBOARD
              </Link>
            </div>
            
            {/* Footer with expiration message */}
            <div className="text-center mt-12 pb-8">
              {timeRemaining > 0 && (
                <p className="text-white/30 text-xs">
                  ⏰ This page expires in {Math.ceil(timeRemaining / 60000)} minutes
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <div className="relative z-50">
        <Footer />
      </div>

      {/* Intake Form Modal */}
      <IntakeFormModal 
        isOpen={showIntakeForm && !checkingIntakeStatus}
        onComplete={handleIntakeFormComplete}
      />
    </>
  );
} 