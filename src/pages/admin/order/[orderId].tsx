import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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

// Available packages for admin features
const AVAILABLE_PACKAGES = [
  {
    id: "test-campaign",
    name: "TEST CAMPAIGN",
    price: 0.10,
    plays: "Test Package",
    placements: "Payment Testing Only",
    description: "For testing live payment processing"
  },
  {
    id: "legendary",
    name: "LEGENDARY",
    price: 479,
    plays: "125K - 150K Streams",
    placements: "375 - 400 Playlist Pitches",
    description: ""
  },
  {
    id: "unstoppable",
    name: "UNSTOPPABLE",
    price: 259,
    plays: "45K - 50K Streams",
    placements: "150 - 170 Playlist Pitches",
    description: ""
  },
  {
    id: "dominate",
    name: "DOMINATE",
    price: 149,
    plays: "18K - 20K Streams",
    placements: "60 - 70 Playlist Pitches",
    description: ""
  },
  {
    id: "momentum",
    name: "MOMENTUM",
    price: 79,
    plays: "7.5K - 8.5K Streams",
    placements: "25 - 30 Playlist Pitches",
    description: ""
  },
  {
    id: "breakthrough",
    name: "BREAKTHROUGH",
    price: 39,
    plays: "3K - 3.5K Streams",
    placements: "10 - 12 Playlist Pitches",
    description: ""
  }
];

export default function OrderDetailPage({ adminSession, accessDenied }: OrderDetailPageProps) {
  const router = useRouter();
  const { orderId } = router.query;
  
  // Admin access control
  if (accessDenied || !adminSession) {
    return <AdminAccessDenied />;
  }
  
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
  
  // New state for advanced features
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemSpotifyUrl, setNewItemSpotifyUrl] = useState('');
  const [newItemPackageId, setNewItemPackageId] = useState('');
  const [editingPackage, setEditingPackage] = useState<{[key: string]: boolean}>({});
  const [packageUpdates, setPackageUpdates] = useState<{[key: string]: string}>({});
  const [updatingPackage, setUpdatingPackage] = useState<{[key: string]: boolean}>({});
  
  // User Genres state
  const [userProfileGenre, setUserProfileGenre] = useState<string | null>(null);
  const [spotifyArtistGenre, setSpotifyArtistGenre] = useState<string | null>(null);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [artistProfileUrls, setArtistProfileUrls] = useState<{[itemId: string]: string}>({});
  const [loadingArtistUrls, setLoadingArtistUrls] = useState<{[itemId: string]: boolean}>({});
  const [copyingProfile, setCopyingProfile] = useState<string | null>(null);
  const [showProfileCopySuccess, setShowProfileCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (orderId && typeof orderId === 'string') {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  // Fetch user genres when order is loaded
  useEffect(() => {
    if (order?.user_id && order?.items) {
      fetchUserGenres(order.user_id, order.items);
      fetchArtistProfileUrls(order.items);
    }
  }, [order?.user_id, order?.items]);

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

  // Function to extract Spotify track ID from URL
  const extractTrackIdFromUrl = (url: string): string | null => {
    const trackUrlPattern = /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/;
    const match = url.match(trackUrlPattern);
    return match ? match[1] : null;
  };

  // Function to fetch user genres (both profile and Spotify)
  const fetchUserGenres = async (userId: string, orderItems?: OrderItem[]) => {
    setLoadingGenres(true);
    console.log('🎵 ADMIN-GENRES: Fetching user genres for user:', userId);

    try {
      // Fetch user profile genre
      const profileResponse = await fetch(`/api/user-profile?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const profileGenre = profileData.profile?.music_genre;
        setUserProfileGenre(profileGenre || null);
        console.log('🎵 ADMIN-GENRES: User profile genre:', profileGenre || 'None Selected');
      } else {
        console.warn('🎵 ADMIN-GENRES: Failed to fetch user profile');
        setUserProfileGenre(null);
      }

      // Fetch Spotify artist genre - check all tracks in the order
      if (orderItems && orderItems.length > 0) {
        console.log(`🎵 ADMIN-GENRES: Checking ${orderItems.length} tracks for Spotify artist genres`);
        
        let foundGenre = null;
        let foundTrackInfo = null;

        // Iterate through all tracks to find one with genre information
        for (let i = 0; i < orderItems.length; i++) {
          const item = orderItems[i];
          const trackUrl = item.track_url;
          
          if (trackUrl) {
            console.log(`🎵 ADMIN-GENRES: Checking track ${i + 1}/${orderItems.length} - "${item.track_title}" by ${item.track_artist} (URL: ${trackUrl})`);
            
            try {
              const trackResponse = await fetch('/api/track', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: trackUrl
                })
              });
              if (trackResponse.ok) {
                const trackData = await trackResponse.json();
                const artistGenres = trackData.track?.artistInsights?.genres;
                
                if (artistGenres && artistGenres.length > 0) {
                  // Found a track with genre information!
                  const genreText = artistGenres.length === 1 ? artistGenres[0] : artistGenres.slice(0, 2).join(', ');
                  foundGenre = genreText;
                  foundTrackInfo = {
                    title: item.track_title,
                    artist: item.track_artist,
                    genres: artistGenres
                  };
                  console.log(`🎵 ADMIN-GENRES: ✅ Found genres for "${item.track_title}" by ${item.track_artist}: ${genreText}`);
                  break; // Stop searching once we find a track with genres
                } else {
                  console.log(`🎵 ADMIN-GENRES: ❌ No genres found for "${item.track_title}" by ${item.track_artist}`);
                }
              } else {
                console.warn(`🎵 ADMIN-GENRES: Failed to fetch track data for "${item.track_title}"`);
              }
            } catch (trackError) {
              console.error(`🎵 ADMIN-GENRES: Error fetching track "${item.track_title}":`, trackError);
            }
          } else {
            console.warn(`🎵 ADMIN-GENRES: No track URL for item: ${item.track_title}`);
          }
        }

        if (foundGenre && foundTrackInfo) {
          setSpotifyArtistGenre(foundGenre);
          console.log(`🎵 ADMIN-GENRES: 🎯 Final result: Using genres from "${foundTrackInfo.title}" by ${foundTrackInfo.artist}: ${foundGenre}`);
        } else {
          setSpotifyArtistGenre(null);
          console.log('🎵 ADMIN-GENRES: 🚫 No Spotify artist genres found in any of the order tracks');
        }
      } else {
        console.log('🎵 ADMIN-GENRES: No order items available for Spotify genre lookup');
        setSpotifyArtistGenre(null);
      }
    } catch (error) {
      console.error('🎵 ADMIN-GENRES: Error fetching user genres:', error);
      setUserProfileGenre(null);
      setSpotifyArtistGenre(null);
    } finally {
      setLoadingGenres(false);
    }
  };

  // Function to fetch artist profile URLs for all tracks
  const fetchArtistProfileUrls = async (orderItems: OrderItem[]) => {
    console.log('🎵 ADMIN-PROFILES: Fetching artist profile URLs for all tracks');

    for (const item of orderItems) {
      if (item.track_url) {
        setLoadingArtistUrls(prev => ({ ...prev, [item.id]: true }));
        
        try {
          console.log(`🎵 ADMIN-PROFILES: Fetching profile URL for "${item.track_title}" by ${item.track_artist}`);
          
          const trackResponse = await fetch('/api/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: item.track_url
            })
          });

          if (trackResponse.ok) {
            const trackData = await trackResponse.json();
            const artistProfileUrl = trackData.track?.artistProfileUrl;
            
            if (artistProfileUrl) {
              setArtistProfileUrls(prev => ({
                ...prev,
                [item.id]: artistProfileUrl
              }));
              console.log(`🎵 ADMIN-PROFILES: ✅ Found profile URL for "${item.track_title}": ${artistProfileUrl}`);
            } else {
              console.log(`🎵 ADMIN-PROFILES: ❌ No profile URL found for "${item.track_title}"`);
            }
          } else {
            console.warn(`🎵 ADMIN-PROFILES: Failed to fetch track data for "${item.track_title}"`);
          }
        } catch (error) {
          console.error(`🎵 ADMIN-PROFILES: Error fetching profile URL for "${item.track_title}":`, error);
        } finally {
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
    } catch (error) {
      console.error('Failed to copy profile URL:', error);
    } finally {
      setCopyingProfile(null);
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
    
    // Also enable package editing when editing track
    setEditingPackage(prev => ({
      ...prev,
      [itemId]: true
    }));
    
    // Initialize package dropdown with current package
    const currentItem = order?.items.find(item => item.id === itemId);
    if (currentItem) {
      setPackageUpdates(prev => ({
        ...prev,
        [itemId]: currentItem.package_id
      }));
    }
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
      setEditingPackage(prev => ({ ...prev, [itemId]: false }));
      
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
        
        // Also refresh artist profile URL for this specific item
        const updatedOrder = await new Promise<Order | null>((resolve) => {
          const checkOrder = () => {
            if (order?.items) {
              resolve(order);
            } else {
              setTimeout(checkOrder, 50);
            }
          };
          checkOrder();
        });
        
        if (updatedOrder?.items) {
          const updatedItem = updatedOrder.items.find(item => item.id === itemId);
          if (updatedItem?.track_url) {
            console.log('🔄 TRACK-UPDATE: Refreshing artist profile URL for updated track');
            fetchArtistProfileUrls([updatedItem]);
          }
        }
      }
      
      // Check if package was also changed and save it
      const currentItem = order?.items.find(item => item.id === itemId);
      const newPackageId = packageUpdates[itemId];
      
      if (currentItem && newPackageId && newPackageId !== currentItem.package_id) {
        console.log('🔄 TRACK-UPDATE: Package also changed, updating package...');
        try {
          const packageResponse = await fetch('/api/admin/update-order-item-package', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              itemId,
              packageId: newPackageId
            }),
          });

          if (packageResponse.ok) {
            console.log('🔄 TRACK-UPDATE: Package updated successfully alongside track');
          } else {
            console.warn('🔄 TRACK-UPDATE: Package update failed, but track update succeeded');
          }
        } catch (packageError) {
          console.warn('🔄 TRACK-UPDATE: Package update error, but track update succeeded:', packageError);
        }
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

  // NEW FEATURE 1: Add Item to Order
  const handleAddItem = async () => {
    if (!order || !newItemSpotifyUrl || !newItemPackageId) {
      setError('Please enter both Spotify URL and select a package');
      return;
    }

    // Validate Spotify URL
    if (!validateSpotifyUrl(newItemSpotifyUrl)) {
      setError('Please enter a valid Spotify track URL');
      return;
    }

    try {
      setAddingItem(true);
      setError('');
      setSuccess('');

      console.log('🎵 ADD-ITEM: Adding new item to order:', {
        orderId: order.id,
        spotifyUrl: newItemSpotifyUrl,
        packageId: newItemPackageId
      });

      const response = await fetch('/api/admin/add-order-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          spotifyUrl: newItemSpotifyUrl,
          packageId: newItemPackageId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item to order');
      }

      setSuccess(`✅ Item added successfully! "${data.trackInfo.title}" by ${data.trackInfo.artist} with ${data.trackInfo.package} package`);
      
      // Reset form
      setNewItemSpotifyUrl('');
      setNewItemPackageId('');
      setShowAddItemModal(false);
      
      // Refresh order data
      await fetchOrderDetails(order.id);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('🎵 ADD-ITEM: Error adding item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add item to order');
    } finally {
      setAddingItem(false);
    }
  };

  // NEW FEATURE 2: Update Package
  const handleEditPackage = (itemId: string) => {
    setEditingPackage(prev => ({
      ...prev,
      [itemId]: true
    }));
    
    // Initialize package dropdown with current package
    const currentItem = order?.items.find(item => item.id === itemId);
    if (currentItem) {
      setPackageUpdates(prev => ({
        ...prev,
        [itemId]: currentItem.package_id
      }));
    }
  };

  const handlePackageChange = (itemId: string, packageId: string) => {
    setPackageUpdates(prev => ({
      ...prev,
      [itemId]: packageId
    }));
  };

  const handleSavePackage = async (itemId: string) => {
    const newPackageId = packageUpdates[itemId];
    
    if (!newPackageId) {
      setError('Please select a package');
      return;
    }

    try {
      setUpdatingPackage(prev => ({ ...prev, [itemId]: true }));
      setError('');
      setSuccess('');

      console.log('🎵 UPDATE-PACKAGE: Updating item package:', {
        itemId,
        newPackageId
      });

      const response = await fetch('/api/admin/update-order-item-package', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          packageId: newPackageId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update package');
      }

      setSuccess(`✅ Package updated successfully! Changed to ${data.packageInfo.name} (${data.orderTotals.priceDifference >= 0 ? '+' : ''}$${data.orderTotals.priceDifference.toFixed(2)})`);
      
      // Stop editing mode
      setEditingPackage(prev => ({ ...prev, [itemId]: false }));
      
      // Refresh order data
      await fetchOrderDetails(order?.id || '');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('🎵 UPDATE-PACKAGE: Error updating package:', err);
      setError(err instanceof Error ? err.message : 'Failed to update package');
    } finally {
      setUpdatingPackage(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const fetchSpotifyTrackInfo = async (spotifyUrl: string) => {
    // Extract track ID from Spotify URL
    const trackIdMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
    if (!trackIdMatch) {
      throw new Error('Invalid Spotify URL format');
    }

    const trackId = trackIdMatch[1];
    
   
    
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
            {!order.first_saved_at && (
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

            {/* User Genres */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">User Genres</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Genre from Spotify Artist Profile:</label>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    {loadingGenres ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white/60 text-sm">Loading...</span>
                      </div>
                    ) : (
                      <p className="text-white text-sm">
                        {spotifyArtistGenre || (
                          <span className="text-white/50 italic">None Found</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Genre selected during checkout:</label>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    {loadingGenres ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-[#59e3a5] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white/60 text-sm">Loading...</span>
                      </div>
                    ) : (
                      <p className="text-white text-sm">
                        {userProfileGenre || (
                          <span className="text-white/50 italic">None Selected</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Order Items</h2>
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center space-x-2"
                  style={{ zIndex: 10 }}
                >
                  <span>Add Item</span>
                  <span className="text-lg">+</span>
                </button>
              </div>
              
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
                        {editingPackage[item.id] ? (
                          <div className="space-y-2">
                            <select
                              value={packageUpdates[item.id] || item.package_id}
                              onChange={(e) => handlePackageChange(item.id, e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded text-white text-xs p-1 focus:outline-none focus:border-[#59e3a5] transition-colors"
                              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                            >
                              {AVAILABLE_PACKAGES.map((pkg) => (
                                <option key={pkg.id} value={pkg.id} className="bg-gray-800 text-white">
                                  {pkg.name} - ${pkg.price}
                                </option>
                              ))}
                            </select>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleSavePackage(item.id)}
                                disabled={updatingPackage[item.id]}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {updatingPackage[item.id] ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingPackage(prev => ({ ...prev, [item.id]: false }))}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-white font-medium text-sm">{item.package_name}</p>
                              <button
                                onClick={() => handleEditPackage(item.id)}
                                className="text-blue-400 hover:text-blue-300 text-xs underline ml-2"
                              >
                                Edit
                              </button>
                            </div>
                            <p className="text-white/70 text-xs">{item.package_plays}</p>
                            <p className="text-white/60 text-xs">{item.package_placements}</p>
                          </div>
                        )}
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
                        <label className="block text-xs font-medium text-[#59e3a5] uppercase tracking-wide">Spotify Track URL</label>
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
                                {copyingTrack === item.id ? 'Copying...' : 'COPY TRACK URL'}
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

                    {/* Artist Profile URL - Full Width Section */}
                    <div className="border-t border-white/10 bg-white/3 p-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-white/70 uppercase tracking-wide">Artist Profile URL</label>
                        <div className="flex space-x-3">
                          <input
                            type="url"
                            value={artistProfileUrls[item.id] || ''}
                            readOnly
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-white/50 text-sm cursor-not-allowed"
                            placeholder={loadingArtistUrls[item.id] ? "Loading artist profile..." : "No artist profile found"}
                          />
                          {artistProfileUrls[item.id] && (
                            <button
                              onClick={() => handleCopyProfile(item.id)}
                              className={`relative bg-blue-800 hover:bg-blue-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                                copyingProfile === item.id ? 'scale-95 bg-blue-900' : ''
                              }`}
                              disabled={copyingProfile === item.id}
                            >
                              {copyingProfile === item.id ? 'Copying...' : 'COPY PROFILE URL'}
                              {/* Blue checkmark overlay */}
                              {showProfileCopySuccess === item.id && (
                                <div className="absolute inset-0 bg-blue-600 rounded-lg flex items-center justify-center animate-pulse">
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          )}
                          {loadingArtistUrls[item.id] && (
                            <div className="flex items-center px-6 py-2.5">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="ml-2 text-white/60 text-sm">Loading...</span>
                            </div>
                          )}
                        </div>
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
                    <span className="text-white/70">Discounts</span>
                    <span className="text-green-400">-{formatOrderCurrency(order.discount)}</span>
                  </div>
                )}
                {order.couponCode && order.couponDiscount && order.couponDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Coupon ({order.couponCode})</span>
                    <span className="text-green-400">-{formatOrderCurrency(order.couponDiscount)}</span>
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

            {/* Deadline Countdown - Only show for processing orders */}
            {(() => {
              const deadlineInfo = calculateDeadline(order.created_at, order.status);
              return deadlineInfo.showDeadline ? (
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Campaign Deadline</h2>
                  <div className="space-y-3">
                    <div 
                      className="px-4 py-3 rounded-lg text-center font-medium"
                      style={{
                        backgroundColor: deadlineInfo.backgroundColor,
                        color: deadlineInfo.textColor,
                        border: `2px solid ${deadlineInfo.color}`
                      }}
                    >
                      {deadlineInfo.message}
                    </div>
                    <p className="text-white/60 text-sm text-center">
                      Campaign must start within 48 hours of order placement
                    </p>
                  </div>
                </div>
              ) : null;
            })()}

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

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 50 }}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/20" style={{ zIndex: 60 }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Add New Item</h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setNewItemSpotifyUrl('');
                  setNewItemPackageId('');
                  setError('');
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Spotify Track URL</label>
                <input
                  type="url"
                  value={newItemSpotifyUrl}
                  onChange={(e) => setNewItemSpotifyUrl(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-white text-sm placeholder-white/50 focus:outline-none focus:border-[#59e3a5] transition-colors"
                  placeholder="https://open.spotify.com/track/..."
                />
                {newItemSpotifyUrl && !validateSpotifyUrl(newItemSpotifyUrl) && (
                  <p className="text-red-400 text-sm mt-1">Invalid Spotify URL format</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Package</label>
                <select
                  value={newItemPackageId}
                  onChange={(e) => setNewItemPackageId(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#59e3a5] transition-colors"
                >
                  <option value="" className="bg-gray-800">Select a package...</option>
                  {AVAILABLE_PACKAGES.map((pkg) => (
                    <option key={pkg.id} value={pkg.id} className="bg-gray-800">
                      {pkg.name} - ${pkg.price} ({pkg.plays})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleAddItem}
                  disabled={addingItem || !newItemSpotifyUrl || !newItemPackageId || !validateSpotifyUrl(newItemSpotifyUrl)}
                  className="flex-1 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingItem ? 'Adding Item...' : 'Add Item'}
                </button>
                <button
                  onClick={() => {
                    setShowAddItemModal(false);
                    setNewItemSpotifyUrl('');
                    setNewItemPackageId('');
                    setError('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
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
    console.log('🔐 ORDER-DETAIL: Checking admin authentication...')
    
    // Get admin session token from request
    const token = getAdminTokenFromRequest(context.req as any)
    
    if (!token) {
      console.log('🔐 ORDER-DETAIL: No admin session token found')
      return {
        props: {
          adminSession: null,
          accessDenied: true,
        },
      }
    }
    
    // Verify the admin token
    const adminSession = await verifyAdminToken(token)
    
    if (!adminSession) {
      console.log('🔐 ORDER-DETAIL: Invalid admin session token')
      return {
        props: {
          adminSession: null,
          accessDenied: true,
        },
      }
    }
    
    console.log('🔐 ORDER-DETAIL: Admin authentication successful:', adminSession.email)
    
    return {
      props: {
        adminSession: {
          email: adminSession.email,
          role: adminSession.role,
        },
      },
    }
  } catch (error) {
    console.error('🔐 ORDER-DETAIL: Admin auth error:', error)
    return {
      props: {
        adminSession: null,
        accessDenied: true,
      },
    }
  }
}; 