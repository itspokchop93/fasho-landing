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

  // Function to track activity
  const trackActivity = useCallback(async (page?: string) => {
    if (!enabled || isTrackingRef.current) return

    const currentTime = Date.now()
    const timeSinceLastTrack = currentTime - lastTrackedRef.current
    
    // Don't track too frequently (minimum 5 seconds between tracks)
    if (timeSinceLastTrack < 5000) return

    isTrackingRef.current = true

    try {
      const currentPage = page || router.asPath
      
      const response = await fetch('/api/track-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPage,
          userAgent: navigator.userAgent
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
  }, [enabled, router.asPath])

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

  // Track user interactions (mouse movement, clicks, keyboard)
  const handleUserInteraction = useCallback(() => {
    if (!enabled || !shouldTrackUserInteraction) return
    trackActivity()
  }, [enabled, shouldTrackUserInteraction, trackActivity])

  // Set up periodic tracking
  useEffect(() => {
    if (!enabled) return

    // Initial track
    trackActivity()

    // Set up interval for periodic tracking
    trackingIntervalRef.current = setInterval(() => {
      trackActivity()
    }, trackInterval * 1000)

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
        trackingIntervalRef.current = null
      }
    }
  }, [enabled, trackInterval, trackActivity])

  // Track page changes
  useEffect(() => {
    if (!enabled || !trackPageChanges) return

    const handleRouteChange = (url: string) => {
      trackActivity(url)
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [enabled, trackPageChanges, router.events, trackActivity])

  // Track user interactions
  useEffect(() => {
    if (!enabled || !shouldTrackUserInteraction) return

    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart']
    
    const handleInteraction = () => {
      handleUserInteraction()
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