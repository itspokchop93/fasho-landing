import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { verifyAdminToken } from '../../../../utils/admin/auth';
import { getSpotifyPlaylistDataWithHealth } from '../../../../utils/spotify-api';
import { scrapeSpotifyPlaylistData } from '../../../../utils/apify-spotify-playlist';
import { propagatePlaylistNameChange } from '../../../../utils/playlist-name-sync';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Manual admin auth (can't use requireAdminAuth wrapper with SSE)
  const token = req.cookies.admin_session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const adminUser = verifyAdminToken(token);
  if (!adminUser) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const supabase = createAdminClient();

    const { data: playlistsData, error: playlistsError } = await supabase
      .from('playlist_network')
      .select(`
        id, playlist_name, genre, account_email, playlist_link,
        spotify_playlist_id, max_songs, cached_song_count, cached_image_url,
        cached_saves, last_scraped_at, is_active, health_status,
        health_last_checked, health_error_message, last_known_public,
        created_at, updated_at
      `)
      .order('created_at', { ascending: false });

    if (playlistsError) {
      send('error', { message: 'Failed to fetch playlists from database' });
      return res.end();
    }

    const allPlaylists = playlistsData || [];
    send('log', { message: `🔄 Starting streaming refresh for ${allPlaylists.length} playlists...` });
    send('total', { count: allPlaylists.length });

    // Phase 1: Run ALL Spotify calls in batches of 5 (fast, ~1s each)
    send('log', { message: `⚡ Phase 1: Fetching Spotify data for all playlists...` });

    interface PlaylistResult {
      id: string;
      playlistName: string;
      genre: string;
      accountEmail: string;
      playlistLink: string;
      spotifyPlaylistId: string;
      maxSongs: number;
      songCount: number;
      imageUrl: string;
      saves: number;
      isActive: boolean;
      healthStatus: string;
      healthLastChecked: string | null;
      healthErrorMessage: string | null;
      createdAt: string;
      updatedAt: string;
      needsApify: boolean;
    }

    const spotifyResults: PlaylistResult[] = [];

    for (let i = 0; i < allPlaylists.length; i += 5) {
      const batch = allPlaylists.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(async (playlist) => {
          let songCount = playlist.cached_song_count || 0;
          let imageUrl = playlist.cached_image_url || '';
          let saves = playlist.cached_saves || 0;
          let healthStatus = playlist.health_status || 'unknown';
          let healthLastChecked = playlist.health_last_checked;
          let healthErrorMessage = playlist.health_error_message;

          let detectedName = playlist.playlist_name;

          try {
            const playlistData = await getSpotifyPlaylistDataWithHealth(playlist.playlist_link);
            if (playlistData) {
              songCount = playlistData.trackCount;
              imageUrl = playlistData.imageUrl || imageUrl;
              saves = playlistData.followers || 0;

              if (playlistData.name && playlistData.name !== 'Unknown' && playlistData.name !== 'Unknown Playlist') {
                detectedName = playlistData.name;
              }

              if (playlistData.healthStatus) {
                healthStatus = playlistData.healthStatus.status;
                healthLastChecked = playlistData.healthStatus.lastChecked;
                healthErrorMessage = playlistData.healthStatus.errorMessage || null;
              }
            }
          } catch (error) {
            healthStatus = 'error';
            healthErrorMessage = error instanceof Error ? error.message : 'Unknown error';
            healthLastChecked = new Date().toISOString();
          }

          const needsApify = songCount === 0 && healthStatus !== 'removed' && healthStatus !== 'error';
          const nameChanged = detectedName !== playlist.playlist_name;

          send('log', { message: `📊 [${playlist.playlist_name}] Spotify: songs=${songCount}, saves=${saves}, health=${healthStatus}${nameChanged ? ` → NAME CHANGED to "${detectedName}"` : ''}${needsApify ? ' → queued for Apify' : healthStatus === 'removed' ? ' → skipping Apify (removed)' : ''}` });

          const updatePayload: Record<string, any> = {
            cached_song_count: songCount,
            cached_image_url: imageUrl,
            cached_saves: saves,
            last_scraped_at: new Date().toISOString(),
            health_status: healthStatus,
            health_last_checked: healthLastChecked,
            health_error_message: healthErrorMessage,
            ...(healthStatus === 'active' ? { last_known_public: true } : {}),
          };

          if (nameChanged) {
            updatePayload.playlist_name = detectedName;
          }

          await supabase
            .from('playlist_network')
            .update(updatePayload)
            .eq('id', playlist.id);

          if (nameChanged) {
            const updated = await propagatePlaylistNameChange(supabase, playlist.id, detectedName);
            if (updated > 0) {
              send('log', { message: `🔄 [${detectedName}] Updated name in ${updated} campaign assignment(s)` });
            }
          }

          const result: PlaylistResult = {
            id: playlist.id,
            playlistName: nameChanged ? detectedName : playlist.playlist_name,
            genre: playlist.genre,
            accountEmail: playlist.account_email,
            playlistLink: playlist.playlist_link,
            spotifyPlaylistId: playlist.spotify_playlist_id,
            maxSongs: playlist.max_songs,
            songCount,
            imageUrl,
            saves,
            isActive: playlist.is_active,
            healthStatus,
            healthLastChecked,
            healthErrorMessage,
            createdAt: playlist.created_at,
            updatedAt: playlist.updated_at,
            needsApify,
          };

          // Send the playlist update to the frontend immediately
          send('playlist', result);

          return result;
        })
      );
      spotifyResults.push(...batchResults);
    }

    // Phase 2: Apify calls SEQUENTIALLY for playlists that need song counts
    const apifyQueue = spotifyResults.filter(p => p.needsApify);

    if (apifyQueue.length > 0) {
      send('log', { message: `🔮 Phase 2: Fetching song counts from Apify for ${apifyQueue.length} playlists (one at a time)...` });

      for (let i = 0; i < apifyQueue.length; i++) {
        const playlist = apifyQueue[i];
        send('log', { message: `🔮 [${i + 1}/${apifyQueue.length}] [${playlist.playlistName}] Calling Apify...` });

        try {
          const apifyData = await scrapeSpotifyPlaylistData(playlist.playlistLink, false);
          if (apifyData && apifyData.trackCount > 0) {
            playlist.songCount = apifyData.trackCount;

            if (playlist.saves === 0 && apifyData.followers > 0) {
              playlist.saves = apifyData.followers;
            }
            if (!playlist.imageUrl && apifyData.imageUrl) {
              playlist.imageUrl = apifyData.imageUrl;
            }

            const apifyNameChanged = apifyData.name && apifyData.name !== 'Unknown Playlist' && apifyData.name !== playlist.playlistName;

            const apifyUpdatePayload: Record<string, any> = {
              cached_song_count: playlist.songCount,
              cached_saves: playlist.saves,
              cached_image_url: playlist.imageUrl,
              last_scraped_at: new Date().toISOString(),
            };

            if (apifyNameChanged) {
              apifyUpdatePayload.playlist_name = apifyData.name;
              playlist.playlistName = apifyData.name;
            }

            await supabase
              .from('playlist_network')
              .update(apifyUpdatePayload)
              .eq('id', playlist.id);

            if (apifyNameChanged) {
              const updated = await propagatePlaylistNameChange(supabase, playlist.id, apifyData.name);
              if (updated > 0) {
                send('log', { message: `🔄 [${apifyData.name}] Apify detected name change → updated ${updated} campaign assignment(s)` });
              }
            }

            send('log', { message: `✅ [${playlist.playlistName}] Apify: songs=${playlist.songCount}${playlist.saves ? `, saves=${playlist.saves}` : ''}${apifyNameChanged ? ' (name updated)' : ''}` });
          } else {
            send('log', { message: `⚠️ [${playlist.playlistName}] Apify returned no data` });
          }
        } catch (error) {
          send('log', { message: `❌ [${playlist.playlistName}] Apify error: ${error instanceof Error ? error.message : 'Unknown'}` });
        }

        // Send updated playlist to frontend
        send('playlist', { ...playlist, needsApify: undefined });

        // Small delay between Apify calls to avoid rate limits
        if (i < apifyQueue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    send('log', { message: `✅ Refresh complete! ${spotifyResults.length} playlists processed, ${apifyQueue.length} Apify lookups.` });
    send('complete', { total: spotifyResults.length, apifySuccessCount: apifyQueue.filter(p => p.songCount > 0).length });
  } catch (error) {
    send('error', { message: `Fatal error: ${error instanceof Error ? error.message : 'Unknown'}` });
  }

  res.end();
}
