// Spotify API utility functions
// For production, you'll need to set up Spotify Web API credentials

interface SpotifyPlaylistResponse {
  tracks: {
    total: number;
  };
  name: string;
  description: string;
  public?: boolean;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  followers: {
    total: number;
  };
  owner: {
    display_name: string;
    external_urls: {
      spotify: string;
    };
  };
  external_urls: {
    spotify: string;
  };
}

// Extract playlist ID from various Spotify URL formats
export function extractSpotifyPlaylistId(url: string): string | null {
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

  return null;
}

// Get playlist track count from Spotify Web API
export async function getSpotifyPlaylistTrackCount(playlistId: string): Promise<number> {
  try {
    // For now, we'll use the public Spotify oEmbed API which doesn't require authentication
    // This is a workaround until proper Spotify Web API credentials are set up
    
    // Try to fetch playlist data from Spotify's public API
    const response = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${playlistId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      // The oEmbed API doesn't give us track count, so we'll need to use the Web API
      // For now, let's use a direct approach with the Web API (requires no auth for public playlists)
      
      const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=tracks.total`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (playlistResponse.ok) {
        const playlistData: SpotifyPlaylistResponse = await playlistResponse.json();
        return playlistData.tracks.total;
      }
    }

    // If API calls fail, try to scrape the playlist page (fallback method)
    const pageResponse = await fetch(`https://open.spotify.com/playlist/${playlistId}`);
    if (pageResponse.ok) {
      const html = await pageResponse.text();
      
      // Look for track count in the HTML (this is fragile but works as fallback)
      const trackCountMatch = html.match(/"tracks":{"total":(\d+)/);
      if (trackCountMatch) {
        return parseInt(trackCountMatch[1], 10);
      }
    }

    // Final fallback - return 0 if we can't get the count
    console.warn(`Could not fetch track count for playlist ${playlistId}`);
    return 0;

  } catch (error) {
    console.error(`Error fetching Spotify playlist ${playlistId}:`, error);
    return 0;
  }
}

// Alternative method using Spotify Web API with client credentials (requires setup)
export async function getSpotifyPlaylistTrackCountWithAuth(playlistId: string, accessToken: string): Promise<number> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=tracks.total`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      }
    });

    if (response.ok) {
      const data: SpotifyPlaylistResponse = await response.json();
      return data.tracks.total;
    } else {
      console.error(`Spotify API error: ${response.status} ${response.statusText}`);
      return 0;
    }
  } catch (error) {
    console.error(`Error fetching Spotify playlist with auth ${playlistId}:`, error);
    return 0;
  }
}

// Interface for complete playlist data (matching the Marketing Manager's needs)
export interface SpotifyPlaylistData {
  name: string;
  description: string;
  trackCount: number;
  imageUrl: string;
  followers: number;
  owner: {
    name: string;
    url: string;
  };
  url: string;
  healthStatus?: PlaylistHealthStatus;
}

// Interface for playlist health status
export interface PlaylistHealthStatus {
  status: 'active' | 'private' | 'removed' | 'error' | 'unknown';
  isPublic?: boolean;
  errorMessage?: string;
  lastChecked: string;
}

// Get Spotify access token using client credentials flow
export async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get complete playlist data using Spotify Web API (replacement for Apify)
export async function getSpotifyPlaylistData(playlistUrl: string): Promise<SpotifyPlaylistData | null> {
  try {
    console.log('🎵 SPOTIFY API: Fetching playlist data for:', playlistUrl);

    // Extract playlist ID from URL
    const playlistId = extractSpotifyPlaylistId(playlistUrl);
    if (!playlistId) {
      console.error('Invalid Spotify playlist URL:', playlistUrl);
      return null;
    }

    // Get access token
    const accessToken = await getSpotifyAccessToken();

    // Fetch playlist data from Spotify API
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,tracks.total,images,followers.total,owner.display_name,owner.external_urls.spotify,external_urls.spotify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error(`Spotify API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Error details:', errorBody);
      return null;
    }

    const data: SpotifyPlaylistResponse = await response.json();
    console.log('🎵 SPOTIFY API: Received response:', data);

    // Transform to the expected format
    const playlistData: SpotifyPlaylistData = {
      name: data.name || '',
      description: data.description || '',
      trackCount: data.tracks.total || 0,
      imageUrl: data.images && data.images.length > 0 ? data.images[0].url : '',
      followers: data.followers.total || 0,
      owner: {
        name: data.owner.display_name || '',
        url: data.owner.external_urls.spotify || ''
      },
      url: playlistUrl
    };

    console.log('✅ SPOTIFY API: Successfully fetched playlist data:', playlistData);
    return playlistData;

  } catch (error) {
    console.error('Error fetching Spotify playlist data:', error);
    return null;
  }
}

// Check playlist health status using Spotify Web API
export async function checkPlaylistHealth(playlistUrl: string): Promise<PlaylistHealthStatus> {
  const timestamp = new Date().toISOString();
  
  try {
    console.log('🏥 HEALTH CHECK: Checking playlist health for:', playlistUrl);

    // Extract playlist ID from URL
    const playlistId = extractSpotifyPlaylistId(playlistUrl);
    if (!playlistId) {
      console.error('Invalid Spotify playlist URL:', playlistUrl);
      return {
        status: 'error',
        errorMessage: 'Invalid Spotify playlist URL',
        lastChecked: timestamp
      };
    }

    // Get access token
    const accessToken = await getSpotifyAccessToken();

    // Fetch playlist data from Spotify API with specific fields for health checking
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,public,owner.display_name,tracks.total`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      }
    });

    console.log(`🏥 HEALTH CHECK: API Response status: ${response.status}`);

    if (response.status === 404) {
      // Playlist not found - removed or deleted
      return {
        status: 'removed',
        errorMessage: 'Playlist not found - may have been deleted or removed',
        lastChecked: timestamp
      };
    }

    if (response.status === 403) {
      // Forbidden - likely private playlist with no access
      return {
        status: 'private',
        errorMessage: 'Playlist is private or access is forbidden',
        lastChecked: timestamp
      };
    }

    if (!response.ok) {
      // Other API errors
      const errorBody = await response.text();
      console.error(`🏥 HEALTH CHECK: Spotify API error: ${response.status} ${response.statusText}`, errorBody);
      return {
        status: 'error',
        errorMessage: `Spotify API error: ${response.status} ${response.statusText}`,
        lastChecked: timestamp
      };
    }

    const data: SpotifyPlaylistResponse = await response.json();
    console.log('🏥 HEALTH CHECK: Received response:', data);

    // Check if the playlist has essential data
    if (!data.name) {
      return {
        status: 'error',
        errorMessage: 'Playlist data is incomplete or corrupted',
        lastChecked: timestamp
      };
    }

    // Check public status
    const isPublic = data.public;
    if (isPublic === false) {
      return {
        status: 'private',
        isPublic: false,
        errorMessage: 'Playlist is set to private',
        lastChecked: timestamp
      };
    }

    // If we reach here, the playlist is accessible and appears healthy
    console.log('✅ HEALTH CHECK: Playlist is healthy and accessible');
    return {
      status: 'active',
      isPublic: isPublic,
      lastChecked: timestamp
    };

  } catch (error) {
    console.error('🏥 HEALTH CHECK: Error checking playlist health:', error);
    return {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      lastChecked: timestamp
    };
  }
}

// Enhanced playlist data function that includes health status
export async function getSpotifyPlaylistDataWithHealth(playlistUrl: string): Promise<SpotifyPlaylistData | null> {
  try {
    console.log('🎵 SPOTIFY API: Fetching playlist data with health check for:', playlistUrl);

    // First check the health of the playlist
    const healthStatus = await checkPlaylistHealth(playlistUrl);
    
    // If the playlist is not accessible, return basic data with health status
    if (healthStatus.status === 'removed' || healthStatus.status === 'error') {
      return {
        name: 'Unknown',
        description: '',
        trackCount: 0,
        imageUrl: '',
        followers: 0,
        owner: {
          name: 'Unknown',
          url: ''
        },
        url: playlistUrl,
        healthStatus
      };
    }

    // Try to get full playlist data
    const playlistData = await getSpotifyPlaylistData(playlistUrl);
    
    if (playlistData) {
      // Add health status to the existing data
      playlistData.healthStatus = healthStatus;
      return playlistData;
    } else {
      // If we can't get full data but health check passed, return minimal data
      return {
        name: 'Unknown',
        description: '',
        trackCount: 0,
        imageUrl: '',
        followers: 0,
        owner: {
          name: 'Unknown',
          url: ''
        },
        url: playlistUrl,
        healthStatus
      };
    }

  } catch (error) {
    console.error('Error fetching Spotify playlist data with health:', error);
    return null;
  }
}
