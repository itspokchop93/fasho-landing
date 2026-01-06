import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { MUSIC_GENRES } from '../../constants/genres';
import { formatProgressDisplay } from '../../utils/numberFormatter';

// Custom Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  position: { top: number; left: number } | null;
  buttonType: 'direct-streams' | 'playlists-added' | 'de-playlisted';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  position,
  buttonType
}) => {
  console.log('🎯 ConfirmationModal render:', { isOpen, position, buttonType, message });
  
  if (!isOpen || !position) {
    console.log('🎯 Modal not rendering because:', { isOpen, position });
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
      case 'direct-streams':
        return {
          confirm: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-200',
          accent: 'text-blue-600'
        };
      case 'playlists-added':
        return {
          confirm: 'bg-green-600 hover:bg-green-700 text-white',
          border: 'border-green-200',
          accent: 'text-green-600'
        };
      case 'de-playlisted':
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
            Are you sure?
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

interface PlaylistAssignment {
  id: string;
  name: string;
  genre: string;
}

interface Campaign {
  id: string;
  orderNumber: string;
  orderId: string;
  orderDate: string;
  customerName: string;
  songName: string;
  songLink: string;
  songImage?: string | null;
  songNumber?: number | null;
  packageName: string;
  userGenre: string;
  directStreams: number;
  playlistStreams: number;
  playlistAssignments: PlaylistAssignment[];
  directStreamsProgress: number;
  playlistStreamsProgress: number;
  removalDate: string | null;
  status: 'Action Needed' | 'Running' | 'Removal Needed' | 'Completed';
  directStreamsConfirmed: boolean;
  playlistsAddedConfirmed: boolean;
  removedFromPlaylists: boolean;
}

interface Playlist {
  id: string;
  name: string;
  genre: string;
}

interface PlaylistSelectorProps {
  currentValue: string;
  playlists: Playlist[];
  onSelect: (value: string) => void;
  onCancel: () => void;
  isUpdating?: boolean;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  currentValue,
  playlists,
  onSelect,
  onCancel,
  isUpdating = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'genre'>('name');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  const allOptions = [
    { id: 'removed', name: '✅ Removed', genre: '' },
    { id: 'empty', name: '📭 -Empty-', genre: '' },
    ...playlists
  ];

  const filteredPlaylists = allOptions
    .filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.genre.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'genre') {
        // Put empty genres at the bottom
        if (!a.genre && b.genre) return 1;
        if (a.genre && !b.genre) return -1;
        if (a.genre < b.genre) return -1;
        if (a.genre > b.genre) return 1;
      }
      // Default to name sorting
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

  return (
    <div 
      ref={dropdownRef}
      className="absolute z-[100] bg-white border-2 border-indigo-500 rounded-lg shadow-2xl w-[280px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
      style={{ 
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      }}
    >
      <div className="p-3 border-b border-gray-100 bg-indigo-50/50 flex items-center justify-between">
        <span className="text-[0.7rem] font-black uppercase text-indigo-900 tracking-wider">Select Playlist</span>
        <div className="flex items-center gap-2">
          {isUpdating && (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          )}
          <button onClick={onCancel} className="text-gray-400 hover:text-red-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-2 bg-gray-50/50 space-y-2">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder="Search playlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[0.7rem] font-bold border-2 border-gray-200 rounded-md focus:border-indigo-500 outline-none transition-all bg-white"
          />
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[0.6rem] font-black text-gray-400 uppercase">Sort By:</span>
          <button 
            onClick={() => setSortBy('name')}
            className={`text-[0.6rem] font-black px-2 py-0.5 rounded uppercase transition-all ${sortBy === 'name' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
          >
            Name
          </button>
          <button 
            onClick={() => setSortBy('genre')}
            className={`text-[0.6rem] font-black px-2 py-0.5 rounded uppercase transition-all ${sortBy === 'genre' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
          >
            Genre
          </button>
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto p-1 bg-white custom-scrollbar">
        {isUpdating ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[0.7rem] font-black text-indigo-900 uppercase animate-pulse">Updating Assignment...</span>
          </div>
        ) : filteredPlaylists.length > 0 ? (
          filteredPlaylists.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full text-left px-3 py-2 rounded-md transition-all flex flex-col gap-0.5 mb-1 group ${
                currentValue === p.id 
                  ? 'bg-indigo-600 text-white shadow-lg scale-[0.98]' 
                  : 'hover:bg-indigo-50 text-gray-700 hover:translate-x-1'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[0.75rem] font-black ${currentValue === p.id ? 'text-white' : 'text-indigo-900 group-hover:text-indigo-600'}`}>
                  {p.name}
                </span>
                {currentValue === p.id && (
                  <svg className="w-3.5 h-3.5 text-white animate-in zoom-in-50 duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {p.genre && (
                <span className={`text-[0.6rem] uppercase font-black tracking-tighter ${currentValue === p.id ? 'text-indigo-200' : 'text-gray-400 group-hover:text-indigo-400'}`}>
                  {p.genre}
                </span>
              )}
            </button>
          ))
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30 rounded-lg border-2 border-dashed border-gray-100 m-2">
            <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[0.7rem] font-bold italic">No matching playlists</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ActiveCampaigns: React.FC = () => {
  const router = useRouter();
  
  // Add custom animation styles
  const animationStyles = `
    @keyframes button-state-change {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(0.95); opacity: 0.7; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes checkmark-entrance {
      0% { transform: scale(0) rotate(0deg); opacity: 0; }
      50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
      100% { transform: scale(1) rotate(360deg); opacity: 1; }
    }
    
    @keyframes button-exit {
      0% { transform: scale(1) translateY(0); opacity: 1; }
      100% { transform: scale(0.8) translateY(-10px); opacity: 0; }
      100% { transform: scale(1) translateY(0); opacity: 0; }
    }
    
    @keyframes button-entrance {
      0% { transform: scale(0.8) translateY(10px); opacity: 0; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    
    @keyframes copy-click {
      0% { transform: scale(1); }
      50% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    
    @keyframes text-fade-out {
      0% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-2px); }
    }
    
    @keyframes text-fade-in {
      0% { opacity: 0; transform: translateY(2px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    .button-state-change { animation: button-state-change 0.6s ease-in-out; }
    .checkmark-entrance { animation: checkmark-entrance 0.8s ease-out; }
    .button-exit { animation: button-exit 0.4s ease-in; }
    .button-entrance { animation: button-entrance 0.5s ease-out; }
    .copy-click { animation: copy-click 0.2s ease-in-out; }
    .text-fade-out { animation: text-fade-out 0.2s ease-out forwards; }
    .text-fade-in { animation: text-fade-in 0.2s ease-in forwards; }
    
    @keyframes fadeSlideIn {
      0% { 
        opacity: 0; 
        transform: translateY(10px); 
      }
      100% { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
  `;
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('orderDate');
  const [editingPlaylist, setEditingPlaylist] = useState<{
    campaignId: string;
    playlistIndex: number;
  } | null>(null);
  const [editingGenre, setEditingGenre] = useState<{
    campaignId: string;
  } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(40);
  
  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    message: string;
    campaignId: string;
    action: 'direct-streams' | 'playlists-added' | 'de-playlisted';
    position: { top: number; left: number } | null;
  }>({
    isOpen: false,
    message: '',
    campaignId: '',
    action: 'direct-streams',
    position: null
  });
  
  // Copy link feedback state - tracks which campaigns have been copied recently
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});
  // Track the absolute last song that was copied
  const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);
  // Animation state for re-copy feedback
  const [copyAnimating, setCopyAnimating] = useState<string | null>(null);
  
  // Track updating state for playlist assignments
  const [updatingPlaylistId, setUpdatingPlaylistId] = useState<{campaignId: string, index: number} | null>(null);
  // Track recently updated playlists for green feedback
  const [recentlyUpdated, setRecentlyUpdated] = useState<{[key: string]: boolean}>({});
  
  // SMM API Submission Modal State
  const [smmApiModal, setSmmApiModal] = useState<{
    isOpen: boolean;
    campaignId: string;
    campaignInfo: { orderNumber: string; songName: string; packageName: string } | null;
    status: 'confirm' | 'submitting' | 'success' | 'partial' | 'error';
    results: Array<{
      orderSetId: string;
      serviceId: string;
      quantity: number;
      success: boolean;
      followizOrderId?: number;
      error?: string;
    }>;
    successCount: number;
    totalCount: number;
    errorMessage: string;
    newBalance: string | null;
  }>({
    isOpen: false,
    campaignId: '',
    campaignInfo: null,
    status: 'confirm',
    results: [],
    successCount: 0,
    totalCount: 0,
    errorMessage: '',
    newBalance: null,
  });

  useEffect(() => {
    fetchCampaigns();
    fetchAvailablePlaylists();
    
    // Set up real-time updates every 60 seconds
    intervalRef.current = setInterval(() => {
      fetchCampaigns();
    }, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Filter and sort campaigns when data or filters change
    let filtered = campaigns.filter(campaign => {
      // Filter out old FASHO orders
      const notFashoOrder = !campaign.orderNumber.startsWith('FASHO');

      // Search filter
      const searchMatch = 
        campaign.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.songName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.songLink.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = filterStatus === 'all' || 
        (filterStatus === 'action-needed' && campaign.status === 'Action Needed') ||
        (filterStatus === 'running' && campaign.status === 'Running') ||
        (filterStatus === 'completed' && campaign.status === 'Completed');

      return notFashoOrder && searchMatch && statusMatch;
    });

    // Sort campaigns
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'orderDate':
          return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        default:
          return 0;
      }
    });

    setFilteredCampaigns(filtered);
  }, [campaigns, searchTerm, filterStatus, sortBy]);

  // Reset to first page ONLY when search filters or sort criteria change
  // This prevents polling updates from kicking the user back to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/marketing-manager/campaigns');
      if (response.ok) {
        const campaignsData = await response.json();
        setCampaigns(campaignsData);
      } else {
        console.error('Failed to fetch campaigns:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailablePlaylists = async () => {
    try {
      const response = await fetch('/api/marketing-manager/playlists');
      if (response.ok) {
        const playlistsData = await response.json();
        setAvailablePlaylists(playlistsData);
      } else {
        console.error('Failed to fetch playlists:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const copyToClipboard = async (text: string, campaignId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Trigger animation for re-copy feedback
      setCopyAnimating(campaignId);
      setTimeout(() => setCopyAnimating(null), 300);
      
      // Set copied state to true
      setCopiedStates(prev => ({ ...prev, [campaignId]: true }));
      // Set this as the absolute last copied ID
      setLastCopiedId(campaignId);
      
      // Revert after 5 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [campaignId]: false }));
      }, 5000);
      
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleOrderNumberClick = (orderId: string) => {
    window.open(`/admin/order/${orderId}`, '_blank');
  };

  const showConfirmationModal = (campaignId: string, action: 'direct-streams' | 'playlists-added' | 'de-playlisted', event: React.MouseEvent) => {
    const actionMessages = {
      'direct-streams': 'Confirm that you have purchased direct streams for this campaign?',
      'playlists-added': 'Confirm that you have added this song to the assigned playlists?',
      'de-playlisted': 'Confirm that you have removed this song from all playlists?'
    };

    // Get button position
    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    
    console.log('🎯 Button position:', {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      scrollY: window.scrollY,
      scrollX: window.scrollX
    });
    
    const modalPosition = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + (rect.width / 2)
    };
    
    console.log('🎯 Modal position will be:', modalPosition);
    
    const newModalState = {
      isOpen: true,
      message: actionMessages[action],
      campaignId,
      action,
      position: modalPosition
    };
    
    console.log('🎯 Setting modal state:', newModalState);
    setConfirmationModal(newModalState);
  };

  const handleConfirmAction = async () => {
    const { campaignId, action } = confirmationModal;
    
    // Close modal first
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    
      try {
        const response = await fetch('/api/marketing-manager/confirm-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ campaignId, action }),
        });

        if (response.ok) {
          // Refresh campaigns data
          fetchCampaigns();
        
        // Dispatch custom event to notify ActionQueue to refresh immediately
        const event = new CustomEvent('campaignActionConfirmed', {
          detail: { campaignId, action }
        });
        window.dispatchEvent(event);
        
        // If this is a "playlists-added" action, also dispatch event for PlaylistPurchasesNeeded
        if (action === 'playlists-added') {
          const campaign = campaigns.find(c => c.id === campaignId);
          if (campaign && campaign.playlistAssignments) {
            const playlistsAddedEvent = new CustomEvent('playlistsAdded', {
              detail: {
                campaignId,
                playlistAssignments: campaign.playlistAssignments,
                songName: campaign.songName,
                orderNumber: campaign.orderNumber
              }
            });
            window.dispatchEvent(playlistsAddedEvent);
            console.log(`📋 PLAYLIST-PURCHASES: Dispatched playlistsAdded event for campaign ${campaignId}`, campaign.playlistAssignments);
          }
        }
        
        console.log(`🔄 LIVE UPDATE: Dispatched campaignActionConfirmed event for ${action} on campaign ${campaignId}`);
        } else {
          console.error('Failed to confirm action:', response.statusText);
        }
      } catch (error) {
        console.error('Error confirming action:', error);
      }
  };

  const handleCancelAction = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  // SMM API Submission Handlers
  const showSmmApiModal = (campaignId: string, campaign: Campaign) => {
    setSmmApiModal({
      isOpen: true,
      campaignId,
      campaignInfo: {
        orderNumber: campaign.orderNumber,
        songName: campaign.songName,
        packageName: campaign.packageName,
      },
      status: 'confirm',
      results: [],
      errorMessage: '',
      newBalance: null,
    });
  };

  const closeSmmApiModal = () => {
    // Only allow closing if not in submitting state
    if (smmApiModal.status !== 'submitting') {
      setSmmApiModal(prev => ({ ...prev, isOpen: false }));
      // Refresh campaigns if there was a successful submission
      if (smmApiModal.status === 'success') {
        fetchCampaigns();
      }
    }
  };

  const handleSmmApiSubmit = async () => {
    setSmmApiModal(prev => ({ ...prev, status: 'submitting' }));

    try {
      const response = await fetch('/api/marketing-manager/smm-panel/submit-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: smmApiModal.campaignId }),
      });

      const result = await response.json();

      const successCount = result.successCount || 0;
      const totalCount = result.totalSubmitted || 0;
      
      // Determine status: success (all), partial (some), error (none)
      let status: 'success' | 'partial' | 'error';
      if (successCount === totalCount && totalCount > 0) {
        status = 'success';
      } else if (successCount > 0) {
        status = 'partial';
      } else {
        status = 'error';
      }

      setSmmApiModal(prev => ({
        ...prev,
        status,
        results: result.results || [],
        successCount,
        totalCount,
        newBalance: result.newBalance,
        errorMessage: result.error || '',
      }));
      
      // Dispatch event to notify other components (only if at least some succeeded)
      if (successCount > 0) {
        const event = new CustomEvent('campaignActionConfirmed', {
          detail: { campaignId: smmApiModal.campaignId, action: 'direct-streams' }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      setSmmApiModal(prev => ({
        ...prev,
        status: 'error',
        successCount: 0,
        totalCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Network error occurred',
      }));
    }
  };

  const updateGenre = async (campaignId: string, newGenre: string) => {
    try {
      const response = await fetch('/api/marketing-manager/update-genre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId, newGenre }),
      });

      if (response.ok) {
        setEditingGenre(null);
        // Refresh campaigns data to show the updated genre and regenerated playlist assignments
        fetchCampaigns();
      } else {
        console.error('Failed to update genre:', response.statusText);
        alert('Failed to update genre');
      }
    } catch (error) {
      console.error('Error updating genre:', error);
      alert('Error updating genre');
    }
  };

  const updatePlaylistAssignment = async (campaignId: string, playlistIndex: number, newPlaylistId: string) => {
    try {
      setUpdatingPlaylistId({ campaignId, index: playlistIndex });
      const response = await fetch('/api/marketing-manager/update-playlist-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId, playlistIndex, newPlaylistId }),
      });

      if (response.ok) {
        // Refresh campaigns data
        await fetchCampaigns();
        
        // Show success feedback
        const updateKey = `${campaignId}-${playlistIndex}`;
        setRecentlyUpdated(prev => ({ ...prev, [updateKey]: true }));
        
        setEditingPlaylist(null);
        
        // Revert feedback after 3 seconds
        setTimeout(() => {
          setRecentlyUpdated(prev => {
            const newState = { ...prev };
            delete newState[updateKey];
            return newState;
          });
        }, 3000);
        
        // Dispatch event to notify SystemSettings to refresh current placements
        const event = new CustomEvent('playlistAssignmentUpdated', {
          detail: { campaignId, playlistIndex, newPlaylistId }
        });
        window.dispatchEvent(event);
      } else {
        console.error('Failed to update playlist assignment:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating playlist assignment:', error);
    } finally {
      setUpdatingPlaylistId(null);
    }
  };



  const populateExistingOrders = async () => {
    if (!window.confirm('This will import all existing orders into the Marketing Manager. Continue?')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/marketing-manager/populate-existing-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully imported ${result.stats.campaignsCreated} campaigns from ${result.stats.ordersProcessed} orders!`);
        // Refresh campaigns data
        fetchCampaigns();
      } else {
        const errorData = await response.json();
        alert(`Failed to import orders: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error importing orders:', error);
      alert('An error occurred while importing orders.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Action Needed':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '⚠️' };
      case 'Running':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '📡' };
      case 'Removal Needed':
        return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: '🚨' };
      case 'Completed':
        return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: '✅' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '❓' };
    }
  };

  const getPackageStyles = (packageName: string) => {
    const name = packageName.toUpperCase();
    if (name.includes('LEGENDARY')) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '✨' };
    if (name.includes('UNSTOPPABLE')) return { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: '🚀' };
    if (name.includes('DOMINATE')) return { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: '🏆' };
    if (name.includes('MOMENTUM')) return { color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', icon: '⚡' };
    if (name.includes('BREAKTHROUGH')) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '💎' };
    return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: '📦' };
  };

  const ProgressBar: React.FC<{ current: number; total: number; color: string; label: string }> = ({ current, total, color, label }) => {
    const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    
    return (
      <div className="flex flex-col gap-1.5 w-full min-w-[150px] bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">{label}</span>
          <span className={`text-[0.7rem] font-black ${percentage === 100 ? 'text-green-600' : 'text-gray-900'}`}>
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={`h-full rounded-full ${color} shadow-inner transition-all duration-500`}
          />
        </div>
        <div className="text-[0.65rem] font-bold text-gray-500 mt-0.5 px-0.5 flex justify-between items-center">
          <span className="tabular-nums">{current.toLocaleString()}</span>
          <div className="h-2 w-[1px] bg-gray-200 mx-1"></div>
          <span className="tabular-nums text-gray-400">{total.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCampaigns = filteredCampaigns.slice(indexOfFirstItem, indexOfLastItem);

  // Helper for page numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    // Always show first, last, current, and some context
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show page 1
      pageNumbers.push(1);
      
      if (currentPage > 3) {
        pageNumbers.push('...');
      }
      
      // Pages around current
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if near start
      if (currentPage <= 3) {
        end = 4;
      }
      
      // Adjust if near end
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-green-800 mb-4">Active Campaigns</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      {/* Inject custom animation styles */}
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-green-800">Active Campaigns</h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live Updates</span>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex-1 max-w-2xl">
          <input
            type="text"
            placeholder="Search by order number, customer, song name, or link..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="action-needed">Action Needed</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="orderDate">Sort by Order Date</option>
          </select>

          <button
            onClick={async () => {
              const orderNumber = prompt('Enter order number to clear and regenerate assignments (e.g., 3424):');
              if (orderNumber) {
                try {
                  const response = await fetch('/api/marketing-manager/debug-clear-assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderNumber })
                  });
                  const result = await response.json();
                  alert(result.message);
                  fetchCampaigns(); // Refresh to trigger regeneration
                } catch (error) {
                  alert('Error clearing assignments');
                }
              }
            }}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
          >
            Debug Clear Order
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search or filters.' : 'No active campaigns at the moment.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          <div className="border border-gray-200 rounded-lg">
            {/* Table container with both horizontal and vertical scroll */}
            <div 
              className="overflow-x-auto overflow-y-auto"
              style={{ maxHeight: '600px' }} // Height for approximately 8 rows
            >
              <table className="min-w-max divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '260px' }}>Order Info</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Package</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Playlist Assignments</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Direct Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Playlist Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Removal Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {currentCampaigns.map((campaign, index) => {
                  // Check if this is a new order (different from previous)
                  const isNewOrder = index === 0 || currentCampaigns[index - 1].orderNumber !== campaign.orderNumber;
                  
                  // Calculate order group index for alternating colors and backgrounds
                  let orderGroupIndex = 0;
                  let currentOrderNum = '';
                  for (let i = 0; i <= index; i++) {
                    if (currentCampaigns[i].orderNumber !== currentOrderNum) {
                      orderGroupIndex++;
                      currentOrderNum = currentCampaigns[i].orderNumber;
                    }
                  }
                  
                  // Determine badge colors based on order group (alternating green/blue)
                  const isGreenOrder = orderGroupIndex % 2 === 1;
                  const badgeBgColor = isGreenOrder ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200';
                  
                  // Alternate row background for each order (white/gray)
                  const isWhiteRow = orderGroupIndex % 2 === 1;
                  const rowBgColor = isWhiteRow ? 'bg-white hover:bg-gray-100/50' : 'bg-gray-50 hover:bg-gray-200/50';
                  
                  return (
                  <tr 
                    key={campaign.id} 
                    id={`campaign-${campaign.orderNumber}`} 
                    className={`${rowBgColor} ${isNewOrder ? 'border-t-2 border-gray-400' : 'border-t border-gray-200'}`}
                  >
                    <td className="px-4 py-4" style={{ width: '260px' }}>
                      {/* Filled triangle chevron on the separator line */}
                      <svg 
                        className="text-gray-400 absolute" 
                        style={{ width: '7px', height: '7px', left: '0px', top: '-4.5px' }} 
                        viewBox="0 0 10 10" 
                        fill="currentColor"
                      >
                        <polygon points="0,0 10,5 0,10" />
                      </svg>
                      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 relative flex flex-col gap-1.5 w-[220px] ${(campaign.songNumber || lastCopiedId === campaign.id) ? 'pb-7' : ''}`}>
                        {/* Order Info - Top Right Corner */}
                        <div className="absolute top-2 right-2 text-right flex flex-col items-end z-10">
                          <button
                            onClick={() => handleOrderNumberClick(campaign.orderId)}
                            className="text-indigo-600 hover:text-indigo-900 font-bold text-[0.75rem] block leading-none"
                          >
                            #{campaign.orderNumber}
                          </button>
                          <span className="text-[0.55rem] font-medium text-gray-400 mt-0.5 leading-none">
                            {new Date(campaign.orderDate).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          {/* Song Image Thumbnail */}
                          <div className="flex-shrink-0">
                            {campaign.songImage ? (
                              <img 
                                src={campaign.songImage} 
                                alt={campaign.songName} 
                                className="w-10 h-10 rounded-md object-cover shadow-sm border border-gray-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-12">
                            {/* Song Title */}
                            <h3 
                              className="text-[0.85rem] font-bold text-gray-900 leading-tight truncate"
                              title={campaign.songName}
                            >
                              {campaign.songName}
                            </h3>

                            {/* Genre Pill - Under Song Title (Constant Color) */}
                            <div className="mt-1">
                              {editingGenre?.campaignId === campaign.id ? (
                                <div className="flex items-center space-x-1">
                                  <select
                                    defaultValue={campaign.userGenre || 'General'}
                                    onChange={(e) => updateGenre(campaign.id, e.target.value)}
                                    className="text-[0.6rem] border border-gray-300 rounded px-1 py-0.5 bg-white"
                                  >
                                    {MUSIC_GENRES.map(genre => (
                                      <option key={genre} value={genre}>{genre}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => setEditingGenre(null)} className="text-[0.6rem] text-gray-500 hover:text-gray-700">✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingGenre({ campaignId: campaign.id })}
                                  className="inline-flex px-2 py-0.5 rounded-full text-[0.6rem] font-black uppercase tracking-wider border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors shadow-sm"
                                >
                                  {campaign.userGenre || 'Unknown'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Section */}
                        <div className="flex flex-col gap-1.5 mt-0.5">
                          <div className="relative">
                            {/* Copy Button - Smaller */}
                            <button
                              onClick={() => copyToClipboard(campaign.songLink, campaign.id)}
                              className={`w-full py-1.5 rounded font-bold text-[0.7rem] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm ${
                                copiedStates[campaign.id] 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                              } ${copyAnimating === campaign.id ? 'ring-2 ring-green-400' : ''}`}
                            >
                              {copiedStates[campaign.id] ? (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                  COPIED!
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                  COPY LINK
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Status Badges Row - Bottom Left and Right */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end leading-none pointer-events-none">
                          {/* "Copied Last" Badge - Bottom Left Flush */}
                          <div className="h-5 flex items-end">
                            <AnimatePresence>
                              {lastCopiedId === campaign.id && !copiedStates[campaign.id] && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  transition={{ duration: 0.4, ease: "easeInOut" }}
                                  className="pointer-events-auto"
                                >
                                  <span className="inline-flex items-center px-2 py-0.5 text-[0.55rem] font-black bg-orange-400 text-white uppercase tracking-wider border-t border-r rounded-tr-md shadow-inner">
                                    Copied Last
                                  </span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Song Number Badge - Bottom Right Flush (Alternating Color) */}
                          <div className="h-5 flex items-end">
                            {campaign.songNumber && (
                              <span className={`inline-flex items-center px-2 py-0.5 text-[0.6rem] font-black uppercase border-t border-l rounded-tl-md shadow-inner ${badgeBgColor}`}>
                                Song {campaign.songNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap w-36">
                      {(() => {
                        const styles = getPackageStyles(campaign.packageName);
                        return (
                          <div className={`rounded-lg border-2 ${styles.bg} ${styles.border} px-2.5 py-1.5 shadow-sm flex items-center gap-2 w-fit mx-auto`}>
                            <div className={`flex-shrink-0 ${styles.color}`}>
                              {styles.icon === '📦' ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              ) : (
                                <span className="text-[0.75rem] leading-none">{styles.icon}</span>
                              )}
                            </div>
                            <span className={`text-[0.78rem] font-black uppercase tracking-tight leading-none ${styles.color}`}>
                              {campaign.packageName}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4 w-64">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 min-h-[90px] w-full flex flex-col justify-center overflow-hidden">
                        <div className="space-y-1.5 w-full">
                          {campaign.playlistAssignments && campaign.playlistAssignments.length > 0 ? (
                            campaign.playlistAssignments.map((playlist, index) => (
                              <div key={index} className="flex items-center group w-full">
                                {editingPlaylist?.campaignId === campaign.id && editingPlaylist?.playlistIndex === index ? (
                                  <div className="w-full">
                                    <PlaylistSelector
                                      currentValue={playlist.id}
                                      playlists={availablePlaylists}
                                      onSelect={(val) => updatePlaylistAssignment(campaign.id, index, val)}
                                      onCancel={() => setEditingPlaylist(null)}
                                      isUpdating={updatingPlaylistId?.campaignId === campaign.id && updatingPlaylistId?.index === index}
                                    />
                                    {/* Ghost button to maintain layout while dropdown is open */}
                                    <div className="text-[0.72rem] font-bold px-2.5 py-1.5 rounded-md truncate w-full text-left border-2 border-indigo-100 bg-indigo-50/50 text-indigo-300 opacity-50 flex items-center justify-between">
                                      <span className="truncate">{playlist.id === 'removed' ? '✅ Removed' : playlist.name}</span>
                                      {updatingPlaylistId?.campaignId === campaign.id && updatingPlaylistId?.index === index && (
                                        <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                      )}
                                    </div>
                                  </div>
                                  ) : (
                                  <button
                                    onClick={() => setEditingPlaylist({ campaignId: campaign.id, playlistIndex: index })}
                                    className={`text-[0.72rem] font-bold px-2.5 py-1.5 rounded-md truncate w-full text-left transition-all border-2 ${
                                      recentlyUpdated[`${campaign.id}-${index}`]
                                        ? 'text-green-700 bg-green-100 border-green-400 scale-[1.02] shadow-sm'
                                        : playlist.id === 'removed' 
                                        ? 'text-green-700 bg-green-50 border-green-50 hover:border-green-200'
                                        : 'text-indigo-700 bg-indigo-50 border-indigo-50 hover:border-indigo-200'
                                    }`}
                                    title={playlist.id === 'removed' ? '✅ Removed' : playlist.name}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="truncate">
                                        {playlist.id === 'removed' ? '✅ Removed' : playlist.name}
                                      </span>
                                      {recentlyUpdated[`${campaign.id}-${index}`] ? (
                                        <svg className="w-3.5 h-3.5 text-green-600 animate-in zoom-in-50 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      )}
                                    </div>
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="space-y-1.5 w-full">
                              <div className="text-[0.7rem] text-gray-400 font-medium italic mb-1 text-center">No assignments</div>
                              {editingPlaylist?.campaignId === campaign.id && editingPlaylist?.playlistIndex === 0 ? (
                                <div className="w-full">
                                  <PlaylistSelector
                                    currentValue="empty"
                                    playlists={availablePlaylists}
                                    onSelect={(val) => updatePlaylistAssignment(campaign.id, 0, val)}
                                    onCancel={() => setEditingPlaylist(null)}
                                    isUpdating={updatingPlaylistId?.campaignId === campaign.id && updatingPlaylistId?.index === 0}
                                  />
                                  {/* Ghost button */}
                                  <div className="text-[0.72rem] font-bold px-3 py-2 rounded-md bg-indigo-100 text-indigo-300 opacity-50 flex items-center justify-center gap-1.5 w-full uppercase tracking-wider">
                                    {updatingPlaylistId?.campaignId === campaign.id && updatingPlaylistId?.index === 0 ? (
                                      <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                      </svg>
                                    )}
                                    Add Playlist
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingPlaylist({ campaignId: campaign.id, playlistIndex: 0 })}
                                  className="text-[0.72rem] font-black px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow flex items-center justify-center gap-1.5 w-full uppercase tracking-wider"
                                  title="Click to add playlist assignment"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add Playlist
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 w-40">
                      <ProgressBar
                        current={campaign.directStreamsProgress}
                        total={campaign.directStreams}
                        color="bg-blue-500"
                        label="Direct"
                      />
                    </td>
                    <td className="px-4 py-4 w-40">
                      <ProgressBar
                        current={campaign.playlistStreamsProgress}
                        total={campaign.playlistStreams}
                        color="bg-green-500"
                        label="Playlist"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 w-28">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[0.55rem] font-black text-gray-400 uppercase tracking-tighter leading-none">Removal</span>
                        <span className="text-[0.7rem] font-bold text-gray-700 leading-none">
                          {campaign.removalDate ? new Date(campaign.removalDate).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap w-32">
                      {(() => {
                        const status = getStatusColor(campaign.status);
                        return (
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 ${status.bg} ${status.text} ${status.border} shadow-sm mx-auto`}>
                            <span className="text-[0.8rem] leading-none">{status.icon}</span>
                            <span className="text-[0.65rem] font-black uppercase tracking-wider whitespace-nowrap">{campaign.status}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium w-40">
                      <div className="flex flex-col items-center space-y-2 w-full">
                        {campaign.status === 'Removal Needed' || (campaign.status === 'Completed' && campaign.removedFromPlaylists) ? (
                          <div className="flex justify-center w-full transition-all duration-500 ease-in-out">
                            {campaign.removedFromPlaylists || campaign.status === 'Completed' ? (
                              // Green checkmark icon for completed de-playlisting - centered
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-green-500 rounded-full checkmark-entrance">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : (
                              // De-Playlisted button - full width
                            <button
                                onClick={(e) => showConfirmationModal(campaign.id, 'de-playlisted', e)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-[0.75rem] font-black uppercase tracking-wider button-entrance hover:scale-[1.02] active:scale-95 transition-all duration-200 w-full shadow-md flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                De-Playlisted
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="button-entrance w-full space-y-2.5">
                            {/* Submit Purchase API Button - full width */}
                              <button
                              onClick={campaign.directStreamsConfirmed ? undefined : () => showSmmApiModal(campaign.id, campaign)}
                              className={`w-full px-4 py-2.5 rounded-lg text-[0.7rem] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-md ${
                                campaign.directStreamsConfirmed 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200 shadow-none' 
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-[1.02] active:scale-95'
                              }`}
                              disabled={campaign.directStreamsConfirmed}
                            >
                              {campaign.directStreamsConfirmed ? (
                                <svg className="w-4 h-4 text-green-500 checkmark-entrance" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              )}
                              <span>Submit Purchase API</span>
                              </button>
                            
                            {/* Added to Playlists Button - full width */}
                            <button
                              onClick={campaign.playlistsAddedConfirmed ? undefined : (e) => showConfirmationModal(campaign.id, 'playlists-added', e)}
                              className={`w-full px-4 py-2.5 rounded-lg text-[0.75rem] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-md ${
                                campaign.playlistsAddedConfirmed 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200 shadow-none' 
                                  : 'bg-green-600 hover:bg-green-700 text-white hover:scale-[1.02] active:scale-95'
                              }`}
                              disabled={campaign.playlistsAddedConfirmed}
                            >
                              {campaign.playlistsAddedConfirmed ? (
                                <svg className="w-4 h-4 text-green-500 checkmark-entrance" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              )}
                              <span>Added to Playlists</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-gray-200">
            {/* Items per page dropdown */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            {/* Page Info */}
            <div className="text-sm text-gray-600">
              Showing {filteredCampaigns.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredCampaigns.length)} of {filteredCampaigns.length} entries
            </div>

            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && setCurrentPage(page)}
                  disabled={page === '...'}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    page === currentPage
                      ? 'bg-indigo-600 text-white'
                      : page === '...'
                      ? 'text-gray-700 cursor-default'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
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
      
      {/* SMM API Submission Modal */}
      {smmApiModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop - does NOT close the modal */}
          <div className="absolute inset-0 bg-black bg-opacity-60" />
          
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Close button - only way to close */}
            {smmApiModal.status !== 'submitting' && (
              <button
                onClick={closeSmmApiModal}
                className="absolute top-4 right-4 z-10 p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Header - Dynamic color based on status */}
            <div className={`px-6 py-4 pr-12 transition-all duration-500 ease-in-out ${
              smmApiModal.status === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
              smmApiModal.status === 'partial' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
              smmApiModal.status === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
              'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}>
              <h3 className="text-white font-bold text-lg">
                {smmApiModal.status === 'confirm' && 'Submit Purchase API'}
                {smmApiModal.status === 'submitting' && 'Submitting Purchases...'}
                {(smmApiModal.status === 'success' || smmApiModal.status === 'partial' || smmApiModal.status === 'error') && 
                  `${smmApiModal.successCount}/${smmApiModal.totalCount} Completed`
                }
              </h3>
              {smmApiModal.campaignInfo && (
                <p className={`text-sm mt-1 transition-colors duration-500 ease-in-out ${
                  smmApiModal.status === 'success' ? 'text-green-100' :
                  smmApiModal.status === 'partial' ? 'text-amber-100' :
                  smmApiModal.status === 'error' ? 'text-red-100' :
                  'text-blue-100'
                }`}>
                  Order #{smmApiModal.campaignInfo.orderNumber} • {smmApiModal.campaignInfo.packageName}
                </p>
              )}
            </div>
            
            {/* Content */}
            <div className="p-6">
              {/* Confirm State */}
              {smmApiModal.status === 'confirm' && (
                <div>
                  <p className="text-gray-700 text-sm mb-6">
                    Are you sure you would like to submit this purchase to the purchase API?
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm text-blue-800 font-medium">
                          This will submit all configured order sets for the {smmApiModal.campaignInfo?.packageName} package to the Followiz SMM panel.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={closeSmmApiModal}
                      className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSmmApiSubmit}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm Submission
                    </button>
                  </div>
                </div>
              )}
              
              {/* Submitting State */}
              {smmApiModal.status === 'submitting' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-700 font-medium mb-2">Submitting Purchases...</p>
                  <p className="text-gray-500 text-sm">Please do not close this window.</p>
                </div>
              )}
              
              {/* Results State (Success, Partial, or Error) */}
              {(smmApiModal.status === 'success' || smmApiModal.status === 'partial' || smmApiModal.status === 'error') && (
                <div>
                  {/* Status Icon */}
                  <div className="text-center mb-5">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-500 ease-in-out ${
                      smmApiModal.status === 'success' ? 'bg-green-100' :
                      smmApiModal.status === 'partial' ? 'bg-amber-100' :
                      'bg-red-100'
                    }`}>
                      {smmApiModal.status === 'success' && (
                        <svg className="w-10 h-10 text-green-500 transition-all duration-500 ease-in-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {smmApiModal.status === 'partial' && (
                        <svg className="w-10 h-10 text-amber-500 transition-all duration-500 ease-in-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {smmApiModal.status === 'error' && (
                        <svg className="w-10 h-10 text-red-500 transition-all duration-500 ease-in-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <p className={`font-medium transition-colors duration-500 ease-in-out ${
                      smmApiModal.status === 'success' ? 'text-green-700' :
                      smmApiModal.status === 'partial' ? 'text-amber-700' :
                      'text-red-700'
                    }`}>
                      {smmApiModal.status === 'success' && 'All purchases submitted successfully!'}
                      {smmApiModal.status === 'partial' && 'Partial completion - some orders failed'}
                      {smmApiModal.status === 'error' && 'All submissions failed'}
                    </p>
                  </div>
                  
                  {/* Order Set Results - Individual Boxes */}
                  {smmApiModal.results.length > 0 && (
                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                      {smmApiModal.results.map((result, index) => (
                        <div 
                          key={index} 
                          className={`rounded-lg p-4 border-2 transition-all duration-500 ease-in-out ${
                            result.success 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                          style={{ 
                            animationDelay: `${index * 100}ms`,
                            animation: 'fadeSlideIn 0.4s ease-out forwards',
                            opacity: 0,
                          }}
                        >
                          {/* Service Info Row */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                              )}
                              <span className={`font-bold text-[0.85rem] ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                Service #{result.serviceId}
                              </span>
                            </div>
                            <span className={`text-[0.75rem] font-medium px-2 py-0.5 rounded-full ${
                              result.success ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                            }`}>
                              {result.quantity.toLocaleString()} qty
                            </span>
                          </div>
                          
                          {/* API Response Row */}
                          <div className={`text-[0.8rem] rounded px-3 py-2 ${
                            result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {result.success ? (
                              <span className="font-medium">✓ Order ID: #{result.followizOrderId}</span>
                            ) : (
                              <span className="font-medium">✗ {result.error || 'Unknown error'}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* New Balance */}
                  {smmApiModal.newBalance && (
                    <div className={`border rounded-lg p-3 mb-4 transition-all duration-500 ease-in-out ${
                      smmApiModal.status === 'success' ? 'bg-green-50 border-green-200' :
                      smmApiModal.status === 'partial' ? 'bg-amber-50 border-amber-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          smmApiModal.status === 'success' ? 'text-green-700' :
                          smmApiModal.status === 'partial' ? 'text-amber-700' :
                          'text-gray-700'
                        }`}>Updated Panel Balance:</span>
                        <span className={`text-lg font-bold ${
                          smmApiModal.status === 'success' ? 'text-green-700' :
                          smmApiModal.status === 'partial' ? 'text-amber-700' :
                          'text-gray-700'
                        }`}>${parseFloat(smmApiModal.newBalance).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={closeSmmApiModal}
                    className={`w-full px-5 py-2.5 text-white rounded-lg font-medium transition-all duration-300 ease-in-out ${
                      smmApiModal.status === 'success' ? 'bg-green-600 hover:bg-green-700' :
                      smmApiModal.status === 'partial' ? 'bg-amber-600 hover:bg-amber-700' :
                      'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {smmApiModal.status === 'success' ? 'OK' : 'Close'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveCampaigns;
