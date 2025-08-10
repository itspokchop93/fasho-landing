import React, { useState, useEffect, useRef } from 'react';

interface ActionItem {
  id: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  songName: string;
  packageName: string;
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
}

const ActionQueue: React.FC = () => {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchActionItems();
    
    // Set up real-time updates every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchActionItems();
    }, 30000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
  };

  const hideItem = async (itemId: string) => {
    try {
      const response = await fetch('/api/marketing-manager/hide-action-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        // Update local state
        setActionItems(items => 
          items.map(item => 
            item.id === itemId ? { ...item, isHidden: true } : item
          )
        );
      } else {
        console.error('Failed to hide item:', response.statusText);
      }
    } catch (error) {
      console.error('Error hiding item:', error);
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

  const visibleItems = showHidden 
    ? actionItems 
    : actionItems.filter(item => !item.isHidden);

  const hiddenCount = actionItems.filter(item => item.isHidden).length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Queue (Immediate)</h2>
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
          <h2 className="text-lg font-semibold text-gray-900">Action Queue (Immediate)</h2>
          <p className="text-sm text-gray-500 mt-1">
            {visibleItems.length} action{visibleItems.length !== 1 ? 's' : ''} requiring attention
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live Updates</span>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleItems.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 ${item.status === 'Completed' ? 'bg-green-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => scrollToActiveCampaign(item.orderNumber)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      {item.orderNumber}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
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
                      {item.actions.removeFromPlaylists && (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-red-300 rounded bg-red-50"></div>
                          <span className="text-sm text-red-700">Remove from Playlists</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDueBy(item.dueBy, item.dueByTimestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {actionItems.filter(item => item.isHidden).map((item) => (
                        <tr key={item.id} className={`${item.status === 'Completed' ? 'bg-green-50' : ''}`}>
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
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => hideItem(item.id)}
                              className="text-gray-400 hover:text-gray-600 text-xs"
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
          )}
        </div>
      )}
    </div>
  );
};

export default ActionQueue;
