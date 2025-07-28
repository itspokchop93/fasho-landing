import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { createClientSSR } from '../utils/supabase/server'
import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/router'
import Lottie from 'lottie-react'
import CampaignProgressBar from '../components/CampaignProgressBar'
import IntakeFormModal from '../components/IntakeFormModal'
import { createPortal } from 'react-dom'
import PowerToolsCarousel from '../components/PowerToolsCarousel'
import PowerToolsTab from '../components/PowerToolsTab'
import { GoogleSheetsService, PowerTool } from '../utils/googleSheets'

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
  const [showResetModal, setShowResetModal] = useState(false)
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
  const [statsBoxesAnimated, setStatsBoxesAnimated] = useState(false)
  const [campaignsAnimated, setCampaignsAnimated] = useState(false)
  const [dashboardCampaignsAnimated, setDashboardCampaignsAnimated] = useState(false)
  const lottieRef = useRef<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: user.email || '',
    subject: 'General Inquiry',
    message: ''
  })
  const [contactFormLoading, setContactFormLoading] = useState(false)
  const [contactFormMessage, setContactFormMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Intake form state
  const [showIntakeForm, setShowIntakeForm] = useState(false)
  const [checkingIntakeStatus, setCheckingIntakeStatus] = useState(true)

  // Settings state
  const [userProfile, setUserProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false)
  const [profileUpdateMessage, setProfileUpdateMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false)
  const [emailChangeLoading, setEmailChangeLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newEmailStatus, setNewEmailStatus] = useState<'checking' | 'available' | 'exists' | 'invalid' | 'same' | null>(null)
  const [isCheckingNewEmail, setIsCheckingNewEmail] = useState(false)
  
  // User name state
  const [userDisplayName, setUserDisplayName] = useState<string>('User')
  
  // Mobile settings dropdown state
  const [showMobileSettingsDropdown, setShowMobileSettingsDropdown] = useState(false)
  
  // Form state for unsaved changes
  const [formData, setFormData] = useState<any>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Curator Connect+ state
  const [curatorData, setCuratorData] = useState<any[]>([])
  const [curatorDataLoading, setCuratorDataLoading] = useState(true)
  const [contactedCurators, setContactedCurators] = useState<Record<number, any>>({})
  const [curatorFilters, setCuratorFilters] = useState({
    genres: [] as string[],
    minSaves: '',
    maxSaves: '',
    status: 'all'
  })
  const [curatorSort, setCuratorSort] = useState({
    field: 'playlistSaves',
    direction: 'desc'
  })
  const [curatorSearch, setCuratorSearch] = useState('')
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [genreDropdownPosition, setGenreDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [statusDropdownPosition, setStatusDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const genreDropdownRef = useRef<HTMLButtonElement>(null)
  const statusDropdownRef = useRef<HTMLButtonElement>(null)
  const genrePortalRef = useRef<HTMLDivElement>(null)
  const statusPortalRef = useRef<HTMLDivElement>(null)

  // Track when component is mounted for portal
  useEffect(() => { setIsMounted(true); }, [])

  // Power Tools state
  const [powerTools, setPowerTools] = useState<PowerTool[]>([])
  const [powerToolsLoading, setPowerToolsLoading] = useState(true)
  const [featuredPowerTools, setFeaturedPowerTools] = useState<PowerTool[]>([])

  // Fetch Power Tools data
  useEffect(() => {
    const fetchPowerTools = async () => {
      try {
        setPowerToolsLoading(true)
        const tools = await GoogleSheetsService.fetchPowerTools()
        setPowerTools(tools)
        
        // Filter featured tools for dashboard carousel
        const featured = GoogleSheetsService.filterTools(tools, { featured: true })
        setFeaturedPowerTools(featured)
      } catch (error) {
        console.error('Failed to fetch power tools:', error)
        setPowerTools([])
        setFeaturedPowerTools([])
      } finally {
        setPowerToolsLoading(false)
      }
    }

    fetchPowerTools()
  }, [])

  // Fetch user's display name from API
  const fetchUserDisplayName = async () => {
    try {
      console.log('🔐 DASHBOARD: Fetching user display name...');
      
      // First, try to get the full profile data (first and last name)
      const profileResponse = await fetch('/api/user-profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('🔐 DASHBOARD: Profile API response:', profileData);
        
        if (profileData.profile) {
          const { first_name, last_name } = profileData.profile;
          if (first_name && last_name) {
            setUserDisplayName(`${first_name} ${last_name}`);
            console.log('🔐 DASHBOARD: ✅ Using full name from user_profiles:', `${first_name} ${last_name}`);
            return;
          } else if (first_name) {
            setUserDisplayName(first_name);
            console.log('🔐 DASHBOARD: ✅ Using first name from user_profiles:', first_name);
            return;
          }
        }
      }
      
      // Fallback: Try the get-user-first-name API
      const response = await fetch('/api/get-user-first-name');
      if (response.ok) {
        const data = await response.json();
        console.log('🔐 DASHBOARD: get-user-first-name API response:', data);
        
        if (data.firstName) {
          setUserDisplayName(data.firstName);
          console.log('🔐 DASHBOARD: ✅ Using name from get-user-first-name API:', data.firstName);
          return;
        }
      }
      
      // Final fallback: Extract from email
      console.log('🔐 DASHBOARD: Using email fallback for user name');
      const emailPart = user.email.split('@')[0];
      const cleanName = emailPart.replace(/[0-9]/g, '').replace(/[._]/g, '');
      setUserDisplayName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      
    } catch (error) {
      console.error('🔐 DASHBOARD: ❌ Error fetching user display name:', error);
      // Final fallback: Extract from email
      const emailPart = user.email.split('@')[0];
      const cleanName = emailPart.replace(/[0-9]/g, '').replace(/[._]/g, '');
      setUserDisplayName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  }

  // Handle click outside to close dropdowns - temporarily disabled to test dropdown functionality
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     const target = event.target as Element
  //     
  //     // Check if click is outside genre dropdown
  //     if (showGenreDropdown) {
  //       const genreDropdown = document.querySelector('[data-dropdown="genre"]')
  //       if (genreDropdown && !genreDropdown.contains(target) && !genreDropdownRef.current?.contains(target)) {
  //         setShowGenreDropdown(false)
  //       }
  //     }
  //     
  //     // Check if click is outside status dropdown
  //     if (showStatusDropdown) {
  //       const statusDropdown = document.querySelector('[data-dropdown="status"]')
  //       if (statusDropdown && !statusDropdown.contains(target) && !statusDropdownRef.current?.contains(target)) {
  //         setShowStatusDropdown(false)
  //       }
  //     }
  //   }

  //   if (showGenreDropdown || showStatusDropdown) {
  //     document.addEventListener('mousedown', handleClickOutside)
  //     return () => {
  //       document.removeEventListener('mousedown', handleClickOutside)
  //     }
  //   }
  // }, [showGenreDropdown, showStatusDropdown])

  // Fetch user display name on component mount
  useEffect(() => {
    fetchUserDisplayName();
  }, [])

  // Listen for profile updates to refresh the name
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('🔐 DASHBOARD: Profile update event received, refreshing name...');
      fetchUserDisplayName();
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, [])

  // Close mobile settings dropdown on tab change
  useEffect(() => {
    setShowMobileSettingsDropdown(false);
  }, [activeTab])

  // Update contact form name when userDisplayName is fetched
  useEffect(() => {
    if (userDisplayName && userDisplayName !== 'User') {
      setContactForm(prev => ({
        ...prev,
        name: userDisplayName
      }))
    }
  }, [userDisplayName])

  // Email validation function for email change
  const checkNewEmailExists = async (email: string) => {
    // Reset status first
    setNewEmailStatus(null);
    
    // Check if it's the same as current email
    if (email === user?.email) {
      setNewEmailStatus('same');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || email.trim() === '') {
      return; // Don't show status for empty email
    }
    
    if (!emailRegex.test(email)) {
      setNewEmailStatus('invalid');
      return;
    }
    
    setIsCheckingNewEmail(true);
    
    try {
      const response = await fetch('/api/check-user-exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.exists) {
          setNewEmailStatus('exists');
        } else {
          setNewEmailStatus('available');
        }
      } else {
        setNewEmailStatus('invalid');
      }
    } catch (error) {
      setNewEmailStatus('invalid');
    } finally {
      setIsCheckingNewEmail(false);
    }
  };

  // Debounced email validation effect
  useEffect(() => {
    if (!newEmail) {
      setNewEmailStatus(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkNewEmailExists(newEmail);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [newEmail, user?.email]);

  // Check intake form status on component mount
  useEffect(() => {
    const checkIntakeFormStatus = async () => {
      console.log('📋 DASHBOARD: Checking intake form status...');
      setCheckingIntakeStatus(true);

      try {
        const response = await fetch('/api/intake-form/check-status');
        const data = await response.json();

        if (response.ok && data.success) {
          console.log('📋 DASHBOARD: Intake form status:', { completed: data.completed });
          
          if (!data.completed) {
            console.log('📋 DASHBOARD: Showing intake form modal');
            setShowIntakeForm(true);
          } else {
            console.log('📋 DASHBOARD: User has already completed intake form');
          }
        } else {
          console.error('📋 DASHBOARD: Failed to check intake form status:', data);
          // Don't show the form if we can't check the status
        }
      } catch (error) {
        console.error('📋 DASHBOARD: Error checking intake form status:', error);
        // Don't show the form if there's an error
      } finally {
        setCheckingIntakeStatus(false);
      }
    };

    checkIntakeFormStatus();
  }, []); // Run once on component mount

  // Fetch curator data when tab is active
  useEffect(() => {
    if (activeTab === 'curator-connect') {
      fetchCuratorData();
      fetchContactedCurators();
    }
  }, [activeTab]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside genre dropdown
      if (showGenreDropdown && 
          genreDropdownRef.current && !genreDropdownRef.current.contains(target) &&
          genrePortalRef.current && !genrePortalRef.current.contains(target)) {
        setShowGenreDropdown(false);
      }
      
      // Check if click is outside status dropdown  
      if (showStatusDropdown && 
          statusDropdownRef.current && !statusDropdownRef.current.contains(target) &&
          statusPortalRef.current && !statusPortalRef.current.contains(target)) {
        setShowStatusDropdown(false);
      }
    };

    if (showGenreDropdown || showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGenreDropdown, showStatusDropdown]);

  // Get user initials or profile image
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

  // Get user profile image (artist image if available)
  const getUserProfileImage = () => {
    if (artistProfile?.artist_image_url) {
      return artistProfile.artist_image_url
    }
    return null
  }

  // Render profile avatar (image or initials)
  const renderProfileAvatar = (size: 'small' | 'medium' = 'medium') => {
    const profileImage = getUserProfileImage()
    const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10'
    const textSizeClasses = size === 'small' ? 'text-xs' : 'text-sm'
    
    if (profileImage) {
      return (
        <img
          src={profileImage}
          alt="Profile"
          className={`${sizeClasses} rounded-full object-cover border-2 border-green-500/50`}
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            target.nextElementSibling?.classList.remove('hidden')
          }}
        />
      )
    }
    
    return (
      <div className={`${sizeClasses} bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center`}>
        <span className={`text-white font-semibold ${textSizeClasses}`}>
          {getUserInitials()}
        </span>
      </div>
    )
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

  // Function to update URL hash when tab changes
  const updateUrlHash = (tabName: string) => {
    if (typeof window !== 'undefined') {
      const newHash = tabName === 'dashboard' ? '' : tabName
      const newUrl = `${window.location.pathname}${newHash ? `#${newHash}` : ''}`
      window.history.replaceState(null, '', newUrl)
    }
  }

  // Enhanced function to change tabs and update URL
  const changeTab = (tabName: string) => {
    setActiveTab(tabName)
    updateUrlHash(tabName)
  }

  // Handle hash navigation for tab switching
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) // Remove the '#' character
      const validTabs = ['dashboard', 'campaigns', 'curator-connect', 'power-tools', 'packages', 'faq', 'contact', 'settings', 'logout']
      
      if (hash === 'campaigns') {
        setActiveTab('campaigns')
      } else if (hash === 'curator-connect') {
        setActiveTab('curator-connect')
      } else if (hash === 'power-tools') {
        setActiveTab('power-tools')
      } else if (hash === 'packages') {
        setActiveTab('packages')
      } else if (hash === 'contact') {
        setActiveTab('contact')
      } else if (hash === 'faq') {
        setActiveTab('faq')
      } else if (hash === 'settings') {
        setActiveTab('settings')
      } else if (hash === 'help') {
        setActiveTab('contact') // 'help' maps to 'contact' tab
      } else if (hash === 'logout') {
        // Handle logout hash - trigger sign out modal
        setShowSignOutModal(true)
        // Don't change the active tab, just show the modal
      } else if (hash === '' || hash === 'dashboard') {
        setActiveTab('dashboard')
      }
    }

    // Check hash on initial load
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)

    // Cleanup listener
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  // Trigger stats boxes animation on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatsBoxesAnimated(true)
    }, 100) // Small delay to ensure DOM is ready

    return () => clearTimeout(timer)
  }, [])

  // Trigger dashboard campaigns animation on main dashboard
  useEffect(() => {
    if (activeTab === 'dashboard') {
      const timer = setTimeout(() => {
        setDashboardCampaignsAnimated(true)
      }, 300) // Delay after stats boxes

      return () => clearTimeout(timer)
    } else {
      setDashboardCampaignsAnimated(false)
    }
  }, [activeTab])

  // Trigger campaigns animation when switching to campaigns tab
  useEffect(() => {
    if (activeTab === 'campaigns') {
      const timer = setTimeout(() => {
        setCampaignsAnimated(true)
      }, 150) // Slight delay after tab switch

      return () => clearTimeout(timer)
    } else {
      setCampaignsAnimated(false)
    }
  }, [activeTab])

  // Generate realistic offset numbers that don't end with 00
  const generateRealisticNumber = (baseNumber: number): number => {
    // Create an offset between 8-18% of the base number
    const offsetPercentage = 0.08 + Math.random() * 0.10; // 8-18%
    const offset = Math.floor(baseNumber * offsetPercentage);
    
    // Add the offset and ensure it doesn't end with 00
    let realisticNumber = baseNumber + offset;
    
    // If it ends with 00, adjust it
    if (realisticNumber % 100 === 0) {
      // Add a random number between 20-99 that doesn't end in 0
      const adjustment = 20 + Math.floor(Math.random() * 70); // 20-89
      realisticNumber += adjustment;
    } else if (realisticNumber % 10 === 0) {
      // If it ends with just one 0, add 1-9
      realisticNumber += Math.floor(Math.random() * 9) + 1;
    }
    
    return Math.floor(realisticNumber);
  };

  // Calculate total estimated plays from orders in the last 30 days
  const calculateTotalPlays = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= thirtyDaysAgo
    })
    
    console.log('📊 PROJECTED PLAYS: Calculating total plays for', recentOrders.length, 'recent orders (last 30 days)')
    
    let totalPlays = 0
    recentOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any) => {
          // Parse the new range format (e.g., "18,000 - 20,000 Streams")
          const playsNumbers = item.package.plays.match(/[\d,]+/g)
          
          if (playsNumbers && playsNumbers.length >= 1) {
            // Convert comma-separated numbers to integers
            const minPlays = parseInt(playsNumbers[0].replace(/,/g, ''))
            const maxPlays = playsNumbers.length > 1 ? parseInt(playsNumbers[1].replace(/,/g, '')) : minPlays
            
            // Generate realistic numbers for min and max, then take their average
            const realisticMinPlays = generateRealisticNumber(minPlays)
            const realisticMaxPlays = generateRealisticNumber(maxPlays)
            const realisticAvgPlays = Math.round((realisticMinPlays + realisticMaxPlays) / 2)
            
            console.log(`📊 PROJECTED PLAYS: Package "${item.package.plays}" -> Original Range: ${minPlays.toLocaleString()} - ${maxPlays.toLocaleString()} -> Realistic Range: ${realisticMinPlays.toLocaleString()} - ${realisticMaxPlays.toLocaleString()} -> Realistic Average: ${realisticAvgPlays.toLocaleString()}`)
            totalPlays += realisticAvgPlays
          } else {
            // Fallback for old format (e.g., "1k Plays")
            const playsMatch = item.package.plays.match(/(\d+)k?\s*Plays/i)
            if (playsMatch) {
              let plays = parseInt(playsMatch[1])
              if (item.package.plays.toLowerCase().includes('k')) {
                plays *= 1000
              }
              const realisticPlays = generateRealisticNumber(plays)
              console.log(`📊 PROJECTED PLAYS: Old format "${item.package.plays}" -> Original: ${plays.toLocaleString()} -> Realistic: ${realisticPlays.toLocaleString()}`)
              totalPlays += realisticPlays
            } else {
              console.log(`📊 PROJECTED PLAYS: Could not parse package plays: "${item.package.plays}"`)
            }
          }
        })
      }
    })
    
    console.log('📊 PROJECTED PLAYS: Total realistic estimated plays:', totalPlays.toLocaleString())
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
    
    try {
      // Call server-side sign out endpoint first
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.error('Server-side sign out failed')
      }
      
      // Clear client-side session
    const { error } = await supabase.auth.signOut()
    
      if (error) {
        console.error('Client-side sign out error:', error.message)
      }
      
      // Clear any cached user data
      setArtistProfile(null)
      setOrders([])
      
      // Clear local storage and session storage
      if (typeof window !== 'undefined') {
        // Clear all possible auth-related storage
        localStorage.removeItem('userProfileImage')
        localStorage.removeItem('supabase.auth.token')
        localStorage.removeItem('sb-auth-token')
        localStorage.removeItem('sb-refresh-token')
        sessionStorage.clear()
        
        // Clear all localStorage items that might contain auth data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      // Force a hard redirect to signup page to ensure clean state
      if (typeof window !== 'undefined') {
        window.location.href = '/signup'
      } else {
      router.push('/signup')
      }
      
    } catch (error) {
      console.error('Error during sign out:', error)
      // Even if there's an error, force redirect to signup
      if (typeof window !== 'undefined') {
        window.location.href = '/signup'
    } else {
        router.push('/signup')
    }
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

  const getMobileStatusClasses = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status)
    if (!statusConfig) return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    
    switch (statusConfig.color) {
      case 'yellow':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      case 'green':
        return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'blue':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      case 'orange':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
      case 'red':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    }
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

  const getArtworkSize = (itemCount: number) => {
    if (itemCount === 1) {
      return 'w-full h-full'; // Single image takes full grid space
    } else {
      return 'w-full h-full'; // Multiple images each take 1 grid square
    }
  };

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
    { id: 'curator-connect', label: 'Curator Connect+', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'power-tools', label: 'Power Tools', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'packages', label: 'Packages', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'faq', label: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'contact', label: 'Contact Us', icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'signout', label: 'Sign Out', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
  ]

  // Mobile-only navigation items (excludes FAQ, Contact, Sign Out - they go in settings dropdown)
  const mobileNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
    { id: 'campaigns', label: 'Campaigns', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'curator-connect', label: 'Curator Connect+', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'power-tools', label: 'Tools', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'packages', label: 'Packages', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ]

  // Settings dropdown menu items
  const settingsDropdownItems = [
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'faq', label: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'contact', label: 'Contact', icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'signout', label: 'Logout', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' },
  ]

  const renderDashboardContent = () => (
    <div className="space-y-4 lg:space-y-8 pb-8">
      {/* Mobile-only gradient heading above stats cards */}
      <div className="block md:hidden mb-2 mt-2 text-center">
        <h2 className="text-lg font-black text-white inline-block" style={{letterSpacing: '0.01em', fontSize: '1.5rem'}}>
          Your Growth Hub
        </h2>
      </div>
      {/* Stats Cards */}
      <div 
        className={`grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 transition-all duration-800 ease-out ${
          statsBoxesAnimated 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-800/30 relative z-10 transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Campaigns</p>
              <p className="text-2xl lg:text-3xl font-bold text-white mt-2">{totalCampaigns}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-3">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-800/30 relative z-10 transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Running Campaigns</p>
              <p className="text-2xl lg:text-3xl font-bold text-white mt-2">{runningCampaigns}/{totalCampaigns}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-3">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-gray-800/30 relative z-10 transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Completed Campaigns</p>
              <p className="text-2xl lg:text-3xl font-bold text-white mt-2">{completedCampaigns}/{totalCampaigns}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-3">
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
                onClick={() => router.push('/#start-campaign')}
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
              {artistProfile ? (
                <button
                  onClick={() => setShowArtistProfileEditor(!showArtistProfileEditor)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Change Artist Profile
                </button>
              ) : (
                <button
                  onClick={() => setShowArtistProfileEditor(!showArtistProfileEditor)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Change Artist Profile
                </button>
              )}
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

      {/* Power Tools Dashboard Section - Mobile positioning */}
      <div className="lg:hidden mb-6">
        <PowerToolsCarousel
          tools={featuredPowerTools}
          onViewAll={() => changeTab('power-tools')}
          className=""
        />
      </div>

      {/* Mobile Projected Plays Chart Section */}
      <div className="lg:hidden mb-6">
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 border border-gray-800/30 relative z-10">
          <h3 className="text-lg font-semibold text-white mb-3">Next 30 Days Projected Streams</h3>
          <div className="text-xs text-gray-400 mb-3">
            Total estimated streams: {totalPlays.toLocaleString()}
          </div>
          <div className="relative h-48 bg-black/20 rounded-lg">
            {/* Y-axis labels - positioned absolutely */}
            <div className="absolute left-1 top-2 h-[calc(100%-1rem)] flex flex-col justify-between text-[9px] text-gray-400 w-10 text-right pr-1 z-10">
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'} whitespace-nowrap`}>
                {yAxisLabels[0]}
              </span>
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'} whitespace-nowrap`}>
                {yAxisLabels[1]}
              </span>
              <span className="whitespace-nowrap">{yAxisLabels[2]}</span>
            </div>
            
            {/* Chart area with proper padding for Y-axis labels and no right margin */}
            <div className="absolute inset-0 pl-12 pr-0">
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
          <div className="flex justify-between mt-3 text-xs text-gray-400 pl-12">
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
                onClick={() => router.push('/#start-campaign')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl text-base font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start New Campaign
              </button>
            </div>
            
            {/* Lottie Animation */}
            <div className="relative z-10 flex items-center justify-start ml-0 mr-8" style={{ transform: 'translateX(-45px)' }}>
              {lottieAnimationData ? (
                <Lottie 
                  animationData={lottieAnimationData}
                  loop={true}
                  autoplay={true}
                  className="w-[442px] h-[442px] xl:w-[483px] xl:h-[483px]"
                  lottieRef={lottieRef}
                />
              ) : (
                <div className="w-[442px] h-[442px] xl:w-[483px] xl:h-[483px] bg-gray-800/50 rounded-lg flex items-center justify-center">
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
              {artistProfile ? (
                <button
                  onClick={() => setShowArtistProfileEditor(!showArtistProfileEditor)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Change Artist Profile
                </button>
              ) : (
                <button
                  onClick={() => setShowArtistProfileEditor(!showArtistProfileEditor)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Change Artist Profile
                </button>
              )}
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

      {/* Power Tools Dashboard Section - Desktop positioning */}
      <div className="hidden lg:block mb-8">
        <PowerToolsCarousel
          tools={featuredPowerTools}
          onViewAll={() => changeTab('power-tools')}
          className=""
        />
      </div>

      {/* Full Width Chart Section - Above Your Campaigns */}
      <div className="hidden lg:block mb-8">
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 relative z-10">
          <h3 className="text-xl font-semibold text-white mb-4">Next 30 Days Projected Streams</h3>
          <div className="text-sm text-gray-400 mb-4">
            Total estimated streams: {totalPlays.toLocaleString()}
          </div>
          <div className="relative h-64 bg-black/20 rounded-lg">
            {/* Y-axis labels - positioned absolutely */}
            <div className="absolute left-2 top-4 h-[calc(100%-2rem)] flex flex-col justify-between text-[10px] text-gray-400 w-12 text-right pr-1 z-10">
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'} whitespace-nowrap`}>
                {yAxisLabels[0]}
              </span>
              <span className={`transition-opacity duration-500 ${totalPlays > 0 ? 'opacity-100' : 'opacity-30'} whitespace-nowrap`}>
                {yAxisLabels[1]}
              </span>
              <span className="whitespace-nowrap">{yAxisLabels[2]}</span>
            </div>
            
            {/* Chart area with proper padding for Y-axis labels and no right margin */}
            <div className="absolute inset-0 pl-16 pr-0">
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
          <div className="flex justify-between mt-4 text-sm text-gray-400 pl-16">
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
            onClick={() => changeTab('campaigns')}
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
              onClick={() => router.push('/#start-campaign')}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className={`space-y-4 transition-all duration-500 ease-out ${
            dashboardCampaignsAnimated 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-6'
          }`}>
            {orders.slice(0, 3).map((order, index) => (
              <div key={order.id}
                className={`campaign-card transition-all duration-600 ease-out ${
                  dashboardCampaignsAnimated 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{
                  animationDelay: dashboardCampaignsAnimated ? `${index * 100}ms` : '0ms',
                  animation: dashboardCampaignsAnimated ? `slideInCard 0.6s ease-out ${index * 0.1}s both` : 'none'
                }}
              >
                {/* Modern App-Style Campaign Card */}
                <div className="bg-white/[0.06] backdrop-blur-xl rounded-[20px] border border-white/[0.15] shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                  {/* Card Header - Mobile Optimized */}
                  <div 
                    className="p-5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                    onClick={() => toggleOrderExpansion(order.id)}
                  >
                    {/* Mobile: Artwork + Basic Info */}
                    <div className="md:hidden">
                      <div className="flex items-start space-x-4 mb-4">
                        {/* Artwork - Compact size for mobile */}
                        <div className="relative flex-shrink-0">
                          <div className="w-[80px] h-[80px] rounded-[16px] overflow-hidden bg-black/20 shadow-lg">
                            {order.items && order.items.length > 0 ? (
                              <div className={`w-full h-full ${order.items.length === 1 ? '' : 'grid grid-cols-2 gap-[1px]'}`}> 
                                {order.items.slice(0, 4).map((item: any, idx: number) => (
                                  <div key={idx} className="bg-black/20 overflow-hidden">
                                    <img 
                                      src={item.track.imageUrl} 
                                      alt={item.track.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="w-full h-full bg-black/20 flex items-center justify-center">
                                <span className="text-white/60 text-lg">🎵</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Track Count Badge */}
                          {order.items && order.items.length > 1 && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white text-xs font-bold">{order.items.length}</span>
                            </div>
                          )}
                        </div>

                        {/* Campaign Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-lg truncate mb-2">
                            Campaign #{order.orderNumber}
                          </h3>
                          
                          <div className="flex items-center justify-between text-sm mb-3">
                            <span className="text-white/70">${order.total.toFixed(2)}</span>
                            <span className="text-white/50 text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>

                          {/* Status on its own line - Mobile only */}
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getMobileStatusClasses(order.status)}`}>
                            <div className={`w-1.5 h-1.5 rounded-full status-glow ${getStatusBgClass(order.status)}`}></div>
                            <span className="text-xs">
                              {getStatusLabel(order.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar - Mobile shows on main card */}
                      <div className="md:hidden mt-4 py-1.5">
                        <div className="relative group">
                          {/* Outer glow effect */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-emerald-500/30 to-purple-500/20 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                          
                          {/* Main container with liquid glass effect */}
                          <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl rounded-xl p-4 border border-white/10 shadow-2xl overflow-hidden">
                            {/* Dynamic gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
                            
                            {/* Neon accent lines */}
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
                            
                            {/* Liquid glass refraction effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-60"></div>
                            
                            {/* Content */}
                            <div className="relative z-10">
                              <CampaignProgressBar 
                                orderCreatedAt={order.createdAt}
                                orderStatus={order.status}
                                showMessage={true}
                                size="small"
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                      {/* Desktop Artwork */}
                      <div className="md:col-span-2 flex justify-center">
                        <div className="w-[110px] h-[110px] rounded-xl overflow-hidden bg-black/20 shadow-lg relative">
                      {order.items && order.items.length > 0 ? (
                        <div className={`w-full h-full ${order.items.length === 1 ? '' : 'grid grid-cols-2 grid-rows-2 gap-1'}`}> 
                          {order.items.slice(0, 4).map((item: any, idx: number) => (
                                <div key={idx} className={`${getArtworkSize(Math.min(order.items.length, 4))} overflow-hidden bg-black/20`}>
                              <img 
                                src={item.track.imageUrl} 
                                alt={item.track.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                            <div className="w-full h-full bg-black/20 flex items-center justify-center">
                              <span className="text-white/60 text-lg">🎵</span>
                        </div>
                      )}
                      
                      {order.items && order.items.length > 4 && (
                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg">
                              <span className="text-white text-xs font-bold">+{order.items.length - 4}</span>
                        </div>
                      )}
                    </div>
                      </div>

                      {/* Desktop Order Info */}
                      <div className="flex-1 md:col-span-6">
                        <h3 className="text-white font-semibold text-lg mb-2">
                          Campaign #{order.orderNumber}
                        </h3>
                        <div className="text-sm text-white/70 mb-3">
                          ${order.total.toFixed(2)} • {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                        <div className={`relative group ${expandedOrders.has(order.id) ? 'hidden' : 'block'}`}>
                          {/* Outer glow effect */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-emerald-500/30 to-purple-500/20 rounded-lg blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                          
                          {/* Main container with liquid glass effect */}
                          <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl rounded-lg p-3 border border-white/10 shadow-2xl overflow-hidden">
                            {/* Dynamic gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
                            
                            {/* Neon accent lines */}
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
                            
                            {/* Liquid glass refraction effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-60"></div>
                            
                            {/* Content */}
                            <div className="relative z-10">
                              <CampaignProgressBar 
                                orderCreatedAt={order.createdAt}
                                orderStatus={order.status}
                                showMessage={true}
                                size="small"
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                    </div>

                      {/* Desktop Status & Controls */}
                      <div className="flex md:col-span-4 items-center justify-end space-x-4">
                      <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusBgClass(order.status)}`} 
                          style={{
                            filter: 'drop-shadow(0 0 4px currentColor)',
                          }}></div>
                        <span className={`text-sm font-medium ${getStatusTextClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <svg 
                          className={`w-5 h-5 text-white/40 transition-transform duration-300 ${
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

                    {/* Expand/Collapse Indicator - Mobile */}
                    <div className="md:hidden flex justify-center items-center mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-2 text-white/60">
                        <span className="text-xs font-medium">
                          {expandedOrders.has(order.id) ? 'Show Less' : 'View Details'}
                        </span>
                        <svg 
                          className={`w-4 h-4 transition-transform duration-300 ${
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
                  </div>
                
                  {/* Expanded Order Details */}
                  {expandedOrders.has(order.id) && (
                    <div className="border-t border-white/10 bg-white/[0.06] backdrop-blur-sm">
                      {/* Progress Bar for Expanded View - Mobile Hidden */}
                      <div className="hidden md:block p-5 pb-0">
                        <div className="relative group">
                          {/* Outer glow effect */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-emerald-500/30 to-purple-500/20 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                          
                          {/* Main container with liquid glass effect */}
                          <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl rounded-xl p-5 border border-white/10 shadow-2xl overflow-hidden">
                            {/* Dynamic gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
                            
                            {/* Neon accent lines */}
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
                            
                            {/* Liquid glass refraction effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-60"></div>
                            
                            {/* Content */}
                            <div className="relative z-10">
                              <CampaignProgressBar 
                                orderCreatedAt={order.createdAt}
                                orderStatus={order.status}
                                showMessage={true}
                                size="medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Track Cards Grid */}
                      <div className="p-5">
                        <h4 className="text-white font-semibold mb-4 text-lg">Track Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {order.items && order.items.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white/[0.03] rounded-2xl p-4 border border-white/15 backdrop-blur-sm">
                              <div className="flex items-center space-x-4">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-black/20 flex-shrink-0">
                                <img 
                                  src={item.track.imageUrl} 
                                  alt={item.track.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-white font-medium text-sm md:text-base truncate mb-2">{item.track.title}</h5>
                                  
                                  {/* Package Badge - Separate Container */}
                                  <div className="mb-3">
                                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 border border-[#59e3a5]/40 text-[#59e3a5] text-xs font-semibold">
                                      {item.package.name} Package
                                    </span>
                                  </div>
                                  
                                  {/* Campaign Benefits List - Separate Container */}
                                  <div className="bg-white/[0.05] rounded-lg p-3 border border-white/10">
                                    <div className="space-y-3 md:space-y-3">
                                      <div className="flex items-center space-x-2">
                                        <svg className="w-3 h-3 text-[#59e3a5] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-white/90 text-xs md:text-base font-medium">{item.package.plays}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <svg className="w-3 h-3 text-[#14c0ff] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-white/90 text-xs md:text-base font-medium">{item.package.placements}</span>
                                      </div>
                                    </div>
                                  </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                      
                      {/* Add-ons Section */}
                      {order.addOnItems && order.addOnItems.length > 0 && (
                        <div className="px-5 pb-5">
                          <h4 className="text-white font-semibold mb-4 text-lg">Add-ons</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {order.addOnItems.map((addon: any, idx: number) => (
                              <div key={idx} className="flex items-center space-x-3 bg-white/[0.06] rounded-xl p-3 border border-white/[0.15]">
                                <div className="w-10 h-10 bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 rounded-xl flex items-center justify-center border border-white/10">
                                  <span className="text-lg">{addon.emoji}</span>
                              </div>
                              <div className="flex-1">
                                  <p className="text-white font-medium text-sm">{addon.name}</p>
                                  <p className="text-[#59e3a5] text-xs font-medium">${addon.price >= 600 ? Math.round(addon.price / 100) : addon.price}</p>
                              </div>
                            </div>
                          ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
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
            onClick={() => router.push('/#start-campaign')}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className={`space-y-4 transition-all duration-500 ease-out ${
          campaignsAnimated 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-6'
        }`}>
          {orders.map((order, index) => (
            <div key={order.id}
              className={`campaign-card transition-all duration-600 ease-out ${
                campaignsAnimated 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-8'
              }`}
              style={{
                animationDelay: campaignsAnimated ? `${index * 100}ms` : '0ms',
                animation: campaignsAnimated ? `slideInCard 0.6s ease-out ${index * 0.1}s both` : 'none'
              }}
            >
              {/* Modern App-Style Campaign Card */}
              <div className="bg-white/[0.06] backdrop-blur-xl rounded-[20px] border border-white/[0.15] shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                {/* Card Header - Mobile Optimized */}
                <div 
                  className="p-5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  {/* Mobile: Artwork + Basic Info */}
                  <div className="md:hidden">
                    <div className="flex items-start space-x-4 mb-4">
                      {/* Artwork - Compact size for mobile */}
                      <div className="relative flex-shrink-0">
                        <div className="w-[80px] h-[80px] rounded-[16px] overflow-hidden bg-black/20 shadow-lg">
                          {order.items && order.items.length > 0 ? (
                            <div className={`w-full h-full ${order.items.length === 1 ? '' : 'grid grid-cols-2 gap-[1px]'}`}> 
                              {order.items.slice(0, 4).map((item: any, idx: number) => (
                                <div key={idx} className="bg-black/20 overflow-hidden">
                                  <img 
                                    src={item.track.imageUrl} 
                                    alt={item.track.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="w-full h-full bg-black/20 flex items-center justify-center">
                              <span className="text-white/60 text-lg">🎵</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Track Count Badge */}
                        {order.items && order.items.length > 1 && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-xs font-bold">{order.items.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Campaign Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg truncate mb-2">
                          Campaign #{order.orderNumber}
                        </h3>
                        
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-white/70">${order.total.toFixed(2)}</span>
                          <span className="text-white/50 text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Status on its own line - Mobile only */}
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getMobileStatusClasses(order.status)}`}>
                          <div className={`w-1.5 h-1.5 rounded-full status-glow ${getStatusBgClass(order.status)}`}></div>
                          <span className="text-xs">
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar - Mobile shows on main card */}
                    <div className="md:hidden mt-4 py-1.5">
                      <div className="relative group">
                        {/* Outer glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-emerald-500/30 to-purple-500/20 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                        
                                                                          {/* Main container with liquid glass effect */}
                          <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl rounded-xl p-4 border border-white/10 shadow-2xl overflow-hidden">
                          {/* Dynamic gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
                          
                          {/* Neon accent lines */}
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
                          
                          {/* Liquid glass refraction effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-60"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <CampaignProgressBar 
                              orderCreatedAt={order.createdAt}
                              orderStatus={order.status}
                              showMessage={true}
                              size="small"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                    {/* Desktop Artwork */}
                    <div className="md:col-span-2 flex justify-center">
                      <div className="w-[110px] h-[110px] rounded-xl overflow-hidden bg-black/20 shadow-lg relative">
                    {order.items && order.items.length > 0 ? (
                      <div className={`w-full h-full ${order.items.length === 1 ? '' : 'grid grid-cols-2 grid-rows-2 gap-1'}`}> 
                        {order.items.slice(0, 4).map((item: any, idx: number) => (
                              <div key={idx} className={`${getArtworkSize(Math.min(order.items.length, 4))} overflow-hidden bg-black/20`}>
                            <img 
                              src={item.track.imageUrl} 
                              alt={item.track.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                          <div className="w-full h-full bg-black/20 flex items-center justify-center">
                            <span className="text-white/60 text-lg">🎵</span>
                      </div>
                    )}
                    
                    {order.items && order.items.length > 4 && (
                          <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg">
                            <span className="text-white text-xs font-bold">+{order.items.length - 4}</span>
                      </div>
                    )}
                  </div>
                    </div>

                    {/* Desktop Order Info */}
                    <div className="flex-1 md:col-span-6">
                      <h3 className="text-white font-semibold text-lg mb-2">
                        Campaign #{order.orderNumber}
                      </h3>
                      <div className="text-sm text-white/70 mb-3">
                        ${order.total.toFixed(2)} • {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                      <div className={`relative group ${expandedOrders.has(order.id) ? 'hidden' : 'block'}`}>
                        {/* Outer glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-emerald-500/30 to-purple-500/20 rounded-lg blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                        
                        {/* Main container with liquid glass effect */}
                        <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl rounded-lg p-3 border border-white/10 shadow-2xl overflow-hidden">
                          {/* Dynamic gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
                          
                          {/* Neon accent lines */}
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
                          
                          {/* Liquid glass refraction effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-60"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <CampaignProgressBar 
                              orderCreatedAt={order.createdAt}
                              orderStatus={order.status}
                              showMessage={true}
                              size="small"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                  </div>

                    {/* Desktop Status & Controls */}
                    <div className="flex md:col-span-4 items-center justify-end space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusBgClass(order.status)}`} 
                        style={{
                          filter: 'drop-shadow(0 0 4px currentColor)',
                        }}></div>
                      <span className={`text-sm font-medium ${getStatusTextClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <svg 
                        className={`w-5 h-5 text-white/40 transition-transform duration-300 ${
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

                  {/* Expand/Collapse Indicator - Mobile */}
                  <div className="md:hidden flex justify-center items-center mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center space-x-2 text-white/60">
                      <span className="text-xs font-medium">
                        {expandedOrders.has(order.id) ? 'Show Less' : 'View Details'}
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform duration-300 ${
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
                </div>
              
                {/* Expanded Order Details */}
                {expandedOrders.has(order.id) && (
                  <div className="border-t border-white/10 bg-white/[0.06] backdrop-blur-sm">
                    {/* Progress Bar for Expanded View - Mobile Hidden */}
                    <div className="hidden md:block p-5 pb-0">
                      <div className="relative group">
                        {/* Outer glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-emerald-500/30 to-purple-500/20 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                        
                        {/* Main container with liquid glass effect */}
                        <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl rounded-xl p-5 border border-white/10 shadow-2xl overflow-hidden">
                          {/* Dynamic gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
                          
                          {/* Neon accent lines */}
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
                          
                          {/* Liquid glass refraction effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-60"></div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <CampaignProgressBar 
                              orderCreatedAt={order.createdAt}
                              orderStatus={order.status}
                              showMessage={true}
                              size="medium"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Track Cards Grid */}
                    <div className="p-5">
                      <h4 className="text-white font-semibold mb-4 text-lg">Track Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {order.items && order.items.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white/[0.03] rounded-2xl p-4 border border-white/15 backdrop-blur-sm">
                            <div className="flex items-center space-x-4">
                              <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-black/20 flex-shrink-0">
                              <img 
                                src={item.track.imageUrl} 
                                alt={item.track.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-white font-medium text-sm md:text-base truncate mb-2">{item.track.title}</h5>
                                
                                {/* Package Badge - Separate Container */}
                                <div className="mb-3">
                                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 border border-[#59e3a5]/40 text-[#59e3a5] text-xs font-semibold">
                                    {item.package.name} Package
                                  </span>
                                </div>
                                
                                {/* Campaign Benefits List - Separate Container */}
                                <div className="bg-white/[0.05] rounded-lg p-3 border border-white/10">
                                  <div className="space-y-3 md:space-y-3">
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-3 h-3 text-[#59e3a5] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-white/90 text-xs md:text-base font-medium">{item.package.plays}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-3 h-3 text-[#14c0ff] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-white/90 text-xs md:text-base font-medium">{item.package.placements}</span>
                                    </div>
                                  </div>
                                </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                    
                    {/* Add-ons Section */}
                    {order.addOnItems && order.addOnItems.length > 0 && (
                      <div className="px-5 pb-5">
                        <h4 className="text-white font-semibold mb-4 text-lg">Add-ons</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                  {order.addOnItems.map((addon: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-3 bg-white/[0.06] rounded-xl p-3 border border-white/[0.15]">
                              <div className="w-10 h-10 bg-gradient-to-r from-[#59e3a5]/20 to-[#14c0ff]/20 rounded-xl flex items-center justify-center border border-white/10">
                                <span className="text-lg">{addon.emoji}</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium text-sm">{addon.name}</p>
                                <p className="text-[#59e3a5] text-xs font-medium">${addon.price >= 600 ? Math.round(addon.price / 100) : addon.price}</p>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderFAQContent = () => (
    <div className="space-y-6 pb-8">
      <h2 className="block md:hidden text-2xl font-bold text-white text-center mt-8 mb-8">Frequently Asked Questions</h2>
      
      <div className="space-y-4">
        {[
          {
            question: "⏱️ How quickly will my music be placed on playlists?",
            answer: "Your campaign begins within 24 hours of purchase, and your first playlist placements typically occur within 48-72 hours from then. Timing can vary depending on curator availability and your specific genre. Most placements happen even faster, while some very rare cases may take up to a week as we ensure proper targeting."
          },
          {
            question: "📈 When will I start seeing streams from playlist placements?",
            answer: "Streams begin immediately once your track is added to a playlist. The volume depends on the playlist size and listener activity, but you should see streaming data appear in your Spotify for Artists dashboard within 24-48 hours of placement."
          },
          {
            question: "📋 How do you submit music to playlists?",
            answer: "We use a personalized outreach approach, contacting each curator individually through phone, email, or direct messaging. Our team has established relationships with playlist curators built over 10+ years in the industry. This personal approach results in higher acceptance rates compared to mass submission methods."
          },
          {
            question: "📊 How can I track my playlist placements?",
            answer: "We recommend all of our clients use the Spotify for Artists (free app/web platform) to monitor which playlists have added your music. This tool shows playlist names, follower counts, and streaming data."
          },
          {
            question: "🌍 Do you work with international artists?",
            answer: "Yes, we work with artists, podcasters, and record labels worldwide. Our playlist network includes curators from multiple countries and regions, covering both local and international playlists."
          },
          {
            question: "🎼 What genres do you support?",
            answer: "We work with all music genres and sub-genres. Our curator network spans hip-hop, pop, rock, electronic, country, jazz, classical, indie, metal, folk, reggae, Latin, world music, and more. We match your music with genre-appropriate playlists."
          },
          {
            question: "💰 Will I earn royalties from the streams?",
            answer: "Yes, all streams generated from playlist placements count as regular Spotify streams and generate royalties through your normal distribution service (DistroKid, CD Baby, etc.). Royalty rates follow Spotify's standard payment structure."
          },
          {
            question: "🛡️ Is this service safe for my Spotify account?",
            answer: "Yes, our service complies with Spotify's terms of service. We work exclusively with legitimate playlists managed by real curators - no bots, artificial streams, or policy violations. All placements are organic and curator-driven."
          },
          {
            question: "🎧 Do you work with podcasts too?",
            answer: "Yes, we have curators who specialize in podcast playlists across various topics and formats. The same process applies - we'll match your podcast with relevant playlist curators in your niche."
          },
          {
            question: "⏰ How long does the campaign last?",
            answer: "All of our marketing campaigns run in 30-day cycles. We will continue to market your material until it reaches the estimated plays included in your package tier, and then marketing will cease. We guarantee you'll reach the estimated amount of streams by the end of the 30-day cycle. But almost all campaigns are completed within only 7-10 days with all streams delivered and clients seeing their full results."
          },
          {
            question: "📞 How do I contact support?",
            answer: "Email support@fasho.co for any questions or account issues. Our team typically responds within 24 hours during business days (M-F)."
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
      {/* Mobile-only Contact Support heading */}
      <h2 className="block md:hidden text-2xl font-bold text-white text-center mt-8 mb-8">Contact Support</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
          <h3 className="hidden md:block text-xl font-semibold text-white mb-6">Speak To Our Team ✉️</h3>
          
          {/* Success/Error Message */}
          {contactFormMessage && (
            <div className={`mb-6 p-4 rounded-xl border ${
              contactFormMessage.type === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <p className="text-sm">{contactFormMessage.text}</p>
            </div>
          )}
          
          <form onSubmit={handleContactFormSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
              <input 
                type="text" 
                value={contactForm.name}
                onChange={(e) => handleContactFormChange('name', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                placeholder="Your full name"
                required
                disabled={contactFormLoading}
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
              <input 
                type="email" 
                value={contactForm.email}
                onChange={(e) => handleContactFormChange('email', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                placeholder="your@email.com"
                required
                disabled={contactFormLoading}
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Subject</label>
              <select 
                value={contactForm.subject}
                onChange={(e) => handleContactFormChange('subject', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                required
                disabled={contactFormLoading}
              >
                <option value="Campaign Support">Campaign Support</option>
                <option value="Billing Question">Billing Question</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="General Inquiry">General Inquiry</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Message</label>
              <textarea 
                rows={4}
                value={contactForm.message}
                onChange={(e) => handleContactFormChange('message', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors resize-none"
                placeholder="How can we help you?"
                required
                disabled={contactFormLoading}
              ></textarea>
            </div>
            
            <button 
              type="submit"
              disabled={contactFormLoading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center"
            >
              {contactFormLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Send Message'
              )}
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
                <span className="text-2xl">⏰</span>
                <span className="text-gray-300">Monday to Friday 9am to 7pm PST</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
            <h4 className="text-lg font-semibold text-white mb-4">Response Times</h4>
            <div className="space-y-3">
              <p className="text-gray-300">We generally respond to all support ticket requests within 24hrs during the business week.</p>
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
        className="flex items-center space-x-3 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-full"
      >
        {renderProfileAvatar('medium')}
        <div className="text-right">
          <p className="text-white font-medium text-sm truncate">
            {userDisplayName}
          </p>
          {artistProfile && (
            <p className="text-green-400 text-xs truncate">
              {artistProfile.name}
            </p>
          )}
        </div>
      </button>
      
      {showUserDropdown && (
        <div className="fixed top-16 right-4 lg:top-20 lg:right-6 w-64 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-xl z-[9999]">
          {/* User Info Section */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              {renderProfileAvatar('medium')}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {userDisplayName}
                </p>
                <p className="text-gray-400 text-xs truncate">{user.email}</p>
                {artistProfile && (
                  <p className="text-green-400 text-xs truncate">
                    {artistProfile.name}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Menu Items */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                setShowUserDropdown(false)
                changeTab('dashboard')
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">Campaigns</span>
            </button>
            
            <button
              onClick={() => {
                setShowUserDropdown(false)
                changeTab('faq')
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">FAQ</span>
            </button>
            
            <button
              onClick={() => {
                setShowUserDropdown(false)
                changeTab('contact')
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25A9.75 9.75 0 1 0 21.75 12A9.75 9.75 0 0 0 12 2.25Z" />
              </svg>
              <span className="text-sm font-medium">Get Help</span>
            </button>
            
            <button
              onClick={() => {
                setShowUserDropdown(false)
                changeTab('settings')
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">Settings</span>
            </button>
            
            <div className="border-t border-gray-700/50 mt-2 pt-2">
              <button
                onClick={() => {
                  setShowUserDropdown(false)
                  updateUrlHash('logout')
                  setShowSignOutModal(true)
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800/50 hover:text-red-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
                <span className="text-sm font-medium">Logout</span>
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderMobileSettingsDropup = () => (
    <div className="fixed inset-0 z-[9999] lg:hidden">
      {/* Backdrop with fade in */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out"
        onClick={() => setShowMobileSettingsDropdown(false)}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      
      {/* Dropup Menu with slide up animation */}
      <div 
        className="absolute bottom-20 left-4 right-4 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl transform transition-all duration-300 ease-out"
        style={{ 
          animation: 'slideUpIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: 'bottom center'
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Settings</h3>
            <button
              onClick={() => setShowMobileSettingsDropdown(false)}
              className="w-8 h-8 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 active:scale-90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            {settingsDropdownItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  setShowMobileSettingsDropdown(false);
                  if (item.id === 'signout') {
                    updateUrlHash('logout')
                    setShowSignOutModal(true);
                  } else {
                    changeTab(item.id);
                  }
                }}
                className="w-full flex items-center space-x-4 px-4 py-4 rounded-xl text-left text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200 active:scale-[0.97] transform"
                style={{ 
                  animation: `slideInItem 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + index * 0.05}s both`
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <span className="font-medium text-base flex-1">{item.label}</span>
                <div className="text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUpIn {
          from { 
            transform: translateY(100%) scale(0.95);
            opacity: 0;
          }
          to { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes slideInItem {
          from { 
            transform: translateX(-20px);
            opacity: 0;
          }
          to { 
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
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

  const renderResetModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold text-white mb-4">Reset Contact Status</h3>
        <p className="text-gray-300 mb-6">
          This will erase the "Contacted" checkmark from all the curators you've already reached out to. 
          You won't know which curators you've already emailed.
        </p>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setShowResetModal(false)}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResetContactStatus}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )

  // Function to fetch user profile
  const fetchUserProfile = async () => {
    setProfileLoading(true)
    try {
      const response = await fetch('/api/user-profile')
      const data = await response.json()
      
      if (data.success) {
        setUserProfile(data.profile)
        // Initialize form data with current profile values
        setFormData({
          first_name: data.profile?.first_name || '',
          last_name: data.profile?.last_name || '',
          billing_address_line1: data.profile?.billing_address_line1 || '',
          billing_address_line2: data.profile?.billing_address_line2 || '',
          billing_city: data.profile?.billing_city || '',
          billing_state: data.profile?.billing_state || '',
          billing_zip: data.profile?.billing_zip || '',
          billing_country: data.profile?.billing_country || '',
          billing_phone: data.profile?.billing_phone || '',
          email_notifications: data.profile?.email_notifications ?? true,
          marketing_emails: data.profile?.marketing_emails ?? true
        })
        setHasUnsavedChanges(false)
      } else {
        setProfileUpdateMessage({ type: 'error', text: 'Failed to load profile data' })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfileUpdateMessage({ type: 'error', text: 'Failed to load profile data' })
    } finally {
      setProfileLoading(false)
    }
  }

  // Fetch user profile when settings tab is active
  React.useEffect(() => {
    if (activeTab === 'settings' && !userProfile) {
      fetchUserProfile()
    }
  }, [activeTab, userProfile])

  // Function to handle form field changes
  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }))
    setHasUnsavedChanges(true)
    // Clear any existing messages when user starts typing
    setProfileUpdateMessage(null)
  }

  // Function to save all profile changes
  const handleSaveProfile = async () => {
    setProfileUpdateLoading(true)
    setProfileUpdateMessage(null)
    
    try {
      console.log('Saving profile data:', formData)
      
      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      console.log('Profile save response:', data)
      
      if (data.success) {
        setUserProfile(data.profile)
        setHasUnsavedChanges(false)
        setProfileUpdateMessage({ type: 'success', text: 'Profile updated successfully!' })
        
        // Update form data with the returned profile to ensure consistency
        setFormData({
          first_name: data.profile?.first_name || '',
          last_name: data.profile?.last_name || '',
          billing_address_line1: data.profile?.billing_address_line1 || '',
          billing_address_line2: data.profile?.billing_address_line2 || '',
          billing_city: data.profile?.billing_city || '',
          billing_state: data.profile?.billing_state || '',
          billing_zip: data.profile?.billing_zip || '',
          billing_country: data.profile?.billing_country || '',
          billing_phone: data.profile?.billing_phone || '',
          email_notifications: data.profile?.email_notifications ?? true,
          marketing_emails: data.profile?.marketing_emails ?? true
        })
        
        // Force a refresh of the header by triggering a custom event
        window.dispatchEvent(new CustomEvent('userProfileUpdated'));
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setProfileUpdateMessage({ 
            type: 'success', 
            text: 'Profile updated successfully!' 
          })
        }, 2000)
      } else {
        setProfileUpdateMessage({ type: 'error', text: data.error || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setProfileUpdateMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setProfileUpdateLoading(false)
    }
  }

  // Function to handle email changes
  const handleEmailChange = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setProfileUpdateMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    setEmailChangeLoading(true)
    setProfileUpdateMessage(null)
    
    try {
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_email', new_email: newEmail })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setShowEmailChangeModal(false)
        setNewEmail('')
        setProfileUpdateMessage({ 
          type: 'success', 
          text: 'Email change confirmation sent!' 
        })
      } else {
        setProfileUpdateMessage({ type: 'error', text: data.error || 'Failed to initiate email change' })
      }
    } catch (error) {
      console.error('Error changing email:', error)
      setProfileUpdateMessage({ type: 'error', text: 'Failed to initiate email change' })
    } finally {
      setEmailChangeLoading(false)
    }
  }

  const renderSettingsContent = () => {

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-[50px]">
        {/* Mobile-only Settings Heading */}
        <div className="lg:hidden mb-8">
          <h1 className="text-3xl font-bold text-white text-center">Settings</h1>
        </div>
        
        {/* Loading State */}
        {profileLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
          </div>
        )}

        {/* Profile Form */}
        {!profileLoading && userProfile && (
          <>
            {/* Success/Error Messages */}
            {profileUpdateMessage && (
              <div className={`p-4 rounded-xl border ${
                profileUpdateMessage.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {profileUpdateMessage.text}
              </div>
            )}

            {/* Personal Information */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Personal Information
              </h3>
              
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                   <input
                     type="text"
                     value={formData.first_name || ''}
                     onChange={(e) => handleFieldChange('first_name', e.target.value)}
                     className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
                     placeholder="Enter first name"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                   <input
                     type="text"
                     value={formData.last_name || ''}
                     onChange={(e) => handleFieldChange('last_name', e.target.value)}
                     className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
                     placeholder="Enter last name"
                   />
                 </div>
               </div>
               
               {/* Save Button for Personal Information */}
               <div className="flex justify-end mt-4">
                 <button
                   onClick={handleSaveProfile}
                   disabled={profileUpdateLoading || !hasUnsavedChanges}
                   className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                     profileUpdateLoading || !hasUnsavedChanges
                       ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                       : 'bg-green-600 hover:bg-green-700 text-white'
                   }`}
                 >
                   {profileUpdateLoading ? 'Saving...' : 'Save Changes'}
                 </button>
               </div>
            </div>

            {/* Email Settings */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Current Email</label>
                  <p className="text-white bg-gray-800/50 p-3 rounded-lg">{user.email}</p>
                </div>
                
                <button
                  onClick={() => setShowEmailChangeModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Change Email Address
                </button>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Billing Address
              </h3>
              
                             <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 1</label>
                     <input
                       type="text"
                       value={formData.billing_address_line1 || ''}
                       onChange={(e) => handleFieldChange('billing_address_line1', e.target.value)}
                       className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                       placeholder="Enter street address"
                     />
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 2 (Optional)</label>
                     <input
                       type="text"
                       value={formData.billing_address_line2 || ''}
                       onChange={(e) => handleFieldChange('billing_address_line2', e.target.value)}
                       className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                       placeholder="Apartment, suite, etc."
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                     <input
                       type="text"
                       value={formData.billing_city || ''}
                       onChange={(e) => handleFieldChange('billing_city', e.target.value)}
                       className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                       placeholder="Enter city"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">State/Province</label>
                     <input
                       type="text"
                       value={formData.billing_state || ''}
                       onChange={(e) => handleFieldChange('billing_state', e.target.value)}
                       className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                       placeholder="Enter state or province"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">ZIP/Postal Code</label>
                     <input
                       type="text"
                       value={formData.billing_zip || ''}
                       onChange={(e) => handleFieldChange('billing_zip', e.target.value)}
                       className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                       placeholder="Enter ZIP or postal code"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                     <input
                       type="text"
                       value={formData.billing_country || ''}
                       onChange={(e) => handleFieldChange('billing_country', e.target.value)}
                       className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                       placeholder="Enter country"
                     />
                   </div>
                 </div>
                 
                 {/* Save Button for Billing Address */}
                 <div className="flex justify-end mt-4">
                   <button
                     onClick={handleSaveProfile}
                     disabled={profileUpdateLoading || !hasUnsavedChanges}
                     className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                       profileUpdateLoading || !hasUnsavedChanges
                         ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                         : 'bg-purple-600 hover:bg-purple-700 text-white'
                     }`}
                   >
                     {profileUpdateLoading ? 'Saving...' : 'Save Changes'}
                   </button>
                 </div>
               </div>
            </div>
          </>
        )}

        {/* Email Change Modal */}
        {showEmailChangeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Change Email Address</h3>
              <p className="text-gray-300 mb-6">
                Enter your new email address. You'll receive a confirmation at your new email address with a link to click!
              </p>
              
              <div className="relative mb-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                  className={`w-full bg-gray-800 border rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none transition-colors ${
                    newEmailStatus === 'available' ? 'border-green-500 focus:border-green-500' :
                    newEmailStatus === 'exists' || newEmailStatus === 'invalid' || newEmailStatus === 'same' ? 'border-red-500 focus:border-red-500' :
                    'border-gray-600 focus:border-blue-500'
                  }`}
                />
              </div>
              
              {/* Email Status Messages */}
              <div className="mb-6 min-h-[20px]">
                {isCheckingNewEmail && (
                  <div className="flex items-center text-blue-400 text-sm">
                    <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent mr-2"></div>
                    Checking email...
                  </div>
                )}
                
                {newEmailStatus === 'available' && (
                  <div className="flex items-center text-green-400 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Email is available
                  </div>
                )}
                
                {newEmailStatus === 'exists' && (
                  <div className="flex items-center text-red-400 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Email already exists
                  </div>
                )}
                
                {newEmailStatus === 'same' && (
                  <div className="flex items-center text-red-400 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    This is the email you already have on your account
                  </div>
                )}
                
                {newEmailStatus === 'invalid' && (
                  <div className="flex items-center text-red-400 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Please enter a valid email address
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowEmailChangeModal(false)
                    setNewEmail('')
                    setNewEmailStatus(null)
                    setIsCheckingNewEmail(false)
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailChange}
                  disabled={emailChangeLoading || newEmailStatus !== 'available'}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-300 transform ${
                    newEmailStatus === 'available' && !emailChangeLoading
                      ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {emailChangeLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Confirmation'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPackagesContent = () => {
    // Package data from pricing page
    const packages = [
      {
        name: "LEGENDARY",
        price: 479,
        streams: "125,000 - 150,000 Streams",
        pitches: "375 - 400 Playlist Pitches",
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included"
        ]
      },
      {
        name: "UNSTOPPABLE",
        price: 259,
        streams: "45,000 - 50,000 Streams",
        pitches: "150 - 170 Playlist Pitches",
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included"
        ]
      },
      {
        name: "DOMINATE",
        price: 149,
        streams: "18,000 - 20,000 Streams",
        pitches: "60 - 70 Playlist Pitches",
        popular: true,
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included"
        ]
      },
      {
        name: "MOMENTUM",
        price: 79,
        streams: "7,500 - 8,500 Streams",
        pitches: "25 - 30 Playlist Pitches",
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included"
        ]
      },
      {
        name: "BREAKTHROUGH",
        price: 39,
        streams: "3,000 - 3,500 Streams",
        pitches: "10-12 Playlist Pitches",
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included"
        ]
      }
    ];

    // Comparison table data
    const comparisonPackages = [
      {
        name: "LEGENDARY",
        price: 479,
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included",
          "Priority curator outreach",
          "Major playlist targeting",
          "Industry influencer reach",
          "VIP curator network access",
          "Dedicated account manager"
        ]
      },
      {
        name: "UNSTOPPABLE",
        price: 259,
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included",
          "Priority curator outreach",
          "Major playlist targeting",
          "Industry influencer reach"
        ]
      },
      {
        name: "DOMINATE",
        price: 149,
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included",
          "Priority curator outreach"
        ]
      },
      {
        name: "MOMENTUM",
        price: 79,
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included"
        ]
      },
      {
        name: "BREAKTHROUGH",
        price: 39,
        features: [
          "Campaign starts within only 24 hours",
          "All streams achieved in only 7-10 days",
          "Established playlist curators",
          "All genres supported",
          "Spotify-safe guarantee",
          "Dashboard tracking included"
        ]
      }
    ];

    const allFeatures = [
      "Campaign starts within only 24 hours",
      "All streams achieved in only 7-10 days",
      "Established playlist curators",
      "All genres supported",
      "Spotify-safe guarantee",
      "Dashboard tracking included",
      "Priority curator outreach",
      "Major playlist targeting",
      "Industry influencer reach",
      "VIP curator network access",
      "Dedicated account manager"
    ];

    const handleGetStarted = (packageName: string) => {
      router.push('/#start-campaign');
    };

    return (
      <div className="space-y-8 pb-8">
        {/* Heading above Pricing Cards */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white text-center mt-8 mb-8">Choose Your Next Campaign</h2>
        </div>
        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto">
          {/* First Row - 3 Cards */}
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            {packages.slice(0, 3).map((pkg, index) => (
              <div
                key={index}
                className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-[#14c0ff]/20 w-full sm:w-80 flex flex-col ${
                  pkg.popular 
                    ? 'border-[#59e3a5] shadow-2xl shadow-[#59e3a5]/20' 
                    : 'border-white/20 hover:border-[#14c0ff]/50'
                }`}
                style={{ minHeight: '520px' }}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-4 py-1 rounded-full text-sm font-bold">
                      POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.name}</h3>
                  <div className="mb-6 py-4">
                    <span className="text-5xl font-black text-white">${pkg.price}</span>
                    <span className="text-gray-400 text-sm">/campaign</span>
                  </div>
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl border border-white/20 p-4 space-y-2">
                    <p className="text-base font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.streams}</p>
                    <p className="text-base font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.pitches}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-grow">
                  {pkg.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleGetStarted(pkg.name)}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 mt-auto ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white hover:shadow-lg hover:shadow-[#14c0ff]/30'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-[#14c0ff]/50'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
          
          {/* Second Row - 2 Cards */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {packages.slice(3, 5).map((pkg, index) => (
              <div
                key={index + 3}
                className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-[#14c0ff]/20 w-full sm:w-80 flex flex-col ${
                  pkg.popular 
                    ? 'border-[#59e3a5] shadow-2xl shadow-[#59e3a5]/20' 
                    : 'border-white/20 hover:border-[#14c0ff]/50'
                }`}
                style={{ minHeight: '520px' }}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white px-4 py-1 rounded-full text-sm font-bold">
                      POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.name}</h3>
                  <div className="mb-6 py-4">
                    <span className="text-5xl font-black text-white">${pkg.price}</span>
                    <span className="text-gray-400 text-sm">/campaign</span>
                  </div>
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl border border-white/20 p-4 space-y-2">
                    <p className="text-base font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.streams}</p>
                    <p className="text-base font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">{pkg.pitches}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-grow">
                  {pkg.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleGetStarted(pkg.name)}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 mt-auto ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-white hover:shadow-lg hover:shadow-[#14c0ff]/30'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-[#14c0ff]/50'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Comparison Table */}
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-black mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
              Campaign Comparison
            </h2>
            <p className="text-lg text-gray-300">
              Compare all features across our packages
            </p>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left p-6 text-white font-semibold">Features</th>
                    {comparisonPackages.slice().reverse().map((pkg, index) => (
                      <th key={index} className="text-center p-6 text-white font-semibold min-w-[150px]">
                        <div className="mb-2">{pkg.name}</div>
                        <div className="text-2xl font-black bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                          ${pkg.price}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((feature, featureIndex) => (
                    <tr key={featureIndex} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="p-6 text-gray-300 font-medium">{feature}</td>
                      {comparisonPackages.slice().reverse().map((pkg, pkgIndex) => (
                        <td key={pkgIndex} className="p-6 text-center">
                          {pkg.features.includes(feature) ? (
                            <div className="w-6 h-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12 px-4">
          <h3 className="text-2xl md:text-3xl font-black mb-4 text-white">
            Ready to <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Go Viral?</span>
          </h3>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
            Join thousands of artists who've already gone from unknown to unstoppable with FASHO.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105"
          >
            Start Your Campaign
          </button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent()
      case 'campaigns':
        return renderCampaignsContent()
      case 'curator-connect':
        return renderCuratorConnectContent()
      case 'power-tools':
        return <PowerToolsTab />
      case 'packages':
        return renderPackagesContent()
      case 'faq':
        return renderFAQContent()
      case 'contact':
        return renderContactContent()
      case 'settings':
        return renderSettingsContent()
      default:
        return renderDashboardContent()
    }
  }

  // Contact form handlers
  const handleContactFormChange = (field: string, value: string) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear any existing messages when user starts typing
    if (contactFormMessage) {
      setContactFormMessage(null)
    }
  }

  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactFormLoading(true)
    setContactFormMessage(null)

    try {
      // Validate form
      if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.subject.trim() || !contactForm.message.trim()) {
        setContactFormMessage({
          type: 'error',
          text: 'Please fill in all fields before submitting.'
        })
        setContactFormLoading(false)
        return
      }

      console.log('📞 DASHBOARD: Submitting contact form:', {
        name: contactForm.name,
        email: contactForm.email,
        subject: contactForm.subject,
        messageLength: contactForm.message.length
      })

      const response = await fetch('/api/contact-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit support request')
      }

      console.log('✅ DASHBOARD: Contact form submitted successfully:', data.ticketId)

      setContactFormMessage({
        type: 'success',
        text: `Your support request has been submitted successfully! Ticket ID: #${data.ticketId}. Our team will respond within 24 hours.`
      })

      // Reset form
      setContactForm({
        name: user.user_metadata?.full_name || '',
        email: user.email || '',
        subject: 'General Inquiry',
        message: ''
      })

    } catch (error) {
      console.error('🚨 DASHBOARD: Contact form submission error:', error)
      setContactFormMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to submit support request. Please try again or email support@fasho.co directly.'
      })
    } finally {
      setContactFormLoading(false)
    }
  }

  // Handle intake form completion
  const handleIntakeFormComplete = (responses: Record<string, any>) => {
    console.log('📋 DASHBOARD: Intake form completed:', responses);
    setShowIntakeForm(false);
  };

  // Curator Connect+ functions
  const fetchCuratorData = async () => {
    try {
      setCuratorDataLoading(true)
      const response = await fetch('/api/curator-connect')
      const data = await response.json()
      
      if (data.success) {
        setCuratorData(data.data)
        console.log('🎵 DASHBOARD: Fetched curator data:', data.data.length, 'entries')
      } else {
        console.error('🚨 DASHBOARD: Failed to fetch curator data:', data.error)
      }
    } catch (error) {
      console.error('🚨 DASHBOARD: Error fetching curator data:', error)
    } finally {
      setCuratorDataLoading(false)
    }
  }

  // Helper function to parse genres from comma-separated string
  const parseGenres = (genreString: string): string[] => {
    if (!genreString) return []
    return genreString.split(',').map(genre => genre.trim()).filter(Boolean)
  }

  // Helper function to get all unique genres from curator data
  const getAllUniqueGenres = (): string[] => {
    const allGenres = curatorData.flatMap(curator => parseGenres(curator.genre))
    return [...new Set(allGenres)].sort()
  }

  // Helper function to handle genre bubble click
  // Calculate dropdown positions
  const updateGenreDropdownPosition = () => {
    if (genreDropdownRef.current) {
      const rect = genreDropdownRef.current.getBoundingClientRect()
      setGenreDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }

  const updateStatusDropdownPosition = () => {
    if (statusDropdownRef.current) {
      const rect = statusDropdownRef.current.getBoundingClientRect()
      setStatusDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }

  // Update dropdown positions on scroll and resize
  useEffect(() => {
    if (showGenreDropdown || showStatusDropdown) {
      const handleScroll = () => {
        if (showGenreDropdown) updateGenreDropdownPosition()
        if (showStatusDropdown) updateStatusDropdownPosition()
      }
      
      const handleResize = () => {
        if (showGenreDropdown) updateGenreDropdownPosition()
        if (showStatusDropdown) updateStatusDropdownPosition()
      }

      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [showGenreDropdown, showStatusDropdown])

  const handleGenreClick = (genre: string) => {
    setCuratorFilters(prev => {
      // If this is the first genre being selected, replace all filters
      if (prev.genres.length === 0) {
        return {
          ...prev,
          genres: [genre]
        }
      }
      // Otherwise, add to existing filters (toggle if already present)
      return {
        ...prev,
        genres: prev.genres.includes(genre)
          ? prev.genres.filter(g => g !== genre)
          : [...prev.genres, genre]
      }
    })
  }

  // Helper function to handle genre filter toggle
  const toggleGenreFilter = (genre: string) => {
    setCuratorFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  // Toggle dropdown functions with position calculation
  const toggleGenreDropdown = () => {
    if (!showGenreDropdown) {
      updateGenreDropdownPosition()
    }
    setShowGenreDropdown(!showGenreDropdown)
  }

  const toggleStatusDropdown = () => {
    if (!showStatusDropdown) {
      updateStatusDropdownPosition()
    }
    setShowStatusDropdown(!showStatusDropdown)
  }

  const fetchContactedCurators = async () => {
    try {
      console.log('🎵 DASHBOARD: Fetching contacted curators for user:', user.id)
      const response = await fetch(`/api/curator-contacts?userId=${user.id}`)
      const data = await response.json()
      
      console.log('🎵 DASHBOARD: Fetch response:', data)
      
      if (data.success) {
        setContactedCurators(data.data)
        console.log('🎵 DASHBOARD: Fetched contacted curators:', Object.keys(data.data).length, 'entries')
      } else {
        console.error('🚨 DASHBOARD: Failed to fetch contacted curators:', data.error)
      }
    } catch (error) {
      console.error('🚨 DASHBOARD: Error fetching contacted curators:', error)
    }
  }

  const handleContactCurator = async (curator: any) => {
    try {
      // Track the contact
      await fetch('/api/curator-contact-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curatorId: curator.id, userId: user.id })
      })

      // Update local state
      setContactedCurators(prev => ({
        ...prev,
        [curator.id]: {
          contacted: true,
          contactedAt: new Date().toISOString(),
          contactCount: (prev[curator.id]?.contactCount || 0) + 1
        }
      }))

      // Create email body with placeholders
      const emailBody = `Hey there!

Hope you're having a great day!

My name is [Your Name], and I'm an independent artist looking to connect with new listeners. I found your playlist and I think my latest release would be a perfect fit for your audience.

The playlist name is:  
${curator.playlistName}

Here's a link to it:  
${curator.playlistUrl}


Here's my song that I think would fit perfectly on your playlist: 

Song Title:  
[Your Song Title]

Spotify Song Link:  
[Your Spotify Song Link]

A little about my music:  
[Short intro about your sound, style, or what makes this track special]

If you have a moment to check it out, I'd really appreciate any feedback or the chance to be included in your playlist. Thanks for supporting indie artists like me and helping new music get discovered!

Looking forward to hearing from you.

Best regards,  
[Your Name or Artist Name]  
[Optional: Instagram/Twitter handle or contact info]`

      // Open email client with subject and body
      const mailtoUrl = `mailto:${curator.contactEmail}?subject=Playlist Submission Request&body=${encodeURIComponent(emailBody)}`
      window.open(mailtoUrl, '_blank')
      
      console.log('🎵 DASHBOARD: Contacted curator:', curator.id)
    } catch (error) {
      console.error('🚨 DASHBOARD: Error contacting curator:', error)
    }
  }

  const handleResetContactStatus = async () => {
    try {
      console.log('🎵 DASHBOARD: Starting reset for user:', user.id)
      
      // Reset in database via API
      const response = await fetch(`/api/curator-contacts-reset?userId=${user.id}`, {
        method: 'DELETE'
      })

      const responseData = await response.json()
      console.log('🎵 DASHBOARD: Reset API response:', responseData)

      if (!response.ok) {
        console.error('🚨 DASHBOARD: Error resetting contact status:', responseData)
        return
      }

      // Reset local state
      setContactedCurators({})
      setShowResetModal(false)
      
      // Refresh the contacted curators data to ensure UI is updated
      await fetchContactedCurators()
      
      console.log('🎵 DASHBOARD: Reset contact status completed for user:', user.id)
    } catch (error) {
      console.error('🚨 DASHBOARD: Error resetting contact status:', error)
    }
  }

  const getFilteredAndSortedCurators = () => {
    let filtered = curatorData.filter(curator => {
      // Search filter
      if (curatorSearch && !curator.playlistName.toLowerCase().includes(curatorSearch.toLowerCase())) {
        return false
      }
      
      // Genre filter - check if any of the curator's genres match the selected genres
      if (curatorFilters.genres.length > 0) {
        const curatorGenres = parseGenres(curator.genre)
        const hasMatchingGenre = curatorFilters.genres.some(selectedGenre => 
          curatorGenres.includes(selectedGenre)
        )
        if (!hasMatchingGenre) {
          return false
        }
      }
      
      // Saves range filter
      if (curatorFilters.minSaves && curator.playlistSaves < parseInt(curatorFilters.minSaves)) {
        return false
      }
      if (curatorFilters.maxSaves && curator.playlistSaves > parseInt(curatorFilters.maxSaves)) {
        return false
      }
      
      // Status filter
      if (curatorFilters.status === 'contacted' && !contactedCurators[curator.id]) {
        return false
      }
      if (curatorFilters.status === 'not-contacted' && contactedCurators[curator.id]) {
        return false
      }
      
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[curatorSort.field]
      let bVal = b[curatorSort.field]
      
      if (curatorSort.field === 'playlistSaves') {
        aVal = parseInt(aVal) || 0
        bVal = parseInt(bVal) || 0
      }
      
      if (curatorSort.direction === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }

  const renderCuratorConnectContent = () => {
    const filteredCurators = getFilteredAndSortedCurators()
    const allUniqueGenres = getAllUniqueGenres()

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
                      <h3 className="text-xl font-bold text-white mb-2">
              <span className="hidden lg:inline">Spotify Playlist Curators</span>
              <span className="lg:hidden">Curator Connect+</span>
            </h3>
                          <p className="text-gray-400">Dive into our exclusive indie playlist network. Handpicked, always fresh, and 100% FREE for FASHO.co members. Find your vibe, hit "Contact," and get your music in front of real curators. This is your personal plug to playlists that break new artists.</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search Playlists</label>
              <input
                type="text"
                placeholder="Search by playlist name..."
                value={curatorSearch}
                onChange={(e) => setCuratorSearch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Genre Filter */}
            <div className="relative genre-dropdown-container">
              <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
              <button
                ref={genreDropdownRef}
                onClick={toggleGenreDropdown}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-between"
              >
                <span className={curatorFilters.genres.length > 0 ? 'text-white' : 'text-gray-400'}>
                  {curatorFilters.genres.length > 0 
                    ? `${curatorFilters.genres.length} selected` 
                    : 'All Genres'
                  }
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Min Followers */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Min Followers</label>
              <input
                type="number"
                placeholder="Minimum followers"
                value={curatorFilters.minSaves}
                onChange={(e) => setCuratorFilters(prev => ({ ...prev, minSaves: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative status-dropdown-container">
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <button
                ref={statusDropdownRef}
                onClick={toggleStatusDropdown}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-between"
              >
                <span className={curatorFilters.status !== 'all' ? 'text-white' : 'text-gray-400'}>
                  {curatorFilters.status === 'all' && 'All'}
                  {curatorFilters.status === 'not-contacted' && 'Not Contacted'}
                  {curatorFilters.status === 'contacted' && 'Already Contacted'}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-gray-300">Sort by:</span>
            <button
              onClick={() => setCuratorSort({ field: 'playlistSaves', direction: curatorSort.direction === 'asc' ? 'desc' : 'asc' })}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                curatorSort.field === 'playlistSaves'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Followers {curatorSort.field === 'playlistSaves' && (curatorSort.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => setCuratorSort({ field: 'playlistName', direction: curatorSort.direction === 'asc' ? 'desc' : 'asc' })}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                curatorSort.field === 'playlistName'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Name {curatorSort.field === 'playlistName' && (curatorSort.direction === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Showing {filteredCurators.length} of {curatorData.length} curators
          </div>
          
          {/* Subtle Reset Button - Only show if there are contacted curators */}
          {Object.keys(contactedCurators).length > 0 && (
            <button
              onClick={() => setShowResetModal(true)}
              className="text-sm text-red-400 hover:text-red-300 transition-colors underline"
            >
              Reset Contact Status
            </button>
          )}
        </div>

        {/* Curators Table - Desktop */}
        <div className="hidden lg:block bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-800/30 overflow-hidden">
          {curatorDataLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading curator data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Playlist</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Genre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Followers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {filteredCurators.map((curator) => {
                    const isContacted = contactedCurators[curator.id]
                    return (
                      <tr key={curator.id} className="hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={curator.playlistImageUrl}
                              alt={curator.playlistName}
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/fasho-logo-wide.png'
                              }}
                            />
                            <div className="flex-1">
                              <a
                                href={curator.playlistUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white font-medium hover:text-green-400 transition-colors text-[1.08rem]"
                              >
                                {curator.playlistName}
                              </a>
                              <div className="mt-1">
                                <a
                                  href={curator.playlistUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white rounded transition-colors"
                                >
                                  View Playlist
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {parseGenres(curator.genre).map((genre, index) => {
                              const isFiltered = curatorFilters.genres.includes(genre)
                              return (
                                <button
                                  key={index}
                                  onClick={() => handleGenreClick(genre)}
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                                    isFiltered
                                      ? 'bg-gray-700 text-gray-300 border border-green-400/50 shadow-sm'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                  }`}
                                  title={`Filter by ${genre}`}
                                >
                                  {genre}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white">
                          {curator.playlistSaves.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {isContacted ? (
                            <div className="flex items-center space-x-2" title="You already contacted this curator">
                              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm text-green-400">Contacted</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not contacted</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleContactCurator(curator)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          >
                            Contact
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Curators Cards - Mobile */}
        <div className="lg:hidden">
          {curatorDataLoading ? (
            <div className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-800/30 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading curator data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCurators.map((curator) => {
                const isContacted = contactedCurators[curator.id]
                return (
                  <div 
                    key={curator.id} 
                    className="bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-800/30 p-4 hover:bg-gray-800/20 transition-colors"
                  >
                    {/* Playlist Header */}
                    <div className="flex items-start space-x-3 mb-3">
                      <img
                        src={curator.playlistImageUrl}
                        alt={curator.playlistName}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = '/fasho-logo-wide.png'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <a
                          href={curator.playlistUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-semibold hover:text-green-400 transition-colors text-lg leading-tight block"
                        >
                          {curator.playlistName}
                        </a>
                        <div className="mt-2">
                          <a
                            href={curator.playlistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 text-xs font-medium border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white rounded transition-colors"
                          >
                            View Playlist
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Genre Tags */}
                    <div className="my-4">
                      <div className="flex flex-wrap gap-1">
                        {parseGenres(curator.genre).map((genre, index) => {
                          const isFiltered = curatorFilters.genres.includes(genre)
                          return (
                            <button
                              key={index}
                              onClick={() => handleGenreClick(genre)}
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                                isFiltered
                                  ? 'bg-gray-700 text-gray-300 border border-green-400/50 shadow-sm'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                              }`}
                              title={`Filter by ${genre}`}
                            >
                              {genre}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Stats and Action Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-white font-semibold text-lg">
                            {curator.playlistSaves.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">Followers</div>
                        </div>
                        <div className="text-center">
                          {isContacted ? (
                            <div className="flex items-center space-x-1" title="You already contacted this curator">
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-green-400">Contacted</span>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-xs text-gray-400">Not contacted</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleContactCurator(curator)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Curator Recruitment Section */}
        <div className="mt-8 p-6 bg-gradient-to-br from-gray-950/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-800/30">
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Want to add your playlist and receive fresh music submissions from our clients?{' '}
              <a 
                href={`mailto:support@fasho.co?subject=${encodeURIComponent('Curator Connect Playlist Addition')}&body=${encodeURIComponent(`Hey FASHO,

My name is [name]. I am a playlist owner and would like to feature my playlist(s) on your Curator Connect+ section. 

Here's a link to my playlist(s):
[Spotify playlist link]

My playlist is in this genre:
[Genre here]

My playlist has this many followers:
[Follower count]

Please let me know if I could be featured in your Curator Connect+ section. 

Thank you, 
[Name]
[Contact info]`)}`}
                className="text-green-400 hover:text-green-300 underline font-medium"
              >
                Reach Out Now
              </a>
            </p>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-[50px]"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Dashboard - FASHO</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style jsx global>{`
          @keyframes slideInLeft {
            0% {
              opacity: 0;
              transform: translateX(-20px) scale(0.95);
            }
            100% {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }
          
          @keyframes fadeInUp {
            0% {
              opacity: 0;
              transform: translateY(10px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideInScale {
            0% {
              opacity: 0;
              transform: translateX(-30px) scale(0.8);
            }
            100% {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }

          @keyframes slideUpStats {
            0% {
              opacity: 0;
              transform: translateY(40px) scale(0.95);
            }
            60% {
              opacity: 0.8;
              transform: translateY(-5px) scale(1.02);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes slideUpFadeIn {
            0% {
              opacity: 0;
              transform: translateY(25px) scale(0.96);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes slideInCard {
            0% {
              opacity: 0;
              transform: translateY(30px) scale(0.92);
            }
            60% {
              opacity: 0.8;
              transform: translateY(-3px) scale(1.01);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .campaign-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .campaign-card:hover {
            transform: translateY(-2px) scale(1.005);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
          }

          .campaign-card:active {
            transform: translateY(0) scale(0.998);
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .dashboard-sidebar-item {
            animation-fill-mode: both;
            animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          @keyframes glowPulse {
            0%, 100% {
              opacity: 1;
              filter: drop-shadow(0 0 4px currentColor);
            }
            50% {
              opacity: 0.6;
              filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 12px currentColor);
            }
          }
          
          .status-glow {
            animation: glowPulse 2s ease-in-out infinite;
          }
        `}</style>
      </Head>
      <div className="min-h-screen dashboard-background flex lg:flex-row flex-col w-full overflow-x-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-64 bg-gradient-to-b from-gray-950/95 to-gray-900/95 backdrop-blur-sm border-r border-gray-800/30 flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-800/30">
            <a href="/" className="block">
            <img 
              src="/fasho-logo-wide.png" 
              alt="FASHO" 
                className="w-full h-auto max-w-[144px] hover:opacity-80 transition-all duration-200 hover:scale-105"
                style={{
                  animation: 'fadeInUp 0.8s ease-out both',
                }}
            />
            </a>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {sidebarItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'signout') {
                      updateUrlHash('logout')
                      setShowSignOutModal(true)
                    } else {
                      changeTab(item.id)
                    }
                  }}
                  className={`dashboard-sidebar-item w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-0.5 ${
                    activeTab === item.id 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/20' 
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:shadow-md'
                  }`}
                  style={{
                    animationName: 'slideInScale',
                    animationDuration: '0.6s',
                    animationDelay: `${index * 0.12}s`,
                    transformOrigin: 'left center',
                  }}
                >
                  <svg 
                    className="w-5 h-5 transition-transform duration-300 hover:scale-110" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
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
            <div className="flex items-center justify-between w-full lg:items-start">
              <div className="min-w-0 flex-1 flex items-center lg:block">
                {/* Mobile Logo - vertically centered with profile */}
                <div className="lg:hidden flex items-center mb-2" style={{ minHeight: '44px' }}>
                  <a href="/" className="block">
                  <img 
                    src="/fasho-logo-wide.png" 
                    alt="FASHO" 
                      className="h-8 w-auto hover:opacity-80 transition-opacity duration-200"
                    style={{ minHeight: '32px' }}
                  />
                  </a>
                </div>
                <div className="hidden md:block">
                  <h2 className="text-xl lg:text-2xl font-bold text-white">
                    {activeTab === 'dashboard' && 'Dashboard'}
                    {activeTab === 'campaigns' && 'Campaigns'}
                    {activeTab === 'curator-connect' && 'Curator Connect+'}
                    {activeTab === 'power-tools' && 'Power Tools'}
                    {activeTab === 'packages' && 'Packages'}
                    {activeTab === 'faq' && 'Frequently Asked Questions'}
                    {activeTab === 'contact' && 'Contact'}
                    {activeTab === 'settings' && 'Settings'}
                  </h2>
                  <p className="text-sm lg:text-base text-gray-400">
                    {activeTab === 'dashboard' && 'Welcome back! Here\'s your campaign overview.'}
                    {activeTab === 'campaigns' && 'Manage and monitor all your music campaigns.'}
                    {activeTab === 'curator-connect' && 'Connect with Spotify playlist curators and grow your audience.'}
                    {activeTab === 'power-tools' && 'These are the battle-tested tools that our top performing clients use. From beat making to social media growth, these are the essentials that help artists dominate every aspect of their music careers.'}
                    {activeTab === 'packages' && 'Choose the perfect plan to launch your music career.'}
                    {activeTab === 'faq' && 'Get the answers that you need, when you need them.'}
                    {activeTab === 'contact' && 'Get in touch with our support team.'}
                    {activeTab === 'settings' && 'Manage your profile, billing address, and account preferences.'}
                  </p>
                </div>
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
          <div className="flex items-center max-w-full">
            {mobileNavItems.map((item, index) => {
              // Get mobile-specific label
              const getMobileLabel = (itemId: string, originalLabel: string) => {
                if (itemId === 'curator-connect') return 'Curators'
                return originalLabel
              }
              
              // Get flex basis based on label length
              const getFlexBasis = (itemId: string) => {
                if (itemId === 'dashboard' || itemId === 'campaigns' || itemId === 'curator-connect') {
                  return 'flex-[1.15]' // Slightly less space for longer labels
                } else {
                  return 'flex-1' // Normal space for others
                }
              }
              
              const isSettingsActive = item.id === 'settings' && (activeTab === 'settings' || activeTab === 'faq' || activeTab === 'contact')
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'settings') {
                      setShowMobileSettingsDropdown(true)
                    } else {
                      changeTab(item.id)
                    }
                  }}
                  className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-all duration-300 min-w-0 transform hover:scale-105 ${getFlexBasis(item.id)} ${
                    (activeTab === item.id || isSettingsActive)
                      ? 'text-green-400' 
                      : 'text-gray-400 hover:text-white'
                  } ${item.id === 'settings' ? 'active:scale-95' : ''}`}
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div className={`relative ${item.id === 'settings' ? 'transition-transform duration-200' : ''}`}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                    {item.id === 'settings' && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-75"></div>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate w-full text-center leading-tight" style={{ fontSize: 'calc(0.75rem - 0.04rem)' }}>{getMobileLabel(item.id, item.label)}</span>
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Mobile Settings Dropup */}
        {showMobileSettingsDropdown && renderMobileSettingsDropup()}
        
        {/* Sign Out Modal */}
        {showSignOutModal && renderSignOutModal()}

        {/* Reset Contact Status Modal */}
        {showResetModal && renderResetModal()}

        {/* Intake Form Modal */}
        <IntakeFormModal 
          isOpen={showIntakeForm && !checkingIntakeStatus}
          onComplete={handleIntakeFormComplete}
        />

        {/* Genre Dropdown Portal */}
        {isMounted && showGenreDropdown && createPortal(
          <div
            ref={genrePortalRef}
            className="fixed z-[9999] bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            style={{
              top: genreDropdownPosition.top,
              left: genreDropdownPosition.left,
              width: genreDropdownPosition.width
            }}
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Select Genres</span>
                <div className="flex gap-2">
                  {curatorFilters.genres.length > 0 && (
                    <button
                      onClick={() => setCuratorFilters(prev => ({ ...prev, genres: [] }))}
                      className="text-xs text-green-400 hover:text-green-300"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowGenreDropdown(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {getAllUniqueGenres().map((genre: string) => (
                  <label key={genre} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700/50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={curatorFilters.genres.includes(genre)}
                      onChange={() => toggleGenreFilter(genre)}
                      className="rounded border-gray-600 text-green-500 focus:ring-green-500 bg-gray-700"
                    />
                    <span className="text-sm text-gray-300">{genre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Status Dropdown Portal */}
        {isMounted && showStatusDropdown && createPortal(
          <div
            ref={statusPortalRef}
            className="fixed z-[9999] bg-gray-800 border border-gray-700 rounded-lg shadow-lg"
            style={{
              top: statusDropdownPosition.top,
              left: statusDropdownPosition.left,
              width: statusDropdownPosition.width
            }}
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Select Status</span>
                <button
                  onClick={() => setShowStatusDropdown(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'not-contacted', label: 'Not Contacted' },
                  { value: 'contacted', label: 'Already Contacted' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setCuratorFilters(prev => ({ ...prev, status: option.value }));
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                      curatorFilters.status === option.value
                        ? 'bg-green-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
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