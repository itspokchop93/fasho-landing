import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Lottie from 'lottie-react'
import AdminOrdersManagement from '../components/AdminOrdersManagement'
import AdminEmailManagement from '../components/AdminEmailManagement'
import AdminCouponsManagement from '../components/AdminCouponsManagement'
import MonthlyOrdersChart from '../components/MonthlyOrdersChart'
import ActiveUsersSection from '../components/ActiveUsersSection'
import AdminAccessDenied from '../components/AdminAccessDenied'
import { verifyAdminToken, getAdminTokenFromRequest, AdminUser } from '../utils/admin/auth'

interface AdminDashboardProps {
  adminUser: AdminUser | null
  authError?: string
}

export default function AdminDashboard({ adminUser, authError }: AdminDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    monthlyOrders: 0,
    monthlyRevenue: 0,
    dailyOrdersData: [],
    currentMonth: {
      name: '',
      year: 0,
      month: 0
    }
  })
  const [animatedCounts, setAnimatedCounts] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    monthlyOrders: 0,
    monthlyRevenue: 0
  })
  const [lottieAnimationData, setLottieAnimationData] = useState(null)
  const lottieRef = useRef<any>(null)

  // Show access denied if not authenticated or error occurred
  if (!adminUser || authError) {
    return <AdminAccessDenied 
      title={authError || "Admin Access Required"}
      message="You need to be logged in as an administrator to access this page."
    />
  }

  // Fetch Lottie animation data
  useEffect(() => {
    const fetchLottieData = async () => {
      try {
        const response = await fetch('https://lottie.host/b85b82bf-f332-408e-adfc-310fb881ddcf/CJGk9Z9X2e.json')
        const data = await response.json()
        setLottieAnimationData(data)
      } catch (error) {
        console.error('Failed to fetch Lottie animation:', error)
      }
    }

    fetchLottieData()
  }, [])

  // Control Lottie animation speed
  useEffect(() => {
    if (lottieRef.current && lottieAnimationData) {
      setTimeout(() => {
        if (lottieRef.current) {
          lottieRef.current.setSpeed(0.5)
        }
      }, 100)
    }
  }, [lottieAnimationData])

  // Handle hash fragment navigation (e.g., /admin#orders)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      console.log('🔄 ADMIN-NAV: Hash changed to:', hash);
      if (hash === 'orders') {
        console.log('🔄 ADMIN-NAV: Setting active tab to orders');
        setActiveTab('orders')
      } else if (hash === 'emails') {
        // Check if sub-admin trying to access emails (not allowed)
        if (adminUser.role === 'sub_admin') {
          console.log('🔄 ADMIN-NAV: Sub-admin cannot access emails tab');
          setActiveTab('orders') // Redirect to orders
          window.location.hash = '#orders'
          return
        }
        console.log('🔄 ADMIN-NAV: Setting active tab to emails');
        setActiveTab('emails')
      } else if (hash === 'coupons') {
        // Check if sub-admin trying to access coupons (not allowed)
        if (adminUser.role === 'sub_admin') {
          console.log('🔄 ADMIN-NAV: Sub-admin cannot access coupons tab');
          setActiveTab('orders') // Redirect to orders
          window.location.hash = '#orders'
          return
        }
        console.log('🔄 ADMIN-NAV: Setting active tab to coupons');
        setActiveTab('coupons')
      } else if (hash === 'dashboard' || !hash) {
        // Check if sub-admin trying to access dashboard (not allowed)
        if (adminUser.role === 'sub_admin') {
          console.log('🔄 ADMIN-NAV: Sub-admin cannot access dashboard tab');
          setActiveTab('orders') // Redirect to orders
          window.location.hash = '#orders'
          return
        }
        console.log('🔄 ADMIN-NAV: Setting active tab to dashboard');
        setActiveTab('dashboard')
      }
    }

    // Check hash on initial load
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [adminUser.role])

  // Fetch analytics data (only for full admins)
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (adminUser.role !== 'admin') return // Sub-admins can't see analytics
      
      try {
        const res = await fetch('/api/admin/analytics', {
          credentials: 'include' // Include admin session cookie
        })
        const data = await res.json()
        if (data.success) {
          setAnalyticsData(data.analytics)
          // Start count-up animations
          animateCounters(data.analytics)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      }
    }

    if (activeTab === 'dashboard' && adminUser.role === 'admin') {
      fetchAnalytics()
    }
  }, [activeTab, adminUser.role])

  // Count-up animation function
  const animateCounters = (targetData: any) => {
    const duration = 2000 // 2 seconds
    const steps = 60
    const stepDuration = duration / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      const progress = currentStep / steps

      setAnimatedCounts({
        totalOrders: Math.floor(targetData.totalOrders * progress),
        totalRevenue: Math.floor(targetData.totalRevenue * progress),
        monthlyOrders: Math.floor(targetData.monthlyOrders * progress),
        monthlyRevenue: Math.floor(targetData.monthlyRevenue * progress)
      })

      if (currentStep >= steps) {
        clearInterval(interval)
        setAnimatedCounts({
          totalOrders: targetData.totalOrders,
          totalRevenue: targetData.totalRevenue,
          monthlyOrders: targetData.monthlyOrders,
          monthlyRevenue: targetData.monthlyRevenue
        })
      }
    }, stepDuration)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      router.push('/a-login')
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if logout API fails
      router.push('/a-login')
    } finally {
      setIsLoading(false)
    }
  }

  const renderDashboardContent = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-4">Welcome to the Admin Dashboard</h1>
          <p className="text-xl opacity-90">Manage orders, track analytics, and oversee your business operations</p>
        </div>
        
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-20">
          {lottieAnimationData && (
            <Lottie
              lottieRef={lottieRef}
              animationData={lottieAnimationData}
              loop={true}
              autoplay={true}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Orders */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatNumber(animatedCounts.totalOrders)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(animatedCounts.totalRevenue)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        {/* This Month's Orders */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">This Month's Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatNumber(animatedCounts.monthlyOrders)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* This Month's Revenue */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">This Month's Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(animatedCounts.monthlyRevenue)}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Orders Chart */}
      {analyticsData.dailyOrdersData.length > 0 && analyticsData.currentMonth.name && (
        <MonthlyOrdersChart 
          dailyOrdersData={analyticsData.dailyOrdersData}
          currentMonth={analyticsData.currentMonth}
        />
      )}

      {/* Active Users Section */}
      <ActiveUsersSection />
    </div>
  )

  const renderOrdersContent = () => (
    <div className="space-y-6">
      <AdminOrdersManagement />
    </div>
  )

  const renderEmailsContent = () => {
    console.log('🚨 ADMIN-RENDER: renderEmailsContent function called - BASIC TEST');
    console.log('🔄 ADMIN-RENDER: Rendering emails content...');
    console.log('🔄 ADMIN-RENDER: About to return AdminEmailManagement component');
    return (
      <div className="space-y-6">
        <AdminEmailManagement />
      </div>
    )
  }

  const renderCouponsContent = () => {
    console.log('🔄 ADMIN-RENDER: Rendering coupons content...');
    return (
      <div className="space-y-6">
        <AdminCouponsManagement />
      </div>
    )
  }

  const renderContent = () => {
    console.log('🔄 ADMIN-RENDER: Rendering content for tab:', activeTab);
    
    // Sub-admins can only access orders
    if (adminUser.role === 'sub_admin' && activeTab !== 'orders') {
      return renderOrdersContent()
    }
    
    switch (activeTab) {
      case 'dashboard':
        return adminUser.role === 'admin' ? renderDashboardContent() : renderOrdersContent()
      case 'orders':
        return renderOrdersContent()
      case 'emails':
        return adminUser.role === 'admin' ? renderEmailsContent() : renderOrdersContent()
      case 'coupons':
        return adminUser.role === 'admin' ? renderCouponsContent() : renderOrdersContent()
      default:
        return adminUser.role === 'admin' ? renderDashboardContent() : renderOrdersContent()
    }
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Fasho.co</title>
        <meta name="description" content="Admin dashboard for managing orders and analytics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900">Fasho Admin</h1>
                </div>
                <div className="flex space-x-8">
                  {/* Dashboard Tab - Only for full admins */}
                  {adminUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setActiveTab('dashboard')
                        window.location.hash = '#dashboard'
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'dashboard'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Dashboard
                    </button>
                  )}
                  
                  {/* Orders Tab - Available to all admin roles */}
                  <button
                    onClick={() => {
                      setActiveTab('orders')
                      window.location.hash = '#orders'
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'orders'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Orders
                  </button>
                  
                  {/* Emails Tab - Only for full admins */}
                  {adminUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setActiveTab('emails')
                        window.location.hash = '#emails'
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'emails'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Emails
                    </button>
                  )}
                  
                  {/* Coupons Tab - Only for full admins */}
                  {adminUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setActiveTab('coupons')
                        window.location.hash = '#coupons'
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'coupons'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Coupons
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">{adminUser.email}</div>
                  <div className="text-xs text-gray-400 capitalize">
                    {adminUser.role === 'sub_admin' ? 'Sub Admin' : 'Administrator'}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </div>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    console.log('🔐 ADMIN-SSR: Checking admin authentication...')
    
    // Get admin session token from request
    const token = getAdminTokenFromRequest(context.req as any)
    
    if (!token) {
      console.log('🔐 ADMIN-SSR: No admin session token found')
      return {
        redirect: {
          destination: '/a-login',
          permanent: false,
        },
      }
    }

    // Verify admin token
    const adminUser = verifyAdminToken(token)
    
    if (!adminUser) {
      console.log('🔐 ADMIN-SSR: Invalid admin session token')
      return {
        redirect: {
          destination: '/a-login',
          permanent: false,
        },
      }
    }

    if (!adminUser.is_active) {
      console.log('🔐 ADMIN-SSR: Admin account is inactive:', adminUser.email)
      return {
        props: {
          adminUser: null,
          authError: 'Admin account is inactive'
        },
      }
    }

    console.log('🔐 ADMIN-SSR: Admin authenticated successfully:', adminUser.email, 'role:', adminUser.role)

    return {
      props: {
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    }
  } catch (error) {
    console.error('🔐 ADMIN-SSR: Authentication error:', error)
    return {
      redirect: {
        destination: '/a-login',
        permanent: false,
      },
    }
  }
} 