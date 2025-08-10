import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Fetch all campaigns with their related order data
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_id,
        order_number,
        customer_name,
        song_name,
        song_link,
        package_name,
        package_id,
        direct_streams,
        playlist_streams,
        playlist_assignments,
        direct_streams_progress,
        playlist_streams_progress,
        direct_streams_confirmed,
        playlists_added_confirmed,
        removed_from_playlists,
        removal_date,
        campaign_status,
        time_on_playlists,
        created_at,
        updated_at,
        orders!inner(created_at, status)
      `)
      .neq('orders.status', 'cancelled')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }

    // Process campaigns data to calculate progress and status
    const campaigns = campaignsData?.map(campaign => {
      // Calculate playlist streams progress based on time elapsed and playlist assignments
      let calculatedPlaylistProgress = campaign.playlist_streams_progress;
      
      if (campaign.playlists_added_confirmed && campaign.playlist_assignments) {
        const playlistAssignments = Array.isArray(campaign.playlist_assignments) 
          ? campaign.playlist_assignments 
          : [];
        
        if (playlistAssignments.length > 0) {
          // Calculate streams based on 500 streams per playlist per 24 hours
          const now = new Date();
          const playlistAddedDate = campaign.removal_date 
            ? new Date(new Date(campaign.removal_date).getTime() - (campaign.playlist_streams / (playlistAssignments.length * 500)) * 24 * 60 * 60 * 1000)
            : new Date(campaign.created_at);
          
          const hoursElapsed = Math.max(0, (now.getTime() - playlistAddedDate.getTime()) / (1000 * 60 * 60));
          const streamsPerHour = (playlistAssignments.length * 500) / 24;
          calculatedPlaylistProgress = Math.min(
            Math.floor(hoursElapsed * streamsPerHour),
            campaign.playlist_streams
          );
        }
      }

      // Determine campaign status
      let status = campaign.campaign_status;
      
      if (!campaign.direct_streams_confirmed || !campaign.playlists_added_confirmed) {
        status = 'Action Needed';
      } else if (calculatedPlaylistProgress >= campaign.playlist_streams && !campaign.removed_from_playlists) {
        status = 'Removal Needed';
      } else if (campaign.removed_from_playlists) {
        status = 'Completed';
      } else if (campaign.direct_streams_confirmed && campaign.playlists_added_confirmed) {
        status = 'Running';
      }

      // Calculate removal date based on time_on_playlists from campaign_totals
      let removalDate = campaign.removal_date;
      if (campaign.playlists_added_confirmed && !removalDate && campaign.time_on_playlists) {
        const calculatedRemovalDate = new Date();
        calculatedRemovalDate.setDate(calculatedRemovalDate.getDate() + campaign.time_on_playlists);
        removalDate = calculatedRemovalDate.toISOString().split('T')[0];
      }

      return {
        id: campaign.id,
        orderNumber: campaign.order_number,
        orderId: campaign.order_id,
        orderDate: campaign.orders.created_at,
        customerName: campaign.customer_name,
        songName: campaign.song_name,
        songLink: campaign.song_link,
        packageName: campaign.package_name,
        directStreams: campaign.direct_streams,
        playlistStreams: campaign.playlist_streams,
        playlistAssignments: Array.isArray(campaign.playlist_assignments) 
          ? campaign.playlist_assignments 
          : [],
        directStreamsProgress: campaign.direct_streams_confirmed ? campaign.direct_streams : 0,
        playlistStreamsProgress: calculatedPlaylistProgress,
        removalDate,
        status,
        directStreamsConfirmed: campaign.direct_streams_confirmed,
        playlistsAddedConfirmed: campaign.playlists_added_confirmed,
        removedFromPlaylists: campaign.removed_from_playlists
      };
    }) || [];

    res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error in campaigns API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
