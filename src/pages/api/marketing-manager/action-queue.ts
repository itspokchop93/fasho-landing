import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Get campaigns that need actions (not hidden and not completed)
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_number,
        order_id,
        customer_name,
        song_name,
        package_name,
        direct_streams_confirmed,
        playlists_added_confirmed,
        removed_from_playlists,
        campaign_status,
        playlist_streams_progress,
        playlist_streams,
        hidden_until,
        created_at,
        orders!inner(created_at, status)
      `)
      .neq('campaign_status', 'Completed')
      .neq('orders.status', 'cancelled');

    if (campaignsError) {
      console.error('Error fetching campaigns for action queue:', campaignsError);
      return res.status(500).json({ error: 'Failed to fetch action queue data' });
    }

    const now = new Date();
    const actionItems = campaignsData
      ?.filter(campaign => {
        // Filter out hidden items (hidden until a future date)
        if (campaign.hidden_until && new Date(campaign.hidden_until) > now) {
          return false;
        }
        
        // Check if both initial actions are completed
        const initialActionsCompleted = campaign.direct_streams_confirmed && campaign.playlists_added_confirmed;
        
        // If completed, check if it's been more than 8 hours since completion
        if (initialActionsCompleted) {
          // For now, we'll include completed items but they'll be marked as completed
          // The 8-hour auto-removal can be implemented with a separate cleanup job
          // or by tracking completion timestamp in the database
        }
        
        // Include campaigns that need actions or removal actions
        return !campaign.direct_streams_confirmed || 
               !campaign.playlists_added_confirmed || 
               (campaign.playlist_streams_progress >= campaign.playlist_streams && !campaign.removed_from_playlists);
      })
      .map(campaign => {
        const orderCreatedAt = new Date(campaign.orders.created_at);
        const dueByTimestamp = orderCreatedAt.getTime() + (48 * 60 * 60 * 1000); // 48 hours after order
        const hoursUntilDue = Math.floor((dueByTimestamp - now.getTime()) / (1000 * 60 * 60));
        
        let dueByString: string;
        let status: 'Needed' | 'Overdue' | 'Completed';

        if (hoursUntilDue > 0) {
          dueByString = `in ${hoursUntilDue}h`;
          status = 'Needed';
        } else {
          dueByString = `${Math.abs(hoursUntilDue)}h ago!`;
          status = 'Overdue';
        }

        // Check if initial actions are completed (direct streams + playlists added)
        const initialActionsCompleted = campaign.direct_streams_confirmed && campaign.playlists_added_confirmed;
        
        if (initialActionsCompleted) {
          status = 'Completed';
        }

        return {
          id: campaign.id,
          orderNumber: campaign.order_number,
          orderId: campaign.order_id,
          customerName: campaign.customer_name,
          songName: campaign.song_name,
          packageName: campaign.package_name,
          actions: {
            directStreams: campaign.direct_streams_confirmed,
            addToPlaylists: campaign.playlists_added_confirmed,
            removeFromPlaylists: campaign.playlist_streams_progress >= campaign.playlist_streams && !campaign.removed_from_playlists
          },
          dueBy: dueByString,
          dueByTimestamp,
          status,
          isHidden: false,
          createdAt: campaign.created_at
        };
      })
      .sort((a, b) => {
        // Sort by status priority (Overdue > Needed > Completed), then by due date
        const statusPriority = { 'Overdue': 0, 'Needed': 1, 'Completed': 2 };
        if (statusPriority[a.status] !== statusPriority[b.status]) {
          return statusPriority[a.status] - statusPriority[b.status];
        }
        return a.dueByTimestamp - b.dueByTimestamp;
      }) || [];

    res.status(200).json(actionItems);
  } catch (error) {
    console.error('Error in action-queue API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
