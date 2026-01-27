import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../../utils/admin/auth';

const BATCH_SIZE = 50; // Process 50 customers at a time

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verify admin authentication
  const token = getAdminTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const adminSession = await verifyAdminToken(token);

  if (!adminSession) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const tokenAmount = parseInt(amount);
    
    // Format reason with "Admin" prefix
    let formattedReason = 'Admin - Bulk Credit';
    if (reason && reason.trim()) {
      formattedReason = `Admin - ${reason.trim()}`;
    }

    const supabase = createAdminClient();

    // Get admin user id from their email
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', adminSession.email)
      .single();

    const adminId = adminUser?.id || null;

    // Get ALL unique customers with user_ids from orders
    // These are customers who have made purchases and have accounts
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('user_id')
      .not('user_id', 'is', null);

    if (ordersError) {
      console.error('🪙 BULK-CREDIT: Error fetching customers:', ordersError);
      return res.status(500).json({ success: false, message: 'Failed to fetch customers' });
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean))] as string[];

    if (uniqueUserIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No customers found to credit' });
    }

    console.log(`🪙 BULK-CREDIT: Starting bulk credit of ${tokenAmount} tokens to ${uniqueUserIds.length} customers`);

    // Process in batches to avoid timeouts and ensure reliability
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
      const batch = uniqueUserIds.slice(i, i + BATCH_SIZE);
      
      // Process each user in the batch
      const batchPromises = batch.map(async (userId) => {
        try {
          // Use the admin_adjust_fashokens function for each user
          const { data: result, error } = await supabase
            .rpc('admin_adjust_fashokens', {
              p_admin_id: adminId,
              p_user_id: userId,
              p_amount: tokenAmount,
              p_is_addition: true,
              p_reason: formattedReason
            });

          if (error) {
            console.error(`🪙 BULK-CREDIT: Error crediting user ${userId}:`, error);
            return { success: false, userId, error: error.message };
          }

          if (result && result[0] && result[0].success) {
            return { success: true, userId };
          } else {
            return { success: false, userId, error: result?.[0]?.error_message || 'Unknown error' };
          }
        } catch (err: any) {
          console.error(`🪙 BULK-CREDIT: Exception crediting user ${userId}:`, err);
          return { success: false, userId, error: err.message };
        }
      });

      // Wait for all in this batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Count successes and failures
      batchResults.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          if (errors.length < 10) { // Only keep first 10 errors
            errors.push(`User ${result.userId}: ${result.error}`);
          }
        }
      });

      console.log(`🪙 BULK-CREDIT: Processed batch ${Math.floor(i / BATCH_SIZE) + 1}, ${successCount} success, ${failCount} failed`);
    }

    console.log(`🪙 BULK-CREDIT: Completed! ${successCount} customers credited, ${failCount} failed`);

    return res.status(200).json({
      success: true,
      message: `Successfully credited ${successCount} customers with ${tokenAmount.toLocaleString()} FASHOKENS each`,
      stats: {
        totalCustomers: uniqueUserIds.length,
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('🪙 BULK-CREDIT: Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
