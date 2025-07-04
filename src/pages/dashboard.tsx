import { GetServerSideProps } from 'next'
import { createClientSSR } from '../utils/supabase/server'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/router'
import Lottie from 'lottie-react'

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
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [animatedData, setAnimatedData] = useState<number[]>([])
  const [chartAnimating, setChartAnimating] = useState(false)
  const [lottieAnimationData, setLottieAnimationData] = useState(null)
  const lottieRef = useRef(null)
  const supabase = createClient()

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
    if (lottieRef.current) {
      lottieRef.current.setSpeed(0.5)
    }
  }, [lottieAnimationData])

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

  // Calculate total estimated plays from orders in the last 30 days
  const calculateTotalPlays = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= thirtyDaysAgo
    })
    
    let totalPlays = 0
    recentOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any) => {
          // Extract plays from package (e.g., "1k Plays" -> 1000)
          const playsMatch = item.package.plays.match(/(\d+)k?\s*Plays/i)
          if (playsMatch) {
            let plays = parseInt(playsMatch[1])
            if (item.package.plays.toLowerCase().includes('k')) {
              plays *= 1000
            }
            totalPlays += plays
          }
        })
      }
    })
    
    return totalPlays
  }

  // Generate 30-day projection data
  const generateChartData = () => {
    const totalPlays = calculateTotalPlays()
    if (totalPlays === 0) return []
    
    const dailyData = []
    for (let i = 0; i < 30; i++) {
      const progress = i / 29
      const randomVariation = 0.85 + Math.random() * 0.3 // 85-115% of expected
      const dailyPlays = Math.floor(totalPlays * progress * randomVariation)
      dailyData.push(Math.max(0, dailyPlays))
    }
    
    return dailyData
  }

  // Animation effect for chart - using packages page approach
  useEffect(() => {
    if (orders.length === 0) return
    
    setChartAnimating(true)
    const targetData = generateChartData()
    
    // Two-phase animation like packages page
    let animationId: number
    let startTime: number
    let phaseStartTime: number
    let phase: 'down' | 'up' = 'down'
    
    // Starting values for down animation
    const startingData = animatedData.length > 0 ? [...animatedData] : new Array(30).fill(0)
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      if (!phaseStartTime) phaseStartTime = timestamp
      
      const elapsed = timestamp - phaseStartTime
      const phaseDuration = 350 // Fast like packages page
      const progress = Math.min(elapsed / phaseDuration, 1)
      
      // Easing function (ease-out-cubic) - same as packages page
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      
      if (phase === 'down') {
        // Animate down from starting values to zero (right to left)
        const newAnimatedData = startingData.map((startValue, index) => {
          const pointDelay = ((29 - index) / 29) * 0.3 // Right to left
          const pointProgress = Math.max(0, Math.min(1, (easeOutCubic - pointDelay) / (1 - pointDelay)))
          return startValue * (1 - pointProgress)
        })
        
        setAnimatedData(newAnimatedData)
        
        if (progress >= 1) {
          // Switch to up phase
          phase = 'up'
          phaseStartTime = timestamp
          setAnimatedData(new Array(30).fill(0)) // Reset to zeros
        }
      } else {
        // Animate up to target values (left to right)
        const newAnimatedData = targetData.map((targetValue, index) => {
          const pointDelay = (index / 29) * 0.3 // Left to right
          const pointProgress = Math.max(0, Math.min(1, (easeOutCubic - pointDelay) / (1 - pointDelay)))
          return targetValue * pointProgress
        })
        
        setAnimatedData(newAnimatedData)
        
        if (progress >= 1) {
          setChartAnimating(false)
          return
        }
      }
      
      animationId = requestAnimationFrame(animate)
    }
    
    // Start with zeros if no previous data
    if (animatedData.length === 0) {
      setAnimatedData(new Array(30).fill(0))
      phase = 'up'
    }
    
    animationId = requestAnimationFrame(animate)
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [orders])

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

  // Calculate stats using the correct field names from API
  const totalCampaigns = orders.length
  const runningCampaigns = orders.filter(order => order.status === 'marketing in progress').length
  const completedCampaigns = orders.filter(order => order.status === 'completed').length

  // Format numbers with K notation for Y-axis labels
  const formatNumberWithK = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K'
    }
    return num.toString()
  }

  // Get Y-axis labels for the chart with K notation
  const getYAxisLabels = (maxValue: number) => {
    if (maxValue === 0) return ['10K', '5K', '0']
    
    let step: number
    if (maxValue >= 50000) {
      step = 10000
    } else if (maxValue >= 20000) {
      step = 5000
    } else if (maxValue >= 5000) {
      step = 1000
    } else {
      step = 500
    }
    
    const topValue = Math.ceil(maxValue / step) * step
    const midValue = Math.floor(topValue / 2 / step) * step
    
    return [formatNumberWithK(topValue), formatNumberWithK(midValue), '0']
  }

  const totalPlays = calculateTotalPlays()
  const chartData = generateChartData()
  const displayData = animatedData.length > 0 ? animatedData : chartData
  const maxPlays = Math.max(...chartData, 1)
  const yAxisLabels = getYAxisLabels(maxPlays)

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
    { id: 'campaigns', label: 'Campaigns', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'faq', label: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'contact', label: 'Contact Us', icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'signout', label: 'Sign Out', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
  ]

  const renderDashboardContent = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Campaigns</p>
              <p className="text-3xl font-bold text-white mt-2">{totalCampaigns}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Running Campaigns</p>
              <p className="text-3xl font-bold text-white mt-2">{runningCampaigns}/{totalCampaigns}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Completed Campaigns</p>
              <p className="text-3xl font-bold text-white mt-2">{completedCampaigns}/{totalCampaigns}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hero Section */}
        <div className="dashboard-hero-gradient rounded-2xl p-8 border border-gray-800/30 relative overflow-hidden min-h-[400px]">
          <div className="flex items-center justify-between h-full">
            <div className="relative z-10 flex-1 pr-8">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                <span className="text-2xl lg:text-3xl">Welcome to</span><br />
                <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                  FASHO.CO
                </span>
              </h2>
              <p className="text-xl lg:text-2xl text-gray-300 mb-8 leading-relaxed">
                It's time to dominate on Spotify! 🚀
              </p>
              <button 
                onClick={() => router.push('/add')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start New Campaign
              </button>
            </div>
            
            {/* Lottie Animation */}
            <div className="relative z-10 flex items-center justify-center">
              {lottieAnimationData ? (
                <Lottie 
                  animationData={lottieAnimationData}
                  loop={true}
                  autoplay={true}
                  className="w-72 h-72 lg:w-80 lg:h-80"
                  lottieRef={lottieRef}
                />
              ) : (
                <div className="w-72 h-72 lg:w-80 lg:h-80 bg-gray-800/50 rounded-lg flex items-center justify-center">
                  <div className="text-gray-400">Loading animation...</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
          <h3 className="text-xl font-semibold text-white mb-4">Next 30 Days Projected Plays</h3>
          <div className="text-sm text-gray-400 mb-4">
            Total estimated plays: {totalPlays.toLocaleString()}
          </div>
          <div className="relative h-64 bg-black/20 rounded-lg p-4 pl-16">
            {/* Enhanced Chart Visualization */}
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.1 }} />
                </linearGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Grid Lines */}
              <g stroke="#374151" strokeWidth="1" opacity="0.3">
                <line x1="0" y1="40" x2="400" y2="40" />
                <line x1="0" y1="80" x2="400" y2="80" />
                <line x1="0" y1="120" x2="400" y2="120" />
                <line x1="0" y1="160" x2="400" y2="160" />
              </g>
              
              {/* Area under the curve */}
              {displayData.length > 0 && (
                <path
                  d={`M 0 200 ${displayData.map((plays, index) => {
                    const x = (index / (displayData.length - 1)) * 400;
                    const y = maxPlays > 0 ? 200 - (plays / maxPlays) * 160 : 200;
                    return `L ${x} ${y}`;
                  }).join(' ')} L 400 200 Z`}
                  fill="url(#areaGradient)"
                />
              )}
              
              {/* Main Glowing Chart Line */}
              {displayData.length > 0 && (
                <path
                  d={`M ${displayData.map((plays, index) => {
                    const x = (index / (displayData.length - 1)) * 400;
                    const y = maxPlays > 0 ? 200 - (plays / maxPlays) * 160 : 200;
                    return `${x} ${y}`;
                  }).join(' L ')}`}
                  fill="none"
                  stroke="url(#chartGradient)"
                  strokeWidth="3"
                  filter="url(#glow)"
                />
              )}
              
              {/* Data Points with Glow */}
              {displayData.map((plays, index) => {
                const x = (index / (displayData.length - 1)) * 400;
                const y = maxPlays > 0 ? 200 - (plays / maxPlays) * 160 : 200;
                
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="url(#chartGradient)"
                    filter="url(#glow)"
                  />
                );
              })}
            </svg>
            
            {/* Y-axis labels - positioned inside container */}
            <div className="absolute left-2 top-0 h-full flex flex-col justify-between text-xs text-gray-400 w-12 text-right pr-2">
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'}`}>
                {yAxisLabels[0]}
              </span>
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'}`}>
                {yAxisLabels[1]}
              </span>
              <span>{yAxisLabels[2]}</span>
            </div>
          </div>
          
          {/* Chart Labels */}
          <div className="flex justify-between mt-4 text-sm text-gray-400 pl-16">
            <span>Day 1</span>
            <span>Day 15</span>
            <span>Day 30</span>
          </div>
        </div>
      </div>

      {/* Your Campaigns Section */}
      <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-800/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Your Campaigns</h3>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className="text-green-400 hover:text-green-300 font-medium transition-colors"
          >
            View All Campaigns →
          </button>
        </div>
        
        {ordersLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎵</div>
            <p className="text-gray-400 mb-4">No campaigns yet. Start your first promotion!</p>
            <button 
              onClick={() => router.push('/add')}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 3).map((order) => (
              <div key={order.id} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                {/* Collapsed Order Row */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <div className="flex items-center space-x-4">
                    {/* Album Artwork Thumbnails */}
                    <div className="flex items-center space-x-2">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item: any, idx: number) => (
                          <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                            <img 
                              src={item.track.imageUrl} 
                              alt={item.track.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-xs">🎵</span>
                        </div>
                      )}
                      
                      {/* Add-on Emoji Thumbnails */}
                      {order.addOnItems && order.addOnItems.length > 0 && (
                        <div className="flex items-center space-x-1 ml-2">
                          {order.addOnItems.map((addon: any, idx: number) => (
                            <div key={idx} className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                              <span className="text-sm">{addon.emoji}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-white font-semibold">{order.orderNumber}</p>
                      <p className="text-gray-400 text-sm">
                        ${(order.total / 100).toFixed(2)} • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'marketing in progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {order.status}
                    </span>
                    
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedOrders.has(order.id) ? 'rotate-180' : ''
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {/* Expanded Order Details */}
                {expandedOrders.has(order.id) && (
                  <div className="border-t border-gray-700/50 p-4 bg-gray-800/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Song Cards */}
                      {order.items && order.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800">
                              <img 
                                src={item.track.imageUrl} 
                                alt={item.track.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-center">
                              <h4 className="text-white font-medium text-sm mb-1">{item.track.title}</h4>
                              <p className="text-gray-400 text-xs mb-2">{item.package.name} Package</p>
                              <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-2">
                                <p className="text-green-400 text-xs font-medium">{item.package.plays}</p>
                                <p className="text-green-400 text-xs">{item.package.placements}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add-ons Section */}
                    {order.addOnItems && order.addOnItems.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <h4 className="text-white font-medium mb-3">Add-ons</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {order.addOnItems.map((addon: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-3 bg-gray-900/30 rounded-lg p-3 border border-gray-700/30">
                              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                                <span className="text-sm">{addon.emoji}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-white text-sm font-medium">{addon.addon_name}</p>
                                <p className="text-green-400 text-xs">${(addon.discounted_price / 100).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderCampaignsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">All Campaigns</h2>
        <button 
          onClick={() => router.push('/add')}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
        >
          + New Campaign
        </button>
      </div>
      
      {ordersLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎵</div>
          <h4 className="text-xl font-semibold text-white mb-2">No campaigns yet</h4>
          <p className="text-gray-400 mb-6">Start your first music promotion campaign today!</p>
          <button 
            onClick={() => router.push('/add')}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-800/50 overflow-hidden">
              {/* Collapsed Order Row */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => toggleOrderExpansion(order.id)}
              >
                <div className="flex items-center space-x-4">
                  {/* Album Artwork Thumbnails */}
                  <div className="flex items-center space-x-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item: any, idx: number) => (
                        <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                          <img 
                            src={item.track.imageUrl} 
                            alt={item.track.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-xs">🎵</span>
                      </div>
                    )}
                    
                    {/* Add-on Emoji Thumbnails */}
                    {order.addOnItems && order.addOnItems.length > 0 && (
                      <div className="flex items-center space-x-1 ml-2">
                        {order.addOnItems.map((addon: any, idx: number) => (
                          <div key={idx} className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                            <span className="text-sm">{addon.emoji}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-white font-semibold">{order.orderNumber}</p>
                    <p className="text-gray-400 text-sm">
                      ${(order.total / 100).toFixed(2)} • {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    order.status === 'marketing in progress' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {order.status}
                  </span>
                  
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedOrders.has(order.id) ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Expanded Order Details */}
              {expandedOrders.has(order.id) && (
                <div className="border-t border-gray-800/50 p-4 bg-gray-950/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Song Cards */}
                    {order.items && order.items.length > 0 && order.items.map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-900/80 rounded-xl p-4 border border-gray-800/50">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800">
                            <img 
                              src={item.track.imageUrl} 
                              alt={item.track.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-center">
                            <h4 className="text-white font-medium text-sm line-clamp-2">{item.track.title}</h4>
                            {item.track.artist && (
                              <p className="text-gray-400 text-xs mt-1">{item.track.artist}</p>
                            )}
                          </div>
                          <div className="w-full bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-lg p-3 text-center">
                            <p className="text-green-400 font-medium text-sm">{item.package.name}</p>
                            <p className="text-gray-300 text-xs mt-1">{item.package.plays}</p>
                            <p className="text-gray-300 text-xs">{item.package.placements}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add-ons Section */}
                  {order.addOnItems && order.addOnItems.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-white font-medium mb-3">Add-ons</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {order.addOnItems.map((addon: any, idx: number) => (
                          <div key={idx} className="bg-gray-900/80 rounded-lg p-3 border border-gray-800/50">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                                <span className="text-sm">{addon.emoji}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-white text-sm font-medium">{addon.name}</p>
                                <p className="text-gray-400 text-xs">
                                  ${(addon.price / 100).toFixed(2)}
                                  {addon.isOnSale && addon.originalPrice && (
                                    <span className="ml-1 line-through text-gray-500">
                                      ${(addon.originalPrice / 100).toFixed(2)}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Order Summary */}
                  <div className="mt-6 pt-4 border-t border-gray-800/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Customer:</span>
                      <span className="text-white">{order.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{order.customerEmail}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-400">Discount:</span>
                        <span className="text-green-400">-${(order.discount / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm mt-1 pt-2 border-t border-gray-800/50">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-white font-semibold">${(order.total / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderFAQContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
      
      <div className="space-y-4">
        {[
          {
            question: "How long does it take to see results?",
            answer: "Most campaigns start showing results within 24-48 hours. Full campaign completion typically takes 7-14 days depending on the package selected."
          },
          {
            question: "What platforms do you promote on?",
            answer: "We promote your music on Spotify, Apple Music, and other major streaming platforms through our network of playlist curators and influencers."
          },
          {
            question: "Can I track my campaign progress?",
            answer: "Yes! Your dashboard provides real-time updates on your campaign progress, including plays, playlist additions, and audience growth."
          },
          {
            question: "What happens if I'm not satisfied with results?",
            answer: "We offer a satisfaction guarantee. If your campaign doesn't meet the promised deliverables, we'll work with you to make it right."
          },
          {
            question: "Can I promote multiple songs at once?",
            answer: "Absolutely! You can create campaigns for multiple tracks simultaneously. We offer bundle discounts for multiple song promotions."
          }
        ].map((faq, index) => (
          <div key={index} className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
            <h3 className="text-lg font-semibold text-white mb-3">{faq.question}</h3>
            <p className="text-gray-300">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderContactContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Contact Support</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
          <h3 className="text-xl font-semibold text-white mb-6">Get in Touch</h3>
          
          <form className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
              <input 
                type="text" 
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                placeholder="Your full name"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
              <input 
                type="email" 
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                placeholder="your@email.com"
                defaultValue={user.email}
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Subject</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors">
                <option>Campaign Support</option>
                <option>Billing Question</option>
                <option>Technical Issue</option>
                <option>General Inquiry</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Message</label>
              <textarea 
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                placeholder="How can we help you?"
              ></textarea>
            </div>
            
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Send Message
            </button>
          </form>
        </div>
        
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
            <h4 className="text-lg font-semibold text-white mb-4">Contact Information</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📧</span>
                <span className="text-gray-300">support@fasho.co</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💬</span>
                <span className="text-gray-300">Live Chat Available</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⏰</span>
                <span className="text-gray-300">24/7 Support</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
            <h4 className="text-lg font-semibold text-white mb-4">Response Times</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">General Inquiries:</span>
                <span className="text-green-400">&lt; 2 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Technical Issues:</span>
                <span className="text-green-400">&lt; 1 hour</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Urgent Matters:</span>
                <span className="text-green-400">&lt; 30 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSignOutModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold text-white mb-4">Confirm Sign Out</h3>
        <p className="text-gray-300 mb-6">Are you sure you want to sign out of your account?</p>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setShowSignOutModal(false)}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent()
      case 'campaigns':
        return renderCampaignsContent()
      case 'faq':
        return renderFAQContent()
      case 'contact':
        return renderContactContent()
      default:
        return renderDashboardContent()
    }
  }

  return (
    <div className="min-h-screen dashboard-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-gray-950/95 to-gray-900/95 backdrop-blur-sm border-r border-gray-800/30 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800/30">
          <h1 className="text-2xl font-bold text-white">FASHO.CO</h1>
          <p className="text-sm text-gray-400">Music Promotion</p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'signout') {
                    setShowSignOutModal(true)
                  } else {
                    setActiveTab(item.id)
                  }
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === item.id 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        
        {/* User Info */}
        <div className="p-4 border-t border-gray-800/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user.user_metadata?.full_name?.[0] || user.email[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                {user.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-gray-400 text-xs">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="bg-gray-950/95 backdrop-blur-sm border-b border-gray-900/30 p-6 relative z-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white capitalize">{activeTab}</h2>
              <p className="text-gray-400">
                {activeTab === 'dashboard' && 'Welcome back! Here\'s your campaign overview.'}
                {activeTab === 'campaigns' && 'Manage and monitor all your music campaigns.'}
                {activeTab === 'faq' && 'Find answers to common questions.'}
                {activeTab === 'contact' && 'Get in touch with our support team.'}
              </p>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto relative z-20">
          {renderContent()}
        </main>
      </div>
      
      {/* Sign Out Modal */}
      {showSignOutModal && renderSignOutModal()}
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