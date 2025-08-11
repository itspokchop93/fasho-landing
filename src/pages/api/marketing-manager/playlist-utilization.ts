import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

import { getSpotifyPlaylistData } from '../../../utils/spotify-api';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if this is a refresh request (bypass cache)
    const forceRefresh = req.query.refresh === 'true';
    const supabase = createAdminClient();

    // Fetch all active playlists
    const { data: playlistsData, error: playlistsError } = await supabase
      .from('playlist_network')
      .select(`
        id,
        playlist_name,
        genre,
        account_email,
        playlist_link,
        spotify_playlist_id,
        max_songs,
        cached_song_count,
        cached_image_url,
        last_scraped_at,
        is_active,
        created_at
      `)
      .eq('is_active', true)
      .order('playlist_name', { ascending: true });

    if (playlistsError) {
      console.error('Error fetching playlists:', playlistsError);
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    // Get active campaigns that might affect next available slot calculation
    const { data: activeCampaignsData, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        playlist_assignments,
        removal_date,
        campaign_status
      `)
      .in('campaign_status', ['Running', 'Removal Needed'])
      .not('removal_date', 'is', null);

    if (campaignsError) {
      console.error('Error fetching active campaigns:', campaignsError);
      // Continue without campaign data - just won't have next available slot info
    }

    // Get playlist utilization data (use database cache unless refresh is requested)
    const playlistUtilization = await Promise.all(
      (playlistsData || []).map(async (playlist) => {
        let songCount = playlist.cached_song_count || 0;
        
        // Only call Spotify API if refresh is explicitly requested
        if (forceRefresh) {
          try {
            console.log(`🔄 REFRESH: Fetching fresh data for ${playlist.playlist_name}`);
            const playlistData = await getSpotifyPlaylistData(playlist.playlist_link);
            if (playlistData) {
              songCount = playlistData.trackCount;
              
              // Update database with fresh data
              await supabase
                .from('playlist_network')
                .update({
                  cached_song_count: songCount,
                  cached_image_url: playlistData.imageUrl,
                  last_scraped_at: new Date().toISOString()
                })
                .eq('id', playlist.id);
              
              console.log(`✅ UPDATED: ${playlist.playlist_name} - Songs: ${songCount}`);
            }
          } catch (error) {
            console.error(`Error fetching fresh data for playlist ${playlist.playlist_name}:`, error);
            // Keep existing cached values on error
          }
        } else {
          console.log(`📋 CACHE: Using cached data for ${playlist.playlist_name} - Songs: ${songCount}`);
        }

        // Calculate occupancy percentage
        const occupancy = playlist.max_songs > 0 ? (songCount / playlist.max_songs) * 100 : 0;

        // Determine next available slot
        let nextAvailSlot: string = 'Open';
        
        if (occupancy >= 100) {
          // Playlist is full - find the earliest removal date for campaigns using this playlist
          const campaignsUsingThisPlaylist = activeCampaignsData?.filter(campaign => {
            const assignments = Array.isArray(campaign.playlist_assignments) 
              ? campaign.playlist_assignments 
              : [];
            return assignments.some((assignment: any) => assignment.id === playlist.id);
          }) || [];

          if (campaignsUsingThisPlaylist.length > 0) {
            const earliestRemovalDate = campaignsUsingThisPlaylist
              .filter(campaign => campaign.removal_date)
              .map(campaign => new Date(campaign.removal_date))
              .sort((a, b) => a.getTime() - b.getTime())[0];

            if (earliestRemovalDate) {
              nextAvailSlot = earliestRemovalDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
            }
          }
        }

        return {
          id: playlist.id,
          playlistName: playlist.playlist_name,
          genre: playlist.genre,
          accountEmail: playlist.account_email,
          songCount,
          maxSongs: playlist.max_songs,
          occupancy: Math.min(occupancy, 100), // Cap at 100%
          nextAvailSlot,
          playlistLink: playlist.playlist_link,
          spotifyPlaylistId: playlist.spotify_playlist_id,
          imageUrl: playlist.cached_image_url || ''
        };
      })
    );

    res.status(200).json(playlistUtilization);
  } catch (error) {
    console.error('Error in playlist-utilization API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
