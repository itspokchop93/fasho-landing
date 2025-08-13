import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';
import { extractTrackIdFromUrl, getAvailablePlaylistsWithProtection } from '../../../utils/playlist-assignment-protection';

interface PlaylistAssignment {
  id: string;
  name: string;
  genre: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    const supabase = createAdminClient();

    // Get campaign details with order information
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_id,
        order_number,
        song_name,
        song_link,
        track_id,
        package_name,
        package_id,
        playlist_assignments,
        orders!inner(billing_info)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Extract genre from billing_info JSONB field (same as order details page)
    let userGenre = 'General'; // Default fallback
    
    // Use the same logic as order details page - check billing_info first (the reliable source)
    if ((campaign.orders as any)?.billing_info?.musicGenre) {
      userGenre = (campaign.orders as any).billing_info.musicGenre;
      console.log(`🎵 PLAYLIST-ASSIGNMENT: Found genre in billing_info: ${userGenre}`);
    } else {
      console.log(`🎵 PLAYLIST-ASSIGNMENT: No genre found in billing_info, using General`);
    }

    console.log(`🎵 PLAYLIST-ASSIGNMENT: Generating assignments for campaign ${campaignId}, package: ${campaign.package_name}, genre: ${userGenre}`);

    // Get package configuration to determine how many playlists are needed
    const { data: packageConfig, error: packageError } = await supabase
      .from('campaign_totals')
      .select('playlist_assignments_needed')
      .eq('package_name', campaign.package_name.toUpperCase())
      .single();

    if (packageError || !packageConfig) {
      console.error('Error fetching package configuration:', packageError);
      return res.status(500).json({ error: 'Package configuration not found' });
    }

    const playlistsNeeded = packageConfig.playlist_assignments_needed;
    console.log(`🎵 PLAYLIST-ASSIGNMENT: Need ${playlistsNeeded} playlists for ${campaign.package_name} package`);

    // Extract track ID from song_link or use existing track_id
    let trackId = campaign.track_id;
    if (!trackId && campaign.song_link) {
      trackId = extractTrackIdFromUrl(campaign.song_link);
      console.log(`🎵 PLAYLIST-ASSIGNMENT: Extracted track ID ${trackId} from song link`);
      
      // Update the campaign with the extracted track_id for future use
      if (trackId) {
        await supabase
          .from('marketing_campaigns')
          .update({ track_id: trackId })
          .eq('id', campaignId);
      }
    }

    // Get playlist assignments with duplicate protection
    const selectedPlaylists = await getAvailablePlaylistsWithProtection(
      supabase,
      userGenre,
      playlistsNeeded,
      trackId || '',
      campaignId // Exclude current campaign for genre changes
    );

    // Update the campaign with the generated playlist assignments
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('marketing_campaigns')
      .update({
        playlist_assignments: selectedPlaylists,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating campaign with playlist assignments:', updateError);
      return res.status(500).json({ error: 'Failed to update campaign' });
    }

    console.log(`🎵 PLAYLIST-ASSIGNMENT: Successfully assigned ${selectedPlaylists.length} playlists to campaign ${campaignId}`);

    res.status(200).json({
      success: true,
      message: `Generated ${selectedPlaylists.length} playlist assignments`,
      playlistAssignments: selectedPlaylists,
      userGenre,
      campaign: updatedCampaign
    });
  } catch (error) {
    console.error('Error in generate-playlist-assignments API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
