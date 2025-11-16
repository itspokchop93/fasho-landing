import React, { useState, useEffect } from 'react';

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

const PlaylistPurchasesNeeded: React.FC = () => {
  console.log('📋 PLAYLIST-PURCHASES: 🚀 COMPONENT CONSTRUCTOR - Component is being initialized');
  
  const [playlistPurchases, setPlaylistPurchases] = useState<PlaylistPurchaseItem[]>([]);
  const [playlistNetwork, setPlaylistNetwork] = useState<{[id: string]: any}>({});
  const [campaignTracker, setCampaignTracker] = useState<{[campaignId: string]: string[]}>({});
  const [copiedPlaylistId, setCopiedPlaylistId] = useState<string | null>(null);
  
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
            genre: playlist.genre
          };
          return acc;
        }, {});
        setPlaylistNetwork(networkMap);
        console.log('📋 PLAYLIST-PURCHASES: Loaded playlist network data', networkMap);
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
        const networkData = playlistNetwork[assignment.id] || {};
        
        if (existingIndex >= 0) {
          // Increase count for existing playlist
          newPurchases[existingIndex] = {
            ...newPurchases[existingIndex],
            songsAdded: newPurchases[existingIndex].songsAdded + 1,
            sessionDate: sessionDate,
            recentlyAdded: true,
            // Update with latest network data
            playlistLink: networkData.link || newPurchases[existingIndex].playlistLink,
            imageUrl: networkData.imageUrl || newPurchases[existingIndex].imageUrl
          };
          console.log(`📋 PLAYLIST-PURCHASES: Increased count for ${assignment.name} to ${newPurchases[existingIndex].songsAdded}`);
        } else {
          // Add new playlist
          newPurchases.push({
            id: assignment.id,
            playlistName: networkData.name || assignment.name,
            playlistLink: networkData.link || '',
            imageUrl: networkData.imageUrl || '',
            songsAdded: 1,
            sessionDate: sessionDate,
            genre: networkData.genre || assignment.genre || '',
            recentlyAdded: true
          });
          console.log(`📋 PLAYLIST-PURCHASES: Added new playlist ${assignment.name}`);
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
        
        if (existingIndex >= 0) {
          // Increase count for existing playlist
          newPurchases[existingIndex] = {
            ...newPurchases[existingIndex],
            songsAdded: newPurchases[existingIndex].songsAdded + 1,
            sessionDate: new Date().toISOString(),
            recentlyAdded: true
          };
          console.log(`📋 PLAYLIST-PURCHASES: 🎯 SMART UPDATE - Increased count for ${newPlaylistId} to ${newPurchases[existingIndex].songsAdded} (admin changed mind)`);
        } else {
          // Add new playlist
          newPurchases.push({
            id: newPlaylistId,
            playlistName: networkData.name || `Playlist ${newPlaylistId}`,
            playlistLink: networkData.link || '',
            imageUrl: networkData.imageUrl || '',
            songsAdded: 1,
            sessionDate: new Date().toISOString(),
            genre: networkData.genre || '',
            recentlyAdded: true
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

    // Check if playlistLink is valid
    if (!playlistLink || playlistLink.trim() === '') {
      console.error('📋 PLAYLIST-PURCHASES: Cannot copy - playlist link is empty for playlist', playlistId);
      alert('Playlist link is not available. Please check the playlist network settings.');
      return;
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(playlistLink);
        setCopiedPlaylistId(playlistId);
        setTimeout(() => setCopiedPlaylistId(null), 2000);
        console.log(`📋 PLAYLIST-PURCHASES: Copied link for playlist ${playlistId}: ${playlistLink}`);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = playlistLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopiedPlaylistId(playlistId);
            setTimeout(() => setCopiedPlaylistId(null), 2000);
            console.log(`📋 PLAYLIST-PURCHASES: Copied link (fallback method) for playlist ${playlistId}: ${playlistLink}`);
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
      alert(`Failed to copy playlist link. Please try selecting and copying manually: ${playlistLink}`);
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
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Image
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Playlist
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Songs Added
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Session
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {playlistPurchases.map((item) => (
                <tr 
                  key={item.id}
                  className={`
                    ${item.recentlyAdded ? 'fade-in-slide highlight-fade' : ''}
                    hover:bg-gray-50
                  `}
                >
                  {/* Image */}
                  <td className="px-4 py-4 whitespace-nowrap w-16">
                    <div className="flex-shrink-0 h-10 w-10">
                      {item.imageUrl ? (
                        <img 
                          className="h-10 w-10 rounded-lg object-cover" 
                          src={item.imageUrl} 
                          alt={item.playlistName}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-300 flex items-center justify-center">
                          <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Playlist */}
                  <td className="px-4 py-4 whitespace-nowrap w-48">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.playlistName}
                      </div>
                      <button
                        onClick={(e) => handleCopyLink(item.id, item.playlistLink, e)}
                        className={`text-xs text-blue-600 hover:text-blue-800 font-medium mt-1 copy-click transition-colors ${
                          copiedPlaylistId === item.id ? 'text-green-600 font-semibold' : ''
                        }`}
                        disabled={!item.playlistLink || item.playlistLink.trim() === ''}
                        title={item.playlistLink ? 'Copy playlist link to clipboard' : 'Playlist link not available'}
                      >
                        {copiedPlaylistId === item.id ? 'Copied to clipboard!' : 'Copy Link'}
                      </button>
                    </div>
                  </td>

                  {/* Songs Added */}
                  <td className="px-4 py-4 whitespace-nowrap w-24">
                    <div className="text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {item.songsAdded}
                      </span>
                    </div>
                  </td>

                  {/* Session */}
                  <td className="px-4 py-4 whitespace-nowrap w-32">
                    <div className="text-sm text-gray-900">
                      {formatDate(item.sessionDate)}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-4 whitespace-nowrap w-24">
                    <div className="text-center">
                      <button
                        onClick={(e) => showConfirmationModal('purchased', e, item.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        PURCHASED
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
};

export default PlaylistPurchasesNeeded;
