import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import { submitFollowizOrder, getFollowizBalance } from '../../../../utils/followiz-api';

interface SubmitPlaylistPurchaseBody {
  playlistId: string;
  playlistName: string;
  playlistLink: string;
  serviceType: 'playlist_followers' | 'playlist_streams';
  quantity: number;
  dripRuns?: number | null;
  intervalMinutes?: number | null;
}

interface OrderSet {
  id: string;
  package_name: string;
  service_id: string;
  quantity: number;
  drip_runs: number | null;
  interval_minutes: number | null;
  price_per_1k: number | null;
  set_cost: number | null;
}

interface SubmissionResult {
  orderSetId: string;
  serviceId: string;
  quantity: number;
  dripRuns: number | null;
  intervalMinutes: number | null;
  success: boolean;
  followizOrderId?: number;
  error?: string;
  pricePerK?: number | null;
  setCost?: number | null;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createAdminClient();

  try {
    const { 
      playlistId, 
      playlistName, 
      playlistLink, 
      serviceType,
      quantity,
      dripRuns,
      intervalMinutes,
    } = req.body as SubmitPlaylistPurchaseBody;

    // Validation
    if (!playlistId || !playlistName || !playlistLink || !serviceType || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: playlistId, playlistName, playlistLink, serviceType, quantity' 
      });
    }

    if (!['playlist_followers', 'playlist_streams'].includes(serviceType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid serviceType. Must be "playlist_followers" or "playlist_streams"' 
      });
    }

    // Map serviceType to the package_name used in smm_order_sets
    const packageName = serviceType === 'playlist_followers' ? 'PLAYLIST_FOLLOWERS' : 'PLAYLIST_STREAMS';

    console.log(`📤 Starting playlist ${serviceType} purchase for: ${playlistName}`);

    // Fetch all active order sets for this playlist service type
    const { data: orderSets, error: orderSetsError } = await supabase
      .from('smm_order_sets')
      .select('*')
      .eq('package_name', packageName)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (orderSetsError) {
      console.error('Error fetching playlist order sets:', orderSetsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch order sets configuration' 
      });
    }

    if (!orderSets || orderSets.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: `No order sets configured for ${serviceType.replace('_', ' ')}. Please set up order sets in Purchase API Settings.` 
      });
    }

    console.log(`📦 Found ${orderSets.length} order sets for ${packageName}`);

    // Get current balance before purchases
    const balanceBefore = await getFollowizBalance();

    // Submit each order set to Followiz
    const results: SubmissionResult[] = [];
    let allSuccessful = true;

    // Use the quantity/drip values from the request body (entered by admin per-playlist)
    const submissionQuantity = quantity;
    const submissionDripRuns = dripRuns || null;
    const submissionInterval = intervalMinutes || null;

    for (const orderSet of orderSets as OrderSet[]) {
      console.log(`🚀 Submitting playlist order: Service ${orderSet.service_id}, Qty ${submissionQuantity}, Drip ${submissionDripRuns || 'none'}`);

      const result = await submitFollowizOrder({
        serviceId: orderSet.service_id,
        link: playlistLink,
        quantity: submissionQuantity,
        runs: submissionDripRuns,
        interval: submissionInterval,
      });

      // Log the submission to database
      const { error: logError } = await supabase
        .from('smm_playlist_purchase_logs')
        .insert({
          playlist_id: playlistId,
          playlist_name: playlistName,
          playlist_link: playlistLink,
          service_type: serviceType,
          service_id: orderSet.service_id,
          quantity: submissionQuantity,
          drip_runs: submissionDripRuns,
          interval_minutes: submissionInterval,
          followiz_order_id: result.orderId?.toString() || null,
          status: result.success ? 'success' : 'failed',
          error_message: result.error || null,
          api_response: result.rawResponse || null,
          submitted_by: adminUser.id,
        });

      if (logError) {
        console.error('Error logging playlist purchase:', logError);
      }

      // Estimate cost using price_per_1k from the order set if available
      const estimatedCost = orderSet.price_per_1k 
        ? (submissionQuantity / 1000) * orderSet.price_per_1k 
        : null;

      const submissionResult: SubmissionResult = {
        orderSetId: orderSet.id,
        serviceId: orderSet.service_id,
        quantity: submissionQuantity,
        dripRuns: submissionDripRuns,
        intervalMinutes: submissionInterval,
        success: result.success,
        followizOrderId: result.orderId,
        error: result.error,
        pricePerK: orderSet.price_per_1k,
        setCost: estimatedCost,
      };

      results.push(submissionResult);

      if (!result.success) {
        allSuccessful = false;
        console.error(`❌ Failed to submit playlist order for service ${orderSet.service_id}:`, result.error);
      } else {
        console.log(`✅ Playlist order submitted successfully. Followiz Order ID: ${result.orderId}`);
      }
    }

    // Get updated balance after purchases
    const balanceAfter = await getFollowizBalance();

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const totalCost = results.reduce((sum, r) => sum + (r.setCost || 0), 0);

    console.log(`📊 Playlist purchase submission complete: ${successCount} successful, ${failedCount} failed`);

    return res.status(200).json({
      success: allSuccessful,
      message: allSuccessful 
        ? `Successfully submitted ${successCount} order${successCount !== 1 ? 's' : ''} to SMM panel` 
        : `Completed with ${failedCount} failed submission${failedCount !== 1 ? 's' : ''}`,
      results,
      totalSubmitted: results.length,
      successCount,
      failedCount,
      totalEstimatedCost: totalCost,
      balanceBefore: balanceBefore.success ? balanceBefore.balance : null,
      balanceAfter: balanceAfter.success ? balanceAfter.balance : null,
      currency: balanceAfter.success ? balanceAfter.currency : 'USD',
    });

  } catch (error) {
    console.error('Error in playlist purchase submission:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

export default requireAdminAuth(handler);
