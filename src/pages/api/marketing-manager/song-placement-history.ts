import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

/**
 * Song Placement History API
 * Returns all playlists a specific song has been placed on across all time
 */

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { songUrl } = req.query;

  if (!songUrl || typeof songUrl !== 'string') {
    return res.status(400).json({ error: 'songUrl is required' });
  }

  try {
    const supabase = createAdminClient();

    // Normalize the song URL for matching
    const normalizedUrl = songUrl.toLowerCase().trim();

    // Fetch all campaigns for this song where playlists have been confirmed
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
        orders!inner(created_at)
      `)
      .eq('playlists_added_confirmed', true)
      .order('playlists_added_at', { ascending: false });

    if (error) {
      console.error('Error fetching song placement history:', error);
      return res.status(500).json({ error: 'Failed to fetch placement history' });
    }

    // Filter campaigns that match this song URL
    const matchingCampaigns = (campaigns || []).filter(c => 
      c.song_link?.toLowerCase().trim() === normalizedUrl
    );

    // Build placement history
    const placements: {
      playlistName: string;
      placementDate: string;
      packageName: string;
      orderNumber: string;
    }[] = [];

    for (const campaign of matchingCampaigns) {
      const playlistAssignments = Array.isArray(campaign.playlist_assignments) 
        ? campaign.playlist_assignments 
        : [];
      
      const placementDate = campaign.playlists_added_at || (campaign.orders as any).created_at;

      for (const playlist of playlistAssignments) {
        if (!playlist.name) continue;
        
        placements.push({
          playlistName: playlist.name,
          placementDate,
          packageName: campaign.package_name,
          orderNumber: campaign.order_number
        });
      }
    }

    // Get unique playlists with most recent placement date
    const playlistMap = new Map<string, { playlistName: string; lastPlacementDate: string; count: number }>();
    
    for (const p of placements) {
      const existing = playlistMap.get(p.playlistName);
      if (!existing || new Date(p.placementDate) > new Date(existing.lastPlacementDate)) {
        playlistMap.set(p.playlistName, {
          playlistName: p.playlistName,
          lastPlacementDate: p.placementDate,
          count: (existing?.count || 0) + 1
        });
      } else {
        existing.count++;
      }
    }

    const uniquePlaylists = Array.from(playlistMap.values()).sort((a, b) => 
      new Date(b.lastPlacementDate).getTime() - new Date(a.lastPlacementDate).getTime()
    );

    res.status(200).json({
      songName: matchingCampaigns[0]?.song_name || '',
      totalPlacements: placements.length,
      uniquePlaylists: uniquePlaylists.length,
      placements: placements.sort((a, b) => 
        new Date(b.placementDate).getTime() - new Date(a.placementDate).getTime()
      ),
      playlistSummary: uniquePlaylists
    });

  } catch (error) {
    console.error('Error in song placement history API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
