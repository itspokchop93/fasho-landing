/**
 * Utility functions for playlist assignment duplicate protection
 * Prevents assigning the same playlists to campaigns with identical tracks
 */

// Extract Spotify track ID from song URL
export function extractTrackIdFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Handle various Spotify URL formats
  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)(?:[?&]|$)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)(?:[?&]|$)/,
    /spotify:track:([a-zA-Z0-9]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Get playlists already assigned to running campaigns with the same track ID
export async function getExcludedPlaylistsForTrack(
  supabase: any, 
  trackId: string, 
  excludeCampaignId?: string
): Promise<string[]> {
  if (!trackId) {
    console.log('🚫 DUPLICATE-PROTECTION: No track ID provided, no exclusions');
    return [];
  }

  try {
    // Query for running campaigns with the same track ID
    let query = supabase
      .from('marketing_campaigns')
      .select('id, playlist_assignments, order_number, song_name')
      .eq('track_id', trackId)
      .eq('campaign_status', 'Running');

    // Exclude the current campaign if provided (for genre changes)
    if (excludeCampaignId) {
      query = query.neq('id', excludeCampaignId);
    }

    const { data: existingCampaigns, error } = await query;

    if (error) {
      console.error('🚫 DUPLICATE-PROTECTION: Error fetching existing campaigns:', error);
      return [];
    }

    if (!existingCampaigns || existingCampaigns.length === 0) {
      console.log(`🚫 DUPLICATE-PROTECTION: No running campaigns found for track ID ${trackId}`);
      return [];
    }

    // Extract all playlist IDs from existing campaigns
    const excludedPlaylistIds: string[] = [];
    
    existingCampaigns.forEach((campaign: any) => {
      console.log(`🚫 DUPLICATE-PROTECTION: Found existing campaign Order #${campaign.order_number} (${campaign.song_name}) with track ID ${trackId}`);
      
      if (campaign.playlist_assignments && Array.isArray(campaign.playlist_assignments)) {
        campaign.playlist_assignments.forEach((assignment: any) => {
          if (assignment.id) {
            excludedPlaylistIds.push(assignment.id);
            console.log(`🚫 DUPLICATE-PROTECTION: Excluding playlist "${assignment.name}" (ID: ${assignment.id})`);
          }
        });
      }
    });

    const uniqueExcludedIds = [...new Set(excludedPlaylistIds)];
    console.log(`🚫 DUPLICATE-PROTECTION: Total excluded playlists for track ${trackId}: ${uniqueExcludedIds.length}`);
    
    return uniqueExcludedIds;
  } catch (error) {
    console.error('🚫 DUPLICATE-PROTECTION: Error in getExcludedPlaylistsForTrack:', error);
    return [];
  }
}

// Enhanced playlist assignment function with duplicate protection
export async function getAvailablePlaylistsWithProtection(
  supabase: any,
  userGenre: string,
  playlistsNeeded: number,
  trackId: string,
  excludeCampaignId?: string
): Promise<any[]> {
  // Get excluded playlists for this track
  const excludedPlaylistIds = await getExcludedPlaylistsForTrack(supabase, trackId, excludeCampaignId);
  
  console.log(`🎵 PLAYLIST-ASSIGNMENT: Looking for ${playlistsNeeded} playlists for genre "${userGenre}" with ${excludedPlaylistIds.length} exclusions`);

  // Get available playlists matching the user's genre, excluding duplicate assignments
  let genreQuery = supabase
    .from('playlist_network')
    .select('id, playlist_name, genre, cached_song_count, max_songs')
    .eq('is_active', true)
    .eq('genre', userGenre)
    .order('playlist_name', { ascending: true });

  // Exclude playlists already assigned to running campaigns with same track
  if (excludedPlaylistIds.length > 0) {
    genreQuery = genreQuery.not('id', 'in', `(${excludedPlaylistIds.join(',')})`);
  }

  const { data: genreMatchingPlaylists, error: genrePlaylistError } = await genreQuery;

  if (genrePlaylistError) {
    console.error('🚫 DUPLICATE-PROTECTION: Error fetching genre-matching playlists:', genrePlaylistError);
    return [];
  }

  let selectedPlaylists: any[] = [];

  // Add genre-specific playlists first (with capacity check)
  if (genreMatchingPlaylists && genreMatchingPlaylists.length > 0) {
    // Filter out full playlists
    const availableGenrePlaylists = genreMatchingPlaylists.filter((playlist: any) => 
      (playlist.cached_song_count || 0) < (playlist.max_songs || 25)
    );

    const genrePlaylistsToAdd = Math.min(availableGenrePlaylists.length, playlistsNeeded);
    selectedPlaylists = availableGenrePlaylists.slice(0, genrePlaylistsToAdd).map((playlist: any) => ({
      id: playlist.id,
      name: playlist.playlist_name,
      genre: playlist.genre
    }));

    console.log(`🎵 PLAYLIST-ASSIGNMENT: Added ${genrePlaylistsToAdd} available ${userGenre} playlists (after duplicate protection)`);
  }

  // If we still need more playlists, fill with General playlists
  if (selectedPlaylists.length < playlistsNeeded) {
    const remainingNeeded = playlistsNeeded - selectedPlaylists.length;
    const selectedIds = selectedPlaylists.map(p => p.id);

    let generalQuery = supabase
      .from('playlist_network')
      .select('id, playlist_name, genre, cached_song_count, max_songs')
      .eq('is_active', true)
      .eq('genre', 'General')
      .order('playlist_name', { ascending: true })
      .limit(remainingNeeded);

    // Exclude already selected playlists and duplicate-protected playlists
    const allExclusions = [...selectedIds, ...excludedPlaylistIds];
    if (allExclusions.length > 0) {
      generalQuery = generalQuery.not('id', 'in', `(${allExclusions.join(',')})`);
    }

    const { data: generalPlaylists, error: generalPlaylistError } = await generalQuery;

    if (generalPlaylistError) {
      console.error('🚫 DUPLICATE-PROTECTION: Error fetching general playlists:', generalPlaylistError);
    } else if (generalPlaylists && generalPlaylists.length > 0) {
      // Filter out full playlists
      const availableGeneralPlaylists = generalPlaylists.filter((playlist: any) => 
        (playlist.cached_song_count || 0) < (playlist.max_songs || 25)
      );

      const generalPlaylistsToAdd = availableGeneralPlaylists.map((playlist: any) => ({
        id: playlist.id,
        name: playlist.playlist_name,
        genre: playlist.genre
      }));

      selectedPlaylists = [...selectedPlaylists, ...generalPlaylistsToAdd];
      console.log(`🎵 PLAYLIST-ASSIGNMENT: Added ${generalPlaylistsToAdd.length} General playlists to fill remaining slots (after duplicate protection)`);
    }
  }

  console.log(`🎵 PLAYLIST-ASSIGNMENT: Final selection: ${selectedPlaylists.length} playlists assigned with duplicate protection for track ${trackId}`);
  return selectedPlaylists;
}
