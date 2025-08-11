import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

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

  // Get available playlists matching the user's genre
  const { data: genreMatchingPlaylists, error: genrePlaylistError } = await supabase
    .from('playlist_network')
    .select('id, playlist_name, genre')
    .eq('is_active', true)
    .eq('genre', userGenre)
    .order('playlist_name', { ascending: true });

  if (genrePlaylistError) {
    console.error('Error fetching genre-matching playlists:', genrePlaylistError);
    return [];
  }

  let selectedPlaylists: PlaylistAssignment[] = [];

  // Add genre-specific playlists first
  if (genreMatchingPlaylists && genreMatchingPlaylists.length > 0) {
    const genrePlaylistsToAdd = Math.min(genreMatchingPlaylists.length, playlistsNeeded);
    selectedPlaylists = genreMatchingPlaylists.slice(0, genrePlaylistsToAdd).map(playlist => ({
      id: playlist.id,
      name: playlist.playlist_name,
      genre: playlist.genre
    }));

    console.log(`🎵 AUTO-ASSIGN: Added ${genrePlaylistsToAdd} ${userGenre} playlists for campaign ${campaign.id}`);
  }

  // If we still need more playlists, fill with General playlists
  if (selectedPlaylists.length < playlistsNeeded) {
    const remainingNeeded = playlistsNeeded - selectedPlaylists.length;
    
    // Get already selected playlist IDs to avoid duplicates
    const selectedIds = selectedPlaylists.map(p => p.id);
    
    let generalPlaylistQuery = supabase
      .from('playlist_network')
      .select('id, playlist_name, genre')
      .eq('is_active', true)
      .eq('genre', 'General')
      .order('playlist_name', { ascending: true })
      .limit(remainingNeeded);

    // Only add the NOT IN clause if we have selected IDs to exclude
    if (selectedIds.length > 0) {
      generalPlaylistQuery = generalPlaylistQuery.not('id', 'in', `(${selectedIds.join(',')})`);
    }

    const { data: generalPlaylists, error: generalPlaylistError } = await generalPlaylistQuery;

    if (generalPlaylistError) {
      console.error('Error fetching general playlists:', generalPlaylistError);
    } else if (generalPlaylists && generalPlaylists.length > 0) {
      const generalPlaylistsToAdd = generalPlaylists.map(playlist => ({
        id: playlist.id,
        name: playlist.playlist_name,
        genre: playlist.genre
      }));

      selectedPlaylists = [...selectedPlaylists, ...generalPlaylistsToAdd];
      console.log(`🎵 AUTO-ASSIGN: Added ${generalPlaylistsToAdd.length} General playlists to fill remaining slots for campaign ${campaign.id}`);
    }
  }

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
