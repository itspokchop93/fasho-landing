import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    id,
    directStreams, 
    playlistStreams, 
    playlistAssignmentsNeeded, 
    timeOnPlaylists,
    smmQty,
    smmRuns
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Campaign total ID is required' });
  }

  // Validate numeric fields
  if (directStreams < 0 || playlistStreams < 0 || playlistAssignmentsNeeded < 0 || 
      timeOnPlaylists < 0 || smmQty < 0 || smmRuns < 0) {
    return res.status(400).json({ error: 'All numeric values must be non-negative' });
  }

  try {
    const supabase = createAdminClient();

    // Update campaign total
    const { data: updatedTotal, error: updateError } = await supabase
      .from('campaign_totals')
      .update({
        direct_streams: directStreams,
        playlist_streams: playlistStreams,
        playlist_assignments_needed: playlistAssignmentsNeeded,
        time_on_playlists: timeOnPlaylists,
        smm_qty: smmQty,
        smm_runs: smmRuns,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating campaign total:', updateError);
      return res.status(500).json({ error: 'Failed to update campaign total' });
    }

    if (!updatedTotal) {
      return res.status(404).json({ error: 'Campaign total not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Campaign total updated successfully',
      campaignTotal: {
        id: updatedTotal.id,
        packageName: updatedTotal.package_name,
        directStreams: updatedTotal.direct_streams,
        playlistStreams: updatedTotal.playlist_streams,
        playlistAssignmentsNeeded: updatedTotal.playlist_assignments_needed,
        timeOnPlaylists: updatedTotal.time_on_playlists,
        smmQty: updatedTotal.smm_qty,
        smmRuns: updatedTotal.smm_runs,
        isActive: updatedTotal.is_active
      }
    });
  } catch (error) {
    console.error('Error in update-campaign-total API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
