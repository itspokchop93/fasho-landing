import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Lottie from 'lottie-react';
import Header from '../components/Header';

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
}

export default function ThankYouPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confettiAnimationData, setConfettiAnimationData] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

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
              newAccountCreated: false // We can't determine this from the API, but it's not critical for display
            };

            setOrderData(apiOrderData);
            setTimeRemaining(data.timeRemaining || 0);
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

  // Trigger confetti animation when order data is loaded
  useEffect(() => {
    if (orderData && confettiAnimationData && !isLoading) {
      console.log('🎉 CONFETTI: Triggering confetti animation');
      setShowConfetti(true);
      
      // Hide confetti after animation completes (approximately 5 seconds)
      const timer = setTimeout(() => {
        setShowConfetti(false);
        console.log('🎉 CONFETTI: Animation completed, hiding confetti');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [orderData, confettiAnimationData, isLoading]);

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
        <Header />
        
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
      <Header />
      
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
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Thank You! 🎉</h1>
              <p className="text-xl text-white/70 mb-2">Your order has been successfully processed</p>
              {orderData.orderNumber && (
                <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 border border-[#59e3a5]/20 rounded-lg p-4 mb-4">
                  <p className="text-[#59e3a5] font-semibold text-lg">Order #{orderData.orderNumber}</p>
                  <p className="text-white/70 text-sm">Keep this number for your records</p>
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
                <p className="text-white/60 mb-4">You can now track your campaign progress in your dashboard.</p>
              )}
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
                    <span>${orderData.subtotal}</span>
                  </div>
                  
                  {orderData.discount > 0 && (
                    <div className="flex justify-between text-[#59e3a5]">
                      <span>Multi-song discount (25% off)</span>
                      <span>-${orderData.discount}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-white/20 pt-2">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total Paid</span>
                      <span className="text-[#59e3a5]">${orderData.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link href="/dashboard" className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity">
                View Dashboard
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
    </>
  );
} 