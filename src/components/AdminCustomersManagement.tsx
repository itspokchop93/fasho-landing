import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import type { CustomerData } from '../pages/api/admin/customers'

export default function AdminCustomersManagement() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date_joined')
  const [sortOrder, setSortOrder] = useState('desc')
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy,
        sortOrder,
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      })

      const res = await fetch(`/api/admin/customers?${params}`)
      const data = await res.json()

      if (data.success) {
        setCustomers(data.customers)
        setPagination(data.pagination)
        setLastUpdated(new Date())
      } else {
        console.error('Failed to fetch customers:', data.message)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [searchTerm, sortBy, sortOrder, pagination.offset])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Only auto-refresh if we're on the first page and no search is active
      if (pagination.offset === 0 && !searchTerm) {
        fetchCustomers()
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, pagination.offset, searchTerm])

  const handleCustomerClick = (customerEmail: string) => {
    // Navigate to customer details page
    router.push(`/admin/customer/${encodeURIComponent(customerEmail)}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setPagination(prev => ({ ...prev, offset: 0 })) // Reset to first page
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const handleLoadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }))
  }

  const handleRefresh = () => {
    setPagination(prev => ({ ...prev, offset: 0 }))
    fetchCustomers()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                Auto-refresh
              </label>
            </div>
            <button
              onClick={handleRefresh}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by customer name, email, or order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Sort */}
          <div className="lg:w-48">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [column, order] = e.target.value.split('-')
                setSortBy(column)
                setSortOrder(order)
                setPagination(prev => ({ ...prev, offset: 0 }))
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="date_joined-desc">Date Joined (Newest)</option>
              <option value="date_joined-asc">Date Joined (Oldest)</option>
              <option value="last_order-desc">Last Order (Recent)</option>
              <option value="last_order-asc">Last Order (Oldest)</option>
              <option value="total_spend-desc">Total Spend (High to Low)</option>
              <option value="total_spend-asc">Total Spend (Low to High)</option>
              <option value="purchases-desc">Purchases (Most to Least)</option>
              <option value="purchases-asc">Purchases (Least to Most)</option>
              <option value="customer_name-asc">Name (A to Z)</option>
              <option value="customer_name-desc">Name (Z to A)</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-600 mb-4">
          Showing {customers.length} of {pagination.total} customers
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: '1200px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('customer_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Customer Name</span>
                  {getSortIcon('customer_name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('customer_email')}
              >
                <div className="flex items-center space-x-1">
                  <span>Email</span>
                  {getSortIcon('customer_email')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date_joined')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date Joined</span>
                  {getSortIcon('date_joined')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('last_order')}
              >
                <div className="flex items-center space-x-1">
                  <span>Last Order</span>
                  {getSortIcon('last_order')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('purchases')}
              >
                <div className="flex items-center space-x-1">
                  <span>Purchases</span>
                  {getSortIcon('purchases')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_spend')}
              >
                <div className="flex items-center space-x-1">
                  <span>Total Spend</span>
                  {getSortIcon('total_spend')}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span>Loading customers...</span>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No customers found
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.customer_email} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/admin/customer/${encodeURIComponent(customer.customer_email)}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition-colors"
                    >
                      {customer.customer_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {customer.customer_email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(customer.date_joined)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(customer.last_order)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.purchases}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(customer.total_spend)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleCustomerClick(customer.customer_email)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      OPEN
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.hasMore && (
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Customers'}
          </button>
        </div>
      )}
    </div>
  )
}
