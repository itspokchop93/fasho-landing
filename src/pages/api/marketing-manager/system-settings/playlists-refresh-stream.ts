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
  maxDuration: 300,
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

  // Heartbeat keeps the SSE connection alive during long Apify calls
  const heartbeatInterval = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 10000);

  // Time budget — Vercel hard-caps this function at 300s. We bail at 270s so we
  // can emit a clean partial-completion message before the platform kills us.
  // Any playlist not processed will be retried automatically on next refresh
  // because we only set `last_scraped_at` on success.
  const handlerStart = Date.now();
  const TIME_BUDGET_MS = 270_000;
  const timeRemaining = () => TIME_BUDGET_MS - (Date.now() - handlerStart);
  const outOfTime = () => timeRemaining() <= 0;

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

    // Freshness gate — skip any playlist refreshed within the last 60 minutes.
    // Cuts down Apify calls (cost + rate limits) and lets the user mash refresh
    // without re-scraping data that's still warm. `last_scraped_at` is the
    // authoritative "fully refreshed" timestamp (set in Phase 1 when no Apify
    // is needed, and in Phase 2 after a successful Apify call).
    const FRESHNESS_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
    const now = Date.now();

    const formatElapsed = (ms: number): string => {
      const totalSec = Math.floor(ms / 1000);
      if (totalSec < 60) return `${totalSec} second${totalSec === 1 ? '' : 's'}`;
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      if (sec === 0) return `${min} minute${min === 1 ? '' : 's'}`;
      return `${min} minute${min === 1 ? '' : 's'} ${sec} second${sec === 1 ? '' : 's'}`;
    };

    const formatTimestamp = (iso: string): string => {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit',
        hour12: true,
      });
    };

    const playlistsToProcess: typeof allPlaylists = [];
    let skippedFreshCount = 0;

    for (const playlist of allPlaylists) {
      const lastScraped = playlist.last_scraped_at;
      if (lastScraped) {
        const ageMs = now - new Date(lastScraped).getTime();
        if (ageMs >= 0 && ageMs < FRESHNESS_WINDOW_MS) {
          send('log', {
            message: `⏭️ [${playlist.playlist_name}] already updated ${formatElapsed(ageMs)} ago at ${formatTimestamp(lastScraped)} - Skipping it`,
          });
          // Still emit a playlist event so the UI's row reflects current cached
          // values (and any frontend "last updated" indicator stays in sync).
          send('playlist', {
            id: playlist.id,
            playlistName: playlist.playlist_name,
            genre: playlist.genre,
            accountEmail: playlist.account_email,
            playlistLink: playlist.playlist_link,
            spotifyPlaylistId: playlist.spotify_playlist_id,
            maxSongs: playlist.max_songs,
            songCount: playlist.cached_song_count || 0,
            imageUrl: playlist.cached_image_url || '',
            saves: playlist.cached_saves || 0,
            isActive: playlist.is_active,
            healthStatus: playlist.health_status || 'unknown',
            healthLastChecked: playlist.health_last_checked,
            healthErrorMessage: playlist.health_error_message,
            createdAt: playlist.created_at,
            updatedAt: playlist.updated_at,
            needsApify: false,
          });
          skippedFreshCount++;
          continue;
        }
      }
      playlistsToProcess.push(playlist);
    }

    if (skippedFreshCount > 0) {
      send('log', { message: `⏭️ Skipped ${skippedFreshCount} playlist(s) refreshed within the last 60 minutes. ${playlistsToProcess.length} remaining to process.` });
    }

    if (playlistsToProcess.length === 0) {
      send('log', { message: `✅ Nothing to refresh — all ${allPlaylists.length} playlist(s) are fresh (updated within the last 60 minutes).` });
      send('complete', { total: allPlaylists.length, apifySuccessCount: 0, apifySkipped: 0, freshSkipped: skippedFreshCount });
      clearInterval(heartbeatInterval);
      return res.end();
    }

    // Phase 1: Run ALL Spotify calls in batches of 5 (fast, ~1s each)
    send('log', { message: `⚡ Phase 1: Fetching Spotify data for ${playlistsToProcess.length} playlist(s)...` });

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

    for (let i = 0; i < playlistsToProcess.length; i += 5) {
      const batch = playlistsToProcess.slice(i, i + 5);
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
            health_status: healthStatus,
            health_last_checked: healthLastChecked,
            health_error_message: healthErrorMessage,
            ...(healthStatus === 'active' ? { last_known_public: true } : {}),
            // Only mark as scraped if data is complete (no Apify needed)
            ...(!needsApify ? { last_scraped_at: new Date().toISOString() } : {}),
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

    // Phase 2: Apify calls in PARALLEL batches (was sequential — that timed out
    // after ~21 playlists at the 300s Vercel function limit).
    //
    // Math: ~14s per Apify call sequentially → 44 playlists × 14s = 616s (fail).
    // With concurrency=5 → ceil(44/5) × ~15s ≈ 135s (well under 270s budget).
    //
    // Apify's `run-sync-get-dataset-items` endpoint supports concurrent runs
    // and our paid plan allows well above 5 simultaneous actor invocations.
    const APIFY_CONCURRENCY = 5;
    const apifyQueue = spotifyResults.filter(p => p.needsApify);
    let apifyCompleted = 0;
    let apifySuccess = 0;
    let apifySkipped = 0;

    const processOneApify = async (playlist: PlaylistResult, indexLabel: string) => {
      send('log', { message: `🔮 ${indexLabel} [${playlist.playlistName}] Calling Apify...` });

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
          apifySuccess++;
        } else {
          send('log', { message: `⚠️ [${playlist.playlistName}] Apify returned no data` });
        }
      } catch (error) {
        send('log', { message: `❌ [${playlist.playlistName}] Apify error: ${error instanceof Error ? error.message : 'Unknown'}` });
      }

      send('playlist', { ...playlist, needsApify: undefined });
      apifyCompleted++;
    };

    if (apifyQueue.length > 0) {
      send('log', { message: `🔮 Phase 2: Fetching song counts from Apify for ${apifyQueue.length} playlists (concurrency=${APIFY_CONCURRENCY})...` });

      for (let i = 0; i < apifyQueue.length; i += APIFY_CONCURRENCY) {
        // Time budget guard — bail BEFORE starting a new wave if we're nearly out
        // of function execution time. Any unprocessed playlists keep their old
        // `last_scraped_at` so the next refresh will pick them up automatically.
        if (outOfTime()) {
          apifySkipped = apifyQueue.length - apifyCompleted;
          send('log', { message: `⏱️ Time budget reached — stopping early to avoid serverless timeout. ${apifySkipped} playlist(s) deferred to next refresh.` });
          break;
        }

        const wave = apifyQueue.slice(i, i + APIFY_CONCURRENCY);
        const waveStart = i + 1;
        const waveEnd = Math.min(i + APIFY_CONCURRENCY, apifyQueue.length);
        send('log', { message: `🌊 Wave ${Math.floor(i / APIFY_CONCURRENCY) + 1}: processing playlists ${waveStart}-${waveEnd} of ${apifyQueue.length} in parallel...` });

        await Promise.all(
          wave.map((playlist, idxInWave) =>
            processOneApify(playlist, `[${i + idxInWave + 1}/${apifyQueue.length}]`)
          )
        );
      }
    }

    const elapsedSec = Math.round((Date.now() - handlerStart) / 1000);
    const freshSuffix = skippedFreshCount > 0 ? ` (${skippedFreshCount} skipped as fresh)` : '';
    if (apifySkipped > 0) {
      send('log', { message: `⚠️ Partial refresh complete in ${elapsedSec}s. ${apifyCompleted}/${apifyQueue.length} Apify lookups done (${apifySuccess} successful). ${apifySkipped} deferred — click Refresh again to process them.${freshSuffix}` });
    } else {
      send('log', { message: `✅ Refresh complete in ${elapsedSec}s! ${spotifyResults.length} playlists processed, ${apifyCompleted} Apify lookups (${apifySuccess} successful).${freshSuffix}` });
    }
    send('complete', { total: allPlaylists.length, apifySuccessCount: apifySuccess, apifySkipped, freshSkipped: skippedFreshCount });
  } catch (error) {
    send('error', { message: `Fatal error: ${error instanceof Error ? error.message : 'Unknown'}` });
  } finally {
    clearInterval(heartbeatInterval);
  }

  res.end();
}
