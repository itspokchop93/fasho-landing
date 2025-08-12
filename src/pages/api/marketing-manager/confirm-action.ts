import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';
import { sendOrderStatusChangeEmail } from '../../../utils/email/emailService';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignId, action } = req.body;

  if (!campaignId || !action) {
    return res.status(400).json({ error: 'Campaign ID and action are required' });
  }

  if (!['direct-streams', 'playlists-added', 'de-playlisted'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action type' });
  }

  try {
    const supabase = createAdminClient();

    // First, get the current campaign data
    const { data: campaignData, error: fetchError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_id,
        direct_streams,
        playlist_streams,
        playlist_assignments,
        direct_streams_confirmed,
        playlists_added_confirmed,
        playlists_added_at,
        removed_from_playlists,
        time_on_playlists
      `)
      .eq('id', campaignId)
      .single();

    if (fetchError || !campaignData) {
      console.error('Error fetching campaign:', fetchError);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'direct-streams':
        updateData.direct_streams_confirmed = true;
        updateData.direct_streams_progress = campaignData.direct_streams;
        break;

      case 'playlists-added':
        updateData.playlists_added_confirmed = true;
        updateData.playlists_added_at = new Date().toISOString();
        updateData.playlist_streams_progress = 0; // Reset to 0 when starting
        
        // DYNAMIC REMOVAL DATE: Calculate based on LIVE data (playlists × streams needed)
        if (campaignData.playlist_assignments && campaignData.playlist_streams) {
          const playlistAssignments = Array.isArray(campaignData.playlist_assignments) 
            ? campaignData.playlist_assignments 
            : [];
          
          if (playlistAssignments.length > 0) {
            // Live calculation: 500 streams per playlist per day
            const streamsPerDay = playlistAssignments.length * 500;
            const streamsNeeded = campaignData.playlist_streams;
            const daysNeeded = Math.ceil(streamsNeeded / streamsPerDay);
            
            const addedDate = new Date();
            const calculatedRemovalDate = new Date(addedDate);
            calculatedRemovalDate.setDate(calculatedRemovalDate.getDate() + daysNeeded);
            
            updateData.removal_date = calculatedRemovalDate.toISOString().split('T')[0];
            
            console.log(`📅 LIVE REMOVAL DATE for Order ${campaignData.order_number}:`);
            console.log(`  - Streams needed: ${streamsNeeded}`);
            console.log(`  - Playlists: ${playlistAssignments.length} (${streamsPerDay}/day)`);
            console.log(`  - Days needed: ${daysNeeded}`);
            console.log(`  - Remove on: ${updateData.removal_date}`);
          }
        }
        break;

      case 'de-playlisted':
        updateData.removed_from_playlists = true;
        updateData.campaign_status = 'Completed';
        updateData.playlist_streams_progress = campaignData.playlist_streams;
        break;
    }

    // Determine new campaign status
    if (action !== 'de-playlisted') {
      const directConfirmed = action === 'direct-streams' ? true : campaignData.direct_streams_confirmed;
      const playlistsConfirmed = action === 'playlists-added' ? true : campaignData.playlists_added_confirmed;
      
      if (directConfirmed && playlistsConfirmed) {
        updateData.campaign_status = 'Running';
      } else {
        updateData.campaign_status = 'Action Needed';
      }
    }

    // Update the campaign
    const { error: updateError } = await supabase
      .from('marketing_campaigns')
      .update(updateData)
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating campaign:', updateError);
      return res.status(500).json({ error: 'Failed to update campaign' });
    }

    // Update order status to "Marketing Campaign Running" when EITHER action is confirmed
    // Only update if current status allows it (not cancelled or order issue)
    if (action === 'direct-streams' || action === 'playlists-added') {
      console.log(`🔄 ORDER STATUS: Checking if order ${campaignData.order_id} status should be updated to Marketing Campaign Running`);
      
      // First, get current order status
      const { data: currentOrder, error: fetchOrderError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', campaignData.order_id)
        .single();

      if (fetchOrderError) {
        console.error('Error fetching current order status:', fetchOrderError);
      } else {
        const currentStatus = currentOrder.status;
        console.log(`🔄 ORDER STATUS: Current order status is "${currentStatus}"`);
        
        // Only update if status is not one of the protected statuses
        const protectedStatuses = ['cancelled', 'order_issue'];
        const shouldUpdate = !protectedStatuses.includes(currentStatus) && currentStatus !== 'marketing_campaign_running';
        
        if (shouldUpdate) {
          console.log(`🔄 ORDER STATUS: Updating order status from "${currentStatus}" to "marketing_campaign_running"`);
          
          const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({ 
              status: 'marketing_campaign_running',
              updated_at: new Date().toISOString()
            })
            .eq('id', campaignData.order_id);

          if (orderUpdateError) {
            console.error('Error updating order status:', orderUpdateError);
            // Don't fail the request for this, just log the error
          } else {
            console.log(`✅ ORDER STATUS: Successfully updated order ${campaignData.order_id} to Marketing Campaign Running`);
            
            // CRITICAL: Send transactional email notification when status changes to Marketing Campaign Running
            console.log(`📧 MARKETING-MANAGER-CONFIRM: Status changed to marketing_campaign_running, sending email notification...`);
            
            try {
              // Get the full order data needed for the email
              const { data: fullOrderData, error: orderFetchError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', campaignData.order_id)
                .single();

              if (orderFetchError || !fullOrderData) {
                console.error('📧 MARKETING-MANAGER-CONFIRM: Error fetching order data for email:', orderFetchError);
              } else {
                const emailSent = await sendOrderStatusChangeEmail(fullOrderData, 'marketing_campaign_running', supabase);
                
                if (emailSent) {
                  console.log(`📧 MARKETING-MANAGER-CONFIRM: ✅ Email notification sent successfully for order ${campaignData.order_id}`);
                } else {
                  console.log(`📧 MARKETING-MANAGER-CONFIRM: ❌ Email notification failed for order ${campaignData.order_id}`);
                }
              }
            } catch (emailError) {
              console.error(`📧 MARKETING-MANAGER-CONFIRM: ❌ Error sending email notification for order ${campaignData.order_id}:`, emailError);
              // Don't fail the entire request if email fails
            }
          }
        } else {
          console.log(`⏭️ ORDER STATUS: Skipping update - current status "${currentStatus}" is protected or already correct`);
        }
      }
    }

    // If de-playlisted, mark order as completed
    if (action === 'de-playlisted') {
      const { error: orderCompleteError } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignData.order_id);

      if (orderCompleteError) {
        console.error('Error completing order:', orderCompleteError);
        // Don't fail the request for this, just log the error
      } else {
        console.log(`✅ ORDER STATUS: Successfully updated order ${campaignData.order_id} to Completed`);
        
        // CRITICAL: Send transactional email notification when status changes to Completed
        console.log(`📧 MARKETING-MANAGER-CONFIRM: Status changed to completed, sending email notification...`);
        
        try {
          // Get the full order data needed for the email
          const { data: fullOrderData, error: orderFetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', campaignData.order_id)
            .single();

          if (orderFetchError || !fullOrderData) {
            console.error('📧 MARKETING-MANAGER-CONFIRM: Error fetching order data for completion email:', orderFetchError);
          } else {
            const emailSent = await sendOrderStatusChangeEmail(fullOrderData, 'completed', supabase);
            
            if (emailSent) {
              console.log(`📧 MARKETING-MANAGER-CONFIRM: ✅ Completion email notification sent successfully for order ${campaignData.order_id}`);
            } else {
              console.log(`📧 MARKETING-MANAGER-CONFIRM: ❌ Completion email notification failed for order ${campaignData.order_id}`);
            }
          }
        } catch (emailError) {
          console.error(`📧 MARKETING-MANAGER-CONFIRM: ❌ Error sending completion email notification for order ${campaignData.order_id}:`, emailError);
          // Don't fail the entire request if email fails
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Action ${action} confirmed successfully`,
      updatedData: updateData
    });
  } catch (error) {
    console.error('Error in confirm-action API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
