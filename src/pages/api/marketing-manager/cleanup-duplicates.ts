import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    console.log('🧹 Starting duplicate cleanup...');

    // First, find all duplicates (same order_id)
    const { data: duplicates, error: duplicatesError } = await supabase
      .from('marketing_campaigns')
      .select('id, order_id, order_number, created_at')
      .order('order_id, created_at');

    if (duplicatesError) {
      console.error('Error fetching campaigns for cleanup:', duplicatesError);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }

    // Group by order_id to identify duplicates
    const orderGroups: { [key: string]: any[] } = {};
    duplicates?.forEach(campaign => {
      if (!orderGroups[campaign.order_id]) {
        orderGroups[campaign.order_id] = [];
      }
      orderGroups[campaign.order_id].push(campaign);
    });

    // Find orders with multiple campaigns
    const duplicateOrders = Object.entries(orderGroups).filter(([_, campaigns]) => campaigns.length > 1);
    
    if (duplicateOrders.length === 0) {
      return res.status(200).json({ 
        message: 'No duplicates found',
        duplicateOrders: 0,
        duplicatesRemoved: 0
      });
    }

    console.log(`Found ${duplicateOrders.length} orders with duplicates`);

    let totalRemoved = 0;
    const idsToDelete: string[] = [];

    // For each order with duplicates, keep only the oldest campaign
    duplicateOrders.forEach(([orderId, campaigns]) => {
      // Sort by created_at (oldest first)
      campaigns.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      // Keep the first (oldest), mark the rest for deletion
      const toDelete = campaigns.slice(1);
      toDelete.forEach(campaign => {
        idsToDelete.push(campaign.id);
        console.log(`Marking for deletion: Order ${campaign.order_number} - Campaign ${campaign.id}`);
      });
      
      totalRemoved += toDelete.length;
    });

    // Delete duplicate campaigns
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('marketing_campaigns')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error deleting duplicate campaigns:', deleteError);
        return res.status(500).json({ error: 'Failed to delete duplicates' });
      }
    }

    console.log(`🎉 Cleanup completed! Removed ${totalRemoved} duplicate campaigns.`);

    res.status(200).json({
      message: `Successfully removed ${totalRemoved} duplicate campaigns`,
      duplicateOrders: duplicateOrders.length,
      duplicatesRemoved: totalRemoved
    });

  } catch (error) {
    console.error('Error in cleanup-duplicates API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
