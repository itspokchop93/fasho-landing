import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { createClientSSR } from '../../../utils/supabase/server';

interface OrderItem {
  id: string;
  track_id: string;
  track_title: string;
  track_artist: string;
  track_image_url: string;
  track_url: string;
  package_id: string;
  package_name: string;
  package_price: number;
  package_plays: string;
  package_placements: string;
  package_description: string;
  original_price: number;
  discounted_price: number;
  is_discounted: boolean;
  created_at: string;
  updated_at: string;
}

interface AddOnItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  originalPrice: number;
  price: number;
  isOnSale: boolean;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  customer_email: string;
  customer_name: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  payment_status: string;
  billing_info: any;
  payment_data: any;
  admin_notes: string | null;
  first_viewed_at: string | null;
  viewed_by_admin: boolean;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  addOnItems?: AddOnItem[];
}

interface OrderDetailPageProps {
  user: any;
}

const ORDER_STATUSES = [
  { value: 'processing', label: 'Processing', color: 'bg-yellow-500', textColor: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  { value: 'marketing_campaign_running', label: 'Marketing Campaign Running', color: 'bg-green-500', textColor: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500', textColor: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'order_issue', label: 'Order Issue - Check Email', color: 'bg-orange-500', textColor: 'text-orange-800', bgColor: 'bg-orange-100' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500', textColor: 'text-red-800', bgColor: 'bg-red-100' }
];

export default function OrderDetailPage({ user }: OrderDetailPageProps) {
  const router = useRouter();
  const { orderId } = router.query;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [trackUpdates, setTrackUpdates] = useState<{[key: string]: string}>({});
  const [editingTrack, setEditingTrack] = useState<{[key: string]: boolean}>({});
  const [validatingSpotify, setValidatingSpotify] = useState<{[key: string]: boolean}>({});
  const [copyingTrack, setCopyingTrack] = useState<string | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (orderId && typeof orderId === 'string') {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  const fetchOrderDetails = async (orderIdParam: string) => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 FETCH-ORDER: Fetching order details for:', orderIdParam);
      
      // Add aggressive cache-busting parameter to ensure fresh data
      const cacheBuster = Date.now();
      const response = await fetch(`/api/admin/order/${orderIdParam}?t=${cacheBuster}&nocache=${Math.random()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch order details');
      }

      console.log('🔄 FETCH-ORDER: Received fresh order data:', {
        orderNumber: data.order.order_number,
        itemsCount: data.order.items.length,
        firstItemTrackTitle: data.order.items[0]?.track_title,
        firstItemTrackArtist: data.order.items[0]?.track_artist,
        firstItemTrackUrl: data.order.items[0]?.track_url,
        firstItemTrackId: data.order.items[0]?.track_id,
        firstItemUpdatedAt: data.order.items[0]?.updated_at
      });

      // CRITICAL: Update all state with fresh data from database
      setOrder(data.order);
      setSelectedStatus(data.order.status);
      setAdminNotes(data.order.admin_notes || '');
      
      // CRITICAL: Always update track URLs with fresh data from database
      const freshTrackUpdates: {[key: string]: string} = {};
      data.order.items.forEach((item: OrderItem) => {
        freshTrackUpdates[item.id] = item.track_url;
      });
      setTrackUpdates(freshTrackUpdates);
      
      console.log('🔄 FETCH-ORDER: Updated track URLs from database:', freshTrackUpdates);
      console.log('🔄 FETCH-ORDER: Order state updated successfully with fresh data');
      
      // Force React to re-render by updating a dependency
      setLoading(false);
      
    } catch (err) {
      console.error('🔄 FETCH-ORDER: Error fetching order details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order details');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!order) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Prepare track updates - only include changed URLs
      const changedTrackUpdates = order.items
        .filter(item => trackUpdates[item.id] !== item.track_url)
        .map(item => ({
          item_id: item.id,
          track_url: trackUpdates[item.id]
        }));

      const updateData = {
        status: selectedStatus,
        admin_notes: adminNotes,
        track_updates: changedTrackUpdates
      };

      const response = await fetch(`/api/admin/order/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      setSuccess('Order updated successfully');
      
      // Reset editing states
      setEditingTrack({});
      
      // Refresh order data
      await fetchOrderDetails(order.id);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error updating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const validateSpotifyUrl = (url: string) => {
    const spotifyRegex = /^https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+(\?.*)?$/;
    return spotifyRegex.test(url);
  };

  const handleTrackUrlChange = (itemId: string, newUrl: string) => {
    setTrackUpdates(prev => ({
      ...prev,
      [itemId]: newUrl
    }));
  };

  const handleEditTrack = (itemId: string) => {
    setEditingTrack(prev => ({
      ...prev,
      [itemId]: true
    }));
  };

  const handleCopyTrack = async (itemId: string) => {
    const trackUrl = order?.items.find(item => item.id === itemId)?.track_url || '';
    if (trackUrl) {
      // Set copying animation state
      setCopyingTrack(itemId);
      
      try {
        await navigator.clipboard.writeText(trackUrl);
        setSuccess('✅ Spotify URL copied to clipboard!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = trackUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setSuccess('✅ Spotify URL copied to clipboard!');
        setTimeout(() => setSuccess(''), 3000);
      } finally {
        // Clear copying animation after 500ms, then show checkmark
        setTimeout(() => {
          setCopyingTrack(null);
          // Show green checkmark overlay after copying animation completes
          setShowCopySuccess(itemId);
          // Clear checkmark after 2 seconds
          setTimeout(() => setShowCopySuccess(null), 2000);
        }, 500);
      }
    }
  };

  const handleSaveTrack = async (itemId: string) => {
    const newUrl = trackUpdates[itemId];
    
    // Validate Spotify URL
    if (!validateSpotifyUrl(newUrl)) {
      setError('Please enter a valid Spotify track URL');
      return;
    }

    // Set validating state
    setValidatingSpotify(prev => ({ ...prev, [itemId]: true }));

    try {
      console.log('🔄 TRACK-UPDATE: Starting Spotify track update for item:', itemId);
      
      // Validate the URL with Spotify API and update database
      console.log('🔄 TRACK-UPDATE: Sending Spotify validation request with:', {
        url: newUrl,
        itemId: itemId,
        orderItemsCount: order?.items?.length
      });
      
      const validateResponse = await fetch('/api/admin/validate-spotify-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: newUrl,
          itemId: itemId 
        }),
      });

      const validateData = await validateResponse.json();

      if (!validateResponse.ok) {
        throw new Error(validateData.error || 'Invalid Spotify URL');
      }

      console.log('🔄 TRACK-UPDATE: Spotify API update successful, track info:', validateData.trackInfo);

      // Show success message with track info
      const trackInfo = validateData.trackInfo;
      setSuccess(`✅ Track updated successfully! "${trackInfo.title}" by ${trackInfo.artist}`);
      
      // Stop editing mode
      setEditingTrack(prev => ({ ...prev, [itemId]: false }));
      
      // CRITICAL: Force complete refresh of order data with cache-busting
      if (order?.id) {
        console.log('🔄 TRACK-UPDATE: Force refreshing order data with cache-busting...');
        
        // Clear current order state first
        setOrder(null);
        
        // Wait a moment to ensure state is cleared
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Fetch fresh data with aggressive cache-busting
        await fetchOrderDetails(order.id);
        
        console.log('🔄 TRACK-UPDATE: Order data refresh completed');
      }
      
      // Save any other pending changes (like status) if needed
      if (selectedStatus !== order?.status || adminNotes !== order?.admin_notes) {
        console.log('🔄 TRACK-UPDATE: Saving additional order changes...');
        await handleSave();
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('🔄 TRACK-UPDATE: Error updating track:', err);
      setError(err instanceof Error ? err.message : 'Failed to update track information');
    } finally {
      setValidatingSpotify(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const fetchSpotifyTrackInfo = async (spotifyUrl: string) => {
    // Extract track ID from Spotify URL
    const trackIdMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
    if (!trackIdMatch) {
      throw new Error('Invalid Spotify URL format');
    }

    const trackId = trackIdMatch[1];
    
    // TODO: Implement Spotify Web API integration
    // This will fetch updated track information (title, artist, image, etc.)
    // and update both the admin dashboard and customer dashboard
    // as well as the database with the new song information
    
    console.log('🎵 TODO: Fetch Spotify track info for ID:', trackId);
    console.log('🎵 TODO: Update database with new track information');
    console.log('🎵 TODO: Refresh both admin and customer dashboards');
    
    return {
      trackId,
      title: 'Updated Track Title', // Will come from Spotify API
      artist: 'Updated Artist Name', // Will come from Spotify API
      imageUrl: 'https://example.com/updated-image.jpg', // Will come from Spotify API
    };
  };

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
  };

  const formatCurrency = (amount: number) => {
    // Handle both cents and dollars format like the customer dashboard
    // For package prices: If amount >= 600, assume it's in cents and convert to dollars
    // For order totals/subtotals: Always treat as dollars (they come from database as dollars)
    if (amount >= 600) {
      return `$${(amount / 100).toFixed(2)}`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  const formatOrderCurrency = (amount: number) => {
    // For order totals, subtotals, and discounts - always treat as dollars
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading order details...</div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push('/admin#orders')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Order not found</div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin#orders')}
              className="text-white/70 hover:text-white transition-colors"
            >
              ← Back to Admin Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white">
              Order #{order.order_number}
            </h1>
            {!order.viewed_by_admin && (
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                NEW ORDER
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor} font-medium`}>
              {statusInfo.label}
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Email</label>
                  <p className="text-white">{order.customer_email}</p>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Name</label>
                  <p className="text-white">{order.customer_name}</p>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Order Date</label>
                  <p className="text-white">{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Payment Status</label>
                  <p className="text-green-400 capitalize">{order.payment_status}</p>
                </div>
              </div>
            </div>

            {/* Billing Information */}
            {order.billing_info && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Billing Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Name</label>
                    <p className="text-white">{order.billing_info.firstName} {order.billing_info.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Address</label>
                    <p className="text-white">
                      {order.billing_info.address}
                      {order.billing_info.address2 && <><br />{order.billing_info.address2}</>}
                      <br />
                      {order.billing_info.city}, {order.billing_info.state} {order.billing_info.zip}
                      <br />
                      {order.billing_info.country}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Information */}
            {order.payment_data && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Payment Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Transaction ID</label>
                    <p className="text-white font-mono">{order.payment_data.transactionId}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Authorization Code</label>
                    <p className="text-white font-mono">{order.payment_data.authorization}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Card Type</label>
                    <p className="text-white">{order.payment_data.accountType}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Card Number</label>
                    <p className="text-white">{order.payment_data.accountNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6">Order Items</h2>
              
              {/* Column Headers */}
              <div className="grid grid-cols-9 gap-0 mb-4 text-xs font-medium text-white/70 uppercase tracking-wide border-b border-white/20 pb-3">
                <div className="col-span-2 px-4 py-2">Track Image</div>
                <div className="col-span-3 px-4 py-2">Track Information</div>
                <div className="col-span-2 px-4 py-2">Package Details</div>
                <div className="col-span-2 px-4 py-2">Pricing</div>
              </div>
              
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={`${item.id}-${item.updated_at}-${item.track_title}`} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:bg-white/10 transition-colors">
                    {/* Column-based layout with fixed widths */}
                    <div className="grid grid-cols-9 gap-0 min-h-[100px]">
                      {/* Track Image Column */}
                      <div className="col-span-2 bg-white/5 border-r border-white/10 p-4 flex items-center justify-center">
                        <img
                          src={item.track_image_url}
                          alt={item.track_title}
                          className="w-16 h-16 rounded-lg object-cover shadow-lg"
                        />
                      </div>
                      
                      {/* Track Info Column */}
                      <div className="col-span-3 border-r border-white/10 p-4 flex flex-col justify-center">
                        <div className="space-y-1">
                          <h3 className="text-white font-medium text-sm leading-tight line-clamp-2">
                            {item.track_title}
                          </h3>
                          {item.track_artist && (
                            <p className="text-white/70 text-xs leading-tight line-clamp-1">{item.track_artist}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Package Details Column */}
                      <div className="col-span-2 border-r border-white/10 p-4 flex flex-col justify-center">
                        <div className="space-y-1">
                          <p className="text-white font-medium text-sm">{item.package_name}</p>
                          <p className="text-white/70 text-xs">{item.package_plays}</p>
                          <p className="text-white/60 text-xs">{item.package_placements}</p>
                        </div>
                      </div>
                      
                      {/* Pricing Column */}
                      <div className="col-span-2 p-4 flex flex-col justify-center">
                        <div className="space-y-1">
                          {item.is_discounted && (
                            <span className="text-white/50 line-through text-xs">{formatCurrency(item.original_price)}</span>
                          )}
                          <span className="text-white font-semibold text-sm">{formatCurrency(item.discounted_price)}</span>
                        </div>
                        {item.is_discounted && (
                          <div className="mt-2">
                            <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">25% OFF</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Spotify URL - Full Width Section */}
                    <div className="border-t border-white/10 bg-white/3 p-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-white/70 uppercase tracking-wide">Spotify Track URL</label>
                        <div className="flex space-x-3">
                          {editingTrack[item.id] ? (
                            <>
                              <input
                                type="url"
                                value={trackUpdates[item.id] || ''}
                                onChange={(e) => handleTrackUrlChange(item.id, e.target.value)}
                                className="flex-1 bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-white text-sm placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                                placeholder="https://open.spotify.com/track/..."
                              />
                              <button
                                onClick={() => handleSaveTrack(item.id)}
                                disabled={validatingSpotify[item.id] || saving}
                                className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {validatingSpotify[item.id] ? 'Saving...' : 'Save'}
                              </button>
                            </>
                          ) : (
                            <>
                              <input
                                type="url"
                                value={trackUpdates[item.id] || item.track_url || ''}
                                readOnly
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-white/70 text-sm cursor-not-allowed"
                              />
                              <button
                                onClick={() => handleCopyTrack(item.id)}
                                className={`relative bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                                  copyingTrack === item.id ? 'scale-95 bg-green-700' : ''
                                }`}
                                disabled={copyingTrack === item.id}
                              >
                                {copyingTrack === item.id ? 'Copying...' : 'Copy'}
                                {/* Green checkmark overlay */}
                                {showCopySuccess === item.id && (
                                  <div className="absolute inset-0 bg-green-500 rounded-lg flex items-center justify-center animate-pulse">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                              <button
                                onClick={() => handleEditTrack(item.id)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg text-sm transition-colors font-medium whitespace-nowrap"
                              >
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                        {editingTrack[item.id] && trackUpdates[item.id] && !validateSpotifyUrl(trackUpdates[item.id]) && (
                          <p className="text-red-400 text-sm">Invalid Spotify URL format</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add-on Items */}
            {order.addOnItems && order.addOnItems.length > 0 && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Add-ons</h2>
                <div className="space-y-4">
                  {order.addOnItems.map((addon: AddOnItem, index: number) => (
                    <div key={`addon-${addon.id}-${index}`} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{addon.emoji}</span>
                          <div>
                            <h3 className="text-white font-medium">{addon.name}</h3>
                            {addon.description && (
                              <p className="text-white/70 text-sm">{addon.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {addon.isOnSale && (
                              <span className="text-white/50 line-through">{formatCurrency(addon.originalPrice)}</span>
                            )}
                            <span className="text-white font-medium">{formatCurrency(addon.price)}</span>
                            {addon.isOnSale && (
                              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">50% OFF</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">Subtotal</span>
                  <span className="text-white">{formatOrderCurrency(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Discount</span>
                    <span className="text-green-400">-{formatOrderCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="border-t border-white/20 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-white">Total</span>
                    <span className="text-white">{formatOrderCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Management */}
          <div className="space-y-6">
            {/* Status Management */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Order Status</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Current Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status.value} value={status.value} className="bg-gray-800">
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Admin Notes</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Internal Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={6}
                    className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors resize-none"
                    placeholder="Add internal notes about this order..."
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = createClientSSR(context);

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        redirect: {
          destination: '/signup',
          permanent: false,
        },
      };
    }

    return {
      props: {
        user,
      },
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      redirect: {
        destination: '/signup',
        permanent: false,
      },
    };
  }
}; 