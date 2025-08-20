import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

// CLEANUP LOGIC: Extracted from cleanup-expired-action-items.ts to run directly
async function runCleanupLogic(supabase: any) {
  const now = new Date();
  let totalUpdated = 0;

  // Find campaigns where hidden_until has expired (8 hours have passed)
  const { data: expiredHiddenCampaigns, error: fetchError } = await supabase
    .from('marketing_campaigns')
    .select('id, order_number, hidden_until, initial_actions_excluded, removal_actions_excluded, direct_streams_confirmed, playlists_added_confirmed, removed_from_playlists')
    .not('hidden_until', 'is', null)
    .lt('hidden_until', now.toISOString());

  if (fetchError) {
    console.error('Error fetching expired hidden campaigns:', fetchError);
    return { totalUpdated: 0, error: fetchError };
  }

  console.log(`🧹 CLEANUP: Found ${expiredHiddenCampaigns?.length || 0} campaigns with expired hidden_until timestamps`);


  if (expiredHiddenCampaigns && expiredHiddenCampaigns.length > 0) {
    // Process each campaign to determine which action type should be excluded
    for (const campaign of expiredHiddenCampaigns) {
      const initialCompleted = campaign.direct_streams_confirmed && campaign.playlists_added_confirmed;
      const removalCompleted = campaign.removed_from_playlists;
      
      let updateFields: any = {
        hidden_until: null, // Clear the hidden_until since it's now permanent
        updated_at: new Date().toISOString()
      };
      
      // Determine which action type to exclude based on campaign state
      if (!initialCompleted && !campaign.initial_actions_excluded) {
        // Initial actions are not completed and not yet excluded - exclude them
        updateFields.initial_actions_excluded = true;
        console.log(`🧹 CLEANUP: Order ${campaign.order_number} - excluding initial actions`);
      } else if (initialCompleted && !removalCompleted && !campaign.removal_actions_excluded) {
        // Initial actions completed but removal not completed - exclude removal actions
        updateFields.removal_actions_excluded = true;
        console.log(`🧹 CLEANUP: Order ${campaign.order_number} - excluding removal actions`);
      } else if (removalCompleted && !campaign.removal_actions_excluded) {
        // Removal completed - exclude removal actions
        updateFields.removal_actions_excluded = true;
        console.log(`🧹 CLEANUP: Order ${campaign.order_number} - excluding completed removal actions`);
      }
      
      // Apply the update for this specific campaign
      const { error: updateError } = await supabase
        .from('marketing_campaigns')
        .update(updateFields)
        .eq('id', campaign.id);

      if (updateError) {
        console.error(`Error updating campaign ${campaign.id}:`, updateError);
      } else {
        totalUpdated++;
      }
    }
  }

  // Also find campaigns that were completed more than 8 hours ago and should be excluded
  const eightHoursAgo = new Date(now.getTime() - (8 * 60 * 60 * 1000));
  
  const { data: expiredCompletedCampaigns, error: completedFetchError } = await supabase
    .from('marketing_campaigns')
    .select('id, order_number, updated_at, direct_streams_confirmed, playlists_added_confirmed, removed_from_playlists, initial_actions_excluded, removal_actions_excluded')
    .lt('updated_at', eightHoursAgo.toISOString())
    .or('and(direct_streams_confirmed.eq.true,playlists_added_confirmed.eq.true),removed_from_playlists.eq.true');

  if (!completedFetchError && expiredCompletedCampaigns && expiredCompletedCampaigns.length > 0) {
    // Mark completed campaigns as excluded based on which actions are completed
    for (const campaign of expiredCompletedCampaigns) {
      let updateFields: any = {
        updated_at: new Date().toISOString()
      };
      
      const initialCompleted = campaign.direct_streams_confirmed && campaign.playlists_added_confirmed;
      const removalCompleted = campaign.removed_from_playlists;
      
      if (initialCompleted && !campaign.initial_actions_excluded) {
        updateFields.initial_actions_excluded = true;
        console.log(`🧹 CLEANUP: Order ${campaign.order_number} - excluding completed initial actions`);
      }
      
      if (removalCompleted && !campaign.removal_actions_excluded) {
        updateFields.removal_actions_excluded = true;
        console.log(`🧹 CLEANUP: Order ${campaign.order_number} - excluding completed removal actions`);
      }
      
      // Only update if there are fields to update
      if (Object.keys(updateFields).length > 1) { // More than just updated_at
        const { error: completedUpdateError } = await supabase
          .from('marketing_campaigns')
          .update(updateFields)
          .eq('id', campaign.id);

        if (completedUpdateError) {
          console.error(`Error updating completed campaign ${campaign.id}:`, completedUpdateError);
        } else {
          totalUpdated++;
        }
      }
    }
  }

  return { 
    totalUpdated,
    expiredHidden: expiredHiddenCampaigns?.length || 0,
    expiredCompleted: expiredCompletedCampaigns?.length || 0
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // First, run cleanup to mark expired hidden/completed items as excluded
    try {
      const cleanupResult = await runCleanupLogic(supabase);
      if (cleanupResult.totalUpdated > 0) {
        console.log(`🧹 AUTO-CLEANUP: ${cleanupResult.totalUpdated} campaigns marked as excluded from action queue`);
      }
    } catch (cleanupError) {
      console.error('Error running auto-cleanup:', cleanupError);
      // Continue even if cleanup fails
    }

    // Get campaigns that need actions (not cancelled)
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
        playlist_assignments,
        playlists_added_at,
        direct_streams_confirmed_at,
        removed_from_playlists_at,
        hidden_until,
        initial_actions_excluded,
        removal_actions_excluded,
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
    const campaignsByOrder: { [key: string]: any[] } = {};
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

      const orderCreatedAt = new Date((campaign.orders as any).created_at);
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
      
      // Check if item is currently hidden (no detailed logging in production)

      // STEP 1 & 2: Create INITIAL ACTION ITEM (Direct Streams + Add to Playlists)
      // Only show if initial actions are not excluded
      if (!campaign.initial_actions_excluded) {
        const initialActionsCompleted = campaign.direct_streams_confirmed && campaign.playlists_added_confirmed;
        const needsInitialActions = !initialActionsCompleted;
        
        // Always show initial action items, but determine their status
        let status: 'Needed' | 'Overdue' | 'Completed';
        let completedAt = null;

        if (initialActionsCompleted) {
          status = 'Completed';
          // Use the LATEST of the two completion timestamps as the overall completion time
          const directCompletedAt = campaign.direct_streams_confirmed_at;
          const playlistsCompletedAt = campaign.playlists_added_at;
          
          if (directCompletedAt && playlistsCompletedAt) {
            // Both completed - use the later timestamp
            completedAt = new Date(directCompletedAt) > new Date(playlistsCompletedAt) 
              ? directCompletedAt 
              : playlistsCompletedAt;
          } else {
            // Use whichever one exists (fallback to updated_at if neither exists)
            completedAt = directCompletedAt || playlistsCompletedAt || campaign.updated_at;
          }
        } else if (hoursUntilDue > 0) {
          status = 'Needed';
        } else {
          status = 'Overdue';
        }

        // Create the initial action item
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
      }

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
      // 3. AND removal actions are not excluded
      const needsRemovalAction = bothInitialActionsCompleted && playlistTargetReached;
      const isRemovalCompleted = campaign.removed_from_playlists;
      
      if (needsRemovalAction && !campaign.removal_actions_excluded) {
        // Determine status and completion details for removal action item
        let removalStatus: 'Needed' | 'Overdue' | 'Completed';
        let removalCompletedAt = null;
        
        if (isRemovalCompleted) {
          // De-playlisted button was clicked - show as completed
          removalStatus = 'Completed';
          removalCompletedAt = campaign.removed_from_playlists_at || campaign.updated_at; // Use dedicated timestamp
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
        const statusPriority: { [key: string]: number } = { 'Overdue': 0, 'Needed': 1, 'Completed': 2 };
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