import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playlistId } = req.body;

  if (!playlistId) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const supabase = createAdminClient();

    console.log(`🔍 USAGE-COUNT: Checking usage count for playlist ${playlistId}`);

    // Check if playlist is currently being used in any active campaigns
    const { data: activeCampaigns, error: campaignCheckError } = await supabase
      .from('marketing_campaigns')
      .select('id, order_number, playlist_assignments')
      .neq('campaign_status', 'Completed');

    if (campaignCheckError) {
      console.error('Error checking active campaigns:', campaignCheckError);
      return res.status(500).json({ error: 'Failed to check playlist usage' });
    }

    // Filter campaigns that contain this playlist ID
    const campaignsUsingPlaylist = activeCampaigns?.filter(campaign => {
      const assignments = Array.isArray(campaign.playlist_assignments) ? campaign.playlist_assignments : [];
      return assignments.some((assignment: any) => assignment.id === playlistId);
    }) || [];

    console.log(`🔍 USAGE-COUNT: Found ${campaignsUsingPlaylist.length} campaigns using playlist ${playlistId}`);

    res.status(200).json({ 
      success: true, 
      usageCount: campaignsUsingPlaylist.length,
      campaignNumbers: campaignsUsingPlaylist.map(c => c.order_number)
    });
  } catch (error) {
    console.error('Error in playlist-usage-count API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
