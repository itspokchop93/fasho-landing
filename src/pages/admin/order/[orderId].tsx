import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../utils/admin/auth';
import AdminAccessDenied from '../../../components/AdminAccessDenied';
import { calculateDeadline } from '../../../utils/deadlineUtils';

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
  first_saved_at: string | null;
  viewed_by_admin: boolean;
  saved_by_admin: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  addOnItems?: AddOnItem[];
}

interface OrderDetailPageProps {
  adminSession: {
    email: string;
    role: 'admin' | 'sub_admin';
  } | null;
  accessDenied?: boolean;
}

const ORDER_STATUSES = [
  { value: 'processing', label: 'Processing', color: 'bg-yellow-500', textColor: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  { value: 'marketing_campaign_running', label: 'Marketing Campaign Running', color: 'bg-green-500', textColor: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500', textColor: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'order_issue', label: 'Order Issue - Check Email', color: 'bg-orange-500', textColor: 'text-orange-800', bgColor: 'bg-orange-100' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500', textColor: 'text-red-800', bgColor: 'bg-red-100' }
];

const AVAILABLE_PACKAGES = [
  { id: "test-campaign", name: "TEST CAMPAIGN", price: 0.10, plays: "Test Package", placements: "Payment Testing Only", description: "For testing live payment processing" },
  { id: "legendary", name: "LEGENDARY", price: 479, plays: "125K - 150K Streams", placements: "375 - 400 Playlist Pitches", description: "" },
  { id: "unstoppable", name: "UNSTOPPABLE", price: 259, plays: "45K - 50K Streams", placements: "150 - 170 Playlist Pitches", description: "" },
  { id: "dominate", name: "DOMINATE", price: 149, plays: "18K - 20K Streams", placements: "60 - 70 Playlist Pitches", description: "" },
  { id: "momentum", name: "MOMENTUM", price: 79, plays: "7.5K - 8.5K Streams", placements: "25 - 30 Playlist Pitches", description: "" },
  { id: "breakthrough", name: "BREAKTHROUGH", price: 39, plays: "3K - 3.5K Streams", placements: "10 - 12 Playlist Pitches", description: "" }
];

export default function OrderDetailPage({ adminSession, accessDenied }: OrderDetailPageProps) {
  const router = useRouter();
  const { orderId } = router.query;
  
  if (accessDenied || !adminSession) {
    return <AdminAccessDenied />;
  }
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [selectedStatus, setSelectedStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [trackUpdates, setTrackUpdates] = useState<{[key: string]: string}>({});
  const [editingTrack, setEditingTrack] = useState<{[key: string]: boolean}>({});
  const [validatingSpotify, setValidatingSpotify] = useState<{[key: string]: boolean}>({});
  const [copyingTrack, setCopyingTrack] = useState<string | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState<string | null>(null);
  
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemSpotifyUrl, setNewItemSpotifyUrl] = useState('');
  const [newItemPackageId, setNewItemPackageId] = useState('');
  const [editingPackage, setEditingPackage] = useState<{[key: string]: boolean}>({});
  const [packageUpdates, setPackageUpdates] = useState<{[key: string]: string}>({});
  const [updatingPackage, setUpdatingPackage] = useState<{[key: string]: boolean}>({});
  
  const [userProfileGenre, setUserProfileGenre] = useState<string | null>(null);
  const [spotifyArtistGenre, setSpotifyArtistGenre] = useState<string | null>(null);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [artistProfileUrls, setArtistProfileUrls] = useState<{[itemId: string]: string}>({});
  const [loadingArtistUrls, setLoadingArtistUrls] = useState<{[itemId: string]: boolean}>({});
  const [copyingProfile, setCopyingProfile] = useState<string | null>(null);
  const [showProfileCopySuccess, setShowProfileCopySuccess] = useState<string | null>(null);

  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (orderId && typeof orderId === 'string') {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (order?.user_id && order?.items) {
      fetchUserGenres(order.user_id, order.items);
      fetchArtistProfileUrls(order.items);
    }
    if (order?.customer_email) {
      fetchCustomerHistory(order.customer_email);
    }
  }, [order?.user_id, order?.items, order?.customer_email]);

  const fetchCustomerHistory = async (email: string) => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`/api/admin/customer/${encodeURIComponent(email)}`);
      const data = await response.json();
      if (data.success && data.customer?.orders) {
        setCustomerHistory(data.customer.orders);
      }
    } catch (error) {
      console.error('Failed to fetch customer history', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchOrderDetails = async (orderIdParam: string) => {
    try {
      setLoading(true);
      setError('');
      const cacheBuster = Date.now();
      const response = await fetch(`/api/admin/order/${orderIdParam}?t=${cacheBuster}&nocache=${Math.random()}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch order details');
      
      setOrder(data.order);
      setSelectedStatus(data.order.status);
      setAdminNotes(data.order.admin_notes || '');
      
      const freshTrackUpdates: {[key: string]: string} = {};
      data.order.items.forEach((item: OrderItem) => {
        freshTrackUpdates[item.id] = item.track_url;
      });
      setTrackUpdates(freshTrackUpdates);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order details');
      setLoading(false);
    }
  };

  const fetchUserGenres = async (userId: string, orderItems?: OrderItem[]) => {
    setLoadingGenres(true);
    try {
      let profileGenre = null;
      const profileResponse = await fetch(`/api/admin/user-profile?user_id=${userId}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        profileGenre = profileData.profile?.music_genre;
      }
      if (!profileGenre && order?.billing_info) {
        profileGenre = order.billing_info?.musicGenre;
      }
      setUserProfileGenre(profileGenre || null);

      if (orderItems && orderItems.length > 0) {
        let foundGenre = null;
        for (const item of orderItems) {
          if (item.track_url) {
            try {
              const trackResponse = await fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: item.track_url })
              });
              if (trackResponse.ok) {
                const trackData = await trackResponse.json();
                const artistGenres = trackData.track?.artistInsights?.genres;
                if (artistGenres && artistGenres.length > 0) {
                  foundGenre = artistGenres.length === 1 ? artistGenres[0] : artistGenres.slice(0, 2).join(', ');
                  break;
                }
              }
            } catch (e) {}
          }
        }
        setSpotifyArtistGenre(foundGenre);
      }
    } catch (error) {
      setUserProfileGenre(null);
      setSpotifyArtistGenre(null);
    } finally {
      setLoadingGenres(false);
    }
  };

  const fetchArtistProfileUrls = async (orderItems: OrderItem[]) => {
    for (const item of orderItems) {
      if (item.track_url) {
        setLoadingArtistUrls(prev => ({ ...prev, [item.id]: true }));
        try {
          const trackResponse = await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: item.track_url })
          });
          if (trackResponse.ok) {
            const trackData = await trackResponse.json();
            const artistProfileUrl = trackData.track?.artistProfileUrl;
            if (artistProfileUrl) {
              setArtistProfileUrls(prev => ({ ...prev, [item.id]: artistProfileUrl }));
            }
          }
        } catch (error) {}
        finally {
          setLoadingArtistUrls(prev => ({ ...prev, [item.id]: false }));
        }
      }
    }
  };

  const handleCopyProfile = async (itemId: string) => {
    const url = artistProfileUrls[itemId];
    if (!url) return;
    setCopyingProfile(itemId);
    try {
      await navigator.clipboard.writeText(url);
      setShowProfileCopySuccess(itemId);
      setTimeout(() => setShowProfileCopySuccess(null), 2000);
    } catch (error) {}
    finally { setCopyingProfile(null); }
  };

  const handleSave = async () => {
    if (!order) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const changedTrackUpdates = order.items
        .filter(item => trackUpdates[item.id] !== item.track_url)
        .map(item => ({ item_id: item.id, track_url: trackUpdates[item.id] }));
      const updateData = { status: selectedStatus, admin_notes: adminNotes, track_updates: changedTrackUpdates };
      const response = await fetch(`/api/admin/order/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update order');
      setSuccess('Order updated successfully');
      setEditingTrack({});
      await fetchOrderDetails(order.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const validateSpotifyUrl = (url: string) => /^https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+(\?.*)?$/.test(url);

  const handleTrackUrlChange = (itemId: string, newUrl: string) => {
    setTrackUpdates(prev => ({ ...prev, [itemId]: newUrl }));
  };

  const handleEditTrack = (itemId: string) => {
    setEditingTrack(prev => ({ ...prev, [itemId]: true }));
    setEditingPackage(prev => ({ ...prev, [itemId]: true }));
    const currentItem = order?.items.find(item => item.id === itemId);
    if (currentItem) {
      setPackageUpdates(prev => ({ ...prev, [itemId]: currentItem.package_id }));
    }
  };

  const handleCopyTrack = async (itemId: string) => {
    const trackUrl = order?.items.find(item => item.id === itemId)?.track_url || '';
    if (trackUrl) {
      setCopyingTrack(itemId);
      try {
        await navigator.clipboard.writeText(trackUrl);
        setSuccess('✅ Spotify URL copied!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = trackUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setSuccess('✅ Spotify URL copied!');
        setTimeout(() => setSuccess(''), 3000);
      } finally {
        setTimeout(() => {
          setCopyingTrack(null);
          setShowCopySuccess(itemId);
          setTimeout(() => setShowCopySuccess(null), 2000);
        }, 500);
      }
    }
  };

  const handleSaveTrack = async (itemId: string) => {
    const newUrl = trackUpdates[itemId];
    if (!validateSpotifyUrl(newUrl)) {
      setError('Please enter a valid Spotify track URL');
      return;
    }
    setValidatingSpotify(prev => ({ ...prev, [itemId]: true }));
    try {
      const validateResponse = await fetch('/api/admin/validate-spotify-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, itemId }),
      });
      const validateData = await validateResponse.json();
      if (!validateResponse.ok) throw new Error(validateData.error || 'Invalid Spotify URL');
      
      const trackInfo = validateData.trackInfo;
      setSuccess(`✅ Track updated! "${trackInfo.title}" by ${trackInfo.artist}`);
      setEditingTrack(prev => ({ ...prev, [itemId]: false }));
      setEditingPackage(prev => ({ ...prev, [itemId]: false }));
      
      if (order?.id) {
        setOrder(null);
        await new Promise(resolve => setTimeout(resolve, 100));
        await fetchOrderDetails(order.id);
      }
      
      const currentItem = order?.items.find(item => item.id === itemId);
      const newPackageId = packageUpdates[itemId];
      if (currentItem && newPackageId && newPackageId !== currentItem.package_id) {
        await fetch('/api/admin/update-order-item-package', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, packageId: newPackageId }),
        });
      }
      if (selectedStatus !== order?.status || adminNotes !== order?.admin_notes) {
        await handleSave();
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update track');
    } finally {
      setValidatingSpotify(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleAddItem = async () => {
    if (!order || !newItemSpotifyUrl || !newItemPackageId) {
      setError('Please enter both Spotify URL and select a package');
      return;
    }
    if (!validateSpotifyUrl(newItemSpotifyUrl)) {
      setError('Please enter a valid Spotify track URL');
      return;
    }
    try {
      setAddingItem(true);
      setError('');
      const response = await fetch('/api/admin/add-order-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, spotifyUrl: newItemSpotifyUrl, packageId: newItemPackageId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add item');
      setSuccess(`✅ Item added! "${data.trackInfo.title}" by ${data.trackInfo.artist}`);
      setNewItemSpotifyUrl('');
      setNewItemPackageId('');
      setShowAddItemModal(false);
      await fetchOrderDetails(order.id);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleEditPackage = (itemId: string) => {
    setEditingPackage(prev => ({ ...prev, [itemId]: true }));
    const currentItem = order?.items.find(item => item.id === itemId);
    if (currentItem) {
      setPackageUpdates(prev => ({ ...prev, [itemId]: currentItem.package_id }));
    }
  };

  const handlePackageChange = (itemId: string, packageId: string) => {
    setPackageUpdates(prev => ({ ...prev, [itemId]: packageId }));
  };

  const handleSavePackage = async (itemId: string) => {
    const newPackageId = packageUpdates[itemId];
    if (!newPackageId) { setError('Please select a package'); return; }
    try {
      setUpdatingPackage(prev => ({ ...prev, [itemId]: true }));
      setError('');
      const response = await fetch('/api/admin/update-order-item-package', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, packageId: newPackageId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update package');
      setSuccess(`✅ Package updated to ${data.packageInfo.name}`);
      setEditingPackage(prev => ({ ...prev, [itemId]: false }));
      await fetchOrderDetails(order?.id || '');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update package');
    } finally {
      setUpdatingPackage(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const getStatusInfo = (status: string) => ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];

  const formatCurrency = (amount: number) => {
    if (amount >= 600) return `$${(amount / 100).toFixed(2)}`;
    return `$${amount.toFixed(2)}`;
  };

  const formatOrderCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-lg">Loading order details...</div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button onClick={() => router.push('/admin?p=orders')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
            Return to Orders
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-lg">Order not found</div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const deadlineInfo = calculateDeadline(order.created_at, order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Mobile Header */}
        <div className="md:hidden mb-4">
          <button onClick={() => router.push('/admin?p=orders')} className="text-white/70 hover:text-white mb-3 flex items-center gap-1" style={{ fontSize: '0.875rem' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Orders
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">#{order.order_number}</h1>
              {!order.first_saved_at && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-medium">NEW</span>}
            </div>
            <div className={`px-3 py-1.5 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor} font-medium`} style={{ fontSize: '0.75rem' }}>
              {statusInfo.label}
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/admin?p=orders')} className="text-white/70 hover:text-white transition-colors">← Return to Orders</button>
            <h1 className="text-3xl font-bold text-white">Order #{order.order_number}</h1>
            {!order.first_saved_at && <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">NEW ORDER</span>}
          </div>
          <div className={`px-4 py-2 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor} font-medium`}>{statusInfo.label}</div>
        </div>

        {/* Success/Error Messages */}
        {success && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 md:p-4 mb-4 md:mb-6"><p className="text-green-400" style={{ fontSize: '0.875rem' }}>{success}</p></div>}
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 md:p-4 mb-4 md:mb-6"><p className="text-red-400" style={{ fontSize: '0.875rem' }}>{error}</p></div>}

        {/* MOBILE LAYOUT - Reordered sections */}
        <div className="md:hidden space-y-4">
          {/* Order Status - FIRST on mobile for easy access */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <h2 className="text-lg font-semibold text-white mb-3">Order Status</h2>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-3 text-white"
              style={{ fontSize: '1rem' }}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status.value} value={status.value} className="bg-gray-800">{status.label}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-3 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Deadline - Show if applicable */}
          {deadlineInfo.showDeadline && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/20">
              <h2 className="text-lg font-semibold text-white mb-3">Campaign Deadline</h2>
              <div className="px-4 py-3 rounded-lg text-center font-medium" style={{ backgroundColor: deadlineInfo.backgroundColor, color: deadlineInfo.textColor, border: `2px solid ${deadlineInfo.color}` }}>
                {deadlineInfo.message}
              </div>
            </div>
          )}

          {/* Quick Info Card */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/60" style={{ fontSize: '0.75rem' }}>Customer</p>
                <p className="text-white font-medium" style={{ fontSize: '0.875rem' }}>{order.customer_name}</p>
              </div>
              <div>
                <p className="text-white/60" style={{ fontSize: '0.75rem' }}>Total</p>
                <p className="text-white font-bold" style={{ fontSize: '1.125rem' }}>{formatOrderCurrency(order.total)}</p>
              </div>
              <div>
                <p className="text-white/60" style={{ fontSize: '0.75rem' }}>Date</p>
                <p className="text-white" style={{ fontSize: '0.875rem' }}>{formatDateShort(order.created_at)}</p>
              </div>
              <div>
                <p className="text-white/60" style={{ fontSize: '0.75rem' }}>Payment</p>
                <p className="text-green-400 capitalize" style={{ fontSize: '0.875rem' }}>{order.payment_status}</p>
              </div>
            </div>
          </div>

          {/* Customer Email */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <p className="text-white/60 mb-1" style={{ fontSize: '0.75rem' }}>Email</p>
            <p className="text-white break-all" style={{ fontSize: '0.875rem' }}>{order.customer_email}</p>
          </div>

          {/* User Genres - Collapsed */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <h2 className="text-lg font-semibold text-white mb-3">Genres</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/60" style={{ fontSize: '0.75rem' }}>Spotify:</span>
                <span className="text-white" style={{ fontSize: '0.875rem' }}>{loadingGenres ? 'Loading...' : spotifyArtistGenre || 'None'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60" style={{ fontSize: '0.75rem' }}>Checkout:</span>
                <span className="text-white" style={{ fontSize: '0.875rem' }}>{loadingGenres ? 'Loading...' : userProfileGenre || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Order Items - Mobile Card Layout */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Order Items</h2>
              <button onClick={() => setShowAddItemModal(true)} className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-3 py-1.5 rounded-lg text-sm">
                + Add
              </button>
            </div>
            
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                  {/* Track Header */}
                  <div className="p-3 flex gap-3">
                    <img src={item.track_image_url} alt={item.track_title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate" style={{ fontSize: '0.9375rem' }}>{item.track_title}</h3>
                      <p className="text-white/60 truncate" style={{ fontSize: '0.8125rem' }}>{item.track_artist}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs">{item.package_name}</span>
                        <span className="text-white font-semibold" style={{ fontSize: '0.875rem' }}>{formatCurrency(item.discounted_price)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Package Details */}
                  <div className="px-3 pb-2">
                    <p className="text-white/50" style={{ fontSize: '0.75rem' }}>{item.package_plays} • {item.package_placements}</p>
                  </div>
                  
                  {/* Spotify URL Section */}
                  <div className="border-t border-white/10 p-3 bg-white/3">
                    <label className="block text-xs font-medium text-[#59e3a5] uppercase tracking-wide mb-2">Spotify Track URL</label>
                    {editingTrack[item.id] ? (
                      <div className="space-y-2">
                        <input
                          type="url"
                          value={trackUpdates[item.id] || ''}
                          onChange={(e) => handleTrackUrlChange(item.id, e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-white"
                          style={{ fontSize: '0.875rem' }}
                          placeholder="https://open.spotify.com/track/..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveTrack(item.id)}
                            disabled={validatingSpotify[item.id]}
                            className="flex-1 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-2.5 rounded-lg disabled:opacity-50"
                            style={{ fontSize: '0.875rem' }}
                          >
                            {validatingSpotify[item.id] ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingTrack(prev => ({ ...prev, [item.id]: false }))}
                            className="px-4 py-2.5 bg-gray-600 text-white rounded-lg"
                            style={{ fontSize: '0.875rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="url"
                          value={trackUpdates[item.id] || item.track_url || ''}
                          readOnly
                          className="w-full bg-green-500/20 border border-green-400/30 rounded-lg py-2.5 px-3 text-white"
                          style={{ fontSize: '0.8125rem' }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyTrack(item.id)}
                            className={`flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium relative ${copyingTrack === item.id ? 'scale-95' : ''}`}
                            style={{ fontSize: '0.875rem' }}
                          >
                            {copyingTrack === item.id ? 'Copying...' : 'Copy URL'}
                            {showCopySuccess === item.id && (
                              <div className="absolute inset-0 bg-green-500 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </button>
                          <button onClick={() => handleEditTrack(item.id)} className="px-4 py-2.5 bg-gray-600 text-white rounded-lg" style={{ fontSize: '0.875rem' }}>Edit</button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Artist Profile URL */}
                  {artistProfileUrls[item.id] && (
                    <div className="border-t border-white/10 p-3 bg-white/3">
                      <label className="block text-xs font-medium text-white/60 uppercase tracking-wide mb-2">Artist Profile</label>
                      <div className="flex gap-2">
                        <input type="url" value={artistProfileUrls[item.id]} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-white/50" style={{ fontSize: '0.8125rem' }} />
                        <button
                          onClick={() => handleCopyProfile(item.id)}
                          className={`px-4 py-2.5 bg-blue-800 text-white rounded-lg font-medium relative ${copyingProfile === item.id ? 'scale-95' : ''}`}
                          style={{ fontSize: '0.875rem' }}
                        >
                          Copy
                          {showProfileCopySuccess === item.id && (
                            <div className="absolute inset-0 bg-blue-600 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add-ons - Mobile */}
          {order.addOnItems && order.addOnItems.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/20">
              <h2 className="text-lg font-semibold text-white mb-3">Add-ons</h2>
              <div className="space-y-2">
                {order.addOnItems.map((addon, index) => (
                  <div key={`addon-${addon.id}-${index}`} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{addon.emoji}</span>
                      <span className="text-white" style={{ fontSize: '0.875rem' }}>{addon.name}</span>
                    </div>
                    <span className="text-white font-medium" style={{ fontSize: '0.875rem' }}>{formatCurrency(addon.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Summary - Mobile */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <h2 className="text-lg font-semibold text-white mb-3">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="text-white">{formatOrderCurrency(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between"><span className="text-white/70">Discounts</span><span className="text-green-400">-{formatOrderCurrency(order.discount)}</span></div>}
              {order.couponCode && order.couponDiscount && order.couponDiscount > 0 && (
                <div className="flex justify-between"><span className="text-white/70">Coupon ({order.couponCode})</span><span className="text-green-400">-{formatOrderCurrency(order.couponDiscount)}</span></div>
              )}
              <div className="border-t border-white/20 pt-2 flex justify-between font-semibold">
                <span className="text-white">Total</span><span className="text-white text-lg">{formatOrderCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Admin Notes - Mobile */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/20">
            <h2 className="text-lg font-semibold text-white mb-3">Admin Notes</h2>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-3 text-white placeholder-white/50 resize-none"
              style={{ fontSize: '1rem' }}
              placeholder="Add internal notes..."
            />
          </div>

          {/* Billing Info - Collapsible on mobile */}
          {order.billing_info && (
            <details className="bg-white/5 rounded-xl border border-white/20">
              <summary className="p-4 text-lg font-semibold text-white cursor-pointer">Billing Information</summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-white" style={{ fontSize: '0.875rem' }}>{order.billing_info.firstName} {order.billing_info.lastName}</p>
                <p className="text-white/70" style={{ fontSize: '0.8125rem' }}>
                  {order.billing_info.address}<br />
                  {order.billing_info.city}, {order.billing_info.state} {order.billing_info.zip}<br />
                  {order.billing_info.country}
                </p>
              </div>
            </details>
          )}

          {/* Payment Info - Collapsible on mobile */}
          {order.payment_data && (
            <details className="bg-white/5 rounded-xl border border-white/20">
              <summary className="p-4 text-lg font-semibold text-white cursor-pointer">Payment Information</summary>
              <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                <div><p className="text-white/60" style={{ fontSize: '0.75rem' }}>Transaction ID</p><p className="text-white font-mono" style={{ fontSize: '0.75rem' }}>{order.payment_data.transactionId}</p></div>
                <div><p className="text-white/60" style={{ fontSize: '0.75rem' }}>Auth Code</p><p className="text-white font-mono" style={{ fontSize: '0.75rem' }}>{order.payment_data.authorization}</p></div>
                <div><p className="text-white/60" style={{ fontSize: '0.75rem' }}>Card Type</p><p className="text-white" style={{ fontSize: '0.8125rem' }}>{order.payment_data.accountType}</p></div>
                <div><p className="text-white/60" style={{ fontSize: '0.75rem' }}>Card #</p><p className="text-white" style={{ fontSize: '0.8125rem' }}>{order.payment_data.accountNumber}</p></div>
              </div>
            </details>
          )}
        </div>

        {/* DESKTOP LAYOUT - Original layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-8">
          {/* Left Column - Order Information */}
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
                  <div className="relative flex items-center space-x-2" ref={dropdownRef}>
                    <Link href={`/admin/customer/${encodeURIComponent(order.customer_email)}?fromOrder=${order.id}`} className="text-white hover:text-indigo-300 transition-colors underline cursor-pointer flex items-center gap-1">
                      <span>{order.customer_name}</span>
                      {customerHistory.length > 0 && <span className="text-sm text-white/60 no-underline">({customerHistory.length})</span>}
                    </Link>
                    <button onClick={() => setShowHistoryDropdown(!showHistoryDropdown)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                      <svg className={`w-4 h-4 transition-transform ${showHistoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showHistoryDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-[600px] bg-[#0f172a] border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                          <h3 className="text-white font-semibold">Order History</h3>
                          <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">{customerHistory.length} orders</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {loadingHistory ? (
                            <div className="p-8 text-center text-white/60">Loading...</div>
                          ) : customerHistory.length === 0 ? (
                            <div className="p-8 text-center text-white/60">No order history</div>
                          ) : (
                            <table className="w-full text-sm text-white">
                              <thead className="bg-white/5 text-white/60 text-xs uppercase sticky top-0">
                                <tr><th className="px-4 py-3">Order #</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Action</th></tr>
                              </thead>
                              <tbody className="divide-y divide-white/10">
                                {customerHistory.map((histOrder) => {
                                  const statusStyle = ORDER_STATUSES.find(s => s.value === histOrder.status);
                                  return (
                                    <tr key={histOrder.id} className="hover:bg-white/5">
                                      <td className="px-4 py-3 font-mono text-white/80">{histOrder.order_number}</td>
                                      <td className="px-4 py-3 text-white/60">{new Date(histOrder.created_at).toLocaleDateString()}</td>
                                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${statusStyle?.bgColor || 'bg-gray-800'} ${statusStyle?.textColor || 'text-gray-300'}`}>{statusStyle?.label || histOrder.status}</span></td>
                                      <td className="px-4 py-3 text-right font-medium text-white/90">{formatOrderCurrency(histOrder.total)}</td>
                                      <td className="px-4 py-3 text-right"><Link href={`/admin/order/${histOrder.id}`} className="text-[#59e3a5] hover:underline text-xs">View</Link></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div><label className="block text-sm text-white/70 mb-1">Order Date</label><p className="text-white">{formatDate(order.created_at)}</p></div>
                <div><label className="block text-sm text-white/70 mb-1">Payment Status</label><p className="text-green-400 capitalize">{order.payment_status}</p></div>
              </div>
            </div>

            {/* Billing Information */}
            {order.billing_info && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Billing Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-white/70 mb-1">Name</label><p className="text-white">{order.billing_info.firstName} {order.billing_info.lastName}</p></div>
                  <div><label className="block text-sm text-white/70 mb-1">Address</label><p className="text-white">{order.billing_info.address}{order.billing_info.address2 && <><br />{order.billing_info.address2}</>}<br />{order.billing_info.city}, {order.billing_info.state} {order.billing_info.zip}<br />{order.billing_info.country}</p></div>
                </div>
              </div>
            )}

            {/* Payment Information */}
            {order.payment_data && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Payment Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-white/70 mb-1">Transaction ID</label><p className="text-white font-mono">{order.payment_data.transactionId}</p></div>
                  <div><label className="block text-sm text-white/70 mb-1">Authorization Code</label><p className="text-white font-mono">{order.payment_data.authorization}</p></div>
                  <div><label className="block text-sm text-white/70 mb-1">Card Type</label><p className="text-white">{order.payment_data.accountType}</p></div>
                  <div><label className="block text-sm text-white/70 mb-1">Card Number</label><p className="text-white">{order.payment_data.accountNumber}</p></div>
                </div>
              </div>
            )}

            {/* User Genres */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">User Genres</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Genre from Spotify Artist Profile:</label>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    {loadingGenres ? <div className="flex items-center space-x-2"><div className="w-4 h-4 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin"></div><span className="text-white/60 text-sm">Loading...</span></div> : <p className="text-white text-sm">{spotifyArtistGenre || <span className="text-white/50 italic">None Found</span>}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Genre selected during checkout:</label>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    {loadingGenres ? <div className="flex items-center space-x-2"><div className="w-4 h-4 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin"></div><span className="text-white/60 text-sm">Loading...</span></div> : <p className="text-white text-sm">{userProfileGenre || <span className="text-white/50 italic">None Selected</span>}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items - Desktop */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Order Items</h2>
                <button onClick={() => setShowAddItemModal(true)} className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90 flex items-center space-x-2">
                  <span>Add Item</span><span className="text-lg">+</span>
                </button>
              </div>
              
              <div className="hidden md:grid grid-cols-9 gap-0 mb-4 text-xs font-medium text-white/70 uppercase tracking-wide border-b border-white/20 pb-3">
                <div className="col-span-2 px-4 py-2">Track Image</div>
                <div className="col-span-3 px-4 py-2">Track Information</div>
                <div className="col-span-2 px-4 py-2">Package Details</div>
                <div className="col-span-2 px-4 py-2">Pricing</div>
              </div>
              
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={`${item.id}-${item.updated_at}`} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:bg-white/10 transition-colors">
                    <div className="grid grid-cols-9 gap-0 min-h-[100px]">
                      <div className="col-span-2 bg-white/5 border-r border-white/10 p-4 flex items-center justify-center">
                        <img src={item.track_image_url} alt={item.track_title} className="w-16 h-16 rounded-lg object-cover shadow-lg" />
                      </div>
                      <div className="col-span-3 border-r border-white/10 p-4 flex flex-col justify-center">
                        <h3 className="text-white font-medium text-sm leading-tight line-clamp-2">{item.track_title}</h3>
                        {item.track_artist && <p className="text-white/70 text-xs leading-tight line-clamp-1">{item.track_artist}</p>}
                      </div>
                      <div className="col-span-2 border-r border-white/10 p-4 flex flex-col justify-center">
                        {editingPackage[item.id] ? (
                          <div className="space-y-2">
                            <select value={packageUpdates[item.id] || item.package_id} onChange={(e) => handlePackageChange(item.id, e.target.value)} className="w-full bg-white/10 border border-white/20 rounded text-white text-xs p-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                              {AVAILABLE_PACKAGES.map((pkg) => <option key={pkg.id} value={pkg.id} className="bg-gray-800 text-white">{pkg.name} - ${pkg.price}</option>)}
                            </select>
                            <div className="flex space-x-1">
                              <button onClick={() => handleSavePackage(item.id)} disabled={updatingPackage[item.id]} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50">{updatingPackage[item.id] ? 'Saving...' : 'Save'}</button>
                              <button onClick={() => setEditingPackage(prev => ({ ...prev, [item.id]: false }))} className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between"><p className="text-white font-medium text-sm">{item.package_name}</p><button onClick={() => handleEditPackage(item.id)} className="text-blue-400 hover:text-blue-300 text-xs underline ml-2">Edit</button></div>
                            <p className="text-white/70 text-xs">{item.package_plays}</p>
                            <p className="text-white/60 text-xs">{item.package_placements}</p>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 p-4 flex flex-col justify-center">
                        {item.is_discounted && <span className="text-white/50 line-through text-xs">{formatCurrency(item.original_price)}</span>}
                        <span className="text-white font-semibold text-sm">{formatCurrency(item.discounted_price)}</span>
                        {item.is_discounted && <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium mt-2 inline-block w-fit">25% OFF</span>}
                      </div>
                    </div>
                    
                    <div className="border-t border-white/10 bg-white/3 p-4">
                      <label className="block text-xs font-medium text-[#59e3a5] uppercase tracking-wide mb-2">Spotify Track URL</label>
                      <div className="flex space-x-3">
                        {editingTrack[item.id] ? (
                          <>
                            <input type="url" value={trackUpdates[item.id] || ''} onChange={(e) => handleTrackUrlChange(item.id, e.target.value)} className="flex-1 bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-white text-sm placeholder-white/50 focus:outline-none focus:border-[#59e3a5]" placeholder="https://open.spotify.com/track/..." />
                            <button onClick={() => handleSaveTrack(item.id)} disabled={validatingSpotify[item.id]} className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50">{validatingSpotify[item.id] ? 'Saving...' : 'Save'}</button>
                          </>
                        ) : (
                          <>
                            <input type="url" value={trackUpdates[item.id] || item.track_url || ''} readOnly className="flex-1 bg-green-500/20 border border-green-400/30 rounded-lg py-2.5 px-3 text-white text-sm cursor-not-allowed" />
                            <button onClick={() => handleCopyTrack(item.id)} className={`relative bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${copyingTrack === item.id ? 'scale-95' : ''}`}>
                              {copyingTrack === item.id ? 'Copying...' : 'COPY TRACK URL'}
                              {showCopySuccess === item.id && <div className="absolute inset-0 bg-green-500 rounded-lg flex items-center justify-center animate-pulse"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                            </button>
                            <button onClick={() => handleEditTrack(item.id)} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Edit</button>
                          </>
                        )}
                      </div>
                    </div>

                    {artistProfileUrls[item.id] && (
                      <div className="border-t border-white/10 bg-white/3 p-4">
                        <label className="block text-xs font-medium text-white/70 uppercase tracking-wide mb-2">Artist Profile URL</label>
                        <div className="flex space-x-3">
                          <input type="url" value={artistProfileUrls[item.id]} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-white/50 text-sm cursor-not-allowed" />
                          <button onClick={() => handleCopyProfile(item.id)} className={`relative bg-blue-800 hover:bg-blue-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${copyingProfile === item.id ? 'scale-95' : ''}`}>
                            {copyingProfile === item.id ? 'Copying...' : 'COPY PROFILE URL'}
                            {showProfileCopySuccess === item.id && <div className="absolute inset-0 bg-blue-600 rounded-lg flex items-center justify-center animate-pulse"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add-ons - Desktop */}
            {order.addOnItems && order.addOnItems.length > 0 && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Add-ons</h2>
                <div className="space-y-4">
                  {order.addOnItems.map((addon, index) => (
                    <div key={`addon-${addon.id}-${index}`} className="bg-white/5 rounded-lg p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{addon.emoji}</span>
                        <div><h3 className="text-white font-medium">{addon.name}</h3>{addon.description && <p className="text-white/70 text-sm">{addon.description}</p>}</div>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        {addon.isOnSale && <span className="text-white/50 line-through">{formatCurrency(addon.originalPrice)}</span>}
                        <span className="text-white font-medium">{formatCurrency(addon.price)}</span>
                        {addon.isOnSale && <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">50% OFF</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Summary - Desktop */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="text-white">{formatOrderCurrency(order.subtotal)}</span></div>
                {order.discount > 0 && <div className="flex justify-between"><span className="text-white/70">Discounts</span><span className="text-green-400">-{formatOrderCurrency(order.discount)}</span></div>}
                {order.couponCode && order.couponDiscount && order.couponDiscount > 0 && <div className="flex justify-between"><span className="text-white/70">Coupon ({order.couponCode})</span><span className="text-green-400">-{formatOrderCurrency(order.couponDiscount)}</span></div>}
                <div className="border-t border-white/20 pt-2 flex justify-between font-semibold"><span className="text-white">Total</span><span className="text-white">{formatOrderCurrency(order.total)}</span></div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Management - Desktop */}
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Order Status</h2>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-[#59e3a5]">
                {ORDER_STATUSES.map((status) => <option key={status.value} value={status.value} className="bg-gray-800">{status.label}</option>)}
              </select>
            </div>

            {deadlineInfo.showDeadline && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4">Campaign Deadline</h2>
                <div className="px-4 py-3 rounded-lg text-center font-medium" style={{ backgroundColor: deadlineInfo.backgroundColor, color: deadlineInfo.textColor, border: `2px solid ${deadlineInfo.color}` }}>{deadlineInfo.message}</div>
                <p className="text-white/60 text-sm text-center mt-3">Campaign must start within 48 hours</p>
              </div>
            )}

            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Admin Notes</h2>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={6} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white placeholder-white/50 focus:outline-none focus:border-[#59e3a5] resize-none" placeholder="Add internal notes..." />
            </div>

            <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-3 px-6 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-4 md:p-6 w-full max-w-md border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-semibold text-white">Add New Item</h3>
              <button onClick={() => { setShowAddItemModal(false); setNewItemSpotifyUrl(''); setNewItemPackageId(''); setError(''); }} className="text-white/70 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Spotify Track URL</label>
                <input type="url" value={newItemSpotifyUrl} onChange={(e) => setNewItemSpotifyUrl(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-3 text-white placeholder-white/50" style={{ fontSize: '1rem' }} placeholder="https://open.spotify.com/track/..." />
                {newItemSpotifyUrl && !validateSpotifyUrl(newItemSpotifyUrl) && <p className="text-red-400 text-sm mt-1">Invalid Spotify URL</p>}
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Package</label>
                <select value={newItemPackageId} onChange={(e) => setNewItemPackageId(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-3 text-white" style={{ fontSize: '1rem' }}>
                  <option value="" className="bg-gray-800">Select a package...</option>
                  {AVAILABLE_PACKAGES.map((pkg) => <option key={pkg.id} value={pkg.id} className="bg-gray-800">{pkg.name} - ${pkg.price}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddItem} disabled={addingItem || !newItemSpotifyUrl || !newItemPackageId || !validateSpotifyUrl(newItemSpotifyUrl)} className="flex-1 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-3 rounded-lg disabled:opacity-50">
                  {addingItem ? 'Adding...' : 'Add Item'}
                </button>
                <button onClick={() => { setShowAddItemModal(false); setNewItemSpotifyUrl(''); setNewItemPackageId(''); setError(''); }} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const token = getAdminTokenFromRequest(context.req as any);
    if (!token) return { props: { adminSession: null, accessDenied: true } };
    const adminSession = await verifyAdminToken(token);
    if (!adminSession) return { props: { adminSession: null, accessDenied: true } };
    return { props: { adminSession: { email: adminSession.email, role: adminSession.role } } };
  } catch (error) {
    return { props: { adminSession: null, accessDenied: true } };
  }
};
