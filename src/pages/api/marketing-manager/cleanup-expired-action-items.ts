import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();

    // Find campaigns where hidden_until has expired (8 hours have passed)
    const { data: expiredHiddenCampaigns, error: fetchError } = await supabase
      .from('marketing_campaigns')
      .select('id, order_number, hidden_until, initial_actions_excluded, removal_actions_excluded, direct_streams_confirmed, playlists_added_confirmed, removed_from_playlists')
      .not('hidden_until', 'is', null)
      .lt('hidden_until', now.toISOString());

    if (fetchError) {
      console.error('Error fetching expired hidden campaigns:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch expired hidden campaigns' });
    }

    console.log(`🧹 CLEANUP: Found ${expiredHiddenCampaigns?.length || 0} campaigns with expired hidden_until timestamps`);

    let updatedCount = 0;

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
          updatedCount++;
        }
      }
      
      console.log(`🧹 CLEANUP: Updated ${updatedCount} campaigns with action-type-specific exclusions`);
    }

    // Also find campaigns that were completed more than 8 hours ago and should be excluded
    const eightHoursAgo = new Date(now.getTime() - (8 * 60 * 60 * 1000));
    
    const { data: expiredCompletedCampaigns, error: completedFetchError } = await supabase
      .from('marketing_campaigns')
      .select('id, order_number, updated_at, direct_streams_confirmed, playlists_added_confirmed, removed_from_playlists, initial_actions_excluded, removal_actions_excluded')
      .lt('updated_at', eightHoursAgo.toISOString())
      .or('and(direct_streams_confirmed.eq.true,playlists_added_confirmed.eq.true),removed_from_playlists.eq.true');

    if (completedFetchError) {
      console.error('Error fetching expired completed campaigns:', completedFetchError);
    } else if (expiredCompletedCampaigns && expiredCompletedCampaigns.length > 0) {
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
            updatedCount++;
          }
        }
      }
    }

    res.status(200).json({ 
      message: `Cleanup completed successfully`,
      expiredHidden: expiredHiddenCampaigns?.length || 0,
      expiredCompleted: expiredCompletedCampaigns?.length || 0,
      totalUpdated: updatedCount
    });
  } catch (error) {
    console.error('Error in cleanup-expired-action-items API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
