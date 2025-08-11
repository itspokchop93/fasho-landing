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
        updated_at,
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
        // Auto-cleanup: If hidden_until is in the past, clear it
        if (campaign.hidden_until && new Date(campaign.hidden_until) <= now) {
          console.log(`🧹 AUTO-CLEANUP: Order ${campaign.order_number} had expired hidden_until, clearing it`);
          // We should clear this in the database, but for now just treat as not hidden
          campaign.hidden_until = null;
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

        // Check if item is currently hidden
        const isHidden = campaign.hidden_until && new Date(campaign.hidden_until) > now;

        // Calculate completion timestamp (when both initial actions were completed)
        let completedAt = null;
        if (initialActionsCompleted) {
          // Use updated_at as completion timestamp for completed items
          completedAt = campaign.updated_at;
        }

        // Debug logging for hidden items
        if (campaign.hidden_until || isHidden) {
          console.log(`🔍 ACTION-QUEUE DEBUG: Order ${campaign.order_number}`);
          console.log(`  - hidden_until: ${campaign.hidden_until}`);
          console.log(`  - isHidden: ${isHidden}`);
          console.log(`  - now: ${now.toISOString()}`);
          console.log(`  - status: ${status}`);
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
          isHidden: isHidden,
          createdAt: campaign.created_at,
          hiddenUntil: campaign.hidden_until,
          completedAt: completedAt
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
