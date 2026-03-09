import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, createAdminClient } from '../../../utils/supabase/server';
import { getArtistStats } from '../../../utils/apify-artist-stats';
import { getTrackImagesByIds, searchTracks } from '../../../utils/spotify-api';

function normalizeTrackName(value: string): string {
  return value.toLowerCase().replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

async function getUserSelectedGenres(adminSupabase: any, userId: string): Promise<string | null> {
  try {
    const { data: userProfile } = await adminSupabase
      .from('user_profiles')
      .select('music_genre')
      .eq('user_id', userId)
      .single();

    const rawProfileGenre = userProfile?.music_genre;
    if (typeof rawProfileGenre === 'string' && rawProfileGenre.trim()) {
      return rawProfileGenre.trim();
    }
  } catch {
    // Ignore and fall back to order data.
  }

  try {
    const { data: latestOrder } = await adminSupabase
      .from('orders')
      .select('billing_info')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawOrderGenre =
      latestOrder?.billing_info?.musicGenre ??
      latestOrder?.billing_info?.music_genre ??
      null;

    if (Array.isArray(rawOrderGenre)) {
      const joined = rawOrderGenre.map((genre: string) => genre.trim()).filter(Boolean).join(', ');
      return joined || null;
    }

    if (typeof rawOrderGenre === 'string' && rawOrderGenre.trim()) {
      return rawOrderGenre.trim();
    }
  } catch {
    // Ignore and return null below.
  }

  return null;
}

async function hydrateTrackImages(
  topTracks: Array<{ id: string; name: string; streamCount: number; duration: number; imageUrl: string | null }>,
  artistName: string
) {
  const trackIds = topTracks.map((track) => track.id).filter(Boolean);
  if (trackIds.length > 0) {
    try {
      const imageMap = await getTrackImagesByIds(trackIds);
      for (const track of topTracks) {
        if (imageMap[track.id]) {
          track.imageUrl = imageMap[track.id];
        }
      }
      console.log(`🔮 REFRESH-ARTIST: Fetched images for ${Object.keys(imageMap).length}/${trackIds.length} tracks by id`);
    } catch (e) {
      console.error('🔮 REFRESH-ARTIST: Failed to fetch track images by id:', e);
    }
  }

  let recoveredImages = 0;
  for (const track of topTracks) {
    if (track.imageUrl) continue;

    try {
      const { tracks } = await searchTracks(`${track.name} ${artistName}`, 5);
      const normalizedName = normalizeTrackName(track.name);
      const matchedTrack =
        tracks.find((candidate) => normalizeTrackName(candidate.title) === normalizedName) ||
        tracks[0];

      if (matchedTrack?.imageUrl) {
        track.imageUrl = matchedTrack.imageUrl;
        recoveredImages += 1;
      }
    } catch (e) {
      console.error(`🔮 REFRESH-ARTIST: Failed search fallback for "${track.name}":`, e);
    }
  }

  if (recoveredImages > 0) {
    console.log(`🔮 REFRESH-ARTIST: Recovered ${recoveredImages} track images via search fallback`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminSupabase = createAdminClient();

  const { data: profile } = await adminSupabase
    .from('user_artist_profiles')
    .select('spotify_artist_url')
    .eq('user_id', user.id)
    .single();

  if (!profile?.spotify_artist_url) {
    return res.status(404).json({ error: 'No artist profile found' });
  }

  console.log('🔮 REFRESH-ARTIST: Fetching Apify data for:', profile.spotify_artist_url);

  const stats = await getArtistStats(profile.spotify_artist_url);
  if (!stats) {
    return res.status(502).json({ success: false, error: 'Apify returned no data' });
  }

  const topTracks = stats.topTracks?.map((t: any) => ({
    id: t.id,
    name: t.name,
    streamCount: t.streamCount || 0,
    duration: t.duration || 0,
    imageUrl: null as string | null,
  })) || [];

  await hydrateTrackImages(topTracks, stats.name || '');

  const topCities = stats.topCities?.map((c: any) => ({
    city: c.city,
    country: c.country,
    listeners: c.numberOfListeners || 0,
  })) || [];

  const musicGenre = await getUserSelectedGenres(adminSupabase, user.id);

  const { data: updated, error: updateError } = await adminSupabase
    .from('user_artist_profiles')
    .update({
      apify_monthly_listeners: stats.monthlyListeners || 0,
      apify_world_rank: stats.worldRank || null,
      apify_top_cities: topCities,
      apify_top_tracks: topTracks,
      apify_verified: stats.verified || false,
      followers_count: stats.followers || undefined,
      apify_cached_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('🔮 REFRESH-ARTIST: DB update failed:', updateError);
    return res.status(500).json({ success: false, error: 'Failed to save data' });
  }

  console.log(`🔮 REFRESH-ARTIST: Cached — ${stats.monthlyListeners?.toLocaleString()} listeners, rank #${stats.worldRank}`);

  // Attach music_genre to the response
  const profileWithGenre = { ...updated, user_music_genre: musicGenre };

  return res.status(200).json({ success: true, profile: profileWithGenre });
}
