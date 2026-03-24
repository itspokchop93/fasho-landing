import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { verifyAdminToken } from '../../../../utils/admin/auth';
import { getSpotifyPlaylistData } from '../../../../utils/spotify-api';
import { scrapeSpotifyPlaylistData } from '../../../../utils/apify-spotify-playlist';
import { propagatePlaylistNameChange } from '../../../../utils/playlist-name-sync';

export const config = {
  api: {
    responseLimit: false,
  },
  maxDuration: 300,
};

// Targeted SSE refresh for a specific set of playlist IDs
// Used by Playlist Purchases Needed to only refresh the playlists in that section

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.cookies.admin_session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const adminUser = verifyAdminToken(token);
  if (!adminUser) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const idsParam = req.query.ids as string;
  if (!idsParam) {
    return res.status(400).json({ error: 'Missing ids parameter' });
  }

  const playlistIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);
  if (playlistIds.length === 0) {
    return res.status(400).json({ error: 'No playlist IDs provided' });
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

  const heartbeatInterval = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 10000);

  try {
    const supabase = createAdminClient();

    const { data: playlistsData, error } = await supabase
      .from('playlist_network')
      .select(`
        id, playlist_name, genre, account_email, playlist_link,
        spotify_playlist_id, max_songs, cached_song_count, cached_image_url,
        cached_saves, health_status, is_active, last_scraped_at
      `)
      .in('id', playlistIds);

    if (error) {
      send('error', { message: 'Failed to fetch playlists from database' });
      return res.end();
    }

    const playlists = playlistsData || [];
    const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
    const now = Date.now();

    const isDataComplete = (p: typeof playlists[0]) => {
      if (p.health_status === 'removed' || p.health_status === 'error') return true;
      return (p.cached_song_count || 0) > 0;
    };

    const freshPlaylists = playlists.filter(p => {
      if (!p.last_scraped_at) return false;
      if (!isDataComplete(p)) return false;
      return (now - new Date(p.last_scraped_at).getTime()) < CACHE_TTL_MS;
    });
    const stalePlaylists = playlists.filter(p => {
      if (!p.last_scraped_at) return true;
      if (!isDataComplete(p)) return true;
      return (now - new Date(p.last_scraped_at).getTime()) >= CACHE_TTL_MS;
    });

    send('log', { message: `🔄 Refreshing ${playlists.length} playlists from Purchases Needed...` });
    if (freshPlaylists.length > 0) {
      send('log', { message: `⏩ ${freshPlaylists.length} playlist(s) refreshed within last 8hrs — using cached data` });
    }
    if (stalePlaylists.length > 0) {
      send('log', { message: `🔄 ${stalePlaylists.length} playlist(s) need fresh data from Spotify/Apify` });
    }

    let processedCount = 0;

    // Emit cached playlists immediately (no API calls)
    for (const playlist of freshPlaylists) {
      processedCount++;
      const ageMinutes = Math.round((now - new Date(playlist.last_scraped_at).getTime()) / 60000);
      const ageLabel = ageMinutes < 60
        ? `${ageMinutes}m ago`
        : `${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m ago`;

      send('log', { message: `⏩ [${processedCount}/${playlists.length}] [${playlist.playlist_name}] Using cached data (last refreshed ${ageLabel})` });

      send('playlist', {
        id: playlist.id,
        playlistName: playlist.playlist_name,
        playlistLink: playlist.playlist_link,
        imageUrl: playlist.cached_image_url || '',
        saves: playlist.cached_saves || 0,
        songCount: playlist.cached_song_count || 0,
        genre: playlist.genre,
      });
    }

    // Fetch fresh data only for stale playlists
    for (let i = 0; i < stalePlaylists.length; i++) {
      processedCount++;
      const playlist = stalePlaylists[i];
      let songCount = playlist.cached_song_count || 0;
      let imageUrl = playlist.cached_image_url || '';
      let saves = playlist.cached_saves || 0;

      let currentName = playlist.playlist_name;

      send('log', { message: `⚡ [${processedCount}/${playlists.length}] [${currentName}] Fetching from Spotify...` });

      try {
        const spotifyData = await getSpotifyPlaylistData(playlist.playlist_link);
        if (spotifyData) {
          imageUrl = spotifyData.imageUrl || imageUrl;
          saves = spotifyData.followers || saves;
          songCount = spotifyData.trackCount || songCount;

          if (spotifyData.name && spotifyData.name !== 'Unknown' && spotifyData.name !== 'Unknown Playlist' && spotifyData.name !== currentName) {
            send('log', { message: `📛 [${currentName}] Name changed to "${spotifyData.name}"` });
            currentName = spotifyData.name;
          }

          send('log', { message: `📊 [${currentName}] Spotify: songs=${spotifyData.trackCount}, saves=${spotifyData.followers}, image=${spotifyData.imageUrl ? 'Yes' : 'No'}` });
        }
      } catch (err) {
        send('log', { message: `⚠️ [${currentName}] Spotify error: ${err instanceof Error ? err.message : 'Unknown'}` });
      }

      const needsApify = songCount === 0 || saves === 0 || !imageUrl;
      let dataComplete = !needsApify || playlist.health_status === 'removed';

      if (needsApify && playlist.health_status !== 'removed') {
        send('log', { message: `🔮 [${currentName}] Calling Apify for missing data...` });
        try {
          const apifyData = await scrapeSpotifyPlaylistData(playlist.playlist_link, false);
          if (apifyData) {
            if (songCount === 0 && apifyData.trackCount > 0) songCount = apifyData.trackCount;
            if (saves === 0 && apifyData.followers > 0) saves = apifyData.followers;
            if (!imageUrl && apifyData.imageUrl) imageUrl = apifyData.imageUrl;

            if (apifyData.name && apifyData.name !== 'Unknown Playlist' && apifyData.name !== currentName) {
              send('log', { message: `📛 [${currentName}] Apify detected name change to "${apifyData.name}"` });
              currentName = apifyData.name;
            }

            dataComplete = true;
            send('log', { message: `✅ [${currentName}] Apify: songs=${apifyData.trackCount}, saves=${apifyData.followers}, image=${apifyData.imageUrl ? 'Yes' : 'No'}` });
          } else {
            send('log', { message: `⚠️ [${currentName}] Apify returned no data — will retry on next refresh` });
          }
        } catch (err) {
          send('log', { message: `❌ [${currentName}] Apify error: ${err instanceof Error ? err.message : 'Unknown'} — will retry on next refresh` });
        }

        if (i < stalePlaylists.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const nameChanged = currentName !== playlist.playlist_name;
      const updatePayload: Record<string, any> = {
        cached_song_count: songCount,
        cached_image_url: imageUrl,
        cached_saves: saves,
        // Only mark as fully scraped when data is complete
        ...(dataComplete ? { last_scraped_at: new Date().toISOString() } : {}),
      };

      if (nameChanged) {
        updatePayload.playlist_name = currentName;
      }

      await supabase
        .from('playlist_network')
        .update(updatePayload)
        .eq('id', playlist.id);

      if (nameChanged) {
        const updated = await propagatePlaylistNameChange(supabase, playlist.id, currentName);
        if (updated > 0) {
          send('log', { message: `🔄 [${currentName}] Updated name in ${updated} campaign assignment(s)` });
        }
      }

      send('log', { message: `💾 [${currentName}] Saved: songs=${songCount}, saves=${saves}, image=${imageUrl ? 'Yes' : 'No'}${nameChanged ? ' (name updated)' : ''}${!dataComplete ? ' ⚠️ (incomplete — not marked as refreshed)' : ''}` });

      send('playlist', {
        id: playlist.id,
        playlistName: currentName,
        playlistLink: playlist.playlist_link,
        imageUrl,
        saves,
        songCount,
        genre: playlist.genre,
      });
    }

    send('log', { message: `✅ Targeted refresh complete! ${playlists.length} playlists processed (${freshPlaylists.length} cached, ${stalePlaylists.length} refreshed).` });
    send('complete', { total: playlists.length });
  } catch (error) {
    send('error', { message: `Fatal error: ${error instanceof Error ? error.message : 'Unknown'}` });
  } finally {
    clearInterval(heartbeatInterval);
  }

  res.end();
}
