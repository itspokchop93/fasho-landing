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
   * Fetch artist profile directly from the API
   */
  public async fetchArtistProfile(userId: string): Promise<ArtistProfile | null> {
    try {
      const response = await fetch('/api/user-artist-profile')
      if (response.ok) {
        const data = await response.json()
        const profile = data.profile || null
        return profile
      }
    } catch (error) {
      console.error('Failed to fetch artist profile:', error)
    }
    return null
  }
}

// Export singleton instance
export const userProfileService = UserProfileService.getInstance()

// Export types for use in components
export type { UserProfileData, ArtistProfile } 