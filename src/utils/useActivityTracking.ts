import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'

interface ActivityTrackingOptions {
  enabled?: boolean
  trackInterval?: number // How often to track activity (in seconds)
  trackPageChanges?: boolean
  trackUserInteraction?: boolean
}

export function useActivityTracking(options: ActivityTrackingOptions = {}) {
  const {
    enabled = true,
    trackInterval = 30, // Track every 30 seconds
    trackPageChanges = true,
    trackUserInteraction: shouldTrackUserInteraction = true
  } = options

  const router = useRouter()
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTrackedRef = useRef<number>(0)
  const isTrackingRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)

  // Function to track activity - STABLE VERSION (no router dependency to prevent re-renders)
  const trackActivity = useCallback(async (page?: string) => {
    if (!enabled || isTrackingRef.current) return

    const currentTime = Date.now()
    const timeSinceLastTrack = currentTime - lastTrackedRef.current
    
    // Don't track too frequently (minimum 5 seconds between tracks)
    if (timeSinceLastTrack < 5000) return

    isTrackingRef.current = true

    try {
      // Use provided page or get current page without dependency on router.asPath
      const currentPage = page || (typeof window !== 'undefined' ? window.location.pathname : '/')
      
      const response = await fetch('/api/track-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPage,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Store session ID for cleanup
        if (data.sessionId && !sessionIdRef.current) {
          sessionIdRef.current = data.sessionId
        }
        lastTrackedRef.current = currentTime
        if (process.env.NODE_ENV === 'development') {
          console.log('👥 ACTIVITY-TRACKING: Activity tracked successfully')
        }
      } else {
        console.warn('👥 ACTIVITY-TRACKING: Failed to track activity:', response.status)
      }
    } catch (error) {
      console.error('👥 ACTIVITY-TRACKING: Error tracking activity:', error)
    } finally {
      isTrackingRef.current = false
    }
  }, [enabled]) // REMOVED router.asPath dependency to prevent re-renders

  // Function to cleanup user when they leave
  const cleanupUser = useCallback(async () => {
    if (!sessionIdRef.current) return

    try {
      await fetch('/api/track-activity/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current
        })
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('👥 ACTIVITY-TRACKING: User cleanup completed')
      }
    } catch (error) {
      console.error('👥 ACTIVITY-TRACKING: Error during cleanup:', error)
    }
  }, [])

  // Track user interactions (mouse movement, clicks, keyboard) - STABLE VERSION
  const handleUserInteraction = useCallback(() => {
    if (!enabled || !shouldTrackUserInteraction || isTrackingRef.current) return
    
    const currentTime = Date.now()
    const timeSinceLastTrack = currentTime - lastTrackedRef.current
    
    // Don't track too frequently (minimum 5 seconds between tracks)
    if (timeSinceLastTrack < 5000) return

    // Use stable inline tracking to avoid dependency loops
    isTrackingRef.current = true
    
    fetch('/api/track-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      })
    }).then(response => {
      if (response.ok) {
        lastTrackedRef.current = currentTime
      }
    }).catch(error => {
      console.error('👥 ACTIVITY-TRACKING: Error tracking user interaction:', error)
    }).finally(() => {
      isTrackingRef.current = false
    })
  }, [enabled, shouldTrackUserInteraction]) // REMOVED trackActivity dependency

  // Set up periodic tracking - STABLE VERSION (no trackActivity dependency)
  useEffect(() => {
    if (!enabled) return

    // Create a stable tracking function that doesn't depend on state
    const stableTrackActivity = async () => {
      if (isTrackingRef.current) return

      const currentTime = Date.now()
      const timeSinceLastTrack = currentTime - lastTrackedRef.current
      
      // Don't track too frequently (minimum 5 seconds between tracks)
      if (timeSinceLastTrack < 5000) return

      isTrackingRef.current = true

      try {
        const currentPage = typeof window !== 'undefined' ? window.location.pathname : '/'
        
        const response = await fetch('/api/track-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPage,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
          })
        })

        if (response.ok) {
          const data = await response.json()
          // Store session ID for cleanup
          if (data.sessionId && !sessionIdRef.current) {
            sessionIdRef.current = data.sessionId
          }
          lastTrackedRef.current = currentTime
          if (process.env.NODE_ENV === 'development') {
            console.log('👥 ACTIVITY-TRACKING: Activity tracked successfully')
          }
        } else {
          console.warn('👥 ACTIVITY-TRACKING: Failed to track activity:', response.status)
        }
      } catch (error) {
        console.error('👥 ACTIVITY-TRACKING: Error tracking activity:', error)
      } finally {
        isTrackingRef.current = false
      }
    }

    // Initial track
    stableTrackActivity()

    // Set up interval for periodic tracking
    trackingIntervalRef.current = setInterval(stableTrackActivity, trackInterval * 1000)

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
        trackingIntervalRef.current = null
      }
    }
  }, [enabled, trackInterval]) // REMOVED trackActivity dependency to prevent re-renders

  // Track page changes - STABLE VERSION (minimal dependencies)
  useEffect(() => {
    if (!enabled || !trackPageChanges) return

    const handleRouteChange = (url: string) => {
      // Use the stable trackActivity function with explicit page parameter
      if (typeof window !== 'undefined') {
        fetch('/api/track-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPage: url,
            userAgent: navigator.userAgent || 'unknown'
          })
        }).catch(error => {
          console.error('👥 ACTIVITY-TRACKING: Error tracking route change:', error)
        })
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [enabled, trackPageChanges]) // REMOVED trackActivity dependency to prevent re-renders

  // Track user interactions - PREVENT tab switching from triggering tracking
  useEffect(() => {
    if (!enabled || !shouldTrackUserInteraction) return

    // Track only meaningful user interactions, NOT focus/blur/visibility
    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart']
    
    // Throttle interactions and prevent tab-switching triggers
    let lastInteractionTime = 0
    const handleInteraction = () => {
      const now = Date.now()
      // Only track once every 10 seconds from actual interactions
      if (now - lastInteractionTime > 10000) {
        lastInteractionTime = now
        handleUserInteraction()
      }
    }

    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction)
      })
    }
  }, [enabled, shouldTrackUserInteraction, handleUserInteraction])

  // PREVENT tab switching from triggering activity tracking
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = (e: Event) => {
      // Prevent default behavior and stop propagation to avoid triggering re-renders
      e.preventDefault()
      e.stopPropagation()
      // Do NOT track activity on visibility changes to prevent tab switching refreshes
    }

    const handleFocusEvents = (e: Event) => {
      // Prevent focus/blur from triggering activity tracking
      e.preventDefault()
      e.stopPropagation()
    }

    // Listen for and neutralize problematic events
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: false })
    window.addEventListener('focus', handleFocusEvents, { passive: false })
    window.addEventListener('blur', handleFocusEvents, { passive: false })
    window.addEventListener('pageshow', handleFocusEvents, { passive: false })
    window.addEventListener('pagehide', handleFocusEvents, { passive: false })

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocusEvents)
      window.removeEventListener('blur', handleFocusEvents)
      window.removeEventListener('pageshow', handleFocusEvents)
      window.removeEventListener('pagehide', handleFocusEvents)
    }
  }, [enabled])

  // Track when page becomes visible (user returns to tab)
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        trackActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, trackActivity])

  // Track when window gains focus
  useEffect(() => {
    if (!enabled) return

    const handleFocus = () => {
      trackActivity()
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [enabled, trackActivity])

  // Cleanup when user leaves the site
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = () => {
      // Use sendBeacon for more reliable cleanup on page unload
      if (navigator.sendBeacon && sessionIdRef.current) {
        const data = new Blob([JSON.stringify({ sessionId: sessionIdRef.current })], {
          type: 'application/json'
        })
        navigator.sendBeacon('/api/track-activity/cleanup', data)
      } else {
        // Fallback to synchronous request (less reliable)
        cleanupUser()
      }
    }

    const handlePageHide = () => {
      // Also cleanup on page hide (mobile browsers, tab switching)
      cleanupUser()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      // Cleanup on component unmount
      cleanupUser()
    }
  }, [enabled, cleanupUser])

  return {
    trackActivity,
    cleanupUser,
    isTracking: isTrackingRef.current
  }
} 