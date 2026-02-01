import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../utils/admin/auth';
import AdminAccessDenied from '../../../components/AdminAccessDenied';
import type { CustomerDetailData } from '../../api/admin/customer/[customerEmail]';
import type { CustomerPlacementHistoryResponse, SongPlacementHistory } from '../../api/admin/customer/playlist-placement-history';

interface CustomerDetailPageProps {
  adminSession: any;
  accessDenied?: boolean;
}

export default function CustomerDetailPage({ adminSession, accessDenied }: CustomerDetailPageProps) {
  const router = useRouter();
  const { customerEmail, fromOrder } = router.query;
  
  // Admin access control
  if (accessDenied || !adminSession) {
    return <AdminAccessDenied />;
  }
  
  const [customer, setCustomer] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Playlist placement history state
  const [placementHistory, setPlacementHistory] = useState<CustomerPlacementHistoryResponse | null>(null);
  const [placementLoading, setPlacementLoading] = useState(true);
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (customerEmail && typeof customerEmail === 'string') {
      fetchCustomerDetails(customerEmail);
      fetchPlacementHistory(customerEmail);
    }
  }, [customerEmail]);


  const fetchCustomerDetails = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customer/${encodeURIComponent(email)}`);
      const data = await res.json();
      
      if (data.success) {
        setCustomer(data.customer);
        setLastUpdated(new Date());
        setError('');
      } else {
        setError(data.message || 'Failed to fetch customer details');
      }
    } catch (err) {
      setError('Failed to fetch customer details');
      console.error('Error fetching customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlacementHistory = async (email: string) => {
    setPlacementLoading(true);
    try {
      const res = await fetch(`/api/admin/customer/playlist-placement-history?customerEmail=${encodeURIComponent(email)}`);
      const data = await res.json();
      
      if (data.success) {
        setPlacementHistory(data);
      }
    } catch (err) {
      console.error('Error fetching placement history:', err);
    } finally {
      setPlacementLoading(false);
    }
  };

  const toggleSongExpansion = (songUrl: string) => {
    setExpandedSongs(prev => {
      const next = new Set(prev);
      if (next.has(songUrl)) {
        next.delete(songUrl);
      } else {
        next.add(songUrl);
      }
      return next;
    });
  };

  const togglePlaylistExpansion = (playlistId: string) => {
    setExpandedPlaylists(prev => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleOrderClick = (orderId: string, event?: MouseEvent) => {
    // Prevent event bubbling if called from button
    if (event) {
      event.stopPropagation();
    }
    // Open order details in new tab
    window.open(`/admin/order/${orderId}`, '_blank');
  };

  const handleBackClick = () => {
    // If we came from an order details page, go back to that order
    if (fromOrder && typeof fromOrder === 'string') {
      router.push(`/admin/order/${fromOrder}`);
    } else {
      // Otherwise, go back to the orders/customers tab
      router.push('/admin?p=orders-customers');
    }
  };

  const ORDER_STATUSES = [
    { value: 'processing', label: 'Processing', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    { value: 'marketing_campaign_running', label: 'Marketing Campaign Running', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    { value: 'completed', label: 'Completed', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    { value: 'order_issue', label: 'Order Issue - Check Email', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
    { value: 'cancelled', label: 'Cancelled', bgColor: 'bg-red-100', textColor: 'text-red-800' }
  ];

  const getStatusBadgeClass = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status);
    if (statusConfig) {
      return `${statusConfig.bgColor} ${statusConfig.textColor}`;
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status);
    return statusConfig ? statusConfig.label : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Customer Details - Fasho Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading customer details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Error - Fasho Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">Error</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleBackClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {fromOrder ? 'Return to Order' : 'Back to Customers'}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!customer) {
    return (
      <>
        <Head>
          <title>Customer Not Found - Fasho Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-600 text-xl mb-4">Customer Not Found</div>
            <button
              onClick={handleBackClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {fromOrder ? 'Return to Order' : 'Back to Customers'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{customer.customer_info.customer_name} - Customer Details - Fasho Admin</title>
        <meta name="description" content={`Customer details for ${customer.customer_info.customer_name}`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackClick}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {fromOrder ? 'Return to Order' : 'Back to Customers'}
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-3xl font-bold text-gray-900">Customer Details</h1>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Customer since</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(customer.customer_info.date_joined)}
                </div>
                {lastUpdated && (
                  <div className="text-xs text-gray-400 mt-1">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer Information */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <div className="text-lg font-semibold text-gray-900">
                      {customer.customer_info.customer_name}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <div className="text-gray-900">
                      {customer.customer_info.customer_email}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Purchases</label>
                    <div className="text-lg font-semibold text-gray-900">
                      {customer.customer_info.total_purchases}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Spend</label>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(customer.customer_info.total_spend)}
                    </div>
                  </div>

                  {/* Billing Information */}
                  {customer.customer_info.billing_info && (
                    <>
                      <div className="border-t border-gray-200 pt-4 mt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div>
                            {customer.customer_info.billing_info.firstName} {customer.customer_info.billing_info.lastName}
                          </div>
                          {customer.customer_info.billing_info.address && (
                            <div>{customer.customer_info.billing_info.address}</div>
                          )}
                          {customer.customer_info.billing_info.city && (
                            <div>
                              {customer.customer_info.billing_info.city}
                              {customer.customer_info.billing_info.state && `, ${customer.customer_info.billing_info.state}`}
                              {customer.customer_info.billing_info.zip && ` ${customer.customer_info.billing_info.zip}`}
                            </div>
                          )}
                          {customer.customer_info.billing_info.country && (
                            <div>{customer.customer_info.billing_info.country}</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Purchase History */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Purchase History</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {customer.orders.length} total orders
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customer.orders.map((order) => (
                        <tr 
                          key={order.id} 
                          onClick={() => handleOrderClick(order.id)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.order_number}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(order.total)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleOrderClick(order.id, e)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              OPEN
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {customer.orders.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No orders found for this customer
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Playlist Placement History Sections */}
          {placementLoading ? (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-3"></div>
                <span className="text-gray-500">Loading playlist placement history...</span>
              </div>
            </div>
          ) : placementHistory && placementHistory.totalPlacements > 0 ? (
            <>
              {/* Account-Wide Placement History */}
              <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Account-Wide Playlist Placement History</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {placementHistory.totalUniqueSongs} unique songs • {placementHistory.totalPlacements} total playlist placements
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Song Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Playlists</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {placementHistory.allPlacements.map((placement, idx) => (
                        <tr key={`${placement.orderNumber}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <a 
                                href={placement.songUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                              >
                                {placement.songName}
                              </a>
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 max-w-md">
                              {placement.playlists.length > 0 ? (
                                <span className="flex flex-wrap gap-1">
                                  {placement.playlists.map((pl, plIdx) => (
                                    <span key={plIdx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      {pl}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">No playlists assigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => window.open(`/admin?search=${placement.orderNumber}`, '_blank')}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              #{placement.orderNumber}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatShortDate(placement.orderDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-Song Placement History */}
              <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Per-Song Placement History</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Detailed placement breakdown for each marketed song
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {placementHistory.songHistories.map((song, songIdx) => {
                    const isExpanded = expandedSongs.has(song.songUrl);
                    return (
                      <div key={song.songUrl || songIdx} className="bg-white">
                        {/* Song Header - Collapsible */}
                        <button
                          onClick={() => toggleSongExpansion(song.songUrl)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${songIdx % 2 === 0 ? 'bg-indigo-100' : 'bg-purple-100'}`}>
                              <svg className={`w-5 h-5 ${songIdx % 2 === 0 ? 'text-indigo-600' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{song.songName}</span>
                                <a 
                                  href={song.songUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-gray-400 hover:text-green-500 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                                  </svg>
                                </a>
                              </div>
                              <div className="text-sm text-gray-500 mt-0.5">
                                {song.totalPlaylists} unique playlists • {song.placements.length} total placements
                              </div>
                            </div>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expanded Content - Placement Table */}
                        {isExpanded && (
                          <div className="px-6 pb-4">
                            <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                              <table className="w-full">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Playlist Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {song.placements.map((placement, plIdx) => (
                                    <tr key={`${placement.campaignId}-${plIdx}`} className="bg-white hover:bg-gray-50">
                                      <td className="px-4 py-2.5">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          🎵 {placement.playlistName}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-gray-600">
                                        {formatShortDate(placement.placementDate)}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className="text-sm font-medium text-gray-700">{placement.packageName}</span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <button
                                          onClick={() => window.open(`/admin?search=${placement.orderNumber}`, '_blank')}
                                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                        >
                                          #{placement.orderNumber}
                                        </button>
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-gray-500">
                                        {formatShortDate(placement.orderDate)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-Playlist Placement History */}
              <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Per-Playlist Placement History</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {placementHistory.totalUniquePlaylists || placementHistory.playlistHistories?.length || 0} playlists with customer songs
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {placementHistory.playlistHistories?.map((playlist, playlistIdx) => {
                    const isExpanded = expandedPlaylists.has(playlist.playlistId || playlist.playlistName);
                    return (
                      <div key={playlist.playlistId || playlistIdx} className="bg-white">
                        {/* Playlist Header - Collapsible */}
                        <button
                          onClick={() => togglePlaylistExpansion(playlist.playlistId || playlist.playlistName)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${playlistIdx % 2 === 0 ? 'bg-green-100' : 'bg-teal-100'}`}>
                              <svg className={`w-5 h-5 ${playlistIdx % 2 === 0 ? 'text-green-600' : 'text-teal-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">🎵 {playlist.playlistName}</span>
                              </div>
                              <div className="text-sm text-gray-500 mt-0.5">
                                {playlist.totalSongs} song{playlist.totalSongs !== 1 ? 's' : ''} placed on this playlist
                              </div>
                            </div>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expanded Content - Songs Table */}
                        {isExpanded && (
                          <div className="px-6 pb-4">
                            <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                              <table className="w-full">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Song Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {playlist.songs.map((song, songIdx) => (
                                    <tr key={`${song.orderNumber}-${songIdx}`} className="bg-white hover:bg-gray-50">
                                      <td className="px-4 py-2.5">
                                        <a 
                                          href={song.songUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors flex items-center gap-1"
                                        >
                                          {song.songName}
                                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </a>
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-gray-600">
                                        {formatShortDate(song.placementDate)}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className="text-sm font-medium text-gray-700">{song.packageName}</span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <button
                                          onClick={() => window.open(`/admin?search=${song.orderNumber}`, '_blank')}
                                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                        >
                                          #{song.orderNumber}
                                        </button>
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-gray-500">
                                        {formatShortDate(song.orderDate)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : !placementLoading && (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="text-gray-500">No playlist placements recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Placements will appear here once songs are added to playlists</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    console.log('🔐 CUSTOMER-DETAIL-SSR: Checking admin authentication...')
    
    // Get admin session token from request
    const token = getAdminTokenFromRequest(context.req as any)
    
    if (!token) {
      console.log('🔐 CUSTOMER-DETAIL-SSR: No admin session token found')
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
      console.log('🔐 CUSTOMER-DETAIL-SSR: Invalid admin session token')
      return {
        redirect: {
          destination: '/a-login',
          permanent: false,
        },
      }
    }

    if (!adminUser.is_active) {
      console.log('🔐 CUSTOMER-DETAIL-SSR: Admin account is inactive:', adminUser.email)
      return {
        props: {
          adminSession: null,
          accessDenied: true
        },
      }
    }

    console.log('🔐 CUSTOMER-DETAIL-SSR: Admin authenticated successfully:', adminUser.email, 'role:', adminUser.role)

    return {
      props: {
        adminSession: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    }
  } catch (error) {
    console.error('🔐 CUSTOMER-DETAIL-SSR: Authentication error:', error)
    return {
      redirect: {
        destination: '/a-login',
        permanent: false,
      },
    }
  }
}
