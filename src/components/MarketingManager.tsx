import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import CounterCards from './marketing-manager/CounterCards';
import ActionQueue from './marketing-manager/ActionQueue';
import ActiveCampaigns from './marketing-manager/ActiveCampaigns';
import PlaylistPurchasesNeeded from './marketing-manager/PlaylistPurchasesNeeded';
import PlaylistUtilization from './marketing-manager/PlaylistUtilization';
import SystemSettings from './marketing-manager/SystemSettings';
import CampaignTotals from './marketing-manager/CampaignTotals';

const MarketingManager: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('manager');
  const [isLoading, setIsLoading] = useState(false);

  // Handle tab changes and URL hash updates
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL hash to reflect current tab
    const currentUrl = new URL(window.location.href);
    currentUrl.hash = `marketing-manager-${tab}`;
    window.history.replaceState({}, '', currentUrl.toString());
  };

  // Handle initial tab state from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('marketing-manager-')) {
      const tab = hash.split('marketing-manager-')[1];
      if (tab === 'system-settings') {
        setActiveTab('system-settings');
      } else {
        setActiveTab('manager');
      }
    }
  }, []);

  const renderManagerContent = () => {
    return (
      <div className="space-y-8">
        {/* Counter Cards */}
        <CounterCards />
        
        {/* Action Queue (Immediate) */}
        <ActionQueue />
        
        {/* Active Campaigns */}
        <ActiveCampaigns />
        
        {/* Playlist Purchases Needed */}
        <PlaylistPurchasesNeeded />
        
        {/* Playlist Network */}
        <SystemSettings onlyPlaylistNetwork={true} />
        
        {/* Campaign Totals */}
        <CampaignTotals />

        {/* Playlist Utilization */}
        <PlaylistUtilization />
      </div>
    );
  };

  const renderSystemSettingsContent = () => {
    return (
      <div className="space-y-8">
        <SystemSettings />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'manager':
        return renderManagerContent();
      case 'system-settings':
        return renderSystemSettingsContent();
      default:
        return renderManagerContent();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketing Manager</h1>
            <p className="text-gray-600 mt-1">
              Manage your Spotify marketing campaigns, playlists, and track progress
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500">Live Updates Active</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Marketing Manager Tabs">
            <button
              onClick={() => handleTabChange('manager')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'manager'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => handleTabChange('system-settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'system-settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              System Settings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketingManager;
