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
  const supabase = createClient()

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
                {orders.map(order => (
                  <div key={order.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-4">
                    {/* Album covers */}
                    <div className="flex items-center space-x-2">
                      {order.items.map((item: any, idx: number) => (
                        <img
                          key={item.id}
                          src={item.track.imageUrl || '/auto1.jpg'}
                          alt={item.track.title}
                          className="w-12 h-12 rounded-lg border-2 border-gray-800 object-cover"
                          style={{ marginLeft: idx === 0 ? 0 : '-12px', zIndex: 10 - idx }}
                        />
                      ))}
                    </div>
                    {/* Order info */}
                    <div className="flex-1 ml-6">
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold text-white">Order #{order.orderNumber}</span>
                        <span className="text-gray-400 text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="text-green-400 font-semibold">Marketing In Progress</span>
                    </div>
                  </div>
                ))}
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