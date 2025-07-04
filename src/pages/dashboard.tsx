import { GetServerSideProps } from 'next'
import { createClientSSR } from '../utils/supabase/server'
import { useState, useEffect } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/router'

interface DashboardProps {
  user: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
    }
  }
}

export default function Dashboard({ user }: DashboardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  useEffect(() => {
    async function fetchOrders() {
      setOrdersLoading(true)
      try {
        const res = await fetch('/api/get-user-orders')
        const data = await res.json()
        if (data.success) {
          setOrders(data.orders)
        } else {
          setOrders([])
        }
      } catch (err) {
        setOrders([])
      } finally {
        setOrdersLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const handleSignOut = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signOut()
    
    if (!error) {
      router.push('/signup')
    } else {
      console.error('Error signing out:', error.message)
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-white">FASHO Dashboard</h1>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-md transition-colors"
            >
              {isLoading ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Welcome to Your Dashboard! 🎉
            </h2>
            <p className="text-gray-300">
              You have successfully authenticated with Supabase
            </p>
          </div>

          {/* User Info Card */}
          <div className="bg-black rounded-lg p-6 border border-gray-700 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">
              Your Account Information
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="text-white ml-2">{user.email}</span>
              </div>
              {user.user_metadata?.full_name && (
                <div>
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white ml-2">{user.user_metadata.full_name}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">User ID:</span>
                <span className="text-white ml-2 font-mono text-sm">{user.id}</span>
              </div>
            </div>
          </div>

          {/* Your Campaigns Section */}
          <div className="bg-black rounded-lg p-6 border border-gray-700 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Your Campaigns</h3>
            {ordersLoading ? (
              <div className="text-gray-400">Loading your campaigns...</div>
            ) : orders.length === 0 ? (
              <div className="text-gray-400">You have not started any campaigns yet.</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => {
                  const isExpanded = expandedOrders.has(order.id)
                  return (
                    <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                      {/* Collapsible Header */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800 transition-colors"
                        onClick={() => toggleOrderExpansion(order.id)}
                      >
                        {/* Album covers */}
                        <div className="flex items-center space-x-2">
                          {order.items.slice(0, 3).map((item: any, idx: number) => (
                            <img
                              key={item.id}
                              src={item.track.imageUrl || '/auto1.jpg'}
                              alt={item.track.title}
                              className="w-12 h-12 rounded-lg border-2 border-gray-800 object-cover"
                              style={{ marginLeft: idx === 0 ? 0 : '-12px', zIndex: 10 - idx }}
                            />
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-12 h-12 bg-gray-700 rounded-lg border-2 border-gray-800 flex items-center justify-center text-white text-xs font-semibold"
                                 style={{ marginLeft: '-12px', zIndex: 7 }}>
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>
                        
                        {/* Order info */}
                        <div className="flex-1 ml-6">
                          <div className="flex items-center space-x-4">
                            <span className="font-semibold text-white">Order #{order.orderNumber}</span>
                            <span className="text-gray-400 text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
                            <span className="text-green-400 font-semibold">${order.total}</span>
                          </div>
                        </div>
                        
                        {/* Status and Expand Arrow */}
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-green-400 font-semibold">Marketing In Progress</span>
                          </div>
                          
                          {/* Expand/Collapse Arrow */}
                          <div className="flex items-center justify-center w-6 h-6">
                            <svg 
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expandable Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-800 p-6 bg-gray-950">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Order Details */}
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-4">Order Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Order Number:</span>
                                  <span className="text-white font-mono">{order.orderNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Order Date:</span>
                                  <span className="text-white">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Customer:</span>
                                  <span className="text-white">{order.customerName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Status:</span>
                                  <span className="text-green-400 font-semibold">{order.status}</span>
                                </div>
                                
                                {/* Price Breakdown */}
                                <div className="pt-4 border-t border-gray-800 mt-4">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Subtotal:</span>
                                    <span className="text-white">${order.subtotal}</span>
                                  </div>
                                  {order.discount > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Discount:</span>
                                      <span className="text-green-400">-${order.discount}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-700 mt-2">
                                    <span className="text-white">Total:</span>
                                    <span className="text-green-400">${order.total}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Songs & Packages */}
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-4">Songs & Packages</h4>
                              <div className="space-y-3">
                                {order.items.map((item: any) => (
                                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-900 rounded-lg">
                                    <img
                                      src={item.track.imageUrl || '/auto1.jpg'}
                                      alt={item.track.title}
                                      className="w-12 h-12 rounded-lg object-cover"
                                    />
                                    <div className="flex-1">
                                      <div className="font-semibold text-white text-sm">{item.track.title}</div>
                                      <div className="text-gray-400 text-xs">{item.track.artist}</div>
                                      <div className="text-green-400 text-xs font-medium">{item.package.name} Package</div>
                                    </div>
                                    <div className="text-right">
                                      {item.isDiscounted ? (
                                        <div>
                                          <div className="text-gray-500 text-xs line-through">${item.originalPrice}</div>
                                          <div className="text-green-400 font-semibold text-sm">${item.discountedPrice}</div>
                                        </div>
                                      ) : (
                                        <div className="text-white font-semibold text-sm">${item.discountedPrice}</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Add-on Items */}
                                {order.addOnItems && order.addOnItems.length > 0 && (
                                  <>
                                    <div className="pt-4 border-t border-gray-800">
                                      <h5 className="font-semibold text-green-400 mb-3">Add-on Services</h5>
                                    </div>
                                    {order.addOnItems.map((item: any, index: number) => (
                                      <div key={`addon-${index}`} className="flex items-center space-x-3 p-3 bg-gray-900 rounded-lg">
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center text-lg border border-gray-700">
                                          {item.addon_emoji}
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-semibold text-white text-sm">{item.addon_name.replace(/ \(.*\)/, '')}</div>
                                          <div className="text-gray-400 text-xs">Additional promotion service</div>
                                        </div>
                                        <div className="text-right">
                                          {item.is_on_sale ? (
                                            <div>
                                              <div className="text-gray-500 text-xs line-through">${item.original_price}</div>
                                              <div className="text-green-400 font-semibold text-sm">${item.sale_price}</div>
                                            </div>
                                          ) : (
                                            <div className="text-white font-semibold text-sm">${item.sale_price}</div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Navigation Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-black rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors cursor-pointer">
              <h4 className="text-lg font-semibold text-white mb-2">Song Promotion</h4>
              <p className="text-gray-400 text-sm">Promote your tracks and reach new audiences</p>
              <button 
                onClick={() => router.push('/add')}
                className="mt-4 text-green-400 hover:text-green-300 transition-colors"
              >
                Get Started →
              </button>
            </div>
            
            <div className="bg-black rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer">
              <h4 className="text-lg font-semibold text-white mb-2">View Packages</h4>
              <p className="text-gray-400 text-sm">Explore promotion packages and pricing</p>
              <button 
                onClick={() => router.push('/packages')}
                className="mt-4 text-blue-400 hover:text-blue-300 transition-colors"
              >
                Browse →
              </button>
            </div>
            
            <div className="bg-black rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer">
              <h4 className="text-lg font-semibold text-white mb-2">Account Settings</h4>
              <p className="text-gray-400 text-sm">Manage your profile and preferences</p>
              <button className="mt-4 text-purple-400 hover:text-purple-300 transition-colors">
                Settings →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = createClientSSR(context)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      redirect: {
        destination: '/signup',
        permanent: false,
      },
    }
  }

  return {
    props: {
      user,
    },
  }
} 