import React, { useState, useEffect, useRef } from 'react';

// CSS animation styles
const animationStyles = `
  @keyframes blink-hide {
    0%, 50%, 100% { opacity: 1; background-color: transparent; }
    25%, 75% { opacity: 0.3; background-color: rgba(239, 68, 68, 0.1); }
  }
  
  @keyframes slide-down-hide {
    0% { transform: translateY(0); opacity: 1; max-height: 100px; }
    100% { transform: translateY(20px); opacity: 0; max-height: 0; padding: 0; margin: 0; }
  }
  
  @keyframes blink-unhide {
    0%, 50%, 100% { opacity: 1; background-color: transparent; }
    25%, 75% { opacity: 0.3; background-color: rgba(59, 130, 246, 0.1); }
  }
  
  @keyframes slide-up-unhide {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes final-blink {
    0%, 50%, 100% { background-color: transparent; }
    25%, 75% { background-color: rgba(34, 197, 94, 0.2); }
  }
  
  .hiding-item {
    animation: blink-hide 0.8s ease-in-out;
  }
  
  .hiding-item.slide-out {
    animation: slide-down-hide 0.6s ease-in-out forwards;
  }
  
  .unhiding-item {
    animation: blink-unhide 0.8s ease-in-out;
  }
  
  .unhiding-item.slide-in {
    animation: slide-up-unhide 0.6s ease-out;
  }
  
  .unhiding-item.final-blink {
    animation: final-blink 0.8s ease-in-out;
  }
  
  .action-row {
    transition: all 0.3s ease-in-out;
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = animationStyles;
  if (!document.head.querySelector('style[data-action-queue-animations]')) {
    styleSheet.setAttribute('data-action-queue-animations', 'true');
    document.head.appendChild(styleSheet);
  }
}

interface ActionItem {
  id: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  songName: string;
  songNumber?: number | null;
  packageName: string;
  actionType: 'initial' | 'removal'; // New field to distinguish action types
  actions: {
    directStreams: boolean;
    addToPlaylists: boolean;
    removeFromPlaylists: boolean;
  };
  dueBy: string;
  dueByTimestamp: number;
  status: 'Needed' | 'Overdue' | 'Completed';
  isHidden: boolean;
  createdAt: string;
  hiddenUntil?: string;
  completedAt?: string;
}

const ActionQueue: React.FC = () => {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [hidingItems, setHidingItems] = useState<Set<string>>(new Set());
  const [unhidingItems, setUnhidingItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchActionItems();
    
    // Set up real-time updates every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchActionItems();
    }, 30000);

    // Set up time updates every minute for live countdown
    timeUpdateRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    // Listen for campaign action confirmations from ActiveCampaigns
    const handleCampaignActionConfirmed = (event: CustomEvent) => {
      console.log(`🔄 LIVE UPDATE: ActionQueue received campaignActionConfirmed event:`, event.detail);
      // Show live update indicator
      setIsLiveUpdating(true);
      // Refresh action items immediately when any campaign action is confirmed
      fetchActionItems();
      // Hide live update indicator after 2 seconds
      setTimeout(() => setIsLiveUpdating(false), 2000);
    };

    // Add event listener for live updates
    window.addEventListener('campaignActionConfirmed', handleCampaignActionConfirmed as EventListener);

    // Cleanup intervals and event listeners on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
      // Remove event listener
      window.removeEventListener('campaignActionConfirmed', handleCampaignActionConfirmed as EventListener);
    };
  }, []);

  const fetchActionItems = async () => {
    try {
      const response = await fetch('/api/marketing-manager/action-queue');
      if (response.ok) {
        const items = await response.json();
        setActionItems(items);
      } else {
        console.error('Failed to fetch action items:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching action items:', error);
    } finally {
      setIsLoading(false);
    }
    
    // Clear selection after fetching new data
    setSelectedItems(new Set());
  };



  const hideItem = async (itemId: string) => {
    try {
      // Start hide animation - add to hiding items set for blink effect
      setHidingItems(prev => new Set([...prev, itemId]));
      
      // Wait for blink animation to complete (0.8 seconds for 2 blinks)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Add slide-out class for the slide down effect
      const element = document.querySelector(`tr[data-item-id="${itemId}"]`);
      if (element) {
        element.classList.add('slide-out');
      }
      
      const response = await fetch('/api/marketing-manager/hide-action-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        console.log(`✅ HIDE: Item ${itemId} hidden successfully, refreshing data`);
        
        // Wait for slide-down animation to complete (0.6 seconds)
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Remove from hiding items and fetch fresh data
        setHidingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        
        // Fetch fresh data immediately to get updated state from database
        await fetchActionItems();
        
        // Remove item from selection if it was selected
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      } else {
        console.error('Failed to hide item:', response.statusText);
        // Remove from hiding items on error
        setHidingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error hiding item:', error);
      // Remove from hiding items on error
      setHidingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const unhideItem = async (itemId: string) => {
    try {
      // Start unhide animation - add to unhiding items set
      setUnhidingItems(prev => new Set([...prev, itemId]));
      
      // Wait for blink animation to complete (0.8 seconds for 2 blinks)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const response = await fetch('/api/marketing-manager/unhide-action-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        console.log(`✅ UNHIDE: Item ${itemId} unhidden successfully, refreshing data`);
        
        // Fetch fresh data immediately to get updated state from database
        await fetchActionItems();
        
        // Wait for slide-up and reposition animations to complete (1.2 seconds total)
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Final blink to show it's back in position, then remove from unhiding items
        setTimeout(() => {
          setUnhidingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }, 800); // Wait for final blink animation
        
      } else {
        console.error('Failed to unhide item:', response.statusText);
        // Remove from unhiding items on error
        setUnhidingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error unhiding item:', error);
      // Remove from unhiding items on error
      setUnhidingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const scrollToActiveCampaign = (orderNumber: string) => {
    // Scroll to the corresponding item in Active Campaigns section
    const element = document.getElementById(`campaign-${orderNumber}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Add a highlight effect
      element.classList.add('ring-4', 'ring-indigo-500', 'ring-opacity-50');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-indigo-500', 'ring-opacity-50');
      }, 3000);
    }
  };

  const getAnimationClass = (itemId: string) => {
    if (hidingItems.has(itemId)) {
      return 'hiding-item';
    }
    if (unhidingItems.has(itemId)) {
      return 'unhiding-item slide-in final-blink';
    }
    return 'action-row';
  };

  const formatDueBy = (dueByString: string, timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
    
    if (diff > 0) {
      return `in ${hours}h`;
    } else {
      return `${hours}h ago!`;
    }
  };

  const formatRemovalCountdown = (removalTimestamp: string): string | null => {
    const removalTime = new Date(removalTimestamp).getTime();
    const now = currentTime;
    const diff = removalTime - now;

    if (diff <= 0) {
      return null; // Already expired
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // SANITY CHECK: Max removal time should be 8 hours for both hidden and completed items
    if (hours > 8) {
      console.warn(`⚠️ REMOVAL COUNTDOWN: Suspicious long countdown ${hours}hr ${minutes}min for timestamp ${removalTimestamp}`);
      return null; // Don't show invalid long countdowns
    }

    if (hours > 0) {
      return `${hours}hr ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  };

  const getRemovalCountdown = (item: ActionItem): string | null => {
    // STRICT RULE: Only show countdown for HIDDEN or COMPLETED items
    
    // Case 1: Item is currently HIDDEN
    if (item.isHidden && item.hiddenUntil) {
      // hiddenUntil is actually the removal time (hide time + 8 hours)
      return formatRemovalCountdown(item.hiddenUntil);
    } 
    
    // Case 2: Item is COMPLETED
    else if (item.status === 'Completed' && item.completedAt) {
      // Calculate 8 hours from completion time
      const completionTime = new Date(item.completedAt).getTime();
      const removalTime = completionTime + (8 * 60 * 60 * 1000); // 8 hours
      return formatRemovalCountdown(new Date(removalTime).toISOString());
    }
    
    // Case 3: All other items (not hidden, not completed) = NO countdown
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Needed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Main queue should ALWAYS only show non-hidden items
  const visibleItems = actionItems.filter(item => {
    const isVisible = !item.isHidden;
    if (!isVisible) {
      console.log(`🔍 FILTER: Item ${item.orderNumber} filtered out (hidden: ${item.isHidden})`);
    }
    return isVisible;
  });

  const hiddenCount = actionItems.filter(item => item.isHidden).length;
  
  console.log(`📊 QUEUE STATE: Total items: ${actionItems.length}, Visible: ${visibleItems.length}, Hidden: ${hiddenCount}, ShowHidden: ${showHidden}`);

  // Bulk selection functions
  const handleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisibleIds = visibleItems.map(item => item.id);
      setSelectedItems(new Set(allVisibleIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  const hideSelectedItems = async () => {
    const itemsToHide = Array.from(selectedItems);
    
    // Hide each selected item
    for (const itemId of itemsToHide) {
      try {
        await hideItem(itemId);
      } catch (error) {
        console.error(`Error hiding item ${itemId}:`, error);
      }
    }
    
    // Clear selection after hiding
    setSelectedItems(new Set());
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">Action Queue (Immediate)</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-800">Action Queue (Immediate)</h2>
          <p className="text-sm text-gray-500 mt-1">
            {visibleItems.length} action{visibleItems.length !== 1 ? 's' : ''} requiring attention
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLiveUpdating ? 'bg-blue-500 animate-bounce' : 'bg-green-500 animate-pulse'}`}></div>
            <span className={`text-xs ${isLiveUpdating ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              {isLiveUpdating ? 'Updating Live...' : 'Live Updates'}
            </span>
          </div>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/marketing-manager/cleanup-invalid-hidden', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                console.log('🧹 CLEANUP RESULT:', result);
                alert(`Cleanup completed: ${result.clearedItems} invalid timestamps cleared`);
                fetchActionItems(); // Refresh data
              } catch (error) {
                console.error('Cleanup error:', error);
                alert('Cleanup failed');
              }
            }}
            className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
          >
            🧹 Fix Invalid Timers
          </button>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
          <p className="mt-1 text-sm text-gray-500">No immediate actions needed right now.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg">
          {/* Table container with both horizontal and vertical scroll */}
          <div 
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: '540px' }} // Height for approximately 9 rows
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    <input
                      type="checkbox"
                      checked={selectedItems.size > 0 && selectedItems.size === visibleItems.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due By
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleItems.map((item) => (
                  <tr 
                    key={item.id} 
                    data-item-id={item.id}
                    className={`hover:bg-gray-50 ${item.status === 'Completed' ? 'bg-green-50' : ''} ${getAnimationClass(item.id)}`}
                  >
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => scrollToActiveCampaign(item.orderNumber)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          {item.orderNumber}
                        </button>
                        {item.songNumber && (
                          <span className="inline-flex items-center px-2 py-0.5 mt-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">
                            Song {item.songNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="space-y-1 flex flex-col items-center">
                        {/* Show actions based on action type */}
                        {item.actionType === 'initial' ? (
                          // INITIAL ACTION ITEMS: Show only Direct Streams + Add to Playlists
                          <>
                            <div className="flex items-center space-x-2">
                              {item.actions.directStreams ? (
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                              )}
                              <span className="text-sm text-gray-700">Direct Streams</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {item.actions.addToPlaylists ? (
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                              )}
                              <span className="text-sm text-gray-700">Add to Playlists</span>
                            </div>
                          </>
                        ) : (
                          // REMOVAL ACTION ITEMS: Show only Remove from Playlists
                          <div className="flex items-center space-x-2">
                            {item.actions.removeFromPlaylists ? (
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <div className="w-4 h-4 border-2 border-red-300 rounded bg-red-50"></div>
                            )}
                            <span className="text-sm text-red-700">Remove from Playlists</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {formatDueBy(item.dueBy, item.dueByTimestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="space-y-1 flex flex-col items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        {(() => {
                          const countdown = getRemovalCountdown(item);
                          if (countdown) {
                            return (
                              <div className="text-xs text-gray-500 italic">
                                This item will be removed in {countdown}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => hideItem(item.id)}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                      >
                        Hide
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hide Selected Button */}
      {selectedItems.size >= 2 && (
        <div className="mt-4 flex justify-start">
          <button
            onClick={hideSelectedItems}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
            <span>Hide Selected ({selectedItems.size})</span>
          </button>
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="mt-4">
          <div className="text-center mb-3">
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              {showHidden ? 'Hide Hidden Items' : `Show Hidden Items (${hiddenCount})`}
            </button>
          </div>
          
          {showHidden && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Hidden Items</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="border border-gray-200 rounded-lg bg-white">
                  <div 
                    className="overflow-x-auto overflow-y-auto"
                    style={{ maxHeight: '300px' }} // Height for approximately 5 hidden rows
                  >
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {actionItems.filter(item => item.isHidden).map((item) => (
                          <tr 
                            key={item.id} 
                            data-item-id={item.id}
                            className={`${item.status === 'Completed' ? 'bg-green-50' : ''} ${getAnimationClass(item.id)}`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button
                                onClick={() => scrollToActiveCampaign(item.orderNumber)}
                                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                              >
                                {item.orderNumber}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {/* Show actions based on action type for hidden items */}
                                {item.actionType === 'initial' ? (
                                  // INITIAL ACTION ITEMS: Show only Direct Streams + Add to Playlists
                                  <>
                                    <div className="flex items-center space-x-2">
                                      {item.actions.directStreams ? (
                                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <div className="w-3 h-3 border border-gray-300 rounded"></div>
                                      )}
                                      <span className="text-xs text-gray-700">Direct Streams</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {item.actions.addToPlaylists ? (
                                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <div className="w-3 h-3 border border-gray-300 rounded"></div>
                                      )}
                                      <span className="text-xs text-gray-700">Add to Playlists</span>
                                    </div>
                                  </>
                                ) : (
                                  // REMOVAL ACTION ITEMS: Show only Remove from Playlists
                                  <div className="flex items-center space-x-2">
                                    {item.actions.removeFromPlaylists ? (
                                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    ) : (
                                      <div className="w-3 h-3 border border-red-300 rounded bg-red-50"></div>
                                    )}
                                    <span className="text-xs text-red-700">Remove from Playlists</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="space-y-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                                  {item.status}
                                </span>
                                {(() => {
                                  const countdown = getRemovalCountdown(item);
                                  if (countdown) {
                                    return (
                                      <div className="text-xs text-gray-500 italic">
                                        This item will be removed in {countdown}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <button
                                onClick={() => unhideItem(item.id)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Unhide
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionQueue;
