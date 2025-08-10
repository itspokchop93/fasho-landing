import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Fetch all campaign totals
    const { data: campaignTotalsData, error: campaignTotalsError } = await supabase
      .from('campaign_totals')
      .select(`
        id,
        package_name,
        direct_streams,
        playlist_streams,
        playlist_assignments_needed,
        time_on_playlists,
        smm_qty,
        smm_runs,
        is_active,
        created_at,
        updated_at
      `)
      .order('package_name', { ascending: true });

    if (campaignTotalsError) {
      console.error('Error fetching campaign totals:', campaignTotalsError);
      return res.status(500).json({ error: 'Failed to fetch campaign totals' });
    }

    // Transform data for frontend
    const campaignTotals = campaignTotalsData?.map(total => ({
      id: total.id,
      packageName: total.package_name,
      directStreams: total.direct_streams,
      playlistStreams: total.playlist_streams,
      playlistAssignmentsNeeded: total.playlist_assignments_needed,
      timeOnPlaylists: total.time_on_playlists,
      smmQty: total.smm_qty,
      smmRuns: total.smm_runs,
      isActive: total.is_active,
      createdAt: total.created_at,
      updatedAt: total.updated_at
    })) || [];

    res.status(200).json(campaignTotals);
  } catch (error) {
    console.error('Error in campaign-totals API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
