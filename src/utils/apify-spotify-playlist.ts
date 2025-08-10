// Apify integration for Marketing Manager Playlist Network section ONLY
// This utility is specifically for the Marketing Manager and should NOT replace
// any existing Spotify API functionality elsewhere on the site

import { ApifyClient } from 'apify-client';
import { playlistCache } from './playlist-cache';

// Initialize the ApifyClient with your API token from environment variables
const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN || '',
});

// Actor ID for the Spotify Playlists scraper
const SPOTIFY_PLAYLISTS_ACTOR_ID = 'augeas~spotify-playlists';

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
  tracks?: Array<{
    name: string;
    artists: string[];
    duration: number;
    url: string;
  }>;
}

/**
 * Extract Spotify playlist ID from various URL formats
 */
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

/**
 * Scrape Spotify playlist data using Apify actor
 * This is ONLY for the Marketing Manager Playlist Network section
 */
export async function scrapeSpotifyPlaylistData(playlistUrl: string, useCache: boolean = true): Promise<SpotifyPlaylistData | null> {
  try {
    console.log('🎵 APIFY: Scraping playlist data for:', playlistUrl);

    // Check cache first if useCache is true
    if (useCache) {
      const cachedData = playlistCache.get(playlistUrl);
      if (cachedData) {
        return {
          name: cachedData.name,
          description: cachedData.description,
          trackCount: cachedData.trackCount,
          imageUrl: cachedData.imageUrl,
          followers: cachedData.followers,
          owner: cachedData.owner,
          url: playlistUrl
        };
      }
    }

    // Validate URL format
    const playlistId = extractSpotifyPlaylistId(playlistUrl);
    if (!playlistId) {
      console.error('Invalid Spotify playlist URL:', playlistUrl);
      return null;
    }

    // Prepare Actor input
    const input = {
      startUrls: [
        {
          url: playlistUrl
        }
      ],
      maxTracks: 1000,
      maxItems: 1,
      expand: true
    };

    console.log('🎵 APIFY: Running actor with input:', input);

    // Run the Actor synchronously and get dataset items
    const response = await fetch(`https://api.apify.com/v2/acts/${SPOTIFY_PLAYLISTS_ACTOR_ID}/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      console.error('Apify API error:', response.status, response.statusText);
      return null;
    }

    const items = await response.json();
    console.log('🎵 APIFY: Received response:', items);

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('No data returned from Apify actor');
      return null;
    }

    const playlistData = items[0];

    // Transform the data to our interface
    // Handle different image formats from Apify
    let imageUrl = '';
    
    if (playlistData.images && Array.isArray(playlistData.images)) {
      // Handle array format: ['url1', 'url2', ...]
      imageUrl = playlistData.images[0] || '';
    } else if (playlistData.images && typeof playlistData.images === 'object' && playlistData.images[0]) {
      // Handle object format: [{url: 'url1'}, {url: 'url2'}, ...]
      imageUrl = playlistData.images[0].url || playlistData.images[0] || '';
    } else if (playlistData.image?.url) {
      // Handle single image object format
      imageUrl = playlistData.image.url;
    } else if (playlistData.imageUrl) {
      // Handle direct imageUrl property
      imageUrl = playlistData.imageUrl;
    } else if (playlistData.cover_art?.url) {
      // Handle cover_art format
      imageUrl = playlistData.cover_art.url;
    } else if (playlistData.coverArt?.url) {
      // Handle coverArt format
      imageUrl = playlistData.coverArt.url;
    }

    const transformedData: SpotifyPlaylistData = {
      name: playlistData.name || 'Unknown Playlist',
      description: playlistData.description || '',
      trackCount: playlistData.tracks?.length || playlistData.trackCount || 0,
      imageUrl: imageUrl,
      followers: playlistData.followers?.total || playlistData.followers || 0,
      owner: {
        name: playlistData.owner?.name || playlistData.owner?.display_name || 'Unknown',
        url: playlistData.owner?.url || playlistData.owner?.external_urls?.spotify || ''
      },
      url: playlistUrl,
      tracks: playlistData.tracks ? playlistData.tracks.map((track: any) => ({
        name: track.name || track.track?.name || 'Unknown Track',
        artists: track.artists?.map((artist: any) => artist.name) || 
                track.track?.artists?.map((artist: any) => artist.name) || 
                ['Unknown Artist'],
        duration: track.duration_ms || track.track?.duration_ms || 0,
        url: track.external_urls?.spotify || track.track?.external_urls?.spotify || ''
      })) : undefined
    };

    console.log('🎵 APIFY: Image URL extracted:', transformedData.imageUrl);
    console.log('🎵 APIFY: Raw images data:', playlistData.images);

    // Cache the data for future use
    playlistCache.set(playlistUrl, {
      trackCount: transformedData.trackCount,
      imageUrl: transformedData.imageUrl,
      name: transformedData.name,
      description: transformedData.description,
      followers: transformedData.followers,
      owner: transformedData.owner
    });

    console.log('🎵 APIFY: Transformed data:', transformedData);
    return transformedData;

  } catch (error) {
    console.error('Error scraping Spotify playlist data:', error);
    return null;
  }
}

/**
 * Get playlist track count using Apify (for Marketing Manager only)
 */
export async function getPlaylistTrackCountViaApify(playlistUrl: string): Promise<number> {
  try {
    const playlistData = await scrapeSpotifyPlaylistData(playlistUrl);
    return playlistData?.trackCount || 0;
  } catch (error) {
    console.error('Error getting track count via Apify:', error);
    return 0;
  }
}

/**
 * Get playlist image URL using Apify (for Marketing Manager only)
 */
export async function getPlaylistImageViaApify(playlistUrl: string): Promise<string> {
  try {
    const playlistData = await scrapeSpotifyPlaylistData(playlistUrl);
    return playlistData?.imageUrl || '';
  } catch (error) {
    console.error('Error getting playlist image via Apify:', error);
    return '';
  }
}
