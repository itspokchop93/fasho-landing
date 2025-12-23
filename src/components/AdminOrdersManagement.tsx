import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { calculateDeadline } from '../utils/deadlineUtils'

interface Order {
  id: string
  orderNumber: string
  customerEmail: string
  customerName: string
  subtotal: number
  discount: number
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  updatedAt: string
  isNewOrder: boolean
  firstViewedAt: string | null
  firstSavedAt: string | null
  viewedByAdmin: string | null
  savedByAdmin: string | null
  adminNotes: string | null
  itemCount: number
  items: any[]
  addOnItems: any[]
}

const ORDER_STATUSES = [
  { value: 'processing', label: 'Processing', color: 'yellow', bgClass: 'bg-yellow-400', textClass: 'text-yellow-600', mobileBg: 'bg-yellow-50', mobileBorder: 'border-yellow-200' },
  { value: 'marketing_campaign_running', label: 'Marketing Campaign Running', color: 'green', bgClass: 'bg-green-400', textClass: 'text-green-600', mobileBg: 'bg-green-50', mobileBorder: 'border-green-200' },
  { value: 'completed', label: 'Completed', color: 'blue', bgClass: 'bg-blue-400', textClass: 'text-blue-600', mobileBg: 'bg-blue-50', mobileBorder: 'border-blue-200' },
  { value: 'order_issue', label: 'Order Issue - Check Email', color: 'orange', bgClass: 'bg-orange-400', textClass: 'text-orange-600', mobileBg: 'bg-orange-50', mobileBorder: 'border-orange-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'red', bgClass: 'bg-red-400', textClass: 'text-red-600', mobileBg: 'bg-red-50', mobileBorder: 'border-red-200' }
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
  return statusConfig?.textClass || 'text-gray-600'
}

const getStatusMobileBg = (status: string) => {
  const statusConfig = ORDER_STATUSES.find(s => s.value === status)
  return statusConfig?.mobileBg || 'bg-gray-50'
}

const getStatusMobileBorder = (status: string) => {
  const statusConfig = ORDER_STATUSES.find(s => s.value === status)
  return statusConfig?.mobileBorder || 'border-gray-200'
}

export default function AdminOrdersManagement() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  })

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        sortBy,
        sortOrder,
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      })

      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()

      if (data.success) {
        setOrders(data.orders)
        setPagination(data.pagination)
      } else {
        console.error('Failed to fetch orders:', data.message)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [searchTerm, statusFilter, sortBy, sortOrder, pagination.offset])

  const handleOrderClick = (orderId: string) => {
    router.push(`/admin/order/${orderId}`)
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

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Header Section */}
      <div className="p-4 md:p-6 border-b border-gray-200">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Order Management</h2>
        
        {/* Search and Filters - Mobile Optimized */}
        <div className="space-y-3 md:space-y-0 md:flex md:flex-row md:gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              style={{ fontSize: '1rem' }}
            />
          </div>

          {/* Filters Row on Mobile */}
          <div className="flex gap-2 md:gap-4">
            {/* Status Filter */}
            <div className="flex-1 md:w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                style={{ fontSize: '0.875rem' }}
              >
                <option value="">All Statuses</option>
                {ORDER_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex-1 md:w-48">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-')
                  setSortBy(newSortBy)
                  setSortOrder(newSortOrder)
                }}
                className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                style={{ fontSize: '0.875rem' }}
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="order_number-asc">Order # A-Z</option>
                <option value="order_number-desc">Order # Z-A</option>
                <option value="total-desc">Highest Value</option>
                <option value="total-asc">Lowest Value</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Column Headers - Hidden on Mobile */}
      <div className="hidden md:block bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="grid grid-cols-13 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wide">
          <div className="col-span-2">Order Details</div>
          <div className="col-span-2">Customer</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-1">Total</div>
          <div className="col-span-2">Deadline</div>
          <div className="col-span-1">Action</div>
        </div>
      </div>

      {/* Orders List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No orders found matching your criteria.
          </div>
        ) : (
          orders.map((order) => {
            const deadlineInfo = calculateDeadline(order.createdAt, order.status);
            
            return (
              <div key={order.id}>
                {/* Mobile Card View */}
                <div
                  onClick={() => handleOrderClick(order.id)}
                  className={`md:hidden p-4 active:bg-gray-100 cursor-pointer transition-colors ${getStatusMobileBg(order.status)} border-l-4 ${getStatusMobileBorder(order.status)}`}
                >
                  {/* Top Row: Order # + Status Badge + NEW Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900" style={{ fontSize: '1rem' }}>
                        #{order.orderNumber}
                      </span>
                      {order.isNewOrder && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-500 text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${getStatusBgClass(order.status)}`}></div>
                      <span className={`text-xs font-semibold ${getStatusTextClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Customer Info */}
                  <div className="mb-3">
                    <p className="font-medium text-gray-900 truncate" style={{ fontSize: '0.9375rem' }}>
                      {order.customerName}
                    </p>
                    <p className="text-gray-500 truncate" style={{ fontSize: '0.8125rem' }}>
                      {order.customerEmail}
                    </p>
                  </div>

                  {/* Bottom Row: Date, Total, Items, Deadline */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>Date</p>
                        <p className="font-medium text-gray-700" style={{ fontSize: '0.8125rem' }}>
                          {formatDateShort(order.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>Total</p>
                        <p className="font-bold text-gray-900" style={{ fontSize: '0.9375rem' }}>
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>Items</p>
                        <p className="font-medium text-gray-700" style={{ fontSize: '0.8125rem' }}>
                          {order.itemCount}
                        </p>
                      </div>
                    </div>
                    
                    {/* Deadline Badge or Open Button */}
                    <div className="flex items-center gap-2">
                      {deadlineInfo.showDeadline && (
                        <div 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: deadlineInfo.backgroundColor,
                            color: deadlineInfo.textColor,
                          }}
                        >
                          {deadlineInfo.message}
                        </div>
                      )}
                      <svg 
                        className="w-5 h-5 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Desktop Grid View */}
                <div
                  onClick={() => handleOrderClick(order.id)}
                  className="hidden md:block relative p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {/* NEW ORDER Badge - Overlay top-left */}
                  {order.isNewOrder && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 opacity-60">
                        NEW
                      </span>
                    </div>
                  )}
                  
                  {/* Main Content Grid */}
                  <div className="grid grid-cols-13 gap-4 items-center">
                    {/* Order Details - Column 1 */}
                    <div className="col-span-2">
                      <div className="truncate">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          ORDER #{order.orderNumber}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Customer Name - Column 2 */}
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-900 truncate" title={order.customerName}>
                        {order.customerName}
                      </p>
                    </div>

                    {/* Customer Email - Column 3 */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 truncate" title={order.customerEmail}>
                        {order.customerEmail}
                      </p>
                    </div>

                    {/* Status - Column 4 */}
                    <div className="col-span-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${getStatusBgClass(order.status)}`}></div>
                        <span className={`text-xs font-medium truncate ${getStatusTextClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>

                    {/* Total - Column 5 */}
                    <div className="col-span-1">
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Deadline - Column 6 */}
                    <div className="col-span-2">
                      {deadlineInfo.showDeadline ? (
                        <div 
                          className="px-2 py-1 rounded-md text-xs font-medium text-center"
                          style={{
                            backgroundColor: deadlineInfo.backgroundColor,
                            color: deadlineInfo.textColor,
                            border: `1px solid ${deadlineInfo.color}`
                          }}
                        >
                          {deadlineInfo.message}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 text-center">-</div>
                      )}
                    </div>

                    {/* Action Button - Column 7 */}
                    <div className="col-span-1">
                      <div className="flex justify-start">
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                          OPEN
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination - Mobile Optimized */}
      {pagination.total > pagination.limit && (
        <div className="p-4 md:p-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-gray-500 text-center md:text-left">
              Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                disabled={pagination.offset === 0}
                className="flex-1 md:flex-none px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-100"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                disabled={!pagination.hasMore}
                className="flex-1 md:flex-none px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
