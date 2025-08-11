import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

// Helper function to generate playlist assignments for a campaign
async function generatePlaylistAssignments(supabase: any, campaign: any): Promise<any[]> {
  // Extract genre from billing_info JSONB field (same as order details page)
  let userGenre = 'General'; // Default fallback
  
  // Debug: Let's see what we actually have
  console.log(`🎵 CAMPAIGNS: Debug for campaign ${campaign.id}:`, {
    hasOrders: !!campaign.orders,
    hasBillingInfo: !!campaign.orders?.billing_info,
    billingInfo: campaign.orders?.billing_info,
    musicGenre: campaign.orders?.billing_info?.musicGenre
  });

  // Use the same logic as order details page - check billing_info first (the reliable source)
  if (campaign.orders?.billing_info?.musicGenre) {
    userGenre = campaign.orders.billing_info.musicGenre;
    console.log(`🎵 CAMPAIGNS: Found genre in billing_info: ${userGenre} for campaign ${campaign.id}`);
  } else {
    console.log(`🎵 CAMPAIGNS: No genre found in billing_info, using General for campaign ${campaign.id}`);
  }

  // Map old package names to new ones
  const packageNameMapping = {
    'ULTRA': 'LEGENDARY',
    'DIAMOND': 'UNSTOPPABLE', 
    'DOMINATE': 'DOMINATE', // Already correct
    'MOMENTUM': 'MOMENTUM', // Already correct
    'BREAKTHROUGH': 'BREAKTHROUGH', // Already correct
    'STARTER': 'BREAKTHROUGH',
    'TEST CAMPAIGN': 'BREAKTHROUGH'
  };

  const mappedPackageName = packageNameMapping[campaign.package_name.toUpperCase()] || campaign.package_name.toUpperCase();
  console.log(`🎵 CAMPAIGNS: Mapping ${campaign.package_name} -> ${mappedPackageName}`);

  // Get package configuration to determine how many playlists are needed
  const { data: packageConfig, error: packageError } = await supabase
    .from('campaign_totals')
    .select('playlist_assignments_needed')
    .eq('package_name', mappedPackageName)
    .single();

  let playlistsNeeded;
  if (packageError || !packageConfig) {
    console.error(`Error fetching package configuration for ${campaign.package_name} (mapped to ${mappedPackageName}):`, packageError);
    // Fallback: use default assignments based on package type
    const fallbackAssignments = {
      'LEGENDARY': 4,
      'UNSTOPPABLE': 4,
      'DOMINATE': 3,
      'MOMENTUM': 2,
      'BREAKTHROUGH': 2
    };
    playlistsNeeded = fallbackAssignments[mappedPackageName] || 2;
    console.log(`🎵 CAMPAIGNS: Using fallback - ${playlistsNeeded} playlists for ${mappedPackageName}`);
  } else {
    playlistsNeeded = packageConfig.playlist_assignments_needed;
  }
  console.log(`🎵 CAMPAIGNS: Need ${playlistsNeeded} playlists for ${campaign.package_name} package, campaign ${campaign.id}`);

  // Get available playlists matching the user's genre
  console.log(`🎵 CAMPAIGNS: Looking for playlists with genre: "${userGenre}"`);
  
  // Use the exact genre from checkout - no mapping needed
  // All playlists should use the same exact genres as the checkout/add-playlist dropdown
  let searchGenre = userGenre;
  console.log(`🎵 CAMPAIGNS: Searching for playlists with exact genre: "${searchGenre}"`);
  
  const { data: genreMatchingPlaylists, error: genrePlaylistError } = await supabase
    .from('playlist_network')
    .select('id, playlist_name, genre, cached_song_count, max_songs')
    .eq('is_active', true)
    .eq('genre', searchGenre)
    .order('playlist_name', { ascending: true });

  console.log(`🎵 CAMPAIGNS: Found ${genreMatchingPlaylists?.length || 0} playlists for genre "${searchGenre}":`, genreMatchingPlaylists);
  
  // Debug: List all found playlists with their details
  genreMatchingPlaylists?.forEach((playlist, index) => {
    console.log(`🎵 CAMPAIGNS: [${index + 1}] "${playlist.playlist_name}" (ID: ${playlist.id}, Songs: ${playlist.cached_song_count || 0}/${playlist.max_songs || 25})`);
  });

  if (genrePlaylistError) {
    console.error('Error fetching genre-matching playlists:', genrePlaylistError);
    return [];
  }

  // Filter out full playlists (where song count >= max songs)
  const availableGenrePlaylists = genreMatchingPlaylists?.filter(playlist => {
    const songCount = playlist.cached_song_count || 0;
    const maxSongs = playlist.max_songs || 25; // Default to 25 if max_songs is null
    const isAvailable = songCount < maxSongs;
    
    if (!isAvailable) {
      console.log(`🎵 CAMPAIGNS: Excluding full playlist "${playlist.playlist_name}" (${songCount}/${maxSongs} songs)`);
    }
    
    return isAvailable;
  }) || [];

  console.log(`🎵 CAMPAIGNS: ${availableGenrePlaylists.length} available (non-full) ${searchGenre} playlists after capacity filtering`);
  
  // Debug: List available playlists after capacity filtering
  availableGenrePlaylists.forEach((playlist, index) => {
    console.log(`🎵 CAMPAIGNS: Available [${index + 1}] "${playlist.playlist_name}" (Songs: ${playlist.cached_song_count || 0}/${playlist.max_songs || 25})`);
  });

  let selectedPlaylists: any[] = [];

  // Add genre-specific playlists first
  if (availableGenrePlaylists && availableGenrePlaylists.length > 0) {
    const genrePlaylistsToAdd = Math.min(availableGenrePlaylists.length, playlistsNeeded);
    selectedPlaylists = availableGenrePlaylists.slice(0, genrePlaylistsToAdd).map(playlist => ({
      id: playlist.id,
      name: playlist.playlist_name,
      genre: playlist.genre
    }));

    console.log(`🎵 CAMPAIGNS: Added ${genrePlaylistsToAdd} available ${userGenre} playlists for campaign ${campaign.id}`);
  }

  // If we still need more playlists, fill with General playlists
  if (selectedPlaylists.length < playlistsNeeded) {
    const remainingNeeded = playlistsNeeded - selectedPlaylists.length;
    console.log(`🎵 CAMPAIGNS: Need ${remainingNeeded} more playlists. Looking for General playlists...`);
    
    // Get already selected playlist IDs to avoid duplicates
    const selectedIds = selectedPlaylists.map(p => p.id);
    
    let generalPlaylistQuery = supabase
      .from('playlist_network')
      .select('id, playlist_name, genre, cached_song_count, max_songs')
      .eq('is_active', true)
      .eq('genre', 'General')
      .order('playlist_name', { ascending: true });

    // Only add the NOT IN clause if we have selected IDs to exclude
    if (selectedIds.length > 0) {
      generalPlaylistQuery = generalPlaylistQuery.not('id', 'in', `(${selectedIds.join(',')})`);
    }

    const { data: generalPlaylists, error: generalPlaylistError } = await generalPlaylistQuery;
    console.log(`🎵 CAMPAIGNS: Found ${generalPlaylists?.length || 0} General playlists:`, generalPlaylists);

    // Filter out full General playlists
    const availableGeneralPlaylists = generalPlaylists?.filter(playlist => {
      const songCount = playlist.cached_song_count || 0;
      const maxSongs = playlist.max_songs || 25;
      const isAvailable = songCount < maxSongs;
      
      if (!isAvailable) {
        console.log(`🎵 CAMPAIGNS: Excluding full General playlist "${playlist.playlist_name}" (${songCount}/${maxSongs} songs)`);
      }
      
      return isAvailable;
    }) || [];

    console.log(`🎵 CAMPAIGNS: ${availableGeneralPlaylists.length} available (non-full) General playlists after capacity filtering`);

    if (generalPlaylistError) {
      console.error('Error fetching general playlists:', generalPlaylistError);
    } else if (availableGeneralPlaylists && availableGeneralPlaylists.length > 0) {
      // Take only the number of playlists we need
      const playlistsToTake = availableGeneralPlaylists.slice(0, remainingNeeded);
      const generalPlaylistsToAdd = playlistsToTake.map(playlist => ({
        id: playlist.id,
        name: playlist.playlist_name,
        genre: playlist.genre
      }));

      selectedPlaylists = [...selectedPlaylists, ...generalPlaylistsToAdd];
      console.log(`🎵 CAMPAIGNS: Added ${generalPlaylistsToAdd.length} available General playlists to fill remaining slots for campaign ${campaign.id}`);
    }
  }

  return selectedPlaylists;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Fetch all campaigns with their related order data
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_id,
        order_number,
        customer_name,
        song_name,
        song_link,
        package_name,
        package_id,
        direct_streams,
        playlist_streams,
        playlist_assignments,
        direct_streams_progress,
        playlist_streams_progress,
        direct_streams_confirmed,
        playlists_added_confirmed,
        removed_from_playlists,
        removal_date,
        campaign_status,
        time_on_playlists,
        created_at,
        updated_at,
        orders!inner(created_at, status, billing_info)
      `)
      .neq('orders.status', 'cancelled')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }

    // First, check if any campaigns need playlist assignments and generate them
    const campaignsToUpdate: any[] = [];
    
    for (const campaign of campaignsData || []) {
      const currentAssignments = Array.isArray(campaign.playlist_assignments) 
        ? campaign.playlist_assignments 
        : [];
      
      // If campaign has no playlist assignments, generate them
      if (currentAssignments.length === 0) {
        console.log(`🎵 CAMPAIGNS: === DEBUGGING ORDER #${campaign.order_number} ===`);
        console.log(`🎵 CAMPAIGNS: Campaign ID: ${campaign.id}`);
        console.log(`🎵 CAMPAIGNS: Package: ${campaign.package_name}`);
        console.log(`🎵 CAMPAIGNS: Current assignments: ${currentAssignments.length}`);
        
        const newAssignments = await generatePlaylistAssignments(supabase, campaign);
        console.log(`🎵 CAMPAIGNS: Generated assignments for ${campaign.order_number}:`, newAssignments);
        
        if (newAssignments.length > 0) {
          // Update the campaign in the database
          const { error: updateError } = await supabase
            .from('marketing_campaigns')
            .update({
              playlist_assignments: newAssignments,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

          if (updateError) {
            console.error(`❌ Error updating campaign ${campaign.id} with assignments:`, updateError);
          } else {
            // Update the campaign object for the response
            campaign.playlist_assignments = newAssignments;
            console.log(`✅ Successfully assigned ${newAssignments.length} playlists to Order #${campaign.order_number}`);
          }
        } else {
          console.log(`❌ No assignments generated for Order #${campaign.order_number}`);
        }
      }
    }

    // Process campaigns data to calculate progress and status
    const campaigns = campaignsData?.map(campaign => {
      // Calculate playlist streams progress based on time elapsed and playlist assignments
      let calculatedPlaylistProgress = campaign.playlist_streams_progress;
      
      if (campaign.playlists_added_confirmed && campaign.playlist_assignments) {
        const playlistAssignments = Array.isArray(campaign.playlist_assignments) 
          ? campaign.playlist_assignments 
          : [];
        
        if (playlistAssignments.length > 0) {
          // Calculate streams based on 500 streams per playlist per 24 hours
          const now = new Date();
          const playlistAddedDate = campaign.removal_date 
            ? new Date(new Date(campaign.removal_date).getTime() - (campaign.playlist_streams / (playlistAssignments.length * 500)) * 24 * 60 * 60 * 1000)
            : new Date(campaign.created_at);
          
          const hoursElapsed = Math.max(0, (now.getTime() - playlistAddedDate.getTime()) / (1000 * 60 * 60));
          const streamsPerHour = (playlistAssignments.length * 500) / 24;
          calculatedPlaylistProgress = Math.min(
            Math.floor(hoursElapsed * streamsPerHour),
            campaign.playlist_streams
          );
        }
      }

      // Determine campaign status
      let status = campaign.campaign_status;
      
      if (!campaign.direct_streams_confirmed || !campaign.playlists_added_confirmed) {
        status = 'Action Needed';
      } else if (calculatedPlaylistProgress >= campaign.playlist_streams && !campaign.removed_from_playlists) {
        status = 'Removal Needed';
      } else if (campaign.removed_from_playlists) {
        status = 'Completed';
      } else if (campaign.direct_streams_confirmed && campaign.playlists_added_confirmed) {
        status = 'Running';
      }

      // Calculate removal date based on time_on_playlists from campaign_totals
      let removalDate = campaign.removal_date;
      if (campaign.playlists_added_confirmed && !removalDate && campaign.time_on_playlists) {
        const calculatedRemovalDate = new Date();
        calculatedRemovalDate.setDate(calculatedRemovalDate.getDate() + campaign.time_on_playlists);
        removalDate = calculatedRemovalDate.toISOString().split('T')[0];
      }

      // Extract user genre for display
      const userGenre = campaign.orders?.billing_info?.musicGenre || 'General';

      return {
        id: campaign.id,
        orderNumber: campaign.order_number,
        orderId: campaign.order_id,
        orderDate: campaign.orders.created_at,
        customerName: campaign.customer_name,
        songName: campaign.song_name,
        songLink: campaign.song_link,
        packageName: campaign.package_name,
        userGenre: userGenre,
        directStreams: campaign.direct_streams,
        playlistStreams: campaign.playlist_streams,
        playlistAssignments: Array.isArray(campaign.playlist_assignments) 
          ? campaign.playlist_assignments 
          : [],
        directStreamsProgress: campaign.direct_streams_confirmed ? campaign.direct_streams : 0,
        playlistStreamsProgress: calculatedPlaylistProgress,
        removalDate,
        status,
        directStreamsConfirmed: campaign.direct_streams_confirmed,
        playlistsAddedConfirmed: campaign.playlists_added_confirmed,
        removedFromPlaylists: campaign.removed_from_playlists
      };
    }) || [];

    res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error in campaigns API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
