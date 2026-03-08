import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import {
  checkPlaylistHealth,
  extractSpotifyPlaylistId,
  getSpotifyPlaylistData,
} from '../../../../utils/spotify-api';
import {
  formatPlaylistGenres,
  parsePlaylistGenres,
} from '../../../../utils/playlist-genres';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    playlistId,
    playlistName,
    genres,
    genre,
    accountEmail,
    playlistLink,
    maxSongs,
    isActive,
  } = req.body;

  const parsedGenres = parsePlaylistGenres(Array.isArray(genres) ? genres : genre);
  const trimmedPlaylistName = typeof playlistName === 'string' ? playlistName.trim() : '';
  const trimmedPlaylistLink = typeof playlistLink === 'string' ? playlistLink.trim() : '';
  const trimmedAccountEmail = typeof accountEmail === 'string' ? accountEmail.trim().toLowerCase() : '';
  const sanitizedMaxSongs = Math.max(1, Number(maxSongs) || 35);

  if (!playlistId || !trimmedPlaylistName || parsedGenres.length === 0 || !trimmedAccountEmail || !trimmedPlaylistLink) {
    return res.status(400).json({
      error: 'Playlist ID, playlist name, at least one genre, account email, and playlist link are required',
    });
  }

  const extractedPlaylistId = extractSpotifyPlaylistId(trimmedPlaylistLink);
  if (!extractedPlaylistId) {
    return res.status(400).json({
      error: 'Invalid Spotify playlist link format',
    });
  }

  try {
    const supabase = createAdminClient();
    const { data: existingPlaylist, error: existingPlaylistError } = await supabase
      .from('playlist_network')
      .select('id, playlist_name, playlist_link, spotify_playlist_id')
      .eq('id', playlistId)
      .maybeSingle();

    if (existingPlaylistError) {
      console.error('Error fetching playlist for update:', existingPlaylistError);
      return res.status(500).json({ error: 'Failed to fetch the existing playlist' });
    }

    if (!existingPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const { data: conflictingBySpotifyId, error: conflictingBySpotifyIdError } = await supabase
      .from('playlist_network')
      .select('id, playlist_name')
      .eq('spotify_playlist_id', extractedPlaylistId)
      .neq('id', playlistId)
      .maybeSingle();

    if (conflictingBySpotifyIdError) {
      console.error('Error checking for duplicate Spotify playlist ID:', conflictingBySpotifyIdError);
      return res.status(500).json({ error: 'Failed to validate the updated playlist' });
    }

    if (conflictingBySpotifyId) {
      return res.status(409).json({
        error: `Another playlist already uses this Spotify ID: ${conflictingBySpotifyId.playlist_name}`,
      });
    }

    const { data: conflictingByLink, error: conflictingByLinkError } = await supabase
      .from('playlist_network')
      .select('id, playlist_name')
      .eq('playlist_link', trimmedPlaylistLink)
      .neq('id', playlistId)
      .maybeSingle();

    if (conflictingByLinkError) {
      console.error('Error checking for duplicate playlist link:', conflictingByLinkError);
      return res.status(500).json({ error: 'Failed to validate the updated playlist' });
    }

    if (conflictingByLink) {
      return res.status(409).json({
        error: `Another playlist already uses this link: ${conflictingByLink.playlist_name}`,
      });
    }

    const now = new Date().toISOString();
    const linkChanged =
      existingPlaylist.playlist_link !== trimmedPlaylistLink ||
      existingPlaylist.spotify_playlist_id !== extractedPlaylistId;

    let refreshedPlaylistData: Awaited<ReturnType<typeof getSpotifyPlaylistData>> = null;
    let refreshedHealthStatus: Awaited<ReturnType<typeof checkPlaylistHealth>> | null = null;
    let resolvedPlaylistName = trimmedPlaylistName;

    if (linkChanged) {
      refreshedPlaylistData = await getSpotifyPlaylistData(trimmedPlaylistLink);

      if (!refreshedPlaylistData) {
        return res.status(400).json({
          error: 'Could not fetch playlist information from Spotify. Please check the updated URL and try again.',
        });
      }

      refreshedHealthStatus = await checkPlaylistHealth(trimmedPlaylistLink);

      if (resolvedPlaylistName === existingPlaylist.playlist_name) {
        resolvedPlaylistName = refreshedPlaylistData.name?.trim() || resolvedPlaylistName;
      }
    }

    const updatePayload: Record<string, unknown> = {
      playlist_name: resolvedPlaylistName,
      genre: formatPlaylistGenres(parsedGenres),
      account_email: trimmedAccountEmail,
      playlist_link: trimmedPlaylistLink,
      spotify_playlist_id: extractedPlaylistId,
      max_songs: sanitizedMaxSongs,
      updated_at: now,
    };

    if (typeof isActive === 'boolean') {
      updatePayload.is_active = isActive;
    }

    if (refreshedPlaylistData) {
      updatePayload.cached_song_count = refreshedPlaylistData.trackCount;
      updatePayload.cached_image_url = refreshedPlaylistData.imageUrl;
      updatePayload.cached_saves = refreshedPlaylistData.followers || 0;
      updatePayload.last_scraped_at = now;
    }

    if (refreshedHealthStatus) {
      updatePayload.health_status = refreshedHealthStatus.status;
      updatePayload.health_last_checked = refreshedHealthStatus.lastChecked;
      updatePayload.health_error_message = refreshedHealthStatus.errorMessage || null;
      updatePayload.last_known_public =
        typeof refreshedHealthStatus.isPublic === 'boolean' ? refreshedHealthStatus.isPublic : null;
    }

    const { data: updatedPlaylist, error: updateError } = await supabase
      .from('playlist_network')
      .update(updatePayload)
      .eq('id', playlistId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating playlist:', updateError);
      return res.status(500).json({ error: 'Failed to update playlist' });
    }

    return res.status(200).json({
      success: true,
      message: 'Playlist updated successfully',
      playlist: updatedPlaylist,
    });
  } catch (error) {
    console.error('Error in update-playlist API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
