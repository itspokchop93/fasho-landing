import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { formatProgressDisplay } from '../../utils/numberFormatter';

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
  packageName: string;
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

const ActiveCampaigns: React.FC = () => {
  const router = useRouter();
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  


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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleOrderNumberClick = (orderId: string) => {
    router.push(`/admin/order/${orderId}`);
  };

  const confirmAction = async (campaignId: string, action: 'direct-streams' | 'playlists-added' | 'de-playlisted') => {
    const actionMessages = {
      'direct-streams': 'Confirm that you have purchased direct streams for this campaign?',
      'playlists-added': 'Confirm that you have added this song to the assigned playlists?',
      'de-playlisted': 'Confirm that you have removed this song from all playlists?'
    };

    if (window.confirm(actionMessages[action])) {
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
        } else {
          console.error('Failed to confirm action:', response.statusText);
        }
      } catch (error) {
        console.error('Error confirming action:', error);
      }
    }
  };

  const updatePlaylistAssignment = async (campaignId: string, playlistIndex: number, newPlaylistId: string) => {
    try {
      const response = await fetch('/api/marketing-manager/update-playlist-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId, playlistIndex, newPlaylistId }),
      });

      if (response.ok) {
        // Refresh campaigns data
        fetchCampaigns();
        setEditingPlaylist(null);
      } else {
        console.error('Failed to update playlist assignment:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating playlist assignment:', error);
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Removal Needed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const ProgressBar: React.FC<{ current: number; total: number; color: string }> = ({ current, total, color }) => {
    const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
        <div className="text-xs text-gray-600 mt-1">
          {formatProgressDisplay(current, total, percentage)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Campaigns</h2>
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
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
            onClick={populateExistingOrders}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium mr-2"
          >
            Import Orders
          </button>
          <button
            onClick={async () => {
              if (confirm('This will remove duplicate campaigns and keep only the oldest one per order. Continue?')) {
                try {
                  const response = await fetch('/api/marketing-manager/cleanup-duplicates', { method: 'POST' });
                  const result = await response.json();
                  alert(result.message);
                  fetchCampaigns(); // Refresh the list
                } catch (error) {
                  alert('Error cleaning up duplicates');
                }
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
          >
            Fix Duplicates
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
        <div className="border border-gray-200 rounded-lg">
          {/* Table container with both horizontal and vertical scroll */}
          <div 
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: '600px' }} // Height for approximately 8 rows
          >
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Song</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Playlist Assignments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direct Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Playlist Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Removal Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} id={`campaign-${campaign.orderNumber}`} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap w-20">
                    <button
                      onClick={() => handleOrderNumberClick(campaign.orderId)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      {campaign.orderNumber}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(campaign.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-900">{campaign.songName}</span>
                      <button
                        onClick={() => copyToClipboard(campaign.songLink)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
                        title="Copy link to clipboard"
                      >
                        [copy link]
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.packageName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {campaign.playlistAssignments.map((playlist, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          {editingPlaylist?.campaignId === campaign.id && editingPlaylist?.playlistIndex === index ? (
                            <div className="flex items-center space-x-2">
                              <select
                                defaultValue={playlist.id}
                                onChange={(e) => updatePlaylistAssignment(campaign.id, index, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                {availablePlaylists.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => setEditingPlaylist(null)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingPlaylist({ campaignId: campaign.id, playlistIndex: index })}
                              className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
                            >
                              {playlist.name}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ProgressBar
                      current={campaign.directStreamsProgress}
                      total={campaign.directStreams}
                      color="bg-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <ProgressBar
                      current={campaign.playlistStreamsProgress}
                      total={campaign.playlistStreams}
                      color="bg-green-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.removalDate ? new Date(campaign.removalDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex flex-col space-y-2">
                      {campaign.status === 'Removal Needed' ? (
                        <button
                          onClick={() => confirmAction(campaign.id, 'de-playlisted')}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium"
                        >
                          De-Playlisted
                        </button>
                      ) : (
                        <>
                          {!campaign.directStreamsConfirmed && (
                            <button
                              onClick={() => confirmAction(campaign.id, 'direct-streams')}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                            >
                              Directly Purchased
                            </button>
                          )}
                          {!campaign.playlistsAddedConfirmed && (
                            <button
                              onClick={() => confirmAction(campaign.id, 'playlists-added')}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                            >
                              Added to Playlists
                            </button>
                          )}
                        </>
                      )}
                    </div>
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
};

export default ActiveCampaigns;
