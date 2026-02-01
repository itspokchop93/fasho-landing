import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

/**
 * Account-Wide Playlist History API
 * Returns all playlists a customer has ever been placed on across all their songs/orders
 */

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const supabase = createAdminClient();

    // Fetch all campaigns for this user where playlists have been confirmed
    const { data: campaigns, error } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        song_name,
        song_link,
        playlist_assignments,
        playlists_added_at,
        package_name,
        order_number,
        orders!inner(created_at, user_id)
      `)
      .eq('orders.user_id', userId)
      .eq('playlists_added_confirmed', true)
      .order('playlists_added_at', { ascending: false });

    if (error) {
      console.error('Error fetching account playlist history:', error);
      return res.status(500).json({ error: 'Failed to fetch playlist history' });
    }

    // Build per-playlist data
    const playlistMap = new Map<string, {
      playlistName: string;
      songs: string[];
      lastPlacementDate: string;
    }>();

    for (const campaign of campaigns || []) {
      const playlistAssignments = Array.isArray(campaign.playlist_assignments) 
        ? campaign.playlist_assignments 
        : [];
      
      const placementDate = campaign.playlists_added_at || (campaign.orders as any).created_at;

      for (const playlist of playlistAssignments) {
        if (!playlist.name) continue;
        
        const existing = playlistMap.get(playlist.name);
        
        if (!existing) {
          playlistMap.set(playlist.name, {
            playlistName: playlist.name,
            songs: [campaign.song_name],
            lastPlacementDate: placementDate
          });
        } else {
          // Add song if not already in list
          if (!existing.songs.includes(campaign.song_name)) {
            existing.songs.push(campaign.song_name);
          }
          // Update last placement date if more recent
          if (new Date(placementDate) > new Date(existing.lastPlacementDate)) {
            existing.lastPlacementDate = placementDate;
          }
        }
      }
    }

    // Convert to array and sort by most songs first, then by most recent
    const playlists = Array.from(playlistMap.values()).sort((a, b) => {
      // First by song count
      if (b.songs.length !== a.songs.length) {
        return b.songs.length - a.songs.length;
      }
      // Then by most recent
      return new Date(b.lastPlacementDate).getTime() - new Date(a.lastPlacementDate).getTime();
    });

    res.status(200).json({
      totalPlaylists: playlists.length,
      playlists
    });

  } catch (error) {
    console.error('Error in account playlist history API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
