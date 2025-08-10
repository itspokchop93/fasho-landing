import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Get active campaigns count (campaigns with both direct streams and playlists confirmed)
    const { data: activeCampaignsData, error: activeCampaignsError } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('direct_streams_confirmed', true)
      .eq('playlists_added_confirmed', true)
      .neq('campaign_status', 'Completed');

    if (activeCampaignsError) {
      console.error('Error fetching active campaigns:', activeCampaignsError);
      return res.status(500).json({ error: 'Failed to fetch active campaigns' });
    }

    // Get actions needed count (campaigns that need either direct streams or playlist confirmation)
    const { data: actionsNeededData, error: actionsNeededError } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .or('direct_streams_confirmed.eq.false,playlists_added_confirmed.eq.false')
      .neq('campaign_status', 'Completed')
      .is('hidden_until', null);

    if (actionsNeededError) {
      console.error('Error fetching actions needed:', actionsNeededError);
      return res.status(500).json({ error: 'Failed to fetch actions needed' });
    }

    // Get total playlists count
    const { data: totalPlaylistsData, error: totalPlaylistsError } = await supabase
      .from('playlist_network')
      .select('id')
      .eq('is_active', true);

    if (totalPlaylistsError) {
      console.error('Error fetching total playlists:', totalPlaylistsError);
      return res.status(500).json({ error: 'Failed to fetch total playlists' });
    }

    // Get playlisted songs count (campaigns that have been added to playlists but not removed)
    const { data: playlistedSongsData, error: playlistedSongsError } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('playlists_added_confirmed', true)
      .eq('removed_from_playlists', false);

    if (playlistedSongsError) {
      console.error('Error fetching playlisted songs:', playlistedSongsError);
      return res.status(500).json({ error: 'Failed to fetch playlisted songs' });
    }

    const counterData = {
      activeCampaigns: activeCampaignsData?.length || 0,
      actionsNeeded: actionsNeededData?.length || 0,
      totalPlaylists: totalPlaylistsData?.length || 0,
      playlistedSongs: playlistedSongsData?.length || 0
    };

    res.status(200).json(counterData);
  } catch (error) {
    console.error('Error in counter-data API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
