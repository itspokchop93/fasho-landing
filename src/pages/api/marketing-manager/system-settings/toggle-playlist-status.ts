import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playlistId, isActive } = req.body;

  if (!playlistId || typeof isActive !== 'boolean') {
    return res.status(400).json({ 
      error: 'Playlist ID and isActive status are required' 
    });
  }

  try {
    const supabase = createAdminClient();

    // Update playlist status
    const { data: updatedPlaylist, error: updateError } = await supabase
      .from('playlist_network')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', playlistId)
      .select('id, playlist_name, is_active')
      .single();

    if (updateError) {
      console.error('Error updating playlist status:', updateError);
      return res.status(500).json({ error: 'Failed to update playlist status' });
    }

    if (!updatedPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: `Playlist ${isActive ? 'activated' : 'deactivated'} successfully`,
      playlist: updatedPlaylist
    });
  } catch (error) {
    console.error('Error in toggle-playlist-status API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
