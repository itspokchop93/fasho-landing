import { createContext, useContext } from 'react'

export interface SiteSettings {
  site_title: string
  site_description: string
}

export const defaultSiteSettings: SiteSettings = {
  site_title: 'FASHO.co – Promotion for Artists, Labels & Podcasters',
  site_description: 'Amplify your reach with FASHO.co. We connect artists, podcasters & labels to top playlists, grow real audiences, and help create your career.'
}

export const SiteSettingsContext = createContext<SiteSettings>(defaultSiteSettings)

export const useSiteSettings = () => {
  return useContext(SiteSettingsContext)
}

export const fetchSiteSettings = async (): Promise<SiteSettings> => {
  try {
    const response = await fetch('/api/site-settings')
    if (!response.ok) {
      throw new Error('Failed to fetch site settings')
    }
    const data = await response.json()
    return data.settings || defaultSiteSettings
  } catch (error) {
    console.error('Error fetching site settings:', error)
    return defaultSiteSettings
  }
} 