import React, { useState, useEffect } from 'react';

interface CampaignTotal {
  id: string;
  packageName: string;
  directStreams: number;
  playlistStreams: number;
  playlistAssignmentsNeeded: number;
  timeOnPlaylists: number;
  smmQty: number;
  smmRuns: number;
  isActive: boolean;
}

const CampaignTotals: React.FC = () => {
  const [campaignTotals, setCampaignTotals] = useState<CampaignTotal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CampaignTotal>>({});

  useEffect(() => {
    fetchCampaignTotals();
  }, []);

  const fetchCampaignTotals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/marketing-manager/system-settings/campaign-totals');
      if (response.ok) {
        const data = await response.json();
        
        // Sort data in correct package order
        const packageOrder = ['LEGENDARY', 'UNSTOPPABLE', 'DOMINATE', 'MOMENTUM', 'BREAKTHROUGH'];
        const sortedData = data.sort((a: CampaignTotal, b: CampaignTotal) => {
          const aIndex = packageOrder.indexOf(a.packageName.toUpperCase());
          const bIndex = packageOrder.indexOf(b.packageName.toUpperCase());
          return aIndex - bIndex;
        });
        
        setCampaignTotals(sortedData);
      } else {
        console.error('Failed to fetch campaign totals:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching campaign totals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (packageData: CampaignTotal) => {
    setEditingPackage(packageData.id);
    setEditForm(packageData);
  };

  const handleSave = async () => {
    if (!editingPackage || !editForm) return;

    try {
      const response = await fetch('/api/marketing-manager/system-settings/update-campaign-total', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingPackage,
          ...editForm
        }),
      });

      if (response.ok) {
        fetchCampaignTotals();
        setEditingPackage(null);
        setEditForm({});
      } else {
        console.error('Failed to update campaign total:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating campaign total:', error);
    }
  };

  const handleCancel = () => {
    setEditingPackage(null);
    setEditForm({});
  };

  const handleInputChange = (field: keyof CampaignTotal, value: string | number) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getPackageIcon = (packageName: string) => {
    switch (packageName.toUpperCase()) {
      case 'LEGENDARY': return '👑';
      case 'UNSTOPPABLE': return '💎';
      case 'DOMINATE': return '🔥';
      case 'MOMENTUM': return '⚡';
      case 'BREAKTHROUGH': return '🚀';
      default: return '📊';
    }
  };

  const getPackageColor = (packageName: string) => {
    switch (packageName.toUpperCase()) {
      case 'LEGENDARY': return 'from-purple-500 to-pink-500';
      case 'UNSTOPPABLE': return 'from-blue-500 to-cyan-500';
      case 'DOMINATE': return 'from-orange-500 to-red-500';
      case 'MOMENTUM': return 'from-green-500 to-teal-500';
      case 'BREAKTHROUGH': return 'from-indigo-500 to-purple-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Totals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Campaign Totals</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure stream counts and settings for each package tier
          </p>
        </div>
        <button
          onClick={fetchCampaignTotals}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {campaignTotals.map((campaign) => (
          <div
            key={campaign.id}
            className={`relative bg-gradient-to-br ${getPackageColor(campaign.packageName)} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
          >
            {/* Package Header */}
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{getPackageIcon(campaign.packageName)}</div>
              <h4 className="text-xl font-bold">{campaign.packageName}</h4>
            </div>

            {editingPackage === campaign.id ? (
              /* Edit Form */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Direct Streams</label>
                  <input
                    type="number"
                    value={editForm.directStreams || 0}
                    onChange={(e) => handleInputChange('directStreams', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm text-gray-900 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Playlist Streams</label>
                  <input
                    type="number"
                    value={editForm.playlistStreams || 0}
                    onChange={(e) => handleInputChange('playlistStreams', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm text-gray-900 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Playlist Assignments</label>
                  <input
                    type="number"
                    value={editForm.playlistAssignmentsNeeded || 0}
                    onChange={(e) => handleInputChange('playlistAssignmentsNeeded', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm text-gray-900 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Time on Playlists (Days)</label>
                  <input
                    type="number"
                    value={editForm.timeOnPlaylists || 0}
                    onChange={(e) => handleInputChange('timeOnPlaylists', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm text-gray-900 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">SMM QTY</label>
                  <input
                    type="number"
                    value={editForm.smmQty || 0}
                    onChange={(e) => handleInputChange('smmQty', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm text-gray-900 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">SMM Runs</label>
                  <input
                    type="number"
                    value={editForm.smmRuns || 0}
                    onChange={(e) => handleInputChange('smmRuns', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm text-gray-900 rounded border"
                  />
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-white text-gray-900 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-black bg-opacity-20 px-3 py-1 rounded text-sm font-medium hover:bg-opacity-30"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm opacity-90">Direct:</span>
                  <span className="text-sm font-medium">{campaign.directStreams.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-90">Playlist:</span>
                  <span className="text-sm font-medium">{campaign.playlistStreams.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-90">Playlists:</span>
                  <span className="text-sm font-medium">{campaign.playlistAssignmentsNeeded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-90">Time:</span>
                  <span className="text-sm font-medium">{campaign.timeOnPlaylists} days</span>
                </div>
                <div className="border-t border-white border-opacity-20 pt-2 mt-3">
                  <div className="flex justify-between">
                    <span className="text-xs opacity-75">SMM QTY:</span>
                    <span className="text-xs font-medium">{campaign.smmQty.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs opacity-75">SMM Runs:</span>
                    <span className="text-xs font-medium">{campaign.smmRuns}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleEdit(campaign)}
                  className="w-full mt-4 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded text-sm font-medium transition-all duration-200"
                >
                  Edit Settings
                </button>
              </div>
            )}

            {/* Status Indicator */}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${campaign.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignTotals;
