import React, { useState, useEffect } from 'react';

interface PlaylistUtilizationData {
  id: string;
  playlistName: string;
  genre: string;
  accountEmail: string;
  songCount: number;
  maxSongs: number;
  occupancy: number;
  nextAvailSlot: string | 'Open';
  playlistLink: string;
  spotifyPlaylistId: string;
  imageUrl?: string;
}

type SortField = 'playlistName' | 'genre' | 'accountEmail' | 'songCount' | 'occupancy' | 'nextAvailSlot';
type SortDirection = 'asc' | 'desc';

const PlaylistUtilization: React.FC = () => {
  const [playlists, setPlaylists] = useState<PlaylistUtilizationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('playlistName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchPlaylistUtilization();
  }, []);

  const fetchPlaylistUtilization = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setRefreshing(true);
      }
      
      const response = await fetch(`/api/marketing-manager/playlist-utilization${forceRefresh ? '?refresh=true' : ''}`);
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      } else {
        console.error('Failed to fetch playlist utilization:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching playlist utilization:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchPlaylistUtilization(true);
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 90) return 'bg-red-500';
    if (occupancy >= 75) return 'bg-yellow-500';
    if (occupancy >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getOccupancyTextColor = (occupancy: number) => {
    if (occupancy >= 90) return 'text-red-700';
    if (occupancy >= 75) return 'text-yellow-700';
    if (occupancy >= 50) return 'text-blue-700';
    return 'text-green-700';
  };

  const getOccupancyBgColor = (occupancy: number) => {
    if (occupancy >= 90) return 'bg-red-50';
    if (occupancy >= 75) return 'bg-yellow-50';
    if (occupancy >= 50) return 'bg-blue-50';
    return 'bg-green-50';
  };

  const openSpotifyPlaylist = (playlistLink: string) => {
    window.open(playlistLink, '_blank');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortPlaylists = (playlistList: PlaylistUtilizationData[]): PlaylistUtilizationData[] => {
    return [...playlistList].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle special cases
      if (sortField === 'nextAvailSlot') {
        // 'Open' should come first when ascending, last when descending
        if (aValue === 'Open' && bValue !== 'Open') return sortDirection === 'asc' ? -1 : 1;
        if (bValue === 'Open' && aValue !== 'Open') return sortDirection === 'asc' ? 1 : -1;
        if (aValue === 'Open' && bValue === 'Open') return 0;
        
        // For date strings, convert to Date objects for comparison
        if (aValue !== 'Open' && bValue !== 'Open') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
      }

      // Compare values
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  };

  // Get sorted playlists
  const sortedPlaylists = sortPlaylists(playlists);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const ProgressBar: React.FC<{ current: number; total: number; occupancy: number }> = ({ 
    current, 
    total, 
    occupancy 
  }) => (
    <div className="w-full">
      <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${getOccupancyColor(occupancy)}`}
          style={{ width: `${Math.min(occupancy, 100)}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{current} songs</span>
        <span>{occupancy.toFixed(1)}%</span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-orange-800 mb-4">Playlist Utilization</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
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
          <h2 className="text-2xl font-bold text-orange-800">Playlist Utilization</h2>
          <p className="text-sm text-gray-500 mt-1">
            Live data from Spotify Web API • {playlists.length} playlists in network
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live Spotify Data</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            onClick={() => fetchPlaylistUtilization()}
            disabled={refreshing}
            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50"
          >
            <svg 
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
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
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No playlists found</h3>
          <p className="mt-1 text-sm text-gray-500">Add playlists in System Settings to get started.</p>
        </div>
      ) : (
        <div 
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: '600px' }} // Height for approximately 8 rows
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('playlistName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Playlist Name</span>
                    {getSortIcon('playlistName')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('genre')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Genre</span>
                    {getSortIcon('genre')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('accountEmail')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Account Email</span>
                    {getSortIcon('accountEmail')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('songCount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Song Count</span>
                    {getSortIcon('songCount')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Songs
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('occupancy')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Occupancy</span>
                    {getSortIcon('occupancy')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('nextAvailSlot')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Next Avail. Slot</span>
                    {getSortIcon('nextAvailSlot')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPlaylists.map((playlist) => (
                <tr key={playlist.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img
                        className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                        src={playlist.imageUrl || 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=♪'}
                        alt={`${playlist.playlistName} cover`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.log('🖼️ IMAGE ERROR: Failed to load:', playlist.imageUrl);
                          target.src = 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=♪';
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {playlist.playlistName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {playlist.genre}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {playlist.accountEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{playlist.songCount}</span>
                      {refreshing && (
                        <svg className="w-3 h-3 animate-spin text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {playlist.maxSongs}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32">
                      <ProgressBar
                        current={playlist.songCount}
                        total={playlist.maxSongs}
                        occupancy={playlist.occupancy}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {playlist.nextAvailSlot === 'Open' ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Open
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {playlist.nextAvailSlot}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openSpotifyPlaylist(playlist.playlistLink)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      <span>View Playlist</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Network Capacity</div>
          <div className="text-2xl font-bold text-gray-900">
            {playlists.reduce((sum, p) => sum + p.maxSongs, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Songs Currently Placed</div>
          <div className="text-2xl font-bold text-gray-900">
            {playlists.reduce((sum, p) => sum + p.songCount, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Available Slots</div>
          <div className="text-2xl font-bold text-gray-900">
            {playlists.reduce((sum, p) => sum + (p.maxSongs - p.songCount), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Average Occupancy</div>
          <div className="text-2xl font-bold text-gray-900">
            {playlists.length > 0 
              ? (playlists.reduce((sum, p) => sum + p.occupancy, 0) / playlists.length).toFixed(1)
              : '0'
            }%
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistUtilization;
