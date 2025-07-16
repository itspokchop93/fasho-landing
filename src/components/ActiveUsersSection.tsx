import React, { useState, useEffect, useCallback } from 'react'

interface ActiveUser {
  id: string
  sessionId: string
  accountName: string
  email: string
  ipAddress: string
  browser: string
  currentPage: string
  lastActivity: string
  isGuest: boolean
  createdAt: string
}

interface DailyStats {
  totalVisitsToday: number
  uniqueVisitorsToday: number
  date: string
}

interface ActiveUsersSectionProps {
  className?: string
}

export default function ActiveUsersSection({ className = '' }: ActiveUsersSectionProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalVisitsToday: 0,
    uniqueVisitorsToday: 0,
    date: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch active users from API
  const fetchActiveUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/active-users', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setActiveUsers(data.activeUsers || [])
        setError(null)
        setLastUpdated(new Date())
      } else {
        throw new Error(data.error || 'Failed to fetch active users')
      }
      
    } catch (err) {
      console.error('👥 ACTIVE-USERS: Error fetching active users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch active users')
    }
  }, [])

  // Fetch daily statistics from API
  const fetchDailyStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/daily-stats', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setDailyStats(data.stats)
        setError(null)
      } else {
        throw new Error(data.error || 'Failed to fetch daily statistics')
      }
      
    } catch (err) {
      console.error('📊 DAILY-STATS: Error fetching daily statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch daily statistics')
    }
  }, [])

  // Fetch both datasets
  const fetchAllData = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchActiveUsers(),
        fetchDailyStats()
      ])
    } finally {
      setIsLoading(false)
    }
  }, [fetchActiveUsers, fetchDailyStats])

  // Initial load
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Set up real-time polling (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only fetch users more frequently, stats less frequently
      fetchActiveUsers()
      
      // Fetch stats every 60 seconds (6 iterations)
      if (Math.floor(Date.now() / 1000) % 60 < 10) {
        fetchDailyStats()
      }
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [fetchActiveUsers, fetchDailyStats])

  // Format time for display
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return 'Unknown'
    }
  }

  // Calculate time since last activity
  const getTimeSince = (timestamp: string) => {
    try {
      const now = new Date()
      const activity = new Date(timestamp)
      const diffMs = now.getTime() - activity.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      
      if (diffMinutes < 1) {
        return 'Just now'
      } else if (diffMinutes === 1) {
        return '1 minute ago'
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minutes ago`
      } else {
        const diffHours = Math.floor(diffMinutes / 60)
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
      }
    } catch {
      return 'Unknown'
    }
  }

  // Truncate long text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header with Analytics */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Users & Analytics</h2>
        
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Total Visits Today */}
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-medium">TOTAL VISITS TODAY</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : dailyStats.totalVisitsToday.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Unique Visitors Today */}
          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">UNIQUE VISITORS TODAY</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : dailyStats.uniqueVisitorsToday.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </span>
            <span>{activeUsers.length} active user{activeUsers.length !== 1 ? 's' : ''}</span>
          </div>
          {lastUpdated && (
            <span>Last updated: {formatTime(lastUpdated.toISOString())}</span>
          )}
        </div>
      </div>

      {/* Active Users List */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Currently Active Users</h3>
          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-900">Loading active users...</span>
          </div>
        ) : activeUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No active users at the moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <div>Account Name</div>
              <div>Email</div>
              <div>IP Address</div>
              <div>Browser</div>
              <div>Current Page</div>
            </div>

            {/* User Rows */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-5 gap-4 py-3 px-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg border border-gray-200"
                >
                  {/* Account Name */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${user.isGuest ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                    <span className="text-gray-900 text-sm font-medium">
                      {truncateText(user.accountName, 20)}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="text-gray-600 text-sm">
                    {truncateText(user.email, 25)}
                  </div>

                  {/* IP Address */}
                  <div className="text-gray-600 text-sm font-mono">
                    {user.ipAddress}
                  </div>

                  {/* Browser */}
                  <div className="text-gray-600 text-sm">
                    {user.browser}
                  </div>

                  {/* Current Page */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">
                      {truncateText(user.currentPage, 20)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {getTimeSince(user.lastActivity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 