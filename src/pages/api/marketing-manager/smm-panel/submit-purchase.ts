import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import { submitFollowizOrder, getFollowizBalance } from '../../../../utils/followiz-api';

interface OrderSet {
  id: string;
  package_name: string;
  service_id: string;
  quantity: number;
  drip_runs: number | null;
  interval_minutes: number | null;
}

interface SubmissionResult {
  orderSetId: string;
  serviceId: string;
  quantity: number;
  success: boolean;
  followizOrderId?: number;
  error?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createAdminClient();

  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: campaignId' 
      });
    }

    console.log(`📤 Starting SMM purchase submission for campaign: ${campaignId}`);

    // Fetch the campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('id, order_number, song_link, package_name, customer_name, song_name')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError);
      return res.status(404).json({ 
        success: false, 
        error: 'Campaign not found' 
      });
    }

    console.log(`📋 Campaign details:`, {
      orderNumber: campaign.order_number,
      packageName: campaign.package_name,
      songName: campaign.song_name,
    });

    // Fetch order sets for this package (LIVE from database)
    const { data: orderSets, error: orderSetsError } = await supabase
      .from('smm_order_sets')
      .select('*')
      .eq('package_name', campaign.package_name.toUpperCase())
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (orderSetsError) {
      console.error('Error fetching order sets:', orderSetsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch order sets configuration' 
      });
    }

    if (!orderSets || orderSets.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: `No order sets configured for package: ${campaign.package_name}` 
      });
    }

    console.log(`📦 Found ${orderSets.length} order sets for ${campaign.package_name} package`);

    // Submit each order set to Followiz
    const results: SubmissionResult[] = [];
    let allSuccessful = true;

    for (const orderSet of orderSets) {
      console.log(`🚀 Submitting order set: Service ${orderSet.service_id}, Qty ${orderSet.quantity}`);

      const result = await submitFollowizOrder({
        serviceId: orderSet.service_id,
        link: campaign.song_link,
        quantity: orderSet.quantity,
        runs: orderSet.drip_runs,
        interval: orderSet.interval_minutes,
      });

      // Log the submission to database
      const { error: logError } = await supabase
        .from('smm_purchase_logs')
        .insert({
          campaign_id: campaign.id,
          order_number: campaign.order_number,
          song_link: campaign.song_link,
          package_name: campaign.package_name,
          order_set_id: orderSet.id,
          service_id: orderSet.service_id,
          quantity: orderSet.quantity,
          drip_runs: orderSet.drip_runs,
          interval_minutes: orderSet.interval_minutes,
          followiz_order_id: result.orderId?.toString() || null,
          status: result.success ? 'success' : 'failed',
          error_message: result.error || null,
          api_response: result.rawResponse || null,
          submitted_by: adminUser.id,
        });

      if (logError) {
        console.error('Error logging purchase:', logError);
      }

      const submissionResult: SubmissionResult = {
        orderSetId: orderSet.id,
        serviceId: orderSet.service_id,
        quantity: orderSet.quantity,
        success: result.success,
        followizOrderId: result.orderId,
        error: result.error,
      };

      results.push(submissionResult);

      if (!result.success) {
        allSuccessful = false;
        console.error(`❌ Failed to submit order set ${orderSet.id}:`, result.error);
      } else {
        console.log(`✅ Order set submitted successfully. Followiz Order ID: ${result.orderId}`);
      }
    }

    // If all orders were successful, update the campaign's direct_streams_confirmed status
    if (allSuccessful) {
      const { error: updateError } = await supabase
        .from('marketing_campaigns')
        .update({
          direct_streams_confirmed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (updateError) {
        console.error('Error updating campaign status:', updateError);
      } else {
        console.log(`✅ Campaign ${campaign.order_number} marked as direct streams confirmed`);
      }
    }

    // Get updated balance after purchases
    const balanceResult = await getFollowizBalance();

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`📊 Submission complete: ${successCount} successful, ${failedCount} failed`);

    return res.status(200).json({
      success: allSuccessful,
      message: allSuccessful 
        ? `Successfully submitted ${successCount} orders to SMM panel` 
        : `Completed with ${failedCount} failed submissions`,
      results,
      totalSubmitted: orderSets.length,
      successCount,
      failedCount,
      newBalance: balanceResult.success ? balanceResult.balance : null,
      currency: balanceResult.success ? balanceResult.currency : null,
    });

  } catch (error) {
    console.error('Error in SMM purchase submission:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

export default requireAdminAuth(handler);

