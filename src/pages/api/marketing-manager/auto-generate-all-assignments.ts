import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';
import { extractTrackIdFromUrl, getAvailablePlaylistsWithProtection } from '../../../utils/playlist-assignment-protection';

interface PlaylistAssignment {
  id: string;
  name: string;
  genre: string;
}

// Helper function to generate playlist assignments for a campaign
async function generatePlaylistAssignmentsForCampaign(supabase: any, campaign: any): Promise<PlaylistAssignment[]> {
  // Extract genre from billing_info JSONB field (same as order details page)
  let userGenre = 'General'; // Default fallback
  
  // Use the same logic as order details page - check billing_info first (the reliable source)
  if (campaign.orders?.billing_info?.musicGenre) {
    userGenre = campaign.orders.billing_info.musicGenre;
    console.log(`🎵 AUTO-ASSIGN: Found genre in billing_info: ${userGenre} for campaign ${campaign.id}`);
  } else {
    console.log(`🎵 AUTO-ASSIGN: No genre found in billing_info, using General for campaign ${campaign.id}`);
  }

  // Extract track ID from song_link or use existing track_id
  let trackId = campaign.track_id;
  if (!trackId && campaign.song_link) {
    trackId = extractTrackIdFromUrl(campaign.song_link);
    console.log(`🎵 AUTO-ASSIGN: Extracted track ID ${trackId} from song link for campaign ${campaign.id}`);
    
    // Update the campaign with the extracted track_id for future use
    if (trackId) {
      await supabase
        .from('marketing_campaigns')
        .update({ track_id: trackId })
        .eq('id', campaign.id);
    }
  }

  // Get package configuration to determine how many playlists are needed
  const { data: packageConfig, error: packageError } = await supabase
    .from('campaign_totals')
    .select('playlist_assignments_needed')
    .eq('package_name', campaign.package_name.toUpperCase())
    .single();

  if (packageError || !packageConfig) {
    console.error(`Error fetching package configuration for ${campaign.package_name}:`, packageError);
    return [];
  }

  const playlistsNeeded = packageConfig.playlist_assignments_needed;
  console.log(`🎵 AUTO-ASSIGN: Need ${playlistsNeeded} playlists for ${campaign.package_name} package, campaign ${campaign.id}`);

  // Get playlist assignments with duplicate protection
  const selectedPlaylists = await getAvailablePlaylistsWithProtection(
    supabase,
    userGenre,
    playlistsNeeded,
    trackId || '',
    campaign.id // Exclude current campaign for re-assignments
  );

  return selectedPlaylists;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Get all campaigns that don't have playlist assignments or have empty assignments
    const { data: campaigns, error: campaignsError } = await supabase
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
      .or('playlist_assignments.is.null,playlist_assignments.eq.[]');

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }

    if (!campaigns || campaigns.length === 0) {
      return res.status(200).json({ 
        message: 'No campaigns need playlist assignments',
        updated: 0
      });
    }

    console.log(`🎵 AUTO-ASSIGN: Found ${campaigns.length} campaigns needing playlist assignments`);

    let updatedCount = 0;

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        const playlistAssignments = await generatePlaylistAssignmentsForCampaign(supabase, campaign);
        
        if (playlistAssignments.length > 0) {
          // Update the campaign with generated playlist assignments
          const { error: updateError } = await supabase
            .from('marketing_campaigns')
            .update({
              playlist_assignments: playlistAssignments,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

          if (updateError) {
            console.error(`Error updating campaign ${campaign.id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`🎵 AUTO-ASSIGN: Successfully assigned ${playlistAssignments.length} playlists to campaign ${campaign.id}`);
          }
        }
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
      }
    }

    console.log(`🎉 AUTO-ASSIGN: Completed! Updated ${updatedCount} campaigns with playlist assignments`);

    res.status(200).json({
      message: `Successfully generated playlist assignments for ${updatedCount} campaigns`,
      updated: updatedCount,
      totalChecked: campaigns.length
    });
  } catch (error) {
    console.error('Error in auto-generate-all-assignments API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
