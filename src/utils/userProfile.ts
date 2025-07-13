interface UserProfileData {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
  }
}

interface ArtistProfile {
  artist_image_url?: string
  artist_name?: string
  spotify_artist_id?: string
  [key: string]: any
}

export class UserProfileService {
  private static instance: UserProfileService
  private artistProfileCache: Map<string, ArtistProfile | null> = new Map()
  private cacheTimestamp: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  private constructor() {}

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService()
    }
    return UserProfileService.instance
  }

  /**
   * Get user initials from full name
   */
  public getUserInitials(user: UserProfileData): string {
    if (user.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0].toUpperCase()
    }
    return user.email.substring(0, 2).toUpperCase()
  }

  /**
   * Get user profile image URL from artist profile
   */
  public getUserProfileImage(artistProfile: ArtistProfile | null): string | null {
    if (artistProfile?.artist_image_url) {
      return artistProfile.artist_image_url
    }
    return null
  }

  /**
   * Fetch artist profile with caching
   */
  public async fetchArtistProfile(userId: string): Promise<ArtistProfile | null> {
    // Check cache first
    const cached = this.artistProfileCache.get(userId)
    const cacheTime = this.cacheTimestamp.get(userId)
    
    if (cached && cacheTime && Date.now() - cacheTime < this.CACHE_DURATION) {
      return cached
    }

    try {
      const response = await fetch('/api/user-artist-profile')
      if (response.ok) {
        const profile = await response.json()
        this.artistProfileCache.set(userId, profile)
        this.cacheTimestamp.set(userId, Date.now())
        return profile
      }
    } catch (error) {
      console.error('Failed to fetch artist profile:', error)
    }

    // Cache null result to avoid repeated failed requests
    this.artistProfileCache.set(userId, null)
    this.cacheTimestamp.set(userId, Date.now())
    return null
  }

  /**
   * Clear cache for specific user
   */
  public clearUserCache(userId: string): void {
    this.artistProfileCache.delete(userId)
    this.cacheTimestamp.delete(userId)
  }

  /**
   * Clear all cached data
   */
  public clearAllCache(): void {
    this.artistProfileCache.clear()
    this.cacheTimestamp.clear()
  }
}

// Export singleton instance
export const userProfileService = UserProfileService.getInstance()

// Export types for use in components
export type { UserProfileData, ArtistProfile } 