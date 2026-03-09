// Apify integration for artist statistics using beatanalytics/spotify-play-count-scraper
// Provides: followers, monthly listeners, world rank, top cities, top tracks with stream counts,
// biography, social links, verified status, cover art

const ACTOR_ID = 'beatanalytics~spotify-play-count-scraper';
const APIFY_BASE_URL = 'https://api.apify.com/v2';
const REQUEST_TIMEOUT = 60000; // 60 seconds (Apify runs take 7-10s typically)

export interface ApifyArtistStats {
  id: string;
  name: string;
  verified: boolean;
  followers: number;
  monthlyListeners: number;
  worldRank: number;
  topCities: Array<{
    country: string;
    city: string;
    numberOfListeners: number;
  }>;
  topTracks: Array<{
    id: string;
    name: string;
    streamCount: number;
    duration: number;
  }>;
  albums: Array<{
    id: string;
    name: string;
    type: string;
    releaseDate: string;
  }>;
  singles: Array<{
    id: string;
    name: string;
    type: string;
    releaseDate: string;
  }>;
  biography: string;
  externalLinks: Array<{
    label: string;
    url: string;
  }>;
  coverArt: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

export interface ApifyTrackStats {
  id: string;
  name: string;
  streamCount: number;
  duration: number;
  artists: Array<{
    id: string;
    name: string;
  }>;
}

function getApiKey(): string {
  const key = process.env.APIFY_API_KEY;
  if (!key) {
    throw new Error('APIFY_API_KEY environment variable is not set');
  }
  return key;
}

function extractArtistUrlFromId(artistId: string): string {
  return `https://open.spotify.com/artist/${artistId}`;
}

function extractArtistIdFromUrl(url: string): string | null {
  const match = url.match(/(?:artist\/|spotify:artist:)([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch artist statistics from Apify beatanalytics/spotify-play-count-scraper
 * Accepts either a Spotify artist URL or artist ID
 */
export async function getArtistStats(artistUrlOrId: string): Promise<ApifyArtistStats | null> {
  try {
    const apiKey = getApiKey();
    
    let artistUrl: string;
    if (artistUrlOrId.startsWith('http')) {
      artistUrl = artistUrlOrId;
    } else {
      artistUrl = extractArtistUrlFromId(artistUrlOrId);
    }

    console.log('🔮 APIFY-ARTIST: Fetching stats for:', artistUrl);

    const input = {
      urls: [{ url: artistUrl }],
      followAlbums: false,
      followSingles: false,
      followPopularReleases: false,
      scrapePreviewUrls: false,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Apify artist stats request timed out'), REQUEST_TIMEOUT);

    try {
      const response = await fetch(
        `${APIFY_BASE_URL}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('🔮 APIFY-ARTIST: API error:', response.status, errorText);
        return null;
      }

      const items = await response.json();

      if (!items || !Array.isArray(items) || items.length === 0) {
        console.error('🔮 APIFY-ARTIST: No data returned');
        return null;
      }

      const data = items[0];

      const result: ApifyArtistStats = {
        id: data.id || '',
        name: data.name || '',
        verified: data.verified || false,
        followers: data.followers || 0,
        monthlyListeners: data.monthlyListeners || 0,
        worldRank: data.worldRank || 0,
        topCities: (data.topCities || []).map((city: any) => ({
          country: city.country || '',
          city: city.city || '',
          numberOfListeners: city.numberOfListeners || 0,
        })),
        topTracks: (data.topTracks || []).map((track: any) => ({
          id: track.id || '',
          name: track.name || '',
          streamCount: track.streamCount || 0,
          duration: track.duration || 0,
        })),
        albums: (data.albums || []).map((album: any) => ({
          id: album.id || '',
          name: album.name || '',
          type: album.type || 'album',
          releaseDate: album.releaseDate || '',
        })),
        singles: (data.singles || []).map((single: any) => ({
          id: single.id || '',
          name: single.name || '',
          type: single.type || 'single',
          releaseDate: single.releaseDate || '',
        })),
        biography: data.biography || '',
        externalLinks: (data.externalLinks || []).map((link: any) => ({
          label: link.label || '',
          url: link.url || '',
        })),
        coverArt: (data.coverArt || []).map((img: any) => ({
          url: img.url || '',
          height: img.height || 0,
          width: img.width || 0,
        })),
      };

      console.log(`🔮 APIFY-ARTIST: Got stats for "${result.name}" — ${result.monthlyListeners.toLocaleString()} monthly listeners, rank #${result.worldRank}`);
      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('🔮 APIFY-ARTIST: Request timed out after', REQUEST_TIMEOUT, 'ms');
        return null;
      }
      throw error;
    }

  } catch (error) {
    console.error('🔮 APIFY-ARTIST: Error fetching artist stats:', error);
    return null;
  }
}

/**
 * Fetch track statistics (stream count) from Apify
 */
export async function getTrackStats(trackUrl: string): Promise<ApifyTrackStats | null> {
  try {
    const apiKey = getApiKey();

    console.log('🔮 APIFY-TRACK: Fetching stats for:', trackUrl);

    const input = {
      urls: [{ url: trackUrl }],
      followAlbums: false,
      followSingles: false,
      followPopularReleases: false,
      scrapePreviewUrls: false,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Apify track stats request timed out'), REQUEST_TIMEOUT);

    try {
      const response = await fetch(
        `${APIFY_BASE_URL}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('🔮 APIFY-TRACK: API error:', response.status);
        return null;
      }

      const items = await response.json();

      if (!items || !Array.isArray(items) || items.length === 0) {
        console.error('🔮 APIFY-TRACK: No data returned');
        return null;
      }

      const data = items[0];

      return {
        id: data.id || '',
        name: data.name || '',
        streamCount: data.streamCount || 0,
        duration: data.duration || 0,
        artists: (data.artists || []).map((a: any) => ({
          id: a.id || '',
          name: a.name || '',
        })),
      };

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('🔮 APIFY-TRACK: Request timed out');
        return null;
      }
      throw error;
    }

  } catch (error) {
    console.error('🔮 APIFY-TRACK: Error fetching track stats:', error);
    return null;
  }
}
