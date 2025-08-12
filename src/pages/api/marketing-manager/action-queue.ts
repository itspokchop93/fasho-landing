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
      .neq('orders.status', 'cancelled');

    if (campaignsError) {
      console.error('Error fetching campaigns for action queue:', campaignsError);
      return res.status(500).json({ error: 'Failed to fetch action queue data' });
    }

    const now = new Date();
    const actionItems: any[] = [];

    // Group campaigns by order number to calculate song numbers for multi-track orders
    const campaignsByOrder = {};
    (campaignsData || []).forEach(campaign => {
      if (!campaignsByOrder[campaign.order_number]) {
        campaignsByOrder[campaign.order_number] = [];
      }
      campaignsByOrder[campaign.order_number].push(campaign);
    });

    // Process each campaign to create appropriate action items
    campaignsData?.forEach(campaign => {
      // Calculate song number for multi-track orders
      const orderCampaigns = campaignsByOrder[campaign.order_number] || [];
      const songNumber = orderCampaigns.length > 1 
        ? orderCampaigns.findIndex(c => c.id === campaign.id) + 1 
        : null;

      const orderCreatedAt = new Date(campaign.orders.created_at);
      const dueByTimestamp = orderCreatedAt.getTime() + (48 * 60 * 60 * 1000); // 48 hours after order
      const hoursUntilDue = Math.floor((dueByTimestamp - now.getTime()) / (1000 * 60 * 60));
      
      let dueByString: string;
      if (hoursUntilDue > 0) {
        dueByString = `in ${hoursUntilDue}h`;
      } else {
        dueByString = `${Math.abs(hoursUntilDue)}h ago!`;
      }

      // Check if item is currently hidden
      const isHidden = campaign.hidden_until && new Date(campaign.hidden_until) > now;

      // STEP 1 & 2: Create INITIAL ACTION ITEM (Direct Streams + Add to Playlists)
      // Show this when either action is NOT confirmed yet OR when both are completed (for 8-hour window)
      const initialActionsCompleted = campaign.direct_streams_confirmed && campaign.playlists_added_confirmed;
      const needsInitialActions = !initialActionsCompleted;
      
      // Always show initial action items, but determine their status
      let status: 'Needed' | 'Overdue' | 'Completed';
      let completedAt = null;

      if (initialActionsCompleted) {
        status = 'Completed';
        completedAt = campaign.updated_at;
      } else if (hoursUntilDue > 0) {
        status = 'Needed';
      } else {
        status = 'Overdue';
      }

      // Create the initial action item (always show it, status determines appearance)
      actionItems.push({
          id: `${campaign.id}-initial`,
          orderNumber: campaign.order_number,
          orderId: campaign.order_id,
          customerName: campaign.customer_name,
          songName: campaign.song_name,
          songNumber: songNumber,
          packageName: campaign.package_name,
          actionType: 'initial', // New field to distinguish action types
          actions: {
            directStreams: campaign.direct_streams_confirmed,
            addToPlaylists: campaign.playlists_added_confirmed,
            removeFromPlaylists: false // Never show this in initial action items
          },
          dueBy: dueByString,
          dueByTimestamp,
          status,
          isHidden: isHidden,
          createdAt: campaign.created_at,
          hiddenUntil: campaign.hidden_until,
          completedAt: completedAt
        });

      // STEP 6 & 7: Create REMOVAL ACTION ITEM (Remove from Playlists)
      // Calculate if removal is needed the same way as campaigns.ts does
      const bothInitialActionsCompleted = campaign.direct_streams_confirmed && campaign.playlists_added_confirmed;
      
      // Calculate playlist streams progress the SAME way as campaigns.ts (dynamic calculation)
      let calculatedPlaylistProgress = 0; // Always start at 0
      
      if (campaign.playlists_added_confirmed && campaign.playlists_added_at && campaign.playlist_assignments) {
        const playlistAssignments = Array.isArray(campaign.playlist_assignments) 
          ? campaign.playlist_assignments 
          : [];
        
        if (playlistAssignments.length > 0) {
          // Calculate streams based on 500 streams per playlist per 24 hours
          const playlistAddedDate = new Date(campaign.playlists_added_at);
          
          const hoursElapsed = Math.max(0, (now.getTime() - playlistAddedDate.getTime()) / (1000 * 60 * 60));
          const streamsPerHour = (playlistAssignments.length * 500) / 24;
          calculatedPlaylistProgress = Math.min(
            Math.floor(hoursElapsed * streamsPerHour),
            campaign.playlist_streams
          );
        }
      }
      
      // Calculate if playlist streams target has been reached (using calculated progress)
      const playlistTargetReached = calculatedPlaylistProgress >= campaign.playlist_streams;
      
      // Show removal action item when:
      // 1. Both initial actions completed AND playlist target reached (needs removal)
      // 2. OR when already removed but within 8 hours (show as completed)
      const needsRemovalAction = bothInitialActionsCompleted && playlistTargetReached;
      const isRemovalCompleted = campaign.removed_from_playlists;
      
      if (needsRemovalAction) {
        // Determine status and completion details for removal action item
        let removalStatus: 'Needed' | 'Overdue' | 'Completed';
        let removalCompletedAt = null;
        
        if (isRemovalCompleted) {
          // De-playlisted button was clicked - show as completed
          removalStatus = 'Completed';
          removalCompletedAt = campaign.updated_at; // When it was completed
        } else {
          // Still needs to be removed
          removalStatus = 'Needed';
        }
        
        // For removal actions, the due date is immediate when needed
        const removalDueTimestamp = now.getTime();

        actionItems.push({
          id: `${campaign.id}-removal`,
          orderNumber: campaign.order_number,
          orderId: campaign.order_id,
          customerName: campaign.customer_name,
          songName: campaign.song_name,
          songNumber: songNumber,
          packageName: campaign.package_name,
          actionType: 'removal', // New field to distinguish action types
          actions: {
            directStreams: true, // Already completed (not relevant for removal actions)
            addToPlaylists: true, // Already completed (not relevant for removal actions)
            removeFromPlaylists: isRemovalCompleted // This shows if removal is done
          },
          dueBy: 'now!',
          dueByTimestamp: removalDueTimestamp,
          status: removalStatus,
          isHidden: isHidden,
          createdAt: campaign.created_at,
          hiddenUntil: campaign.hidden_until,
          completedAt: removalCompletedAt
        });
      }
    });

    // Filter out action items that have been completed for more than 8 hours
    const eightHoursAgo = now.getTime() - (8 * 60 * 60 * 1000);
    const filteredActionItems = actionItems.filter(item => {
      // Keep all non-completed items
      if (item.status !== 'Completed') {
        return true;
      }
      
      // For completed items, only keep if completed within last 8 hours
      if (item.completedAt) {
        const completedTime = new Date(item.completedAt).getTime();
        const shouldKeep = completedTime > eightHoursAgo;
        
        if (!shouldKeep) {
          console.log(`🧹 AUTO-REMOVAL: Filtering out completed ${item.actionType} action item for order ${item.orderNumber} (completed more than 8 hours ago)`);
        }
        
        return shouldKeep;
      }
      
      // If no completion time, keep it (shouldn't happen for completed items)
      return true;
    });

    // Sort action items by priority: Overdue > Needed > Completed, then by due date
    const sortedActionItems = filteredActionItems
      .sort((a, b) => {
        // Sort by status priority (Overdue > Needed > Completed), then by due date
        const statusPriority = { 'Overdue': 0, 'Needed': 1, 'Completed': 2 };
        if (statusPriority[a.status] !== statusPriority[b.status]) {
          return statusPriority[a.status] - statusPriority[b.status];
        }
        return a.dueByTimestamp - b.dueByTimestamp;
      });

    res.status(200).json(sortedActionItems);
  } catch (error) {
    console.error('Error in action-queue API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);