import { GetServerSideProps } from 'next'
import Head from 'next/head'
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
  const [animatedData, setAnimatedData] = useState<{ day: number; plays: number }[]>([])
  const [chartAnimating, setChartAnimating] = useState(false)
  const [lottieAnimationData, setLottieAnimationData] = useState(null)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [artistProfile, setArtistProfile] = useState<any>(null)
  const [artistProfileLoading, setArtistProfileLoading] = useState(true)
  const [showArtistProfileEditor, setShowArtistProfileEditor] = useState(false)
  const [artistSearchQuery, setArtistSearchQuery] = useState('')
  const [artistSearchResults, setArtistSearchResults] = useState<any[]>([])
  const [artistSearchLoading, setArtistSearchLoading] = useState(false)
  const [artistTracks, setArtistTracks] = useState<any[]>([])
  const [artistTracksLoading, setArtistTracksLoading] = useState(false)
  const lottieRef = useRef<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Get user initials
  const getUserInitials = () => {
    if (user.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0].toUpperCase()
    }
    return user.email[0].toUpperCase()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
      // Ensure animation is loaded before setting speed
      setTimeout(() => {
        if (lottieRef.current) {
          lottieRef.current.setSpeed(0.5)
        }
      }, 100)
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
        // Request all orders by setting a high limit
        const res = await fetch('/api/get-user-orders?limit=1000')
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
      // Create a more realistic growth curve - starts low, grows exponentially
      const dayProgress = i / 29 // 0 to 1
      
      // Use a smooth exponential curve for more realistic growth
      // This starts around 20% and grows to 100%
      const growthFactor = 0.2 + (dayProgress * dayProgress * 0.8) // Exponential curve from 0.2 to 1.0
      
      const randomVariation = 0.85 + Math.random() * 0.3 // 85-115% variation
      const dailyPlays = Math.floor(totalPlays * growthFactor * randomVariation)
      
      dailyData.push({
        day: i + 1,
        plays: Math.max(Math.floor(totalPlays * 0.1), dailyPlays) // Minimum 10% of total
      })
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
    
    // Starting values for down animation - convert to objects with .plays property
    const startingData = animatedData.length > 0 
      ? animatedData.map((data, index) => ({ 
          day: index + 1, 
          plays: typeof data === 'number' ? data : data.plays || 0 
        }))
      : new Array(30).fill(0).map((_, index) => ({ day: index + 1, plays: 0 }))
    
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
        const newAnimatedData = startingData.map((startData, index) => {
          const pointDelay = ((29 - index) / 29) * 0.3 // Right to left
          const pointProgress = Math.max(0, Math.min(1, (easeOutCubic - pointDelay) / (1 - pointDelay)))
          return {
            day: index + 1,
            plays: startData.plays * (1 - pointProgress)
          }
        })
        
        setAnimatedData(newAnimatedData)
        
        if (progress >= 1) {
          // Switch to up phase
          phase = 'up'
          phaseStartTime = timestamp
          setAnimatedData(new Array(30).fill(0).map((_, index) => ({ day: index + 1, plays: 0 }))) // Reset to zeros
        }
      } else {
        // Animate up to target values (left to right)
        const newAnimatedData = targetData.map((targetData, index) => {
          const pointDelay = (index / 29) * 0.3 // Left to right
          const pointProgress = Math.max(0, Math.min(1, (easeOutCubic - pointDelay) / (1 - pointDelay)))
          return {
            day: index + 1,
            plays: targetData.plays * pointProgress
          }
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
      setAnimatedData(new Array(30).fill(0).map((_, index) => ({ day: index + 1, plays: 0 })))
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
  const runningCampaigns = orders.filter(order => order.status === 'marketing_campaign_running').length
  const completedCampaigns = orders.filter(order => order.status === 'completed').length

  // Status formatting functions (same as admin dashboard)
  const ORDER_STATUSES = [
    { value: 'processing', label: 'Processing', color: 'yellow', bgClass: 'bg-yellow-400', textClass: 'text-yellow-400' },
    { value: 'marketing_campaign_running', label: 'Marketing Campaign Running', color: 'green', bgClass: 'bg-green-400', textClass: 'text-green-400' },
    { value: 'completed', label: 'Completed', color: 'blue', bgClass: 'bg-blue-400', textClass: 'text-blue-400' },
    { value: 'order_issue', label: 'Order Issue - Check Email', color: 'orange', bgClass: 'bg-orange-400', textClass: 'text-orange-400' },
    { value: 'cancelled', label: 'Cancelled', color: 'red', bgClass: 'bg-red-400', textClass: 'text-red-400' }
  ]

  const getStatusColor = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status)
    return statusConfig?.color || 'gray'
  }

  const getStatusLabel = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status)
    return statusConfig?.label || status
  }

  const getStatusBgClass = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status)
    return statusConfig?.bgClass || 'bg-gray-400'
  }

  const getStatusTextClass = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status)
    return statusConfig?.textClass || 'text-gray-400'
  }

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

  // Artist Profile Functions
  const fetchArtistProfile = async () => {
    try {
      setArtistProfileLoading(true)
      const response = await fetch('/api/user-artist-profile')
      const data = await response.json()
      
      if (data.profile) {
        setArtistProfile(data.profile)
        // Fetch artist tracks when profile is loaded
        await fetchArtistTracks(data.profile.spotify_artist_id)
      }
    } catch (error) {
      console.error('Failed to fetch artist profile:', error)
    } finally {
      setArtistProfileLoading(false)
    }
  }

  const fetchArtistTracks = async (artistId: string) => {
    try {
      setArtistTracksLoading(true)
      const response = await fetch(`/api/spotify/artist?artistId=${artistId}&includeAlbums=true`)
      const data = await response.json()
      
      if (data.topTracks) {
        setArtistTracks(data.topTracks)
      }
    } catch (error) {
      console.error('Failed to fetch artist tracks:', error)
    } finally {
      setArtistTracksLoading(false)
    }
  }

  const searchArtists = async (query: string) => {
    if (!query.trim()) {
      setArtistSearchResults([])
      return
    }

    try {
      setArtistSearchLoading(true)
      const response = await fetch('/api/spotify/artist-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      })
      const data = await response.json()
      
      if (data.artists) {
        setArtistSearchResults(data.artists)
      }
    } catch (error) {
      console.error('Failed to search artists:', error)
      setArtistSearchResults([])
    } finally {
      setArtistSearchLoading(false)
    }
  }

  const saveArtistProfile = async (selectedArtist: any) => {
    try {
      const method = artistProfile ? 'PUT' : 'POST'
      const response = await fetch('/api/user-artist-profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotify_artist_id: selectedArtist.id,
          artist_name: selectedArtist.name,
          artist_image_url: selectedArtist.imageUrl,
          spotify_artist_url: selectedArtist.spotifyUrl,
          followers_count: selectedArtist.followersCount,
          genres: selectedArtist.genres
        })
      })

      if (response.ok) {
        setShowArtistProfileEditor(false)
        setArtistSearchQuery('')
        setArtistSearchResults([])
        await fetchArtistProfile() // Refresh profile data
      }
    } catch (error) {
      console.error('Failed to save artist profile:', error)
    }
  }

  const handlePromoteTrack = (track: any) => {
    // Create track object in the format expected by /add page
    const trackData = {
      id: track.id,
      title: track.name,
      artist: artistProfile?.artist_name || '',
      imageUrl: track.imageUrl,
      url: track.spotifyUrl
    }

    // Navigate to /add page with track data
    const trackParams = new URLSearchParams({
      tracks: JSON.stringify([trackData])
    })
    router.push(`/add?${trackParams.toString()}`)
  }

  // Fetch artist profile on component mount
  useEffect(() => {
    fetchArtistProfile()
  }, [])

  // Debounced artist search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (artistSearchQuery) {
        searchArtists(artistSearchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [artistSearchQuery])

  const totalPlays = calculateTotalPlays()
  const chartData = generateChartData()
  const displayData = animatedData.length > 0 ? animatedData : chartData
  const actualMaxPlays = Math.max(...chartData.map(d => d.plays), 1)
  // Add 17% headroom to prevent data points from hitting the top
  const maxPlays = actualMaxPlays * 1.17
  const yAxisLabels = getYAxisLabels(maxPlays)

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
    { id: 'campaigns', label: 'Campaigns', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'faq', label: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'contact', label: 'Contact Us', icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'signout', label: 'Sign Out', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
  ]

  const renderDashboardContent = () => (
    <div className="space-y-4 lg:space-y-8 pb-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-800/30 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Campaigns</p>
              <p className="text-2xl lg:text-3xl font-bold text-white mt-2">{totalCampaigns}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-800/30 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Running Campaigns</p>
              <p className="text-2xl lg:text-3xl font-bold text-white mt-2">{runningCampaigns}/{totalCampaigns}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-800/30 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Completed Campaigns</p>
              <p className="text-2xl lg:text-3xl font-bold text-white mt-2">{completedCampaigns}/{totalCampaigns}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Hero Section - Enhanced */}
      <div className="lg:hidden relative overflow-hidden rounded-2xl mb-6 h-[28rem] bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-green-900/20 backdrop-blur-sm border-2 border-gray-900/60 z-10">
        {/* Gradient Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-green-600/10 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        
        <div className="relative z-10 flex flex-col h-full px-6 py-6 pb-20">
          {/* Text Content - Top Section */}
          <div className="flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
              <span className="text-xl">Welcome to</span><br />
              <span className="text-5xl bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent font-black">
                FASHO.CO
              </span>
            </h2>
            <p className="text-base text-gray-200 font-medium">
              It's time to dominate on Spotify! 🚀
            </p>
          </div>
          
          {/* Lottie Animation - Middle Section with proper spacing */}
          <div className="flex-1 flex items-center justify-center relative" style={{ marginTop: '10px' }}>
            {lottieAnimationData ? (
              <Lottie
                lottieRef={lottieRef}
                animationData={lottieAnimationData}
                style={{ width: 300, height: 300 }}
                loop={true}
                autoplay={true}
              />
            ) : (
              <div className="w-72 h-72 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <div className="text-gray-400 text-xs">Loading...</div>
              </div>
            )}
            
            {/* Button - Overlayed on Lottie */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-8">
              <button 
                onClick={() => router.push('/add')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-12 py-4 rounded-xl text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-gray-900/60 whitespace-nowrap"
              >
                Start New Campaign
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Artist Profile Section */}
      <div className="lg:hidden mb-6">
        <div className="bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-orange-900/20 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 relative z-10 overflow-hidden">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-pink-600/5 to-orange-600/5 animate-pulse"></div>
          
          <div className="relative z-10">
            {/* Header with title and change button */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Your Artist Profile</h3>
              <button
                onClick={() => setShowArtistProfileEditor(!showArtistProfileEditor)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Change Artist Profile
              </button>
            </div>

            {artistProfileLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-400 text-sm">Loading artist profile...</div>
              </div>
            ) : artistProfile ? (
              <div className="space-y-4">
                {/* Artist Info */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-gray-700">
                    <img 
                      src={artistProfile.artist_image_url || '/default-artist.jpg'} 
                      alt={artistProfile.artist_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-1">{artistProfile.artist_name}</h4>
                  <p className="text-sm text-gray-400">{artistProfile.followers_count?.toLocaleString()} followers</p>
                </div>

                {/* Artist Tracks */}
                <div className="space-y-3">
                  <h5 className="text-base font-semibold text-white text-center">Your Top Tracks</h5>
                  {artistTracksLoading ? (
                    <div className="text-center text-gray-400 text-sm">Loading tracks...</div>
                  ) : (
                    <div className="relative">
                      {/* Left Arrow */}
                      <button
                        onClick={() => {
                          const container = document.getElementById('mobile-tracks-container');
                          if (container) {
                            container.scrollBy({ left: -150, behavior: 'smooth' });
                          }
                        }}
                        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-all duration-300 hover:scale-110"
                        style={{ marginLeft: '-8px' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Right Arrow */}
                      <button
                        onClick={() => {
                          const container = document.getElementById('mobile-tracks-container');
                          if (container) {
                            container.scrollBy({ left: 150, behavior: 'smooth' });
                          }
                        }}
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-all duration-300 hover:scale-110"
                        style={{ marginRight: '-8px' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Tracks Container */}
                      <div
                        id="mobile-tracks-container"
                        className="flex gap-3 overflow-x-auto mobile-tracks-scrollbar pb-2"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 transparent' }}
                      >
                        {artistTracks.map((track, index) => (
                          <div key={index} className="flex-shrink-0 w-32 bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/50 transition-colors">
                            <div className="w-20 h-20 rounded-lg overflow-hidden mb-2 mx-auto">
                              <img 
                                src={track.imageUrl || '/default-track.jpg'} 
                                alt={track.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-center">
                              <div className="text-white text-xs font-medium mb-1 truncate" title={track.name}>
                                {track.name}
                              </div>
                              <button
                                onClick={() => handlePromoteTrack(track)}
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-all duration-300 transform hover:scale-105 w-full"
                              >
                                Promote
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-gray-400 mb-2 font-medium text-sm">No Artist Profile Found</div>
                <div className="text-gray-500 text-xs mb-3 max-w-xs">
                  Your artist profile will be automatically set when you create your first campaign.
                </div>
                <button
                  onClick={() => setShowArtistProfileEditor(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 text-sm"
                >
                  Set Artist Profile
                </button>
              </div>
            )}

            {/* Artist Profile Editor */}
            {showArtistProfileEditor && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl p-4 z-20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-white">Set Artist Profile</h4>
                    <button
                      onClick={() => setShowArtistProfileEditor(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Search artist name or paste Spotify artist URL"
                      value={artistSearchQuery}
                      onChange={(e) => setArtistSearchQuery(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 text-sm"
                    />
                    
                    {artistSearchLoading && (
                      <div className="text-center text-gray-400 text-sm">Searching...</div>
                    )}
                    
                    {artistSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {artistSearchResults.map((artist, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                            <img 
                              src={artist.imageUrl || '/default-artist.jpg'} 
                              alt={artist.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium text-xs truncate">{artist.name}</div>
                              <div className="text-gray-400 text-xs">{artist.followersCount?.toLocaleString()} followers</div>
                            </div>
                            <button
                              onClick={() => saveArtistProfile(artist)}
                              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-all duration-300"
                            >
                              Save
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Projected Plays Chart Section */}
      <div className="lg:hidden mb-6">
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 border border-gray-800/30 relative z-10">
          <h3 className="text-lg font-semibold text-white mb-3">Next 30 Days Projected Plays</h3>
          <div className="text-xs text-gray-400 mb-3">
            Total estimated plays: {totalPlays.toLocaleString()}
          </div>
          <div className="relative h-48 bg-black/20 rounded-lg">
            {/* Y-axis labels - positioned absolutely */}
            <div className="absolute left-1 top-2 h-[calc(100%-1rem)] flex flex-col justify-between text-xs text-gray-400 w-6 text-right pr-1 z-10">
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'} text-xs`}>
                {yAxisLabels[0]}
              </span>
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'} text-xs`}>
                {yAxisLabels[1]}
              </span>
              <span className="text-xs">{yAxisLabels[2]}</span>
            </div>
            
            {/* Chart area with proper padding for Y-axis labels and no right margin */}
            <div className="absolute inset-0 pl-8 pr-0">
              <svg className="w-full h-full" viewBox="0 0 120 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mobileChartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="mobileAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0.1 }} />
                  </linearGradient>
                </defs>
                
                {/* Grid lines */}
                <g stroke="#374151" strokeWidth="0.5" opacity="0.3">
                  <line x1="0" y1="8" x2="120" y2="8" />
                  <line x1="0" y1="20" x2="120" y2="20" />
                  <line x1="0" y1="32" x2="120" y2="32" />
                </g>
                
                {/* Area under curve */}
                <path
                  d={`M ${displayData.map((point, index) => 
                    `${(index / (displayData.length - 1)) * 120},${5 + (1 - point.plays / maxPlays) * 30}`
                  ).join(' L ')} L 120,35 L 0,35 Z`}
                  fill="url(#mobileAreaGradient)"
                />
                
                {/* Main chart line */}
                <path
                  d={`M ${displayData.map((point, index) => 
                    `${(index / (displayData.length - 1)) * 120},${5 + (1 - point.plays / maxPlays) * 30}`
                  ).join(' L ')}`}
                  stroke="url(#mobileChartGradient)"
                  strokeWidth="1"
                  fill="none"
                />
                
                {/* Data points */}
                {displayData.map((point, index) => (
                  <circle
                    key={index}
                    cx={(index / (displayData.length - 1)) * 120}
                    cy={5 + (1 - point.plays / maxPlays) * 30}
                    r="0.7"
                    fill="url(#mobileChartGradient)"
                    className="drop-shadow-sm"
                  />
                ))}
              </svg>
            </div>
          </div>
          
          {/* Chart Labels */}
          <div className="flex justify-between mt-3 text-xs text-gray-400 pl-6">
            <span>Day 1</span>
            <span>Day 15</span>
            <span>Day 30</span>
          </div>
        </div>
      </div>

      {/* Desktop Hero Section & Artist Profile */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-8 mb-8">
        {/* Hero Section */}
        <div className="dashboard-hero-gradient rounded-2xl p-8 border border-gray-800/30 relative overflow-hidden min-h-[400px] z-10">
          <div className="flex flex-row items-center justify-between h-full">
            <div className="relative z-10 flex-1 pr-8 text-left">
              <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                <span className="text-3xl">Welcome to</span><br />
                <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                  FASHO.CO
                </span>
              </h2>
              <p className="text-2xl text-gray-300 mb-8 leading-relaxed">
                It's time to dominate on Spotify! 🚀
              </p>
              <button 
                onClick={() => router.push('/add')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl text-base font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
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
                  className="w-96 h-96 xl:w-[420px] xl:h-[420px]"
                  lottieRef={lottieRef}
                />
              ) : (
                <div className="w-96 h-96 xl:w-[420px] xl:h-[420px] bg-gray-800/50 rounded-lg flex items-center justify-center">
                  <div className="text-gray-400">Loading animation...</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Artist Profile Section */}
        <div className="bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-orange-900/20 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 relative z-10 overflow-hidden">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-pink-600/5 to-orange-600/5 animate-pulse"></div>
          
          <div className="relative z-10">
            {/* Header with title and change button */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Your Artist Profile</h3>
              <button
                onClick={() => setShowArtistProfileEditor(!showArtistProfileEditor)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Change Artist Profile
              </button>
            </div>

            {artistProfileLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading artist profile...</div>
              </div>
            ) : artistProfile ? (
              <div className="space-y-6">
                {/* Artist Info */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-gray-700">
                    <img 
                      src={artistProfile.artist_image_url || '/default-artist.jpg'} 
                      alt={artistProfile.artist_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-2">{artistProfile.artist_name}</h4>
                  <p className="text-sm text-gray-400">{artistProfile.followers_count?.toLocaleString()} followers</p>
                </div>

                {/* Artist Tracks */}
                <div className="space-y-4">
                  <h5 className="text-lg font-semibold text-white">Your Top Tracks</h5>
                  {artistTracksLoading ? (
                    <div className="text-center text-gray-400">Loading tracks...</div>
                  ) : (
                    <div className="relative">
                      {/* Left Arrow */}
                      <button
                        onClick={() => {
                          const container = document.getElementById('tracks-container');
                          if (container) {
                            container.scrollBy({ left: -200, behavior: 'smooth' });
                          }
                        }}
                        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 hover:scale-110"
                        style={{ marginLeft: '-12px' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Right Arrow */}
                      <button
                        onClick={() => {
                          const container = document.getElementById('tracks-container');
                          if (container) {
                            container.scrollBy({ left: 200, behavior: 'smooth' });
                          }
                        }}
                        className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 hover:scale-110"
                        style={{ marginRight: '-12px' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Horizontal Scrolling Container */}
                      <div 
                        id="tracks-container"
                        className="flex gap-3 overflow-x-auto pb-2 px-2"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#6B7280 #1F2937'
                        }}
                      >
                        <style jsx>{`
                          #tracks-container::-webkit-scrollbar {
                            height: 6px;
                          }
                          #tracks-container::-webkit-scrollbar-track {
                            background: #1F2937;
                            border-radius: 3px;
                          }
                          #tracks-container::-webkit-scrollbar-thumb {
                            background: #6B7280;
                            border-radius: 3px;
                          }
                          #tracks-container::-webkit-scrollbar-thumb:hover {
                            background: #9CA3AF;
                          }
                        `}</style>
                        
                        {artistTracks.map((track, index) => (
                          <div 
                            key={index} 
                            className="flex-shrink-0 w-40 h-56 bg-black/20 rounded-lg hover:bg-black/30 transition-colors p-3 flex flex-col justify-between"
                          >
                            {/* Track Image */}
                            <div className="w-full h-32 rounded-md overflow-hidden mb-3">
                              <img 
                                src={track.imageUrl || '/default-track.jpg'} 
                                alt={track.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            {/* Track Info */}
                            <div className="flex-1 flex flex-col justify-between">
                              <div className="mb-3">
                                <div className="text-white font-medium text-sm truncate mb-1">{track.name}</div>
                                <div className="text-gray-400 text-xs truncate">{artistProfile.artist_name}</div>
                              </div>
                              
                              {/* Promote Button */}
                              <button
                                onClick={() => handlePromoteTrack(track)}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105"
                              >
                                Promote
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-gray-400 mb-2 font-medium">No Artist Profile Found</div>
                <div className="text-gray-500 text-sm mb-4 max-w-xs">
                  Your artist profile will be automatically set when you create your first campaign. Or you can set it manually below.
                </div>
                <button
                  onClick={() => setShowArtistProfileEditor(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Set Artist Profile
                </button>
              </div>
            )}

            {/* Artist Profile Editor */}
            {showArtistProfileEditor && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl p-6 z-20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-white">Set Artist Profile</h4>
                    <button
                      onClick={() => setShowArtistProfileEditor(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Search artist name or paste Spotify artist URL"
                      value={artistSearchQuery}
                      onChange={(e) => setArtistSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                    
                    {artistSearchLoading && (
                      <div className="text-center text-gray-400">Searching...</div>
                    )}
                    
                    {artistSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {artistSearchResults.map((artist, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                            <img 
                              src={artist.imageUrl || '/default-artist.jpg'} 
                              alt={artist.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="text-white font-medium text-sm">{artist.name}</div>
                              <div className="text-gray-400 text-xs">{artist.followersCount?.toLocaleString()} followers</div>
                            </div>
                            <button
                              onClick={() => saveArtistProfile(artist)}
                              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
                            >
                              Save
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Width Chart Section - Above Your Campaigns */}
      <div className="hidden lg:block mb-8">
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 relative z-10">
          <h3 className="text-xl font-semibold text-white mb-4">Next 30 Days Projected Plays</h3>
          <div className="text-sm text-gray-400 mb-4">
            Total estimated plays: {totalPlays.toLocaleString()}
          </div>
          <div className="relative h-64 bg-black/20 rounded-lg">
            {/* Y-axis labels - positioned absolutely */}
            <div className="absolute left-2 top-4 h-[calc(100%-2rem)] flex flex-col justify-between text-xs text-gray-400 w-8 text-right pr-1 z-10">
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'}`}>
                {yAxisLabels[0]}
              </span>
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'}`}>
                {yAxisLabels[1]}
              </span>
              <span>{yAxisLabels[2]}</span>
            </div>
            
            {/* Chart area with proper padding for Y-axis labels and no right margin */}
            <div className="absolute inset-0 pl-12 pr-0">
              <svg className="w-full h-full" viewBox="0 0 120 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0.1 }} />
                  </linearGradient>
                </defs>
                
                {/* Grid lines */}
                <g stroke="#374151" strokeWidth="0.5" opacity="0.3">
                  <line x1="0" y1="8" x2="120" y2="8" />
                  <line x1="0" y1="20" x2="120" y2="20" />
                  <line x1="0" y1="32" x2="120" y2="32" />
                </g>
                
                {/* Area under curve */}
                <path
                  d={`M ${displayData.map((point, index) => 
                    `${(index / (displayData.length - 1)) * 120},${5 + (1 - point.plays / maxPlays) * 30}`
                  ).join(' L ')} L 120,35 L 0,35 Z`}
                  fill="url(#areaGradient)"
                />
                
                {/* Main chart line */}
                <path
                  d={`M ${displayData.map((point, index) => 
                    `${(index / (displayData.length - 1)) * 120},${5 + (1 - point.plays / maxPlays) * 30}`
                  ).join(' L ')}`}
                  stroke="url(#chartGradient)"
                  strokeWidth="1"
                  fill="none"
                />
                
                {/* Data points */}
                {displayData.map((point, index) => (
                  <circle
                    key={index}
                    cx={(index / (displayData.length - 1)) * 120}
                    cy={5 + (1 - point.plays / maxPlays) * 30}
                    r="0.7"
                    fill="url(#chartGradient)"
                    className="drop-shadow-sm"
                  />
                ))}
              </svg>
            </div>
          </div>
          
          {/* Chart Labels */}
          <div className="flex justify-between mt-4 text-sm text-gray-400 pl-10">
            <span>Day 1</span>
            <span>Day 15</span>
            <span>Day 30</span>
          </div>
        </div>
      </div>

      {/* Your Campaigns Section */}
      <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 lg:p-8 border border-gray-800/30">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h3 className="text-xl lg:text-2xl font-bold text-white">Your Campaigns</h3>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className="text-green-400 hover:text-green-300 font-medium transition-colors text-sm lg:text-base"
          >
            View All →
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
                        ${Math.round(order.total)} • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusBgClass(order.status)}`}></div>
                      <span className={`text-sm font-medium ${getStatusTextClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    
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
                              <p className="text-white text-sm font-medium">{addon.name}</p>
                              <p className="text-green-400 text-xs">${addon.price >= 600 ? Math.round(addon.price / 100) : addon.price}</p>
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
    <div className="space-y-6 pb-8">
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
                      ${Math.round(order.total)} • {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusBgClass(order.status)}`}></div>
                    <span className={`text-sm font-medium ${getStatusTextClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  
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
                                    ${addon.price >= 600 ? Math.round(addon.price / 100) : addon.price}
                                    {addon.isOnSale && addon.originalPrice && (
                                      <span className="ml-1 line-through text-gray-500">
                                        ${addon.originalPrice >= 600 ? Math.round(addon.originalPrice / 100) : addon.originalPrice}
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
                        <span className="text-green-400">-${Math.round(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm mt-1 pt-2 border-t border-gray-800/50">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-white font-semibold">${Math.round(order.total)}</span>
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
    <div className="space-y-6 pb-8">
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
    <div className="space-y-6 pb-8">
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

  const renderUserDropdown = () => (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowUserDropdown(!showUserDropdown)}
        className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        <span className="text-white font-semibold text-sm">
          {getUserInitials()}
        </span>
      </button>
      
      {showUserDropdown && (
        <div className="fixed top-16 right-4 lg:top-20 lg:right-6 w-64 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-xl z-[9999]">
          {/* User Info Section */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {getUserInitials()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-gray-400 text-xs truncate">{user.email}</p>
              </div>
            </div>
          </div>
          
          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => {
                setShowUserDropdown(false)
                setShowSignOutModal(true)
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
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
    <>
      <Head>
        <title>Dashboard - FASHO</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen dashboard-background flex lg:flex-row flex-col w-full overflow-x-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-64 bg-gradient-to-b from-gray-950/95 to-gray-900/95 backdrop-blur-sm border-r border-gray-800/30 flex-col">
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
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col relative z-10 w-full lg:w-auto min-h-screen lg:min-h-0 overflow-x-hidden">
          {/* Header */}
          <header className="bg-gray-950/95 backdrop-blur-sm border-b border-gray-900/30 p-4 lg:p-6 relative z-50 w-full">
            <div className="flex items-center justify-between w-full">
              <div className="min-w-0 flex-1">
                {/* Mobile Logo */}
                <div className="lg:hidden mb-2">
                  <h1 className="text-xl font-bold text-white">FASHO.CO</h1>
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-white capitalize">{activeTab}</h2>
                <p className="text-sm lg:text-base text-gray-400">
                  {activeTab === 'dashboard' && 'Welcome back! Here\'s your campaign overview.'}
                  {activeTab === 'campaigns' && 'Manage and monitor all your music campaigns.'}
                  {activeTab === 'faq' && 'Find answers to common questions.'}
                  {activeTab === 'contact' && 'Get in touch with our support team.'}
                </p>
              </div>
              {/* User Profile Dropdown - Top Right */}
              <div className="flex-shrink-0 ml-4">
                {renderUserDropdown()}
              </div>
            </div>
          </header>
          
          {/* Content */}
          <main className="flex-1 p-4 lg:p-6 pr-6 lg:pr-6 overflow-y-auto overflow-x-hidden relative z-10 pb-20 lg:pb-0 w-full">
            {renderContent()}
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-sm border-t border-gray-800/30 px-2 py-1 z-30 safe-area-inset-bottom">
          <div className="flex items-center justify-around max-w-full">
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
                className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-all duration-300 min-w-0 flex-1 ${
                  activeTab === item.id 
                    ? 'text-green-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="text-xs font-medium truncate w-full text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Sign Out Modal */}
        {showSignOutModal && renderSignOutModal()}
      </div>
    </>
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