import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Check recent orders that might be missing campaigns
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        status,
        created_at,
        order_items(
          id,
          track_title,
          package_name
        )
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      return res.status(500).json({ error: 'Failed to fetch orders', details: ordersError });
    }

    // Check which have campaigns
    const orderIds = recentOrders?.map(o => o.id) || [];
    const { data: existingCampaigns, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select('order_id, order_number, song_name')
      .in('order_id', orderIds);

    if (campaignsError) {
      return res.status(500).json({ error: 'Failed to fetch campaigns', details: campaignsError });
    }

    const campaignOrderIds = new Set(existingCampaigns?.map(c => c.order_id) || []);

    // Test database functions
    let functionTests = {
      get_package_streams: { exists: false, error: null as string | null },
      get_package_configuration: { exists: false, error: null as string | null }
    };

    // Test get_package_streams
    try {
      const { data: streamData, error: streamError } = await supabase.rpc('get_package_streams', {
        package_name: 'LEGENDARY'
      });
      functionTests.get_package_streams = { 
        exists: !streamError, 
        error: streamError?.message ?? null,
        result: streamData || null
      };
    } catch (e: any) {
      functionTests.get_package_streams.error = e.message;
    }

    // Test get_package_configuration
    try {
      const { data: configData, error: configError } = await supabase.rpc('get_package_configuration', {
        package_name: 'LEGENDARY'
      });
      functionTests.get_package_configuration = { 
        exists: !configError, 
        error: configError?.message ?? null,
        result: configData || null
      };
    } catch (e: any) {
      functionTests.get_package_configuration.error = e.message;
    }

    // Check trigger existence
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_timing')
      .eq('trigger_name', 'create_marketing_campaign_on_order_insert');

    const ordersAnalysis = recentOrders?.map(order => ({
      order_number: order.order_number,
      customer_name: order.customer_name,
      created_at: order.created_at,
      status: order.status,
      items_count: order.order_items?.length || 0,
      has_campaign: campaignOrderIds.has(order.id),
      missing_campaign: !campaignOrderIds.has(order.id)
    })) || [];

    const missingCampaigns = ordersAnalysis.filter(o => o.missing_campaign);

    return res.status(200).json({
      success: true,
      summary: {
        total_recent_orders: recentOrders?.length || 0,
        orders_with_campaigns: campaignOrderIds.size,
        orders_missing_campaigns: missingCampaigns.length,
        trigger_exists: triggers && triggers.length > 0
      },
      database_functions: functionTests,
      trigger_info: triggers || [],
      missing_campaigns: missingCampaigns,
      recent_orders: ordersAnalysis,
      existing_campaigns: existingCampaigns || [],
      recommendations: missingCampaigns.length > 0 ? [
        'Database trigger is not working properly',
        'Use the Force Import API to manually import missing orders',
        'Check if get_package_configuration function exists in database'
      ] : [
        'Import system appears to be working correctly'
      ]
    });

  } catch (error: any) {
    console.error('Error in debug check:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

export default requireAdminAuth(handler);
