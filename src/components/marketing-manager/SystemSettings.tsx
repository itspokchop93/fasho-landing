import React, { useState, useEffect, useMemo } from 'react';
import CampaignTotals from './CampaignTotals';
import { MUSIC_GENRES } from '../../constants/genres';

// Custom Confirmation Modal Component for Delete Actions
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  position: { top: number; left: number } | null;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  position
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
            Delete this stream purchase record?
          </p>
          
          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded font-medium flex-1"
            >
              ✓ Delete
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium flex-1"
            >
              ✗ Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

interface Playlist {
  id: string;
  playlistName: string;
  genre: string;
  accountEmail: string;
  playlistLink: string;
  spotifyPlaylistId: string;
  maxSongs: number;
  songCount: number;
  imageUrl?: string;
  isActive: boolean;
  healthStatus?: 'active' | 'private' | 'removed' | 'error' | 'unknown';
  healthLastChecked?: string;
  healthErrorMessage?: string;
  createdAt: string;
  nextStreamPurchase?: string;
}

interface StreamPurchase {
  id: string;
  playlistId: string;
  streamQty: number;
  drips: number;
  intervalMinutes: number;
  serviceId: string;
  purchaseDate: string;
  nextPurchaseDate: string;
  createdAt: string;
  updatedAt: string;
}

interface CurrentPlacement {
  id: string;
  orderNumber: string;
  orderId: string;
  songName: string;
  songLink: string;
  packageName: string;
  placementDate: string;
  status: string;
}

interface StreamPurchaseForm {
  playlistId: string;
  streamQty: number;
  drips: number;
  intervalMinutes: number;
  serviceId: string;
}

interface NewPlaylistForm {
  playlistName: string;
  genre: string;
  accountEmail: string;
  playlistLink: string;
  maxSongs: number;
}

interface SystemSettingsProps {
  onlyPlaylistNetwork?: boolean;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ onlyPlaylistNetwork = false }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [streamPurchases, setStreamPurchases] = useState<StreamPurchase[]>([]);
  const [currentPlacements, setCurrentPlacements] = useState<{ [playlistId: string]: CurrentPlacement[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStreamPurchaseForm, setShowStreamPurchaseForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingStreamPurchase, setIsSubmittingStreamPurchase] = useState(false);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    purchaseId: string;
    position: { top: number; left: number } | null;
  }>({
    isOpen: false,
    purchaseId: '',
    position: null
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [copiedPlaylistId, setCopiedPlaylistId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    playlistId: string;
    playlistName: string;
    usageCount: number;
    position: { top: number; left: number } | null;
  }>({
    isOpen: false,
    playlistId: '',
    playlistName: '',
    usageCount: 0,
    position: null
  });
  const [deleteSuccess, setDeleteSuccess] = useState<{
    isVisible: boolean;
    playlistName: string;
    totalCampaigns: number;
    remainingCampaigns: number;
    isProcessing: boolean;
  }>({
    isVisible: false,
    playlistName: '',
    totalCampaigns: 0,
    remainingCampaigns: 0,
    isProcessing: false
  });
  const [newPlaylist, setNewPlaylist] = useState<NewPlaylistForm>({
    playlistName: '',
    genre: '',
    accountEmail: '',
    playlistLink: '',
    maxSongs: 25
  });
  const [streamPurchaseForm, setStreamPurchaseForm] = useState<StreamPurchaseForm>({
    playlistId: '',
    streamQty: 0,
    drips: 0,
    intervalMinutes: 1440,
    serviceId: ''
  });

  useEffect(() => {
    fetchPlaylists();
    fetchStreamPurchases();
    fetchCurrentPlacements();

    // Listen for campaign actions that affect current placements
    const handleCampaignActionConfirmed = (event: CustomEvent) => {
      console.log('🔄 SYSTEM-SETTINGS: Campaign action detected, refreshing current placements');
      fetchCurrentPlacements();
    };

    // Listen for playlist assignment updates
    const handlePlaylistAssignmentUpdate = () => {
      console.log('🔄 SYSTEM-SETTINGS: Playlist assignment updated, refreshing current placements');
      fetchCurrentPlacements();
    };

    window.addEventListener('campaignActionConfirmed', handleCampaignActionConfirmed as EventListener);
    window.addEventListener('playlistAssignmentUpdated', handlePlaylistAssignmentUpdate);

    return () => {
      window.removeEventListener('campaignActionConfirmed', handleCampaignActionConfirmed as EventListener);
      window.removeEventListener('playlistAssignmentUpdated', handlePlaylistAssignmentUpdate);
    };
  }, []);

  // Helper function to get health status display properties
  const getHealthStatusDisplay = (healthStatus?: string, isActive?: boolean) => {
    // If no health status is available, fall back to isActive
    if (!healthStatus || healthStatus === 'unknown') {
      return {
        text: isActive ? 'Active' : 'Inactive',
        className: isActive 
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-red-100 text-red-800 border-red-200',
        clickable: true
      };
    }

    switch (healthStatus) {
      case 'active':
        return {
          text: 'Active',
          className: 'bg-green-100 text-green-800 border-green-200',
          clickable: true
        };
      case 'private':
        return {
          text: 'Private',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          clickable: false
        };
      case 'removed':
        return {
          text: 'Removed',
          className: 'bg-red-100 text-red-800 border-red-200',
          clickable: false
        };
      case 'error':
        return {
          text: 'Error',
          className: 'bg-red-100 text-red-800 border-red-200',
          clickable: false
        };
      default:
        return {
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          clickable: false
        };
    }
  };

  const fetchCurrentPlacements = async () => {
    try {
      const response = await fetch('/api/marketing-manager/current-placements');
      if (response.ok) {
        const data = await response.json();
        setCurrentPlacements(data);
      } else {
        console.error('Failed to fetch current placements:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching current placements:', error);
    }
  };

  const fetchStreamPurchases = async () => {
    try {
      const response = await fetch('/api/marketing-manager/system-settings/stream-purchases');
      if (response.ok) {
        const data = await response.json();
        setStreamPurchases(data);
      } else {
        console.error('Failed to fetch stream purchases:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stream purchases:', error);
    }
  };

  const getLatestStreamPurchaseForPlaylist = (playlistId: string): StreamPurchase | null => {
    const playlistPurchases = streamPurchases
      .filter(purchase => purchase.playlistId === playlistId)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    
    return playlistPurchases.length > 0 ? playlistPurchases[0] : null;
  };

  const formatNextPurchaseDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: '2-digit' 
    });
  };

  const getDateUrgency = (dateString: string) => {
    const now = new Date();
    const purchaseDate = new Date(dateString);
    const diffTime = purchaseDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isOverdue = diffTime < 0;
    
    let colorClass = '';
    if (diffDays >= 5) {
      colorClass = 'text-green-600 font-medium';
    } else if (diffDays >= 2) {
      colorClass = 'text-orange-500 font-medium';
    } else {
      colorClass = 'text-red-600 font-medium';
    }
    
    return {
      colorClass,
      isOverdue,
      daysAway: diffDays
    };
  };

  const fetchPlaylists = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      const response = await fetch(`/api/marketing-manager/system-settings/playlists${forceRefresh ? '?refresh=true' : ''}`);
      if (response.ok) {
        const data = await response.json();
        
        // Enhance playlists with next stream purchase data
        const enhancedPlaylists = data.map((playlist: Playlist) => {
          const latestPurchase = getLatestStreamPurchaseForPlaylist(playlist.id);
          return {
            ...playlist,
            nextStreamPurchase: latestPurchase ? latestPurchase.nextPurchaseDate : null
          };
        });
        
        setPlaylists(enhancedPlaylists);
      } else {
        console.error('Failed to fetch playlists:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchPlaylists(true);
    fetchStreamPurchases();
    fetchCurrentPlacements();
  };

  const extractSpotifyPlaylistId = (url: string): string => {
    // Extract Spotify playlist ID from various URL formats
    const patterns = [
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /spotify\.com\/playlist\/([a-zA-Z0-9]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // If no pattern matches, assume the URL itself is the ID
    return url.replace(/[^a-zA-Z0-9]/g, '');
  };

  const handleInputChange = (field: keyof NewPlaylistForm, value: string | number) => {
    setNewPlaylist(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPlaylist.genre || !newPlaylist.accountEmail || !newPlaylist.playlistLink) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const spotifyPlaylistId = extractSpotifyPlaylistId(newPlaylist.playlistLink);
      
      const response = await fetch('/api/marketing-manager/system-settings/add-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          genre: newPlaylist.genre,
          accountEmail: newPlaylist.accountEmail,
          playlistLink: newPlaylist.playlistLink,
          maxSongs: newPlaylist.maxSongs,
          spotifyPlaylistId
        }),
      });

      if (response.ok) {
        // Reset form and refresh data
        setNewPlaylist({
          playlistName: '',
          genre: '',
          accountEmail: '',
          playlistLink: '',
          maxSongs: 25
        });
        setShowAddForm(false);
        fetchPlaylists();
        fetchStreamPurchases(); // Also refresh stream purchases to update dropdown
      } else {
        const errorData = await response.json();
        alert(`Failed to add playlist: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error adding playlist:', error);
      alert('An error occurred while adding the playlist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStreamPurchaseInputChange = (field: keyof StreamPurchaseForm, value: string | number) => {
    setStreamPurchaseForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStreamPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!streamPurchaseForm.playlistId || !streamPurchaseForm.streamQty || !streamPurchaseForm.drips || !streamPurchaseForm.intervalMinutes) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmittingStreamPurchase(true);

    try {
      const response = await fetch('/api/marketing-manager/system-settings/stream-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(streamPurchaseForm),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reset form and refresh data
              setStreamPurchaseForm({
        playlistId: '',
        streamQty: 0,
        drips: 0,
        intervalMinutes: 1440,
        serviceId: ''
      });
        setShowStreamPurchaseForm(false);
        fetchStreamPurchases();
        fetchPlaylists(); // Refresh to update next purchase dates
        
        showSuccessBannerWithMessage(result.message);
      } else {
        const errorData = await response.json();
        alert(`Failed to add stream purchase: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error adding stream purchase:', error);
      alert('An error occurred while adding the stream purchase.');
    } finally {
      setIsSubmittingStreamPurchase(false);
    }
  };

  const togglePlaylistExpansion = (playlistId: string) => {
    setExpandedPlaylist(expandedPlaylist === playlistId ? null : playlistId);
  };

  const showSuccessBannerWithMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessBanner(true);
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      setShowSuccessBanner(false);
      setSuccessMessage('');
    }, 8000);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
      );
    }
  };

  const sortedPlaylists = useMemo(() => {
    let sortableItems = [...playlists];
    
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (sortConfig.key) {
          case 'playlistName':
            aValue = a.playlistName.toLowerCase();
            bValue = b.playlistName.toLowerCase();
            break;
          case 'accountEmail':
            aValue = a.accountEmail.toLowerCase();
            bValue = b.accountEmail.toLowerCase();
            break;
          case 'songCount':
            aValue = a.songCount || 0;
            bValue = b.songCount || 0;
            break;
          case 'nextStreamPurchase':
            // Get the latest purchase for each playlist
            const aLatestPurchase = streamPurchases
              .filter(purchase => purchase.playlistId === a.id)
              .sort((x, y) => new Date(y.purchaseDate).getTime() - new Date(x.purchaseDate).getTime())[0];
            const bLatestPurchase = streamPurchases
              .filter(purchase => purchase.playlistId === b.id)
              .sort((x, y) => new Date(y.purchaseDate).getTime() - new Date(x.purchaseDate).getTime())[0];
            
            // If no purchase data, put at end
            if (!aLatestPurchase && !bLatestPurchase) return 0;
            if (!aLatestPurchase) return 1;
            if (!bLatestPurchase) return -1;
            
            aValue = new Date(aLatestPurchase.nextPurchaseDate).getTime();
            bValue = new Date(bLatestPurchase.nextPurchaseDate).getTime();
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sortableItems;
  }, [playlists, sortConfig, streamPurchases]);

  const showDeleteConfirmation = (purchaseId: string, event: React.MouseEvent) => {
    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    
    const modalPosition = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + (rect.width / 2)
    };
    
    setConfirmationModal({
      isOpen: true,
      purchaseId,
      position: modalPosition
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch('/api/marketing-manager/system-settings/stream-purchases', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseId: confirmationModal.purchaseId }),
      });

      if (response.ok) {
        const result = await response.json();
        fetchStreamPurchases();
        fetchPlaylists(); // Refresh to update next purchase dates
        showSuccessBannerWithMessage('Stream purchase deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete stream purchase: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting stream purchase:', error);
      alert('An error occurred while deleting the stream purchase.');
    } finally {
      setConfirmationModal({ isOpen: false, purchaseId: '', position: null });
    }
  };

  const handleDeleteCancel = () => {
    setConfirmationModal({ isOpen: false, purchaseId: '', position: null });
  };

  const handleCopyPlaylistLink = async (playlistLink: string, playlistId: string) => {
    try {
      await navigator.clipboard.writeText(playlistLink);
      setCopiedPlaylistId(playlistId);
      
      // Reset the copied state after 5 seconds
      setTimeout(() => {
        setCopiedPlaylistId(null);
      }, 5000);
    } catch (error) {
      console.error('Failed to copy playlist link:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = playlistLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedPlaylistId(playlistId);
      setTimeout(() => {
        setCopiedPlaylistId(null);
      }, 5000);
    }
  };

  const togglePlaylistStatus = async (playlistId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/marketing-manager/system-settings/toggle-playlist-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId,
          isActive: !currentStatus
        }),
      });

      if (response.ok) {
        fetchPlaylists();
      } else {
        console.error('Failed to toggle playlist status:', response.statusText);
      }
    } catch (error) {
      console.error('Error toggling playlist status:', error);
    }
  };

  const checkPlaylistHealth = async (playlistId: string, playlistName: string) => {
    try {
      console.log(`🏥 HEALTH CHECK: Triggering health check for ${playlistName}`);
      
      const response = await fetch('/api/marketing-manager/playlist-health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ HEALTH CHECK: ${playlistName} status: ${result.healthStatus.status}`);
        
        // Refresh the playlists to show updated health status
        await fetchPlaylists();
        
        // Show success message
        setSuccessMessage(`Health check completed for ${playlistName}. Status: ${result.healthStatus.status}`);
        setShowSuccessBanner(true);
        setTimeout(() => setShowSuccessBanner(false), 5000);
      } else {
        console.error('Error checking playlist health:', response.statusText);
        setSuccessMessage(`Failed to check health for ${playlistName}`);
        setShowSuccessBanner(true);
        setTimeout(() => setShowSuccessBanner(false), 5000);
      }
    } catch (error) {
      console.error('Error checking playlist health:', error);
      setSuccessMessage(`Error checking health for ${playlistName}`);
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000);
    }
  };

  const deletePlaylist = async (playlistId: string, playlistName: string, event: React.MouseEvent) => {
    try {
      console.log(`🔍 FRONTEND: Checking usage count for playlist "${playlistName}" (ID: ${playlistId})`);
      
      // Modal will be centered, so we don't need complex positioning
      const position = { top: 0, left: 0 };
      
      // First, get the usage count
      const usageResponse = await fetch('/api/marketing-manager/system-settings/playlist-usage-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId }),
      });

      const usageResult = await usageResponse.json();
      console.log(`🔍 FRONTEND: Usage count response:`, usageResult);

      if (!usageResponse.ok) {
        alert(`❌ Failed to check playlist usage: ${usageResult.error || usageResponse.statusText}`);
        return;
      }

      // Show custom confirmation modal
      console.log('🎯 MODAL: Setting modal state', { playlistId, playlistName, usageCount: usageResult.usageCount, position });
      setDeleteConfirmation({
        isOpen: true,
        playlistId,
        playlistName,
        usageCount: usageResult.usageCount,
        position
      });

    } catch (error) {
      console.error('Error checking playlist usage:', error);
      alert('❌ Error occurred while checking playlist usage');
    }
  };

  const confirmDeletePlaylist = async () => {
    try {
      console.log(`🗑️ FRONTEND: User confirmed deletion of playlist "${deleteConfirmation.playlistName}" (ID: ${deleteConfirmation.playlistId})`);
      
      // Close the confirmation modal
      const playlistName = deleteConfirmation.playlistName;
      const usageCount = deleteConfirmation.usageCount;
      setDeleteConfirmation({
        isOpen: false,
        playlistId: '',
        playlistName: '',
        usageCount: 0,
        position: null
      });

      // Show success notification immediately
      setDeleteSuccess({
        isVisible: true,
        playlistName,
        totalCampaigns: usageCount,
        remainingCampaigns: usageCount,
        isProcessing: usageCount > 0
      });

      // If there are campaigns to update, start the countdown
      if (usageCount > 0) {
        // Simulate real-time progress countdown
        const countdownInterval = setInterval(() => {
          setDeleteSuccess(prev => {
            const newRemaining = prev.remainingCampaigns - 1;
            if (newRemaining <= 0) {
              clearInterval(countdownInterval);
              // Start the 6-second auto-hide timer
              setTimeout(() => {
                setDeleteSuccess(prev => ({ ...prev, isVisible: false }));
              }, 6000);
              return {
                ...prev,
                remainingCampaigns: 0,
                isProcessing: false
              };
            }
            return {
              ...prev,
              remainingCampaigns: newRemaining
            };
          });
        }, 200); // Update every 200ms for smooth countdown
      } else {
        // No campaigns to update, start 6-second timer immediately
        setTimeout(() => {
          setDeleteSuccess(prev => ({ ...prev, isVisible: false }));
        }, 6000);
      }
      
      // Actually perform the deletion
      const response = await fetch('/api/marketing-manager/system-settings/delete-playlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId: deleteConfirmation.playlistId }),
      });

      const result = await response.json();
      console.log(`🗑️ FRONTEND: Delete response:`, result);

      if (response.ok) {
        fetchPlaylists();
      } else {
        // Hide success notification and show error
        setDeleteSuccess(prev => ({ ...prev, isVisible: false }));
        alert(`❌ Failed to delete playlist: ${result.error || response.statusText}`);
        console.error('Failed to delete playlist:', result);
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      setDeleteSuccess(prev => ({ ...prev, isVisible: false }));
      alert('❌ Error occurred while deleting playlist');
    }
  };

  const openSpotifyPlaylist = (playlistLink: string) => {
    window.open(playlistLink, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-purple-800 mb-4">Playlist Network</h2>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Totals Section - only show in System Settings */}
      {!onlyPlaylistNetwork && <CampaignTotals />}
      
      {/* Playlist Network Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        {/* Success Banner */}
        {showSuccessBanner && (
          <div className={`mb-4 p-4 bg-green-50 border border-green-200 rounded-lg transition-all duration-300 ${showSuccessBanner ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-purple-800">Playlist Network</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your Spotify playlist network for marketing campaigns
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
            <button
              onClick={() => setShowStreamPurchaseForm(!showStreamPurchaseForm)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Add Stream Purchase</span>
            </button>
            <button
              onClick={() => {
                if (!showAddForm) {
                  // Reset form state when opening
                  setNewPlaylist({
                    playlistName: '',
                    genre: '',
                    accountEmail: '',
                    playlistLink: '',
                    maxSongs: 25
                  });
                }
                setShowAddForm(!showAddForm);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Playlist</span>
            </button>
          </div>
        </div>

        {/* Add Stream Purchase Form */}
        {showStreamPurchaseForm && (
          <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">Add Stream Purchase</h3>
            <form onSubmit={handleStreamPurchaseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Playlist *
                  </label>
                  <select
                    required
                    value={streamPurchaseForm.playlistId}
                    onChange={(e) => handleStreamPurchaseInputChange('playlistId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select a playlist...</option>
                    {playlists
                      .filter(playlist => playlist.isActive)
                      .sort((a, b) => a.playlistName.localeCompare(b.playlistName))
                      .map(playlist => (
                        <option key={playlist.id} value={playlist.id}>
                          {playlist.playlistName} ({playlist.genre})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={streamPurchaseForm.serviceId || ''}
                    onChange={(e) => handleStreamPurchaseInputChange('serviceId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g. 1933"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stream QTY *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={streamPurchaseForm.streamQty || ''}
                    onChange={(e) => handleStreamPurchaseInputChange('streamQty', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g. 1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Streams per drip</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drips *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={streamPurchaseForm.drips || ''}
                    onChange={(e) => handleStreamPurchaseInputChange('drips', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g. 7"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of drip deliveries</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interval (minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={streamPurchaseForm.intervalMinutes || ''}
                    onChange={(e) => handleStreamPurchaseInputChange('intervalMinutes', parseInt(e.target.value) || 1440)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="1440 (1 day)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minutes between each drip (1440 = 1 day)</p>
                </div>
              </div>

              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowStreamPurchaseForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStreamPurchase}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmittingStreamPurchase ? 'Adding...' : 'Add Stream Purchase'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Playlist Form */}
        {showAddForm && (
          <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">Add New Playlist</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Playlist Link *
                </label>
                <input
                  type="url"
                  required
                  value={newPlaylist.playlistLink}
                  onChange={(e) => handleInputChange('playlistLink', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://open.spotify.com/playlist/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepts Spotify playlist URLs or spotify: URIs. Playlist name will be fetched automatically.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genre *
                  </label>
                  <select
                    required
                    value={newPlaylist.genre}
                    onChange={(e) => handleInputChange('genre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select a genre...</option>
                    {MUSIC_GENRES.map(genre => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newPlaylist.accountEmail}
                    onChange={(e) => handleInputChange('accountEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="owner@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Songs
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={newPlaylist.maxSongs}
                    onChange={(e) => handleInputChange('maxSongs', parseInt(e.target.value) || 25)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Playlist'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmation.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-2xl border border-gray-200 p-6 w-96 max-w-sm mx-4">
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Delete Playlist</h3>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="mb-2">
                    Are you sure you'd like to delete <strong>"{deleteConfirmation.playlistName}"</strong>?
                  </p>
                  
                  {deleteConfirmation.usageCount > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                      <p className="text-yellow-800 text-xs">
                        <strong>⚠️ Warning:</strong> There are currently <strong>{deleteConfirmation.usageCount}</strong> songs assigned to this playlist.
                      </p>
                      <p className="text-yellow-700 text-xs mt-1">
                        All assignments will be automatically changed to "Removed" in the Active Campaigns section.
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeletePlaylist}
                    className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                  >
                    Delete Playlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Notification */}
        <div className={`fixed top-4 right-4 z-50 transform transition-all duration-500 ease-in-out ${
          deleteSuccess.isVisible 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0'
        }`}>
          <div className="bg-green-500 text-white rounded-lg shadow-2xl p-4 min-w-80 max-w-96">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-6 h-6 text-green-100" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-green-50 mb-1">
                  Playlist Deleted Successfully
                </div>
                <div className="text-green-100 text-sm mb-2">
                  "{deleteSuccess.playlistName}" has been removed from your network
                </div>
                
                {deleteSuccess.isProcessing && deleteSuccess.remainingCampaigns > 0 && (
                  <div className="bg-green-400 bg-opacity-30 rounded-md p-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-green-50 text-sm font-medium">
                        Removing from campaigns
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-100 border-t-transparent"></div>
                        <span className="text-green-50 font-bold text-lg">
                          {deleteSuccess.remainingCampaigns}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 bg-green-600 bg-opacity-50 rounded-full h-1.5">
                      <div 
                        className="bg-green-200 h-1.5 rounded-full transition-all duration-200 ease-out"
                        style={{
                          width: `${((deleteSuccess.totalCampaigns - deleteSuccess.remainingCampaigns) / deleteSuccess.totalCampaigns) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {!deleteSuccess.isProcessing && deleteSuccess.totalCampaigns > 0 && (
                  <div className="bg-green-400 bg-opacity-30 rounded-md p-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-100" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-50 text-sm">
                        Updated {deleteSuccess.totalCampaigns} campaign{deleteSuccess.totalCampaigns !== 1 ? 's' : ''} to "Removed"
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setDeleteSuccess(prev => ({ ...prev, isVisible: false }))}
                className="flex-shrink-0 text-green-200 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Playlists Table */}
        {playlists.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No playlists added yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first playlist to the network.</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="relative max-h-[600px] overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10 border-b border-black/20 shadow-md">
              <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8 bg-gray-50">
                  
                </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 bg-gray-50">
                  Image
                </th>
                <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-40 bg-gray-50"
                  onClick={() => handleSort('playlistName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Playlist Name</span>
                    {getSortIcon('playlistName')}
                  </div>
                </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 bg-gray-50">
                  Genre
                </th>
                <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-32 bg-gray-50"
                  onClick={() => handleSort('accountEmail')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Account</span>
                    {getSortIcon('accountEmail')}
                  </div>
                </th>
                <th 
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-16 bg-gray-50"
                  onClick={() => handleSort('songCount')}
                >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Songs</span>
                    {getSortIcon('songCount')}
                  </div>
                </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 bg-gray-50">
                      Placements
                    </th>
                <th 
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none w-24 bg-gray-50"
                  onClick={() => handleSort('nextStreamPurchase')}
                >
                  <div className="flex items-center space-x-1">
                        <span>Next Stream</span>
                    {getSortIcon('nextStreamPurchase')}
                  </div>
                </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 bg-gray-50">
                  Last QTY
                </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 bg-gray-50">
                  Status
                </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPlaylists.map((playlist) => {
                  const playlistPurchases = streamPurchases
                    .filter(purchase => purchase.playlistId === playlist.id)
                    .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
                  

                  
                  const latestPurchase = playlistPurchases[0];
                  const isExpanded = expandedPlaylist === playlist.id;

                  return (
                    <React.Fragment key={playlist.id}>
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={() => togglePlaylistExpansion(playlist.id)}
                      >
                        <td className="px-2 py-4 whitespace-nowrap w-8">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlaylistExpansion(playlist.id);
                            }}
                            className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 transition-transform duration-200"
                          >
                            <svg 
                              className={`w-3 h-3 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-12">
                          <div className="flex-shrink-0 h-8 w-8">
                            <img
                              className="h-8 w-8 rounded object-cover border border-gray-200"
                              src={playlist.imageUrl || 'https://via.placeholder.com/32x32/1DB954/FFFFFF?text=♪'}
                              alt={`${playlist.playlistName} cover`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                console.log('🖼️ IMAGE ERROR: Failed to load:', playlist.imageUrl);
                                target.src = 'https://via.placeholder.com/32x32/1DB954/FFFFFF?text=♪';
                              }}
                              onLoad={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (playlist.imageUrl) {
                                  console.log('🖼️ IMAGE SUCCESS: Loaded:', playlist.imageUrl);
                                }
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-40">
                          <div className="text-sm font-medium text-gray-900 truncate" title={playlist.playlistName}>
                            {playlist.playlistName}
                          </div>
                          <div className="text-xs text-gray-500">
                            Max: {playlist.maxSongs}
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-20">
                          <span className="inline-flex px-1 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                            {playlist.genre}
                          </span>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-32 text-sm text-gray-900 truncate" title={playlist.accountEmail}>
                          {playlist.accountEmail}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-16">
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-900">
                              {playlist.songCount}
                            </div>
                            <div className="text-xs text-gray-500">
                              {playlist.maxSongs > 0 ? ((playlist.songCount / playlist.maxSongs) * 100).toFixed(0) : 0}%
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-16">
                          <div className="text-center">
                            <span className="text-sm font-medium text-blue-600">
                              {(currentPlacements[playlist.id] || []).length}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-24">
                          {latestPurchase ? (
                            (() => {
                              const urgency = getDateUrgency(latestPurchase.nextPurchaseDate);
                              return (
                                <div className={`text-xs ${urgency.colorClass} flex items-center space-x-1`}>
                                  <span>{formatNextPurchaseDate(latestPurchase.nextPurchaseDate)}</span>
                                  {urgency.isOverdue && <span>⚠️</span>}
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-xs text-gray-400">No data</span>
                          )}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-16 text-center">
                          {latestPurchase ? (
                            <div className="text-xs font-medium text-gray-900">
                              {(latestPurchase.streamQty * latestPurchase.drips).toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-16 text-center">
                          {(() => {
                            const statusDisplay = getHealthStatusDisplay(playlist.healthStatus, playlist.isActive);
                            return statusDisplay.clickable ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlaylistStatus(playlist.id, playlist.isActive);
                                }}
                                className={`inline-flex px-1 py-1 text-xs font-medium rounded border ${statusDisplay.className}`}
                                title={playlist.healthErrorMessage || `Last checked: ${playlist.healthLastChecked ? new Date(playlist.healthLastChecked).toLocaleDateString() : 'Never'}`}
                              >
                                {statusDisplay.text}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex px-1 py-1 text-xs font-medium rounded border ${statusDisplay.className}`}
                                title={playlist.healthErrorMessage || `Last checked: ${playlist.healthLastChecked ? new Date(playlist.healthLastChecked).toLocaleDateString() : 'Never'}`}
                              >
                                {statusDisplay.text}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap w-20 text-center text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPlaylistLink(playlist.playlistLink, playlist.id);
                              }}
                              className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                                copiedPlaylistId === playlist.id
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200'
                              }`}
                              title="Copy playlist link to clipboard"
                            >
                              {copiedPlaylistId === playlist.id ? 'COPIED!' : 'COPY LINK'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openSpotifyPlaylist(playlist.playlistLink);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="View on Spotify"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                checkPlaylistHealth(playlist.id, playlist.playlistName);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Check playlist health"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePlaylist(playlist.id, playlist.playlistName, e);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete playlist"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Accordion Details Section */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="px-0 py-0">
                            <div className="bg-gray-50 border-t border-gray-200 animate-slide-down w-full">
                              <div className="px-4 py-4 max-h-96 overflow-y-auto w-full">
                                {/* Current Placements Section */}
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Current Placements</h4>
                                {(() => {
                                  const playlistPlacements = currentPlacements[playlist.id] || [];
                                  return playlistPlacements.length === 0 ? (
                                    <div className="text-center py-4 mb-6">
                                      <svg className="mx-auto h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      <p className="mt-1 text-xs text-gray-500">No songs currently placed</p>
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto mb-6">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-blue-50">
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Order Number
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Song
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Package
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Placement Date
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Status
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {playlistPlacements.map((placement) => (
                                            <tr key={placement.id}>
                                              <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                <button
                                                  onClick={() => window.open(`/admin/order/${placement.orderId}`, '_blank')}
                                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                                  title="View order details"
                                                >
                                                  {placement.orderNumber}
                                                </button>
                                              </td>
                                              <td className="px-3 py-2 text-xs">
                                                <div>
                                                  <div className="font-medium text-gray-900 truncate max-w-[120px]" title={placement.songName}>
                                                    {placement.songName}
                                                  </div>
                                                  <button
                                                    onClick={async () => {
                                                      try {
                                                        await navigator.clipboard.writeText(placement.songLink);
                                                        // You could add a toast notification here
                                                      } catch (err) {
                                                        console.error('Failed to copy link:', err);
                                                      }
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 text-xs underline"
                                                    title="Copy song link"
                                                  >
                                                    copy link
                                                  </button>
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                                {placement.packageName}
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                                {formatNextPurchaseDate(placement.placementDate)}
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                  placement.status === 'Running' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : placement.status === 'Removal Needed'
                                                    ? 'bg-red-100 text-red-800' 
                                                    : placement.status === 'Action Needed'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                  {placement.status}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })()}

                                <h4 className="text-sm font-medium text-gray-900 mb-3">Stream Purchase History</h4>
                                {playlistPurchases.length === 0 ? (
                                  <div className="text-center py-6">
                                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <p className="mt-2 text-sm text-gray-500">No stream purchases recorded yet</p>
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Purchase
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Service ID
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Stream QTY
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Drips
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Interval
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Next Purchase Needed
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {playlistPurchases.map((purchase) => (
                                          <tr key={purchase.id}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                              {formatNextPurchaseDate(purchase.purchaseDate)}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                              {purchase.serviceId || 'N/A'}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                              {purchase.streamQty.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                              {purchase.drips}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                              {purchase.intervalMinutes} min
                                              {purchase.intervalMinutes === 1440 && (
                                                <span className="text-gray-500 ml-1">(1 day)</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                              {formatNextPurchaseDate(purchase.nextPurchaseDate)}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  showDeleteConfirmation(purchase.id, e);
                                                }}
                                                className="text-red-600 hover:text-red-900 transition-colors duration-200"
                                                title="Delete stream purchase"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={confirmationModal.isOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        position={confirmationModal.position}
      />
    </div>
  );
};

export default SystemSettings;

