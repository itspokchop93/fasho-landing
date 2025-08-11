import React, { useState, useEffect } from 'react';
import CampaignTotals from './CampaignTotals';
import { MUSIC_GENRES } from '../../constants/genres';

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
  createdAt: string;
}

interface NewPlaylistForm {
  playlistName: string;
  genre: string;
  accountEmail: string;
  playlistLink: string;
  maxSongs: number;
}

const SystemSettings: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState<NewPlaylistForm>({
    playlistName: '',
    genre: '',
    accountEmail: '',
    playlistLink: '',
    maxSongs: 25
  });

  useEffect(() => {
    fetchPlaylists();
  }, []);

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
        setPlaylists(data);
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
    
    if (!newPlaylist.playlistName || !newPlaylist.genre || !newPlaylist.accountEmail || !newPlaylist.playlistLink) {
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
          ...newPlaylist,
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

  const deletePlaylist = async (playlistId: string, playlistName: string) => {
    if (window.confirm(`Are you sure you want to delete "${playlistName}"? This action cannot be undone.`)) {
      try {
        console.log(`🗑️ FRONTEND: Attempting to delete playlist "${playlistName}" (ID: ${playlistId})`);
        
        const response = await fetch('/api/marketing-manager/system-settings/delete-playlist', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playlistId }),
        });

        const result = await response.json();
        console.log(`🗑️ FRONTEND: Delete response:`, result);

        if (response.ok) {
          alert(`✅ Successfully deleted "${playlistName}"`);
          fetchPlaylists();
        } else {
          alert(`❌ Failed to delete playlist: ${result.error || response.statusText}`);
          console.error('Failed to delete playlist:', result);
        }
      } catch (error) {
        console.error('Error deleting playlist:', error);
        alert('❌ Error occurred while deleting playlist');
      }
    }
  };

  const openSpotifyPlaylist = (playlistLink: string) => {
    window.open(playlistLink, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Playlist Network</h2>
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
      {/* Campaign Totals Section */}
      <CampaignTotals />
      
      {/* Playlist Network Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Playlist Network</h2>
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
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Playlist</span>
            </button>
          </div>
        </div>

        {/* Add Playlist Form */}
        {showAddForm && (
          <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">Add New Playlist</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Playlist Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlaylist.playlistName}
                    onChange={(e) => handleInputChange('playlistName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter playlist name"
                  />
                </div>
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
                  Accepts Spotify playlist URLs or spotify: URIs
                </p>
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
                  <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Playlist Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Genre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Song Count
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
                {playlists.map((playlist) => (
                  <tr key={playlist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex-shrink-0 h-12 w-12">
                        <img
                          className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                          src={playlist.imageUrl || 'https://via.placeholder.com/48x48/1DB954/FFFFFF?text=♪'}
                          alt={`${playlist.playlistName} cover`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.log('🖼️ IMAGE ERROR: Failed to load:', playlist.imageUrl);
                            target.src = 'https://via.placeholder.com/48x48/1DB954/FFFFFF?text=♪';
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
                      <div className="text-xs text-gray-500">
                        Max: {playlist.maxSongs} songs
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {playlist.songCount}
                        </span>
                        <div className="text-xs text-gray-500">
                          ({playlist.maxSongs > 0 ? ((playlist.songCount / playlist.maxSongs) * 100).toFixed(1) : 0}% full)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => togglePlaylistStatus(playlist.id, playlist.isActive)}
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                          playlist.isActive
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {playlist.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openSpotifyPlaylist(playlist.playlistLink)}
                          className="text-green-600 hover:text-green-900"
                          title="View on Spotify"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => deletePlaylist(playlist.id, playlist.playlistName)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
