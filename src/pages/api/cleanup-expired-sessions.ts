import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);

    console.log('🧹 Starting cleanup of expired checkout sessions...');

    // Mark sessions older than 24 hours as expired
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredSessions, error: updateError } = await supabase
      .from('checkout_sessions')
      .update({ status: 'expired' })
      .lt('created_at', twentyFourHoursAgo)
      .eq('status', 'active')
      .select('id');

    if (updateError) {
      console.error('Error updating expired sessions:', updateError);
      throw updateError;
    }

    // Delete very old sessions (older than 7 days) to keep database clean
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedSessions, error: deleteError } = await supabase
      .from('checkout_sessions')
      .delete()
      .lt('created_at', sevenDaysAgo)
      .neq('status', 'completed') // Keep completed sessions for record-keeping
      .select('id');

    if (deleteError) {
      console.error('Error deleting old sessions:', deleteError);
      throw deleteError;
    }

    const expiredCount = expiredSessions?.length || 0;
    const deletedCount = deletedSessions?.length || 0;

    console.log(`🧹 Cleanup completed: ${expiredCount} sessions marked as expired, ${deletedCount} old sessions deleted`);

    res.status(200).json({ 
      success: true,
      expired: expiredCount,
      deleted: deletedCount,
      message: 'Session cleanup completed successfully'
    });

  } catch (error) {
    console.error('Error during session cleanup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}