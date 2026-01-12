import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import { submitFollowizOrder, getFollowizBalance, getFollowizServices } from '../../../../utils/followiz-api';

interface SubmitPlaylistPurchaseBody {
  playlistId: string;
  playlistName: string;
  playlistLink: string;
  serviceType: 'playlist_followers' | 'playlist_streams';
  quantity: number;
  dripRuns?: number | null;
  intervalMinutes?: number | null;
}

// Helper function to get service info from Followiz API
async function getServiceInfo(serviceId: string): Promise<{ name: string | null; price: number | null }> {
  try {
    const result = await getFollowizServices();
    
    if (!result.success || !result.services) {
      return { name: null, price: null };
    }

    const service = result.services.find(s => s.service.toString() === serviceId);
    
    if (service) {
      return { name: service.name, price: parseFloat(service.rate) };
    }
    
    return { name: null, price: null };
  } catch (error) {
    console.error('Error fetching service info:', error);
    return { name: null, price: null };
  }
}

// Calculate cost based on quantity and price per 1k
function calculateCost(quantity: number, dripRuns: number | null, pricePerK: number | null): number | null {
  if (pricePerK === null) return null;
  const totalQuantity = dripRuns && dripRuns > 0 ? quantity * dripRuns : quantity;
  return (totalQuantity / 1000) * pricePerK;
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
      intervalMinutes 
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

    console.log(`📤 Starting playlist ${serviceType} purchase for: ${playlistName}`);

    // Fetch the service configuration from database
    const { data: serviceConfig, error: serviceError } = await supabase
      .from('smm_playlist_services')
      .select('*')
      .eq('service_type', serviceType)
      .eq('is_active', true)
      .single();

    if (serviceError || !serviceConfig) {
      console.error('Error fetching service config:', serviceError);
      return res.status(400).json({ 
        success: false, 
        error: `No ${serviceType.replace('_', ' ')} service configured. Please set up the service ID in Purchase API Settings.` 
      });
    }

    console.log(`📋 Service config:`, {
      serviceId: serviceConfig.service_id,
      serviceName: serviceConfig.service_name,
      pricePerK: serviceConfig.price_per_1k,
    });

    // Get current balance before purchase
    const balanceBefore = await getFollowizBalance();
    
    // Get service info for accurate pricing
    const serviceInfo = await getServiceInfo(serviceConfig.service_id);
    const pricePerK = serviceInfo.price || serviceConfig.price_per_1k;
    const estimatedCost = calculateCost(quantity, dripRuns || null, pricePerK);

    // Submit the order to Followiz
    const result = await submitFollowizOrder({
      serviceId: serviceConfig.service_id,
      link: playlistLink,
      quantity: quantity,
      runs: dripRuns || null,
      interval: intervalMinutes || null,
    });

    // Log the submission to database
    const { error: logError } = await supabase
      .from('smm_playlist_purchase_logs')
      .insert({
        playlist_id: playlistId,
        playlist_name: playlistName,
        playlist_link: playlistLink,
        service_type: serviceType,
        service_id: serviceConfig.service_id,
        quantity: quantity,
        drip_runs: dripRuns || null,
        interval_minutes: intervalMinutes || null,
        followiz_order_id: result.orderId?.toString() || null,
        status: result.success ? 'success' : 'failed',
        error_message: result.error || null,
        api_response: result.rawResponse || null,
        submitted_by: adminUser.id,
      });

    if (logError) {
      console.error('Error logging playlist purchase:', logError);
    }

    // Get updated balance after purchase
    const balanceAfter = await getFollowizBalance();

    if (!result.success) {
      console.error(`❌ Failed to submit playlist ${serviceType} order:`, result.error);
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to submit order to SMM panel',
        balanceBefore: balanceBefore.success ? balanceBefore.balance : null,
        balanceAfter: balanceAfter.success ? balanceAfter.balance : null,
      });
    }

    console.log(`✅ Playlist ${serviceType} order submitted successfully. Order ID: ${result.orderId}`);

    return res.status(200).json({
      success: true,
      message: `Successfully submitted ${serviceType.replace('_', ' ')} order`,
      orderId: result.orderId,
      serviceId: serviceConfig.service_id,
      serviceName: serviceConfig.service_name || serviceInfo.name,
      quantity: quantity,
      dripRuns: dripRuns || null,
      intervalMinutes: intervalMinutes || null,
      pricePerK: pricePerK,
      estimatedCost: estimatedCost,
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
