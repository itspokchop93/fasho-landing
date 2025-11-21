import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

interface CurrentPlacement {
  id: string;
  orderNumber: string;
  orderId: string;
  songName: string;
  songLink: string;
  packageName: string;
  placementDate: string;
  status: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Fetch all active campaigns with their playlist assignments and live status calculation
    // REMOVED: .eq('playlists_added_confirmed', true) to include ALL assignments immediately
    let { data: campaignsData, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_id,
        order_number,
        song_name,
        song_link,
        package_name,
        playlist_assignments,
        playlists_added_at,
        campaign_status,
        removed_from_playlists,
        direct_streams,
        playlist_streams,
        direct_streams_progress,
        playlist_streams_progress,
        direct_streams_confirmed,
        playlists_added_confirmed,
        removal_date,
        time_on_playlists,
        created_at,
        orders!inner(created_at, status, billing_info)
      `)
      .eq('removed_from_playlists', false)
      .neq('orders.status', 'cancelled')
      .order('created_at', { ascending: false }); // Changed sorting to created_at since playlists_added_at might be null

    if (campaignsError) {
      console.error('Error fetching campaigns for current placements:', campaignsError);
      return res.status(500).json({ error: 'Failed to fetch current placements' });
    }

    // Process campaigns to extract current placements grouped by playlist with LIVE status calculation
    const placementsByPlaylist: { [playlistId: string]: CurrentPlacement[] } = {};

    campaignsData?.forEach(campaign => {
      // Calculate LIVE status using the same logic as Active Campaigns
      let liveStatus = 'Action Needed';
      
      // Check if it's already marked as completed or removed
      if (campaign.removed_from_playlists) {
        liveStatus = 'Completed';
      } else {
        // Calculate based on current progress and confirmation status
        const directConfirmed = campaign.direct_streams_confirmed;
        const playlistsConfirmed = campaign.playlists_added_confirmed;
        
        if (directConfirmed && playlistsConfirmed) {
          // Check if it's time for removal based on removal_date
          if (campaign.removal_date) {
            const today = new Date();
            const removalDate = new Date(campaign.removal_date);
            
            // If removal date has passed, it needs removal
            if (today >= removalDate) {
              liveStatus = 'Removal Needed';
            } else {
              liveStatus = 'Running';
            }
          } else {
            liveStatus = 'Running';
          }
        } else {
          liveStatus = 'Action Needed';
        }
      }

      if (campaign.playlist_assignments && Array.isArray(campaign.playlist_assignments)) {
        campaign.playlist_assignments.forEach((assignment: any) => {
          // Only include active playlist assignments (not "removed" ones and not "empty" placeholders)
          if (assignment.id && assignment.id !== 'removed' && assignment.id !== 'empty') {
            const playlistId = assignment.id;
            
            if (!placementsByPlaylist[playlistId]) {
              placementsByPlaylist[playlistId] = [];
            }
            
            placementsByPlaylist[playlistId].push({
              id: campaign.id,
              orderNumber: campaign.order_number,
              orderId: campaign.order_id,
              songName: campaign.song_name,
              songLink: campaign.song_link,
              packageName: campaign.package_name,
              placementDate: campaign.playlists_added_at || campaign.created_at,
              status: liveStatus // Use the live calculated status
            });
          }
        });
      }
    });

    console.log(`📊 CURRENT-PLACEMENTS: Processed ${campaignsData?.length || 0} campaigns`);
    console.log(`📊 CURRENT-PLACEMENTS: Found placements in ${Object.keys(placementsByPlaylist).length} playlists`);

    res.status(200).json(placementsByPlaylist);
  } catch (error) {
    console.error('Error in current-placements API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
