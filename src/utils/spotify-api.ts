// Spotify API utility functions with robust retry logic and caching
// Production-ready implementation that handles failures gracefully

interface SpotifyPlaylistResponse {
  items?: {
    total: number;
  };
  tracks?: {
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

// ============================================================================
// TOKEN CACHING - Prevents unnecessary token fetches
// ============================================================================
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

// ============================================================================
// CONFIGURATION
// ============================================================================
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 15000; // 15 seconds

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`🔄 SPOTIFY-API: ${operationName} attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`🔄 SPOTIFY-API: Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

// ============================================================================
// PLAYLIST ID EXTRACTION
// ============================================================================

/**
 * Extract playlist ID from various Spotify URL formats
 */
export function extractSpotifyPlaylistId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

export interface PlaylistHealthStatus {
  status: 'active' | 'private' | 'removed' | 'error' | 'unknown';
  isPublic?: boolean;
  errorMessage?: string;
  lastChecked: string;
}

// ============================================================================
// ACCESS TOKEN MANAGEMENT
// ============================================================================

/**
 * Get Spotify access token using client credentials flow
 * Tokens are cached and reused until they expire
 */
export async function getSpotifyAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 300000) {
    return cachedAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('🎵 SPOTIFY-API: Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
    throw new Error('Missing Spotify credentials. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.');
  }

  console.log('🎵 SPOTIFY-API: Fetching new access token...');

  const response = await fetchWithTimeout('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  }, 10000);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('🎵 SPOTIFY-API: Token fetch failed:', response.status, errorText);
    // Clear cache on auth failure
    cachedAccessToken = null;
    tokenExpiresAt = 0;
    throw new Error(`Failed to get Spotify access token: ${response.status}`);
  }

  const data = await response.json();
  const token: string = data.access_token;
  cachedAccessToken = token;
  // Token typically expires in 3600 seconds (1 hour)
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);
  
  console.log('✅ SPOTIFY-API: Access token obtained successfully');
  return token;
}

/**
 * Clear the cached token (useful when token is rejected)
 */
function clearTokenCache(): void {
  cachedAccessToken = null;
  tokenExpiresAt = 0;
}

// ============================================================================
// CENTRALIZED SPOTIFY HELPERS (track, artist, search)
// ============================================================================

export interface SpotifyTrackData {
  id: string;
  title: string;
  artist: string;
  artists: Array<{ id: string; name: string; url: string }>;
  album: string;
  imageUrl: string;
  url: string;
  artistProfileUrl: string;
  duration: number;
  isPlayable?: boolean;
  previewUrl: string | null;
  releaseDate?: string;
}

export interface SpotifyArtistData {
  id: string;
  name: string;
  imageUrl: string | null;
  followersCount: number;
  genres: string[];
  spotifyUrl: string;
}

/**
 * Fetch a single track by Spotify track ID
 */
export async function getTrackById(trackId: string): Promise<SpotifyTrackData | null> {
  try {
    const accessToken = await getSpotifyAccessToken();
    const response = await fetchWithTimeout(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      if (response.status === 401) { clearTokenCache(); }
      console.error(`🎵 SPOTIFY-API: getTrackById failed: ${response.status}`);
      return null;
    }

    const track = await response.json();
    const primaryArtist = track.artists?.[0];

    return {
      id: track.id,
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || '',
      artists: track.artists?.map((a: any) => ({
        id: a.id,
        name: a.name,
        url: a.external_urls?.spotify || ''
      })) || [],
      album: track.album?.name || '',
      imageUrl: track.album?.images?.[0]?.url || '',
      url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
      artistProfileUrl: primaryArtist?.external_urls?.spotify || '',
      duration: track.duration_ms || 0,
      isPlayable: track.is_playable,
      previewUrl: track.preview_url || null,
      releaseDate: track.album?.release_date,
    };
  } catch (error) {
    console.error('🎵 SPOTIFY-API: getTrackById error:', error);
    return null;
  }
}

/**
 * Fetch multiple tracks by their Spotify IDs (batch, max 50 per call)
 * Returns a map of trackId -> album image URL
 */
export async function getTrackImagesByIds(trackIds: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!trackIds.length) return result;

  try {
    const accessToken = await getSpotifyAccessToken();
    const chunks: string[][] = [];
    for (let i = 0; i < trackIds.length; i += 50) {
      chunks.push(trackIds.slice(i, i + 50));
    }

    for (const chunk of chunks) {
      const response = await fetchWithTimeout(
        `https://api.spotify.com/v1/tracks?ids=${chunk.join(',')}`,
        { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
      );
      if (!response.ok) {
        if (response.status === 401) { clearTokenCache(); }
        console.error(`🎵 SPOTIFY-API: getTrackImagesByIds failed: ${response.status}`);
        continue;
      }
      const data = await response.json();
      for (const track of (data.tracks || [])) {
        if (track?.id && track?.album?.images?.[0]?.url) {
          result[track.id] = track.album.images[0].url;
        }
      }
    }
  } catch (error) {
    console.error('🎵 SPOTIFY-API: getTrackImagesByIds error:', error);
  }
  return result;
}

/**
 * Fetch a single artist by Spotify artist ID
 */
export async function getArtistById(artistId: string): Promise<SpotifyArtistData | null> {
  try {
    const accessToken = await getSpotifyAccessToken();
    const response = await fetchWithTimeout(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      if (response.status === 401) { clearTokenCache(); }
      console.error(`🎵 SPOTIFY-API: getArtistById failed: ${response.status}`);
      return null;
    }

    const artist = await response.json();
    return {
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url || null,
      followersCount: artist.followers?.total || 0,
      genres: artist.genres || [],
      spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
    };
  } catch (error) {
    console.error('🎵 SPOTIFY-API: getArtistById error:', error);
    return null;
  }
}

/**
 * Search Spotify for tracks
 */
export async function searchTracks(query: string, limit: number = 10): Promise<{ tracks: SpotifyTrackData[]; total: number }> {
  const accessToken = await getSpotifyAccessToken();
  const safeLimit = Math.min(limit, 10);
  const response = await fetchWithTimeout(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${safeLimit}`,
    { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
  );

  if (!response.ok) {
    if (response.status === 401) { clearTokenCache(); }
    throw new Error(`Spotify search failed: ${response.status}`);
  }

  const data = await response.json();
  const tracks: SpotifyTrackData[] = (data.tracks?.items || []).map((track: any) => {
    const primaryArtist = track.artists?.[0];
    return {
      id: track.id,
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || '',
      artists: track.artists?.map((a: any) => ({
        id: a.id,
        name: a.name,
        url: a.external_urls?.spotify || ''
      })) || [],
      album: track.album?.name || '',
      imageUrl: track.album?.images?.[0]?.url || '',
      url: track.external_urls?.spotify || '',
      artistProfileUrl: primaryArtist?.external_urls?.spotify || '',
      duration: track.duration_ms || 0,
      isPlayable: track.is_playable,
      previewUrl: track.preview_url || null,
      releaseDate: track.album?.release_date,
    };
  });

  return { tracks, total: data.tracks?.total || 0 };
}

/**
 * Search Spotify for artists
 */
export async function searchArtists(query: string, limit: number = 10): Promise<SpotifyArtistData[]> {
  const accessToken = await getSpotifyAccessToken();
  const safeLimit = Math.min(limit, 10);
  const response = await fetchWithTimeout(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&market=US&limit=${safeLimit}`,
    { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
  );

  if (!response.ok) {
    if (response.status === 401) { clearTokenCache(); }
    throw new Error(`Spotify artist search failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.artists?.items || []).map((artist: any) => ({
    id: artist.id,
    name: artist.name,
    imageUrl: artist.images?.[0]?.url || null,
    followersCount: artist.followers?.total || 0,
    genres: artist.genres || [],
    spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
  }));
}

/**
 * Fetch artist's albums from Spotify
 */
export async function getArtistAlbums(artistId: string, limit: number = 50): Promise<any[]> {
  try {
    const accessToken = await getSpotifyAccessToken();
    const response = await fetchWithTimeout(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=US&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('🎵 SPOTIFY-API: getArtistAlbums error:', error);
    return [];
  }
}

/**
 * Fetch album tracks from Spotify
 */
export async function getAlbumTracks(albumId: string): Promise<any[]> {
  try {
    const accessToken = await getSpotifyAccessToken();
    const response = await fetchWithTimeout(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?market=US`,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('🎵 SPOTIFY-API: getAlbumTracks error:', error);
    return [];
  }
}

// ============================================================================
// PLAYLIST DATA FETCHING WITH RETRY
// ============================================================================

/**
 * Fetch playlist data with retry logic
 */
async function fetchPlaylistDataWithRetry(playlistId: string, accessToken: string): Promise<SpotifyPlaylistResponse | null> {
  const fields = 'name,description,tracks.total,items.total,images,followers.total,owner.display_name,owner.external_urls.spotify,external_urls.spotify,public';
  const url = `https://api.spotify.com/v1/playlists/${playlistId}?fields=${encodeURIComponent(fields)}`;

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    }
  });

  if (response.status === 401) {
    // Token expired or invalid - clear cache and throw to trigger retry
    clearTokenCache();
    throw new Error('Access token expired or invalid');
  }

  if (response.status === 404) {
    console.warn(`🎵 SPOTIFY-API: Playlist not found: ${playlistId}`);
    return null;
  }

  if (response.status === 429) {
    // Rate limited - throw to trigger retry with backoff
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`Rate limited. Retry after ${retryAfter || 'unknown'} seconds`);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Spotify API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Get complete playlist data using Spotify Web API
 * Includes robust retry logic and error handling
 */
export async function getSpotifyPlaylistData(playlistUrl: string): Promise<SpotifyPlaylistData | null> {
  try {
    console.log('🎵 SPOTIFY-API: Fetching playlist data for:', playlistUrl);

    // Extract playlist ID from URL
    const playlistId = extractSpotifyPlaylistId(playlistUrl);
    if (!playlistId) {
      console.error('🎵 SPOTIFY-API: Invalid playlist URL:', playlistUrl);
      return null;
    }

    // Use retry wrapper for the entire operation
    const result = await withRetry(async () => {
      // Get access token (may use cache)
      const accessToken = await getSpotifyAccessToken();
      
      // Fetch playlist data
      const data = await fetchPlaylistDataWithRetry(playlistId, accessToken);
      
      if (!data) {
        return null;
      }

      // Transform to the expected format
      const trackCount = data.items?.total ?? data.tracks?.total ?? 0;
      console.log(`🎵 SPOTIFY-API: Track count parsing: items.total=${data.items?.total}, tracks.total=${data.tracks?.total}, resolved=${trackCount}`);

      const playlistData: SpotifyPlaylistData = {
        name: data.name || 'Unknown Playlist',
        description: data.description || '',
        trackCount,
        imageUrl: data.images && data.images.length > 0 ? data.images[0].url : '',
        followers: data.followers?.total || 0,
        owner: {
          name: data.owner?.display_name || 'Unknown',
          url: data.owner?.external_urls?.spotify || ''
        },
        url: playlistUrl
      };

      return playlistData;
    }, `Fetch playlist ${playlistId}`);

    if (result) {
      console.log('✅ SPOTIFY-API: Successfully fetched playlist:', result.name, 'Saves:', result.followers);
    }

    return result;

  } catch (error) {
    console.error('🎵 SPOTIFY-API: Failed to fetch playlist data after all retries:', error);
    return null;
  }
}

/**
 * Check playlist health status using Spotify Web API
 */
export async function checkPlaylistHealth(playlistUrl: string): Promise<PlaylistHealthStatus> {
  const timestamp = new Date().toISOString();
  
  try {
    console.log('🏥 HEALTH-CHECK: Checking playlist health for:', playlistUrl);

    const playlistId = extractSpotifyPlaylistId(playlistUrl);
    if (!playlistId) {
      return {
        status: 'error',
        errorMessage: 'Invalid Spotify playlist URL',
        lastChecked: timestamp
      };
    }

    const result = await withRetry(async () => {
      const accessToken = await getSpotifyAccessToken();
      
      const response = await fetchWithTimeout(
        `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,public,tracks.total,items.total`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          }
        }
      );

      if (response.status === 401) {
        clearTokenCache();
        throw new Error('Access token expired');
      }

      if (response.status === 404) {
        return { status: 'removed' as const, errorMessage: 'Playlist not found', lastChecked: timestamp };
      }

      if (response.status === 403) {
        return { status: 'private' as const, errorMessage: 'Playlist is private', lastChecked: timestamp };
      }

      if (response.status === 429) {
        throw new Error('Rate limited');
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const isPublic = data.public;

      if (isPublic === false) {
        return { status: 'private' as const, isPublic: false, errorMessage: 'Playlist is set to private', lastChecked: timestamp };
      }

      return { status: 'active' as const, isPublic: true, lastChecked: timestamp };
    }, `Health check ${playlistId}`);

    console.log('✅ HEALTH-CHECK: Result for', playlistUrl, ':', result.status);
    return result;

  } catch (error) {
    console.error('🏥 HEALTH-CHECK: Failed after retries:', error);
    return {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: timestamp
    };
  }
}

/**
 * Get playlist data with health status included
 */
export async function getSpotifyPlaylistDataWithHealth(playlistUrl: string): Promise<SpotifyPlaylistData | null> {
  try {
    console.log('🎵 SPOTIFY-API: Fetching playlist data with health check for:', playlistUrl);

    // Get playlist data first (this already has retry logic)
    const playlistData = await getSpotifyPlaylistData(playlistUrl);
    
    // Get health status
    const healthStatus = await checkPlaylistHealth(playlistUrl);
    
    if (playlistData) {
      playlistData.healthStatus = healthStatus;
      return playlistData;
    }

    // If no data but health check ran, return minimal data with health status
    if (healthStatus.status === 'removed' || healthStatus.status === 'error' || healthStatus.status === 'private') {
      return {
        name: 'Unknown',
        description: '',
        trackCount: 0,
        imageUrl: '',
        followers: 0,
        owner: { name: 'Unknown', url: '' },
        url: playlistUrl,
        healthStatus
      };
    }

    return null;

  } catch (error) {
    console.error('🎵 SPOTIFY-API: Error in getSpotifyPlaylistDataWithHealth:', error);
    return null;
  }
}

// ============================================================================
// LEGACY FUNCTIONS (kept for compatibility)
// ============================================================================

export async function getSpotifyPlaylistTrackCount(playlistId: string): Promise<number> {
  try {
    const accessToken = await getSpotifyAccessToken();
    const response = await fetchWithTimeout(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=tracks.total,items.total`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.items?.total ?? data.tracks?.total ?? 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching track count:', error);
    return 0;
  }
}

export async function getSpotifyPlaylistTrackCountWithAuth(playlistId: string, accessToken: string): Promise<number> {
  try {
    const response = await fetchWithTimeout(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=tracks.total,items.total`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.items?.total ?? data.tracks?.total ?? 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching track count with auth:', error);
    return 0;
  }
}
