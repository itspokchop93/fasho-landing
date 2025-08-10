import React, { useState, useEffect } from 'react';

interface CounterCardData {
  activeCampaigns: number;
  actionsNeeded: number;
  totalPlaylists: number;
  playlistedSongs: number;
}

const CounterCards: React.FC = () => {
  const [data, setData] = useState<CounterCardData>({
    activeCampaigns: 0,
    actionsNeeded: 0,
    totalPlaylists: 0,
    playlistedSongs: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCounterData();
  }, []);

  const fetchCounterData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/marketing-manager/counter-data');
      if (response.ok) {
        const counterData = await response.json();
        setData(counterData);
      } else {
        console.error('Failed to fetch counter data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching counter data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const CounterCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    description: string;
  }> = ({ title, value, icon, color, description }) => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {isLoading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
            ) : (
              value.toLocaleString()
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Campaign Overview</h2>
        <button
          onClick={fetchCounterData}
          disabled={isLoading}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center space-x-1 disabled:opacity-50"
        >
          <svg 
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CounterCard
          title="Active Campaigns"
          value={data.activeCampaigns}
          color="bg-green-100"
          description="Campaigns currently running"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        <CounterCard
          title="Actions Needed"
          value={data.actionsNeeded}
          color="bg-orange-100"
          description="Items in action queue"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <CounterCard
          title="Total Playlists"
          value={data.totalPlaylists}
          color="bg-blue-100"
          description="Playlists in network"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          }
        />

        <CounterCard
          title="Playlisted Songs"
          value={data.playlistedSongs}
          color="bg-purple-100"
          description="Songs currently on playlists"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v8.25" />
            </svg>
          }
        />
      </div>
    </div>
  );
};

export default CounterCards;
