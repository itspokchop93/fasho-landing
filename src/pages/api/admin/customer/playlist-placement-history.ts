import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

/**
 * Playlist Placement History API
 * 
 * Returns the complete playlist placement ledger for a customer.
 * This includes:
 * - All songs that have been placed on playlists
 * - Which playlists each song was placed on
 * - Placement dates
 * - Package and order information
 * 
 * Data is derived from marketing_campaigns where playlists_added_confirmed = true
 */

export interface PlaylistPlacement {
  playlistName: string;
  playlistId: string;
  placementDate: string;
  packageName: string;
  orderNumber: string;
  orderDate: string;
  campaignId: string;
}

export interface SongPlacementHistory {
  songName: string;
  songUrl: string;
  placements: PlaylistPlacement[];
  totalPlaylists: number;
  uniquePlaylists: string[]; // Unique playlist names across all placements
}

export interface SongOnPlaylist {
  songName: string;
  songUrl: string;
  placementDate: string;
  packageName: string;
  orderNumber: string;
  orderDate: string;
}

export interface PlaylistHistory {
  playlistName: string;
  playlistId: string;
  songs: SongOnPlaylist[];
  totalSongs: number;
}

export interface CustomerPlacementHistoryResponse {
  success: boolean;
  customerEmail: string;
  // Account-wide view: all placements in one flat list
  allPlacements: {
    songName: string;
    songUrl: string;
    playlists: string[]; // All unique playlists this song has been on
    orderNumber: string;
    orderDate: string;
  }[];
  // Per-song view: grouped by song
  songHistories: SongPlacementHistory[];
  // Per-playlist view: grouped by playlist
  playlistHistories: PlaylistHistory[];
  totalUniqueSongs: number;
  totalUniquePlaylists: number;
  totalPlacements: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { customerEmail } = req.query;

  if (!customerEmail || typeof customerEmail !== 'string') {
    return res.status(400).json({ success: false, message: 'customerEmail is required' });
  }

  try {
    const supabase = createAdminClient();

    console.log('📋 PLACEMENT-HISTORY: Fetching for customer:', customerEmail);

    // Fetch all marketing campaigns for this customer where playlists have been confirmed
    // Join with orders to get order dates and verify customer ownership
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
        order_id,
        orders!inner(
          created_at,
          customer_email,
          user_id
        )
      `)
      .eq('orders.customer_email', customerEmail)
      .eq('playlists_added_confirmed', true)
      .order('playlists_added_at', { ascending: false });

    if (error) {
      console.error('📋 PLACEMENT-HISTORY: Error fetching campaigns:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch placement history' });
    }

    if (!campaigns || campaigns.length === 0) {
      return res.status(200).json({
        success: true,
        customerEmail,
        allPlacements: [],
        songHistories: [],
        playlistHistories: [],
        totalUniqueSongs: 0,
        totalUniquePlaylists: 0,
        totalPlacements: 0
      });
    }

    // Build the account-wide placements list (grouped by campaign/order)
    const allPlacements: CustomerPlacementHistoryResponse['allPlacements'] = [];
    
    // Build the per-song histories (grouped by song URL for accurate matching)
    const songHistoryMap: Map<string, SongPlacementHistory> = new Map();
    
    // Build the per-playlist histories (grouped by playlist)
    const playlistHistoryMap: Map<string, PlaylistHistory> = new Map();

    let totalPlacements = 0;

    for (const campaign of campaigns) {
      const orderData = campaign.orders as any;
      const playlistAssignments = Array.isArray(campaign.playlist_assignments) 
        ? campaign.playlist_assignments 
        : [];
      
      const placementDate = campaign.playlists_added_at || orderData.created_at;
      const playlistNames = playlistAssignments.map((p: any) => p.name).filter(Boolean);

      // Add to account-wide list
      allPlacements.push({
        songName: campaign.song_name,
        songUrl: campaign.song_link,
        playlists: playlistNames,
        orderNumber: campaign.order_number,
        orderDate: orderData.created_at
      });

      // Build per-song history
      // Use song_link as the unique identifier (normalized)
      const songKey = campaign.song_link?.toLowerCase().trim() || campaign.song_name.toLowerCase().trim();
      
      if (!songHistoryMap.has(songKey)) {
        songHistoryMap.set(songKey, {
          songName: campaign.song_name,
          songUrl: campaign.song_link,
          placements: [],
          totalPlaylists: 0,
          uniquePlaylists: []
        });
      }

      const songHistory = songHistoryMap.get(songKey)!;

      // Add each playlist as a separate placement record
      for (const playlist of playlistAssignments) {
        if (!playlist.name) continue;
        
        // Per-song tracking
        songHistory.placements.push({
          playlistName: playlist.name,
          playlistId: playlist.id,
          placementDate,
          packageName: campaign.package_name,
          orderNumber: campaign.order_number,
          orderDate: orderData.created_at,
          campaignId: campaign.id
        });

        totalPlacements++;

        // Track unique playlists for this song
        if (!songHistory.uniquePlaylists.includes(playlist.name)) {
          songHistory.uniquePlaylists.push(playlist.name);
        }
        
        // Per-playlist tracking
        const playlistKey = playlist.id || playlist.name.toLowerCase().trim();
        
        if (!playlistHistoryMap.has(playlistKey)) {
          playlistHistoryMap.set(playlistKey, {
            playlistName: playlist.name,
            playlistId: playlist.id,
            songs: [],
            totalSongs: 0
          });
        }
        
        const playlistHistory = playlistHistoryMap.get(playlistKey)!;
        playlistHistory.songs.push({
          songName: campaign.song_name,
          songUrl: campaign.song_link,
          placementDate,
          packageName: campaign.package_name,
          orderNumber: campaign.order_number,
          orderDate: orderData.created_at
        });
      }

      songHistory.totalPlaylists = songHistory.uniquePlaylists.length;
    }

    // Convert map to array and sort by most recent placement first
    const songHistories = Array.from(songHistoryMap.values()).map(history => ({
      ...history,
      placements: history.placements.sort((a, b) => 
        new Date(b.placementDate).getTime() - new Date(a.placementDate).getTime()
      )
    }));

    // Sort songs by most recent placement
    songHistories.sort((a, b) => {
      const aLatest = a.placements[0]?.placementDate || '';
      const bLatest = b.placements[0]?.placementDate || '';
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });
    
    // Convert playlist map to array and sort
    const playlistHistories = Array.from(playlistHistoryMap.values()).map(history => ({
      ...history,
      totalSongs: history.songs.length,
      songs: history.songs.sort((a, b) => 
        new Date(b.placementDate).getTime() - new Date(a.placementDate).getTime()
      )
    }));
    
    // Sort playlists by most songs first
    playlistHistories.sort((a, b) => b.totalSongs - a.totalSongs);

    console.log(`📋 PLACEMENT-HISTORY: Found ${songHistories.length} unique songs, ${playlistHistories.length} unique playlists, ${totalPlacements} total placements`);

    res.status(200).json({
      success: true,
      customerEmail,
      allPlacements,
      songHistories,
      playlistHistories,
      totalUniqueSongs: songHistories.length,
      totalUniquePlaylists: playlistHistories.length,
      totalPlacements
    });

  } catch (error) {
    console.error('📋 PLACEMENT-HISTORY: Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
