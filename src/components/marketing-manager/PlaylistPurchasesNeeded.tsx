import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface PlaylistPurchaseItem {
  id: string;
  playlistName: string;
  playlistLink: string;
  imageUrl?: string;
  songsAdded: number;
  sessionDate: string;
  genre: string;
  recentlyAdded?: boolean; // For highlighting new additions
  followersPurchased?: boolean; // Track if followers have been purchased
  streamsPurchased?: boolean; // Track if streams have been purchased
  currentSaves?: number; // Current saves count from API
}

interface PlaylistService {
  id: string;
  service_type: string;
  service_id: string;
  service_name: string | null;
  price_per_1k: number | null;
}

interface PurchaseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  purchaseType: 'followers' | 'streams';
  playlistName: string;
  quantity: number;
  dripRuns?: number;
  interval?: number;
  serviceId: string | null;
  pricePerK: number | null;
  currentBalance: string | null;
  estimatedCost: number | null;
  // Success state
  isSuccess?: boolean;
  orderId?: number;
  newBalance?: string | null;
  errorMessage?: string | null;
}

// Custom Confirmation Modal Component - identical to ActiveCampaigns
interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  position: { top: number; left: number } | null;
  buttonType: 'purchased' | 'clear';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  position,
  buttonType
}) => {
  if (!isOpen || !position) {
    return null;
  }

  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      } else if (event.key === 'Enter') {
        onConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel, onConfirm]);

  const getButtonColors = () => {
    switch (buttonType) {
      case 'purchased':
        return {
          confirm: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-200',
          accent: 'text-blue-600'
        };
      case 'clear':
        return {
          confirm: 'bg-red-600 hover:bg-red-700 text-white',
          border: 'border-red-200',
          accent: 'text-red-600'
        };
      default:
        return {
          confirm: 'bg-gray-600 hover:bg-gray-700 text-white',
          border: 'border-gray-200',
          accent: 'text-gray-600'
        };
    }
  };

  const colors = getButtonColors();

  return (
    <>
      {/* Invisible overlay to close on outside click */}
      <div 
        className="fixed inset-0"
        style={{ zIndex: 9999 }}
        onClick={onCancel}
      />
      
      {/* Small popup attached to button */}
      <div
        className="absolute bg-white rounded-lg shadow-xl border-2 border-gray-800"
        style={{
          zIndex: 10000,
          top: position.top - 110,
          left: position.left - 100,
          width: '250px'
        }}
      >
        {/* Arrow pointing down to button */}
        <div 
          className="absolute top-full left-1/2 transform -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '10px solid #1f2937'
          }}
        ></div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-gray-800 text-sm mb-4 leading-tight font-medium">
            {message}
          </p>
          
          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded font-medium flex-1"
            >
              ✓ Yes
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium flex-1"
            >
              ✗ No
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Purchase Receipt Modal Component
const PurchaseReceiptModal: React.FC<PurchaseReceiptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  purchaseType,
  playlistName,
  quantity,
  dripRuns,
  interval,
  serviceId,
  pricePerK,
  currentBalance,
  estimatedCost,
  isSuccess,
  orderId,
  newBalance,
  errorMessage,
}) => {
  if (!isOpen) return null;

  const totalQuantity = dripRuns && dripRuns > 0 ? quantity * dripRuns : quantity;
  const balanceAfter = currentBalance && estimatedCost 
    ? (parseFloat(currentBalance) - estimatedCost).toFixed(2)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={!isSubmitting ? onClose : undefined} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className={`px-6 py-4 ${isSuccess ? 'bg-gradient-to-r from-green-500 to-emerald-500' : errorMessage ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            {isSuccess ? (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Purchase Successful!
              </>
            ) : errorMessage ? (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Purchase Failed
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Order Receipt
              </>
            )}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isSuccess ? (
            // Success content
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-[0.7rem] font-bold text-green-500 uppercase tracking-wider mb-1">Order ID</div>
                <div className="text-2xl font-black text-green-700">#{orderId}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[0.65rem] font-bold text-gray-400 uppercase">Type</div>
                  <div className="text-[0.9rem] font-bold text-gray-700 capitalize">{purchaseType}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[0.65rem] font-bold text-gray-400 uppercase">Quantity</div>
                  <div className="text-[0.9rem] font-bold text-gray-700">{totalQuantity.toLocaleString()}</div>
                </div>
              </div>
              {newBalance && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-[0.65rem] font-bold text-green-500 uppercase mb-1">New Balance</div>
                  <div className="text-xl font-black text-green-700">${parseFloat(newBalance).toFixed(2)}</div>
                </div>
              )}
            </div>
          ) : errorMessage ? (
            // Error content
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-[0.7rem] font-bold text-red-500 uppercase mb-2">Error Message</div>
              <div className="text-[0.85rem] text-red-700">{errorMessage}</div>
            </div>
          ) : (
            // Confirmation content
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-[0.65rem] font-bold text-purple-500 uppercase mb-1">Playlist</div>
                <div className="text-[0.95rem] font-bold text-purple-800 truncate">{playlistName}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[0.65rem] font-bold text-gray-400 uppercase">Purchase Type</div>
                  <div className="text-[0.9rem] font-bold text-gray-700 capitalize">{purchaseType}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[0.65rem] font-bold text-gray-400 uppercase">Service ID</div>
                  <div className="text-[0.9rem] font-bold text-gray-700">
                    {serviceId || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[0.65rem] font-bold text-gray-400 uppercase">Quantity</div>
                  <div className="text-[0.9rem] font-bold text-gray-700">{quantity.toLocaleString()}</div>
                </div>
                {dripRuns && dripRuns > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-[0.65rem] font-bold text-blue-400 uppercase">Drip Feed</div>
                    <div className="text-[0.85rem] font-bold text-blue-700">
                      {dripRuns} runs x {interval === 1440 ? '1 day' : `${interval}min`}
                    </div>
                  </div>
                )}
              </div>

              {dripRuns && dripRuns > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="text-[0.65rem] font-bold text-indigo-400 uppercase">Total Quantity</div>
                  <div className="text-lg font-black text-indigo-700">{totalQuantity.toLocaleString()}</div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[0.8rem] text-gray-500">Price per 1K:</span>
                  <span className="text-[0.9rem] font-bold text-gray-700">
                    {pricePerK ? `$${pricePerK.toFixed(4)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.8rem] text-gray-500">Estimated Cost:</span>
                  <span className="text-[0.9rem] font-bold text-orange-600">
                    {estimatedCost ? `$${estimatedCost.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.8rem] text-gray-500">Current Balance:</span>
                  <span className="text-[0.9rem] font-bold text-green-600">
                    {currentBalance ? `$${parseFloat(currentBalance).toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-yellow-50 -mx-6 px-6 py-2 border-y border-yellow-200">
                  <span className="text-[0.8rem] font-bold text-yellow-700">Balance After:</span>
                  <span className="text-lg font-black text-yellow-700">
                    {balanceAfter ? `$${balanceAfter}` : 'N/A'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {isSuccess || errorMessage ? (
            <button
              onClick={onClose}
              className="flex-1 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isSubmitting}
                className="flex-1 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Purchase
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const PlaylistPurchasesNeeded: React.FC = () => {
  console.log('📋 PLAYLIST-PURCHASES: 🚀 COMPONENT CONSTRUCTOR - Component is being initialized');
  
  const [playlistPurchases, setPlaylistPurchases] = useState<PlaylistPurchaseItem[]>([]);
  const [playlistNetwork, setPlaylistNetwork] = useState<{[id: string]: any}>({});
  const [campaignTracker, setCampaignTracker] = useState<{[campaignId: string]: string[]}>({});
  const [copiedPlaylistId, setCopiedPlaylistId] = useState<string | null>(null);
  // Track the absolute last playlist that was copied
  const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);
  // Animation state for re-copy feedback
  const [copyAnimating, setCopyAnimating] = useState<string | null>(null);
  
  // Playlist service settings
  const [playlistServices, setPlaylistServices] = useState<{ [key: string]: PlaylistService }>({});
  const [currentBalance, setCurrentBalance] = useState<string | null>(null);
  
  // Form inputs for each playlist
  const [followersInputs, setFollowersInputs] = useState<{ [playlistId: string]: string }>({});
  const [streamsInputs, setStreamsInputs] = useState<{ [playlistId: string]: { qty: string; dripRuns: string; interval: string } }>({});
  
  // Purchase receipt modal state
  const [receiptModal, setReceiptModal] = useState<{
    isOpen: boolean;
    playlistId: string;
    playlistName: string;
    purchaseType: 'followers' | 'streams';
    quantity: number;
    dripRuns?: number;
    interval?: number;
    isSubmitting: boolean;
    isSuccess?: boolean;
    orderId?: number;
    newBalance?: string | null;
    errorMessage?: string | null;
  }>({
    isOpen: false,
    playlistId: '',
    playlistName: '',
    purchaseType: 'followers',
    quantity: 0,
    isSubmitting: false,
  });
  
  console.log('📋 PLAYLIST-PURCHASES: 🚀 STATE INITIALIZED - All state variables created');
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    message: string;
    playlistId?: string;
    action: 'purchased' | 'clear';
    position: { top: number; left: number } | null;
  }>({
    isOpen: false,
    message: '',
    action: 'purchased',
    position: null
  });

  // Animation styles
  const animationStyles = `
    @keyframes fade-in-slide {
      0% { opacity: 0; transform: translateY(-10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes highlight-fade {
      0% { background-color: #dcfce7; }
      100% { background-color: transparent; }
    }
    
    @keyframes copy-click {
      0% { transform: scale(1); }
      50% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    
    .fade-in-slide { animation: fade-in-slide 0.3s ease-out; }
    .highlight-fade { animation: highlight-fade 8s ease-out; }
    .copy-click { animation: copy-click 0.2s ease-in-out; }
  `;

  // Fetch playlist services and balance
  const fetchPlaylistServicesAndBalance = async () => {
    try {
      // Fetch playlist service settings
      const servicesResponse = await fetch('/api/marketing-manager/smm-panel/playlist-services');
      if (servicesResponse.ok) {
        const data = await servicesResponse.json();
        if (data.success) {
          setPlaylistServices(data.services || {});
        }
      }

      // Fetch current balance
      const balanceResponse = await fetch('/api/marketing-manager/smm-panel/balance');
      if (balanceResponse.ok) {
        const data = await balanceResponse.json();
        if (data.success) {
          setCurrentBalance(data.balance);
        }
      }
    } catch (error) {
      console.error('Error fetching playlist services/balance:', error);
    }
  };

  // Open the receipt modal for followers purchase
  const openFollowersPurchaseModal = (playlistId: string, playlistName: string) => {
    const qty = parseInt(followersInputs[playlistId] || '0');
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    
    if (!playlistServices.playlist_followers) {
      alert('Playlist Followers Service not configured. Please set it up in Purchase API Settings.');
      return;
    }

    setReceiptModal({
      isOpen: true,
      playlistId,
      playlistName,
      purchaseType: 'followers',
      quantity: qty,
      isSubmitting: false,
    });
  };

  // Open the receipt modal for streams purchase
  const openStreamsPurchaseModal = (playlistId: string, playlistName: string) => {
    const inputs = streamsInputs[playlistId] || { qty: '', dripRuns: '', interval: '1440' };
    const qty = parseInt(inputs.qty || '0');
    const dripRuns = parseInt(inputs.dripRuns || '0');
    const interval = parseInt(inputs.interval || '1440');

    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (!playlistServices.playlist_streams) {
      alert('Playlist Streams Service not configured. Please set it up in Purchase API Settings.');
      return;
    }

    setReceiptModal({
      isOpen: true,
      playlistId,
      playlistName,
      purchaseType: 'streams',
      quantity: qty,
      dripRuns: dripRuns > 0 ? dripRuns : undefined,
      interval: dripRuns > 0 ? interval : undefined,
      isSubmitting: false,
    });
  };

  // Submit playlist purchase
  const submitPlaylistPurchase = async () => {
    const { playlistId, playlistName, purchaseType, quantity, dripRuns, interval } = receiptModal;
    
    // Find playlist link
    const playlist = playlistPurchases.find(p => p.id === playlistId);
    const playlistLink = playlistNetwork[playlistId]?.link || playlist?.playlistLink || '';

    if (!playlistLink) {
      setReceiptModal(prev => ({
        ...prev,
        isSubmitting: false,
        errorMessage: 'Playlist link not found',
      }));
      return;
    }

    setReceiptModal(prev => ({ ...prev, isSubmitting: true }));

    try {
      const response = await fetch('/api/marketing-manager/smm-panel/submit-playlist-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId,
          playlistName,
          playlistLink,
          serviceType: purchaseType === 'followers' ? 'playlist_followers' : 'playlist_streams',
          quantity,
          dripRuns: dripRuns || null,
          intervalMinutes: interval || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReceiptModal(prev => ({
          ...prev,
          isSubmitting: false,
          isSuccess: true,
          orderId: data.orderId,
          newBalance: data.balanceAfter,
        }));
        
        // Update balance
        if (data.balanceAfter) {
          setCurrentBalance(data.balanceAfter);
        }
      } else {
        setReceiptModal(prev => ({
          ...prev,
          isSubmitting: false,
          errorMessage: data.error || 'Failed to submit order',
        }));
      }
    } catch (error) {
      console.error('Error submitting playlist purchase:', error);
      setReceiptModal(prev => ({
        ...prev,
        isSubmitting: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  };

  // Close receipt modal and update purchased state
  const closeReceiptModal = () => {
    const { isSuccess, playlistId, purchaseType } = receiptModal;
    
    if (isSuccess) {
      // Mark as purchased
      setPlaylistPurchases(prev => prev.map(item => {
        if (item.id === playlistId) {
          return {
            ...item,
            [purchaseType === 'followers' ? 'followersPurchased' : 'streamsPurchased']: true,
          };
        }
        return item;
      }));
      
      // Clear the input fields
      if (purchaseType === 'followers') {
        setFollowersInputs(prev => ({ ...prev, [playlistId]: '' }));
      } else {
        setStreamsInputs(prev => ({ ...prev, [playlistId]: { qty: '', dripRuns: '', interval: '1440' } }));
      }
    }

    setReceiptModal({
      isOpen: false,
      playlistId: '',
      playlistName: '',
      purchaseType: 'followers',
      quantity: 0,
      isSubmitting: false,
    });
  };

  // Calculate estimated cost
  const calculateEstimatedCost = (quantity: number, dripRuns: number | undefined, pricePerK: number | null): number | null => {
    if (!pricePerK) return null;
    const totalQty = dripRuns && dripRuns > 0 ? quantity * dripRuns : quantity;
    return (totalQty / 1000) * pricePerK;
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('playlistPurchasesNeeded');
    const savedCampaignTracker = localStorage.getItem('playlistPurchasesCampaignTracker');
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPlaylistPurchases(parsed);
        console.log('📋 PLAYLIST-PURCHASES: Loaded saved data from localStorage', parsed);
      } catch (error) {
        console.error('Error parsing saved playlist purchases data:', error);
        localStorage.removeItem('playlistPurchasesNeeded');
      }
    }

    if (savedCampaignTracker) {
      try {
        const parsed = JSON.parse(savedCampaignTracker);
        setCampaignTracker(parsed);
        console.log('📋 PLAYLIST-PURCHASES: Loaded campaign tracker from localStorage', parsed);
      } catch (error) {
        console.error('Error parsing saved campaign tracker data:', error);
        localStorage.removeItem('playlistPurchasesCampaignTracker');
      }
    }

    // Fetch playlist network data to populate images and links
    fetchPlaylistNetwork();
    
    // Fetch playlist services and balance
    fetchPlaylistServicesAndBalance();

    // Listen for "Added to Playlists" events from ActiveCampaigns
    const handlePlaylistsAdded = (event: CustomEvent) => {
      console.log('📋 PLAYLIST-PURCHASES: Received playlistsAdded event', event.detail);
      addPlaylistsFromCampaign(event.detail);
    };

    // Listen for playlist assignment updates
    const handlePlaylistAssignmentUpdate = (event: CustomEvent) => {
      console.log('📋 PLAYLIST-PURCHASES: 🎯 EVENT LISTENER TRIGGERED - Received playlistAssignmentUpdated event', event.detail);
      updatePlaylistAssignments(event.detail);
    };

    window.addEventListener('playlistsAdded', handlePlaylistsAdded as EventListener);
    window.addEventListener('playlistAssignmentUpdated', handlePlaylistAssignmentUpdate as EventListener);

    console.log('📋 PLAYLIST-PURCHASES: 🎧 EVENT LISTENERS REGISTERED - Component mounted and listening for events');
    console.log('📋 PLAYLIST-PURCHASES: 🎧 DEBUG - Current campaign tracker on mount:', campaignTracker);
    console.log('📋 PLAYLIST-PURCHASES: 🎧 DEBUG - Current playlist purchases on mount:', playlistPurchases);
    console.log('📋 PLAYLIST-PURCHASES: 🎧 DEBUG - localStorage campaign tracker:', localStorage.getItem('playlistPurchasesCampaignTracker'));
    console.log('📋 PLAYLIST-PURCHASES: 🎧 DEBUG - localStorage playlist purchases:', localStorage.getItem('playlistPurchasesNeeded'));
    
    // TEST: Add a simple test event listener to verify the system is working
    const testListener = (event: CustomEvent) => {
      console.log('📋 PLAYLIST-PURCHASES: 🧪 TEST LISTENER - Received any custom event:', event.type, event.detail);
    };
    window.addEventListener('playlistAssignmentUpdated', testListener as EventListener);
    console.log('📋 PLAYLIST-PURCHASES: 🧪 TEST LISTENER - Added additional test listener for debugging');

    return () => {
      console.log('📋 PLAYLIST-PURCHASES: 🎧 EVENT LISTENERS REMOVED - Component unmounting');
      window.removeEventListener('playlistsAdded', handlePlaylistsAdded as EventListener);
      window.removeEventListener('playlistAssignmentUpdated', handlePlaylistAssignmentUpdate as EventListener);
    };
  }, []);

  // Save to localStorage whenever playlistPurchases changes
  useEffect(() => {
    localStorage.setItem('playlistPurchasesNeeded', JSON.stringify(playlistPurchases));
    console.log('📋 PLAYLIST-PURCHASES: Saved data to localStorage', playlistPurchases);
  }, [playlistPurchases]);

  // Save campaign tracker to localStorage
  useEffect(() => {
    localStorage.setItem('playlistPurchasesCampaignTracker', JSON.stringify(campaignTracker));
    console.log('📋 PLAYLIST-PURCHASES: Saved campaign tracker to localStorage', campaignTracker);
  }, [campaignTracker]);

  // Fetch playlist network data
  const fetchPlaylistNetwork = async () => {
    try {
      const response = await fetch('/api/marketing-manager/system-settings/playlists');
      if (response.ok) {
        const playlists = await response.json();
        const networkMap = playlists.reduce((acc: any, playlist: any) => {
          acc[playlist.id] = {
            name: playlist.playlistName,
            link: playlist.playlistLink,
            imageUrl: playlist.imageUrl,
            genre: playlist.genre,
            saves: playlist.cached_saves || playlist.saves || 0
          };
          return acc;
        }, {});
        setPlaylistNetwork(networkMap);
        console.log('📋 PLAYLIST-PURCHASES: Loaded playlist network data', networkMap);
        
        // Update existing purchases with latest network data including saves
        setPlaylistPurchases(current => 
          current.map(item => {
            const networkData = networkMap[item.id];
            if (networkData) {
              return {
                ...item,
                playlistName: networkData.name || item.playlistName,
                playlistLink: networkData.link || item.playlistLink,
                imageUrl: networkData.imageUrl || item.imageUrl,
                genre: networkData.genre || item.genre,
                currentSaves: networkData.saves
              };
            }
            return item;
          })
        );
      }
    } catch (error) {
      console.error('Error fetching playlist network:', error);
    }
  };

  // Add playlists from a campaign that was just confirmed
  const addPlaylistsFromCampaign = (campaignData: any) => {
    if (!campaignData.playlistAssignments || !Array.isArray(campaignData.playlistAssignments)) {
      console.log('📋 PLAYLIST-PURCHASES: No playlist assignments found in campaign data');
      return;
    }

    const sessionDate = new Date().toISOString();
    const campaignId = campaignData.campaignId;
    
    // Track which playlists this campaign is assigned to (maintain the same index structure)
    const playlistAssignmentMapping = campaignData.playlistAssignments.map((assignment: any) => assignment.id);
    
    setCampaignTracker(prev => ({
      ...prev,
      [campaignId]: playlistAssignmentMapping
    }));
    
    console.log(`📋 PLAYLIST-PURCHASES: 🎯 CAMPAIGN TRACKER - Added campaign ${campaignId} with playlist mapping:`, playlistAssignmentMapping);
    
    setPlaylistPurchases(prevPurchases => {
      const newPurchases = [...prevPurchases];
      
      campaignData.playlistAssignments.forEach((assignment: any) => {
        // Skip "removed" assignments
        if (!assignment.id || assignment.id === 'removed') {
          return;
        }

        const existingIndex = newPurchases.findIndex(item => item.id === assignment.id);
        // Use the freshest network data if available
        const networkData = playlistNetwork[assignment.id] || {};
        const playlistName = networkData.name || assignment.name;
        const playlistLink = networkData.link || assignment.link || '';
        const imageUrl = networkData.imageUrl || assignment.imageUrl || '';
        const genre = networkData.genre || assignment.genre || '';
        const saves = networkData.saves || 0;
        
        if (existingIndex >= 0) {
          // Increase count for existing playlist
          newPurchases[existingIndex] = {
            ...newPurchases[existingIndex],
            songsAdded: newPurchases[existingIndex].songsAdded + 1,
            sessionDate: sessionDate,
            recentlyAdded: true,
            // Update with latest network data
            playlistLink: playlistLink || newPurchases[existingIndex].playlistLink,
            imageUrl: imageUrl || newPurchases[existingIndex].imageUrl,
            currentSaves: saves
          };
          console.log(`📋 PLAYLIST-PURCHASES: Increased count for ${assignment.name} to ${newPurchases[existingIndex].songsAdded}`);
        } else {
          // Add new playlist
          newPurchases.push({
            id: assignment.id,
            playlistName: playlistName,
            playlistLink: playlistLink,
            imageUrl: imageUrl,
            songsAdded: 1,
            sessionDate: sessionDate,
            genre: genre,
            recentlyAdded: true,
            currentSaves: saves
          });
          console.log(`📋 PLAYLIST-PURCHASES: Added new playlist ${assignment.name} with link ${playlistLink}`);
        }
      });

      // Clear recentlyAdded flag after highlighting period
      setTimeout(() => {
        setPlaylistPurchases(current => 
          current.map(item => ({ ...item, recentlyAdded: false }))
        );
      }, 8000);

      return newPurchases;
    });
  };

  // Update playlist assignments when changes are made in ActiveCampaigns
  const updatePlaylistAssignments = (updateData: any) => {
    console.log('📋 PLAYLIST-PURCHASES: 🔥 RECEIVED PLAYLIST ASSIGNMENT UPDATE EVENT', updateData);
    console.log('📋 PLAYLIST-PURCHASES: 🔥 CURRENT CAMPAIGN TRACKER STATE:', campaignTracker);
    
    const { campaignId, playlistIndex, newPlaylistId } = updateData;
    
    // Only handle updates for campaigns we're tracking (i.e., campaigns that have been confirmed with "Added to Playlists")
    if (!campaignTracker[campaignId]) {
      console.log('📋 PLAYLIST-PURCHASES: ❌ Campaign not tracked (not yet confirmed), ignoring update', {
        campaignId,
        trackedCampaigns: Object.keys(campaignTracker),
        reason: 'Campaign not in tracker - probably not confirmed with Added to Playlists yet'
      });
      return;
    }
    
    const oldPlaylistId = campaignTracker[campaignId][playlistIndex];
    console.log('📋 PLAYLIST-PURCHASES: ✅ Smart playlist assignment update detected', { 
      campaignId, 
      playlistIndex, 
      oldPlaylistId, 
      newPlaylistId,
      action: 'admin_changed_mind',
      currentTracking: campaignTracker[campaignId]
    });
    
    setPlaylistPurchases(prevPurchases => {
      let newPurchases = [...prevPurchases];
      
      // Handle old playlist (decrease count or remove)
      if (oldPlaylistId && oldPlaylistId !== 'removed') {
        const oldIndex = newPurchases.findIndex(item => item.id === oldPlaylistId);
        if (oldIndex >= 0) {
          if (newPurchases[oldIndex].songsAdded > 1) {
            // Decrease count
            newPurchases[oldIndex] = {
              ...newPurchases[oldIndex],
              songsAdded: newPurchases[oldIndex].songsAdded - 1,
              sessionDate: new Date().toISOString(), // Update session date
              recentlyAdded: true // Highlight the change
            };
            console.log(`📋 PLAYLIST-PURCHASES: 🎯 SMART UPDATE - Decreased count for ${oldPlaylistId} to ${newPurchases[oldIndex].songsAdded} (admin changed mind)`);
          } else {
            // Remove playlist entirely
            newPurchases = newPurchases.filter(item => item.id !== oldPlaylistId);
            console.log(`📋 PLAYLIST-PURCHASES: 🎯 SMART UPDATE - Removed playlist ${oldPlaylistId} entirely (admin changed mind)`);
          }
        }
      }
      
      // Handle new playlist (increase count or add new) - but only if it's not "removed"
      if (newPlaylistId && newPlaylistId !== 'removed') {
        const existingIndex = newPurchases.findIndex(item => item.id === newPlaylistId);
        const networkData = playlistNetwork[newPlaylistId] || {};
        const playlistName = networkData.name || `Playlist ${newPlaylistId}`;
        const playlistLink = networkData.link || '';
        const imageUrl = networkData.imageUrl || '';
        const genre = networkData.genre || '';
        const saves = networkData.saves || 0;
        
        if (existingIndex >= 0) {
          // Increase count for existing playlist
          newPurchases[existingIndex] = {
            ...newPurchases[existingIndex],
            songsAdded: newPurchases[existingIndex].songsAdded + 1,
            sessionDate: new Date().toISOString(),
            recentlyAdded: true,
            // Ensure link is up to date
            playlistLink: playlistLink || newPurchases[existingIndex].playlistLink,
            currentSaves: saves
          };
          console.log(`📋 PLAYLIST-PURCHASES: 🎯 SMART UPDATE - Increased count for ${newPlaylistId} to ${newPurchases[existingIndex].songsAdded} (admin changed mind)`);
        } else {
          // Add new playlist
          newPurchases.push({
            id: newPlaylistId,
            playlistName: playlistName,
            playlistLink: playlistLink,
            imageUrl: imageUrl,
            songsAdded: 1,
            sessionDate: new Date().toISOString(),
            genre: genre,
            recentlyAdded: true,
            currentSaves: saves
          });
          console.log(`📋 PLAYLIST-PURCHASES: 🎯 SMART UPDATE - Added new playlist ${newPlaylistId} (admin changed mind)`);
        }
      } else if (newPlaylistId === 'removed') {
        console.log(`📋 PLAYLIST-PURCHASES: 🎯 SMART UPDATE - Admin set playlist to "Removed" - no new playlist added`);
      }
      
      // Clear highlighting after 8 seconds
      setTimeout(() => {
        setPlaylistPurchases(current => 
          current.map(item => ({ ...item, recentlyAdded: false }))
        );
      }, 8000);
      
      return newPurchases;
    });
    
    // Update campaign tracker with new assignment
    setCampaignTracker(prev => {
      const newTracker = { ...prev };
      if (newTracker[campaignId]) {
        newTracker[campaignId][playlistIndex] = newPlaylistId;
        console.log(`📋 PLAYLIST-PURCHASES: 🎯 SMART UPDATE - Updated campaign tracker for ${campaignId}`, newTracker[campaignId]);
      }
      return newTracker;
    });
  };

  // Copy playlist link to clipboard
  const handleCopyLink = async (playlistId: string, playlistLink: string, event?: React.MouseEvent) => {
    // Prevent event bubbling
    if (event) {
      event.stopPropagation();
    }

    // Find the correct link from the network map if the passed link is empty
    let targetLink = playlistLink;
    if (!targetLink && playlistNetwork[playlistId]) {
      targetLink = playlistNetwork[playlistId].link;
    }

    // Check if targetLink is valid
    if (!targetLink || targetLink.trim() === '') {
      console.error('📋 PLAYLIST-PURCHASES: Cannot copy - playlist link is empty for playlist', playlistId);
      alert('Playlist link is not available. Please check the playlist network settings.');
      return;
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(targetLink);
        
        // Trigger animation for re-copy feedback
        setCopyAnimating(playlistId);
        setTimeout(() => setCopyAnimating(null), 300);
        
        setCopiedPlaylistId(playlistId);
        setLastCopiedId(playlistId);
        
        // Revert after 5 seconds
        setTimeout(() => setCopiedPlaylistId(null), 5000);
        
        console.log(`📋 PLAYLIST-PURCHASES: Copied link for playlist ${playlistId}: ${targetLink}`);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = targetLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            // Trigger animation for re-copy feedback
            setCopyAnimating(playlistId);
            setTimeout(() => setCopyAnimating(null), 300);
            
            setCopiedPlaylistId(playlistId);
            setLastCopiedId(playlistId);
            
            // Revert after 5 seconds
            setTimeout(() => setCopiedPlaylistId(null), 5000);
            
            console.log(`📋 PLAYLIST-PURCHASES: Copied link (fallback method) for playlist ${playlistId}: ${targetLink}`);
          } else {
            throw new Error('execCommand copy failed');
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('📋 PLAYLIST-PURCHASES: Failed to copy playlist link:', error);
      // Show user-friendly error message
      alert(`Failed to copy playlist link. Please try selecting and copying manually: ${targetLink}`);
    }
  };

  // Show confirmation modal
  const showConfirmationModal = (action: 'purchased' | 'clear', event: React.MouseEvent, playlistId?: string) => {
    const actionMessages = {
      'purchased': 'Mark this playlist as purchased? This will remove it from the list.',
      'clear': 'Clear all playlist purchases? This will empty the entire list.'
    };

    // Get button position
    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    
    const modalPosition = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + (rect.width / 2)
    };
    
    setConfirmationModal({
      isOpen: true,
      message: actionMessages[action],
      playlistId,
      action,
      position: modalPosition
    });
  };

  // Handle confirmation actions
  const handleConfirmAction = () => {
    if (confirmationModal.action === 'purchased' && confirmationModal.playlistId) {
      // Remove specific playlist
      setPlaylistPurchases(prev => 
        prev.filter(item => item.id !== confirmationModal.playlistId)
      );
      console.log(`📋 PLAYLIST-PURCHASES: Marked playlist ${confirmationModal.playlistId} as purchased and removed`);
    } else if (confirmationModal.action === 'clear') {
      // Clear all playlists
      setPlaylistPurchases([]);
      console.log('📋 PLAYLIST-PURCHASES: Cleared all playlist purchases');
    }
    
    setConfirmationModal({
      isOpen: false,
      message: '',
      action: 'purchased',
      position: null
    });
  };

  // Cancel confirmation
  const handleCancelAction = () => {
    setConfirmationModal({
      isOpen: false,
      message: '',
      action: 'purchased',
      position: null
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      {/* Inject custom animation styles */}
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-indigo-800">Playlist Purchases Needed</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track playlists that need SMM panel streams purchased - {playlistPurchases.length} playlist{playlistPurchases.length !== 1 ? 's' : ''} pending
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={(e) => showConfirmationModal('clear', e)}
            disabled={playlistPurchases.length === 0}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>
        </div>
      </div>

      {playlistPurchases.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No playlist purchases needed</h3>
          <p className="mt-1 text-sm text-gray-500">
            When you add songs to playlists, they will appear here for stream purchasing tracking.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[0.65rem] font-black text-gray-500 uppercase tracking-widest w-16">
                  Image
                </th>
                <th className="px-3 py-3 text-left text-[0.65rem] font-black text-gray-500 uppercase tracking-widest w-32">
                  Playlist
                </th>
                <th className="px-3 py-3 text-center text-[0.65rem] font-black text-gray-500 uppercase tracking-widest w-14">
                  Songs
                </th>
                <th className="px-3 py-3 text-center text-[0.65rem] font-black text-green-600 uppercase tracking-widest w-20">
                  Current Saves
                </th>
                <th className="px-3 py-3 text-center text-[0.65rem] font-black text-gray-500 uppercase tracking-widest w-24">
                  Session
                </th>
                <th className="px-3 py-3 text-center text-[0.65rem] font-black text-purple-600 uppercase tracking-widest w-28">
                  Followers QTY
                </th>
                <th className="px-3 py-3 text-center text-[0.65rem] font-black text-purple-600 uppercase tracking-widest w-52">
                  Streams
                </th>
                <th className="px-4 py-3 text-center text-[0.65rem] font-black text-gray-500 uppercase tracking-widest w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {playlistPurchases.map((item) => {
                // Ensure we have the latest link from network data if possible
                const currentLink = playlistNetwork[item.id]?.link || item.playlistLink;
                
                return (
                  <tr 
                    key={item.id}
                    className={`
                      ${item.recentlyAdded ? 'fade-in-slide highlight-fade' : ''}
                      hover:bg-gray-50 relative border-t-2 border-gray-200
                    `}
                  >
                    {/* Image & Vertical Badge & Chevron */}
                    <td className="px-4 py-4 whitespace-nowrap w-16 relative pl-10">
                      {/* Filled triangle chevron on the separator line */}
                      <svg 
                        className="text-gray-400 absolute" 
                        style={{ width: '7px', height: '7px', left: '0px', top: '-4.5px' }} 
                        viewBox="0 0 10 10" 
                        fill="currentColor"
                      >
                        <polygon points="0,0 10,5 0,10" />
                      </svg>

                      {/* Vertical "Copied Last" Badge */}
                      <AnimatePresence>
                        {lastCopiedId === item.id && copiedPlaylistId !== item.id && (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="absolute left-0 top-0 bottom-0 w-6 bg-orange-400 shadow-inner flex items-center justify-center overflow-hidden pointer-events-auto"
                          >
                            <span className="text-[0.45rem] font-black text-white uppercase tracking-widest whitespace-nowrap -rotate-90 inline-block">
                              Copied Last
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex-shrink-0 h-10 w-10">
                        {item.imageUrl ? (
                          <img 
                            className="h-10 w-10 rounded-lg object-cover border border-gray-100 shadow-sm" 
                            src={item.imageUrl} 
                            alt={item.playlistName}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Playlist */}
                    <td className="px-3 py-4 whitespace-nowrap w-32">
                      <div className="flex flex-col gap-1">
                        <div className="text-[0.8rem] font-black text-gray-900 truncate tracking-tight">
                          {item.playlistName}
                        </div>
                        <button
                          onClick={(e) => handleCopyLink(item.id, currentLink, e)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[0.7rem] uppercase tracking-wider transition-all duration-200 shadow-sm w-fit ${
                            copiedPlaylistId === item.id 
                              ? 'bg-green-600 text-white' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                          } ${copyAnimating === item.id ? 'ring-2 ring-green-400' : ''}`}
                          disabled={!currentLink || currentLink.trim() === ''}
                          title={currentLink ? 'Copy playlist link to clipboard' : 'Playlist link not available'}
                        >
                          {copiedPlaylistId === item.id ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                              COPIED!
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              COPY LINK
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Songs Added */}
                    <td className="px-3 py-4 whitespace-nowrap w-14">
                      <div className="text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[0.7rem] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
                          {item.songsAdded}
                        </span>
                      </div>
                    </td>

                    {/* Current Saves */}
                    <td className="px-3 py-4 whitespace-nowrap w-20">
                      <div className="text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-black bg-green-100 text-green-800 border border-green-200 shadow-sm">
                          {item.currentSaves !== undefined ? item.currentSaves.toLocaleString() : '-'}
                        </span>
                      </div>
                    </td>

                    {/* Session */}
                    <td className="px-3 py-4 whitespace-nowrap w-24">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[0.55rem] font-black text-gray-400 uppercase tracking-tighter leading-none">Session</span>
                        <span className="text-[0.7rem] font-bold text-gray-700 leading-none">
                          {formatDate(item.sessionDate)}
                        </span>
                      </div>
                    </td>

                    {/* Followers QTY Column */}
                    <td className="px-3 py-4 whitespace-nowrap w-28">
                      <AnimatePresence mode="wait">
                        {item.followersPurchased ? (
                          <motion.div
                            key="checkmark"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex justify-center"
                          >
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="input"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex flex-col items-center gap-1"
                          >
                            <input
                              type="number"
                              min="1"
                              value={followersInputs[item.id] || ''}
                              onChange={(e) => setFollowersInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="QTY"
                              className="w-full px-2 py-1.5 text-[0.75rem] text-center border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-0 outline-none transition-colors"
                            />
                            <button
                              onClick={() => openFollowersPurchaseModal(item.id, item.playlistName)}
                              disabled={!followersInputs[item.id] || !playlistServices.playlist_followers}
                              className="text-[0.6rem] font-bold text-purple-600 hover:text-purple-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                              Submit
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>

                    {/* Streams Column */}
                    <td className="px-3 py-4 whitespace-nowrap w-52">
                      <AnimatePresence mode="wait">
                        {item.streamsPurchased ? (
                          <motion.div
                            key="checkmark"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex justify-center"
                          >
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="inputs"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex flex-col gap-1"
                          >
                            <div className="flex gap-1">
                              <div className="flex-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={streamsInputs[item.id]?.qty || ''}
                                  onChange={(e) => setStreamsInputs(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], qty: e.target.value, dripRuns: prev[item.id]?.dripRuns || '', interval: prev[item.id]?.interval || '1440' }
                                  }))}
                                  placeholder="QTY"
                                  className="w-full px-1.5 py-1 text-[0.7rem] text-center border-2 border-purple-200 rounded focus:border-purple-500 focus:ring-0 outline-none transition-colors"
                                />
                              </div>
                              <div className="flex-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={streamsInputs[item.id]?.dripRuns || ''}
                                  onChange={(e) => setStreamsInputs(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], qty: prev[item.id]?.qty || '', dripRuns: e.target.value, interval: prev[item.id]?.interval || '1440' }
                                  }))}
                                  placeholder="Runs"
                                  className="w-full px-1.5 py-1 text-[0.7rem] text-center border-2 border-blue-200 rounded focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                                />
                              </div>
                              <div className="flex-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={streamsInputs[item.id]?.interval || '1440'}
                                  onChange={(e) => setStreamsInputs(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], qty: prev[item.id]?.qty || '', dripRuns: prev[item.id]?.dripRuns || '', interval: e.target.value }
                                  }))}
                                  placeholder="Int"
                                  className="w-full px-1.5 py-1 text-[0.7rem] text-center border-2 border-gray-200 rounded focus:border-gray-400 focus:ring-0 outline-none transition-colors"
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[0.5rem] text-gray-400">QTY / Drip Runs / Interval</span>
                              <button
                                onClick={() => openStreamsPurchaseModal(item.id, item.playlistName)}
                                disabled={!streamsInputs[item.id]?.qty || !playlistServices.playlist_streams}
                                className="text-[0.6rem] font-bold text-purple-600 hover:text-purple-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                              >
                                Submit
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4 whitespace-nowrap w-24">
                      <div className="text-center">
                        <button
                          onClick={(e) => showConfirmationModal('purchased', e, item.id)}
                          className="inline-flex items-center px-3 py-2 rounded-lg text-[0.65rem] font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md gap-1.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          PURCHASED
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        message={confirmationModal.message}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        position={confirmationModal.position}
        buttonType={confirmationModal.action}
      />

      {/* Purchase Receipt Modal */}
      <AnimatePresence>
        {receiptModal.isOpen && (
          <PurchaseReceiptModal
            isOpen={receiptModal.isOpen}
            onClose={closeReceiptModal}
            onConfirm={submitPlaylistPurchase}
            isSubmitting={receiptModal.isSubmitting}
            purchaseType={receiptModal.purchaseType}
            playlistName={receiptModal.playlistName}
            quantity={receiptModal.quantity}
            dripRuns={receiptModal.dripRuns}
            interval={receiptModal.interval}
            serviceId={
              receiptModal.purchaseType === 'followers'
                ? playlistServices.playlist_followers?.service_id || null
                : playlistServices.playlist_streams?.service_id || null
            }
            pricePerK={
              receiptModal.purchaseType === 'followers'
                ? playlistServices.playlist_followers?.price_per_1k || null
                : playlistServices.playlist_streams?.price_per_1k || null
            }
            currentBalance={currentBalance}
            estimatedCost={calculateEstimatedCost(
              receiptModal.quantity,
              receiptModal.dripRuns,
              receiptModal.purchaseType === 'followers'
                ? playlistServices.playlist_followers?.price_per_1k || null
                : playlistServices.playlist_streams?.price_per_1k || null
            )}
            isSuccess={receiptModal.isSuccess}
            orderId={receiptModal.orderId}
            newBalance={receiptModal.newBalance}
            errorMessage={receiptModal.errorMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlaylistPurchasesNeeded;
