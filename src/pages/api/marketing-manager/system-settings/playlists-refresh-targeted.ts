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

  try {
    const supabase = createAdminClient();

    const { data: playlistsData, error } = await supabase
      .from('playlist_network')
      .select(`
        id, playlist_name, genre, account_email, playlist_link,
        spotify_playlist_id, max_songs, cached_song_count, cached_image_url,
        cached_saves, health_status, is_active
      `)
      .in('id', playlistIds);

    if (error) {
      send('error', { message: 'Failed to fetch playlists from database' });
      return res.end();
    }

    const playlists = playlistsData || [];
    send('log', { message: `🔄 Refreshing ${playlists.length} playlists from Purchases Needed...` });

    // Process each playlist: Spotify first, then Apify if needed — one at a time
    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i];
      let songCount = playlist.cached_song_count || 0;
      let imageUrl = playlist.cached_image_url || '';
      let saves = playlist.cached_saves || 0;

      let currentName = playlist.playlist_name;

      send('log', { message: `⚡ [${i + 1}/${playlists.length}] [${currentName}] Fetching from Spotify...` });

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

            send('log', { message: `✅ [${currentName}] Apify: songs=${apifyData.trackCount}, saves=${apifyData.followers}, image=${apifyData.imageUrl ? 'Yes' : 'No'}` });
          } else {
            send('log', { message: `⚠️ [${currentName}] Apify returned no data` });
          }
        } catch (err) {
          send('log', { message: `❌ [${currentName}] Apify error: ${err instanceof Error ? err.message : 'Unknown'}` });
        }

        if (i < playlists.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const nameChanged = currentName !== playlist.playlist_name;
      const updatePayload: Record<string, any> = {
        cached_song_count: songCount,
        cached_image_url: imageUrl,
        cached_saves: saves,
        last_scraped_at: new Date().toISOString(),
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

      send('log', { message: `💾 [${currentName}] Saved: songs=${songCount}, saves=${saves}, image=${imageUrl ? 'Yes' : 'No'}${nameChanged ? ' (name updated)' : ''}` });

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

    send('log', { message: `✅ Targeted refresh complete! ${playlists.length} playlists updated.` });
    send('complete', { total: playlists.length });
  } catch (error) {
    send('error', { message: `Fatal error: ${error instanceof Error ? error.message : 'Unknown'}` });
  }

  res.end();
}
