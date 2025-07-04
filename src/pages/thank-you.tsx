import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
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

  useEffect(() => {
    console.log('🔍 THANK YOU PAGE: Checking for order data...');
    
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
        console.log('🔍 THANK YOU PAGE: Parsed order data:', parsedOrder);
        console.log('🔍 THANK YOU PAGE: Order items:', parsedOrder.items);
        console.log('🔍 THANK YOU PAGE: Subtotal:', parsedOrder.subtotal);
        console.log('🔍 THANK YOU PAGE: Total:', parsedOrder.total);
        setOrderData(parsedOrder);
        // Clear the stored order data
        sessionStorage.removeItem('completedOrder');
      } catch (error) {
        console.error('Error parsing order data:', error);
        // Redirect to home if no valid order data
        router.push('/');
      }
    } else {
      console.log('🔍 THANK YOU PAGE: No order data found, redirecting to home');
      // No order data found, redirect to home
      router.push('/');
    }
    
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-white/70 mb-6">We couldn't find your order details.</p>
          <Link href="/" className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
            Go Home
          </Link>
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
        {/* Background layers */}
        <div className="fixed inset-0 bg-black z-0"></div>
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20 z-10"
          style={{ backgroundImage: 'url(/marble-bg.jpg)' }}
        ></div>
        
        <div className="relative z-20">
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
          </div>
        </div>
      </main>
    </>
  );
} 