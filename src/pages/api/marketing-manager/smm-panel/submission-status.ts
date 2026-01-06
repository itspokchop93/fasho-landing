import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

// Database format (snake_case)
interface DbSubmissionLog {
  id: string;
  campaign_id: string;
  order_set_id: string;
  service_id: string;
  quantity: number;
  drip_runs: number | null;
  interval_minutes: number | null;
  followiz_order_id: string | null;
  status: 'pending' | 'success' | 'failed';
  error_message: string | null;
  created_at: string;
}

// Frontend format (camelCase)
interface SubmissionLog {
  orderSetId: string;
  serviceId: string;
  quantity: number;
  success: boolean;
  followizOrderId?: number;
  error?: string;
}

// Transform DB log to frontend format
function transformLog(log: DbSubmissionLog): SubmissionLog {
  return {
    orderSetId: log.order_set_id,
    serviceId: log.service_id,
    quantity: log.quantity,
    success: log.status === 'success',
    followizOrderId: log.followiz_order_id ? parseInt(log.followiz_order_id) : undefined,
    error: log.error_message || undefined,
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createAdminClient();

  try {
    const { campaignIds } = req.query;

    if (!campaignIds) {
      return res.status(400).json({ error: 'Missing campaignIds parameter' });
    }

    // Parse campaign IDs (can be comma-separated)
    const ids = (campaignIds as string).split(',').map(id => id.trim());
    
    console.log('🔍 [SMM Status] Checking status for campaign IDs:', ids.slice(0, 5), `(${ids.length} total)`);

    // Fetch the most recent submission logs for each campaign
    // Group by campaign_id and order_set_id to get the latest status for each
    const { data: logs, error } = await supabase
      .from('smm_purchase_logs')
      .select('*')
      .in('campaign_id', ids)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [SMM Status] Error fetching submission logs:', error);
      return res.status(500).json({ error: 'Failed to fetch submission status' });
    }
    
    console.log(`📊 [SMM Status] Found ${logs?.length || 0} total logs in database`);
    
    // Log a sample of what we found
    if (logs && logs.length > 0) {
      const uniqueCampaigns = [...new Set(logs.map(l => l.campaign_id))];
      console.log(`📋 [SMM Status] Logs found for ${uniqueCampaigns.length} campaigns:`, uniqueCampaigns.slice(0, 5));
    }

    // Group logs by campaign_id and get the latest submission batch for each
    const campaignStatuses: Record<string, {
      hasSubmissions: boolean;
      hasFailures: boolean;
      allSuccess: boolean;
      submissions: SubmissionLog[];
    }> = {};

    // Initialize all requested campaigns
    ids.forEach(id => {
      campaignStatuses[id] = {
        hasSubmissions: false,
        hasFailures: false,
        allSuccess: false,
        submissions: [],
      };
    });

    if (logs && logs.length > 0) {
      // Group by campaign and find the most recent batch (same created_at within a few seconds)
      const campaignLogs: Record<string, DbSubmissionLog[]> = {};
      
      logs.forEach((log: DbSubmissionLog) => {
        if (!campaignLogs[log.campaign_id]) {
          campaignLogs[log.campaign_id] = [];
        }
        campaignLogs[log.campaign_id].push(log);
      });

      // For each campaign, get the most recent batch of submissions
      Object.entries(campaignLogs).forEach(([campaignId, allLogs]) => {
        if (allLogs.length === 0) return;

        // Get unique order_set_ids and their most recent status
        const orderSetStatuses: Record<string, DbSubmissionLog> = {};
        
        allLogs.forEach(log => {
          const key = log.order_set_id || log.service_id;
          // Only keep the most recent log for each order set
          if (!orderSetStatuses[key] || new Date(log.created_at) > new Date(orderSetStatuses[key].created_at)) {
            orderSetStatuses[key] = log;
          }
        });

        const latestLogs = Object.values(orderSetStatuses);
        const hasFailures = latestLogs.some(log => log.status === 'failed');
        const allSuccess = latestLogs.every(log => log.status === 'success');

        // Transform to frontend format
        const transformedSubmissions = latestLogs.map(transformLog);

        campaignStatuses[campaignId] = {
          hasSubmissions: true,
          hasFailures,
          allSuccess,
          submissions: transformedSubmissions,
        };
        
        // Debug: Log campaigns with failures
        if (hasFailures) {
          console.log(`⚠️ [SMM Status] Campaign ${campaignId} has FAILURES: ${transformedSubmissions.filter(s => !s.success).length} failed orders`);
        }
      });
    }
    
    // Count how many campaigns have failures
    const campaignsWithFailures = Object.values(campaignStatuses).filter(s => s.hasFailures).length;
    console.log(`📤 [SMM Status] Returning status for ${Object.keys(campaignStatuses).length} campaigns, ${campaignsWithFailures} with failures`);

    return res.status(200).json(campaignStatuses);
  } catch (error) {
    console.error('Error in submission status check:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);

