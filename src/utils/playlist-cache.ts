// Playlist data caching system for Marketing Manager
// This helps reduce Apify API calls and improves performance

interface CachedPlaylistData {
  playlistUrl: string;
  data: {
    trackCount: number;
    imageUrl: string;
    name: string;
    description: string;
    followers: number;
    owner: {
      name: string;
      url: string;
    };
  };
  timestamp: number;
  expiresAt: number;
}

class PlaylistCache {
  private cache: Map<string, CachedPlaylistData> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  /**
   * Get cached data for a playlist
   */
  get(playlistUrl: string): CachedPlaylistData['data'] | null {
    const cached = this.cache.get(playlistUrl);
    
    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(playlistUrl);
      return null;
    }

    console.log('🎵 CACHE: Using cached data for:', playlistUrl);
    return cached.data;
  }

  /**
   * Set cached data for a playlist
   */
  set(playlistUrl: string, data: CachedPlaylistData['data']): void {
    const now = Date.now();
    const cachedData: CachedPlaylistData = {
      playlistUrl,
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    };

    this.cache.set(playlistUrl, cachedData);
    console.log('🎵 CACHE: Cached data for:', playlistUrl);
  }

  /**
   * Clear cache for a specific playlist
   */
  clear(playlistUrl: string): void {
    this.cache.delete(playlistUrl);
    console.log('🎵 CACHE: Cleared cache for:', playlistUrl);
  }

  /**
   * Clear all cached data
   */
  clearAll(): void {
    this.cache.clear();
    console.log('🎵 CACHE: Cleared all cached data');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [url, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(url);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🎵 CACHE: Cleaned ${cleaned} expired entries`);
    }
  }
}

// Export singleton instance
export const playlistCache = new PlaylistCache();

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    playlistCache.cleanup();
  }, 5 * 60 * 1000);
}
