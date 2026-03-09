import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, createAdminClient } from '../../utils/supabase/server';
import { getArtistById, getTrackImagesByIds, searchTracks } from '../../utils/spotify-api';
import { getArtistStats } from '../../utils/apify-artist-stats';

const APIFY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log('🔐 USER-ARTIST-PROFILE: Authentication failed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log(`🔐 USER-ARTIST-PROFILE: ${req.method} request from user:`, user.email);

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(supabase, user.id, res);
      case 'POST':
        return await handlePost(supabase, user.id, req.body, res);
      case 'PUT':
        return await handlePut(supabase, user.id, req.body, res);
      case 'DELETE':
        return await handleDelete(supabase, user.id, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('🔐 USER-ARTIST-PROFILE: Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function normalizeTrackName(value: string): string {
  return value.toLowerCase().replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

async function getUserSelectedGenres(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data: userProfile } = await supabase
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
    const { data: latestOrder } = await supabase
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
    } catch (e) {
      console.error('🔐 USER-ARTIST-PROFILE: Failed to fetch track images by id:', e);
    }
  }

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
      }
    } catch (e) {
      console.error(`🔐 USER-ARTIST-PROFILE: Failed search fallback for "${track.name}":`, e);
    }
  }
}

// GET - Fetch user's artist profile
async function handleGet(supabase: any, userId: string, res: NextApiResponse) {
  console.log('🔐 USER-ARTIST-PROFILE-GET: Fetching artist profile for user:', userId);

  const { data: existingProfile, error: profileError } = await supabase
    .from('user_artist_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('🔐 USER-ARTIST-PROFILE-GET: Database error:', profileError);
    return res.status(500).json({ error: 'Failed to fetch artist profile' });
  }

  const userMusicGenre = await getUserSelectedGenres(supabase, userId);

  if (existingProfile) {
    console.log('🔐 USER-ARTIST-PROFILE-GET: Found existing artist profile:', existingProfile.artist_name);

    const profileWithGenre = { ...existingProfile, user_music_genre: userMusicGenre };

    const cachedAt = existingProfile.apify_cached_at ? new Date(existingProfile.apify_cached_at).getTime() : 0;
    const isStale = !cachedAt || (Date.now() - cachedAt > APIFY_CACHE_TTL_MS);
    const hasApifyData = !!existingProfile.apify_monthly_listeners || !!existingProfile.apify_top_tracks;

    if (hasApifyData && !isStale) {
      console.log('🔐 USER-ARTIST-PROFILE-GET: Returning cached Apify data');
      return res.status(200).json({ profile: profileWithGenre, apifyCacheStatus: 'fresh' });
    }

    // Return profile immediately, then try to refresh Apify data
    if (existingProfile.spotify_artist_url && isStale) {
      console.log('🔐 USER-ARTIST-PROFILE-GET: Apify data stale/missing, refreshing in background');
      refreshApifyData(userId, existingProfile.spotify_artist_url).catch(e =>
        console.error('🔐 USER-ARTIST-PROFILE-GET: Background Apify refresh failed:', e)
      );
    }

    return res.status(200).json({
      profile: profileWithGenre,
      apifyCacheStatus: hasApifyData ? 'stale' : 'missing',
    });
  }

  // No existing profile found, try to create one from order history
  console.log('🔐 USER-ARTIST-PROFILE-GET: No existing profile, checking order history...');
  
  try {
    // Get user's orders with artist profile URLs
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_items (
          artist_profile_url,
          track_artist,
          track_title
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('🔐 USER-ARTIST-PROFILE-GET: Error fetching orders:', ordersError);
      return res.status(200).json({ profile: null });
    }

    // Find the first order item with an artist profile URL
    let artistProfileUrl = null;
    let trackArtist = null;
    
    for (const order of orders || []) {
      for (const item of order.order_items || []) {
        if (item.artist_profile_url && item.track_artist) {
          artistProfileUrl = item.artist_profile_url;
          trackArtist = item.track_artist;
          break;
        }
      }
      if (artistProfileUrl) break;
    }

    if (!artistProfileUrl) {
      console.log('🔐 USER-ARTIST-PROFILE-GET: No artist profile URL found in order history');
      const result = { profile: null };
      
      return res.status(200).json(result);
    }

    console.log('🔐 USER-ARTIST-PROFILE-GET: Found artist profile URL in orders:', artistProfileUrl);

    // Extract artist ID from Spotify URL
    const artistIdMatch = artistProfileUrl.match(/artist\/([a-zA-Z0-9]+)/);
    if (!artistIdMatch) {
      console.log('🔐 USER-ARTIST-PROFILE-GET: Invalid Spotify artist URL format');
      const result = { profile: null };
      
      return res.status(200).json(result);
    }

    const artistId = artistIdMatch[1];
    console.log('🔐 USER-ARTIST-PROFILE-GET: Extracted artist ID:', artistId);

    // Fetch artist details from Spotify
    try {
      const artistData = await getArtistById(artistId);
      
      if (!artistData) {
        console.log('🔐 USER-ARTIST-PROFILE-GET: Failed to fetch artist details from Spotify');
        const result = { profile: null };
        
        return res.status(200).json(result);
      }

      // Create artist profile from Spotify data
      const profileData = {
        user_id: userId,
        spotify_artist_id: artistData.id,
        artist_name: artistData.name,
        artist_image_url: artistData.imageUrl,
        spotify_artist_url: artistProfileUrl,
        followers_count: artistData.followersCount || 0,
        genres: artistData.genres || [],
      };

      console.log('🔐 USER-ARTIST-PROFILE-GET: Creating new profile from order history:', profileData.artist_name);

      const { data: newProfile, error: createError } = await supabase
        .from('user_artist_profiles')
        .insert(profileData)
        .select()
        .single();

      if (createError) {
        console.error('🔐 USER-ARTIST-PROFILE-GET: Error creating profile:', createError);
        const result = { profile: null };
        
        return res.status(200).json(result);
      }

      console.log('🔐 USER-ARTIST-PROFILE-GET: Successfully created profile from order history');
      const result = { profile: { ...newProfile, user_music_genre: userMusicGenre } };
      
      return res.status(200).json(result);

    } catch (error) {
      console.error('🔐 USER-ARTIST-PROFILE-GET: Error fetching artist from Spotify:', error);
      const result = { profile: null };
      
      // Cache null result for 5 minutes
      // cache.set(cacheKey, result, 5 * 60 * 1000);
      console.log('🔐 USER-ARTIST-PROFILE-GET: Cached null profile for user:', userId);
      
      return res.status(200).json(result);
    }

  } catch (error) {
    console.error('🔐 USER-ARTIST-PROFILE-GET: Error processing order history:', error);
    return res.status(200).json({ profile: null });
  }
}

// POST - Create new artist profile
async function handlePost(supabase: any, userId: string, body: any, res: NextApiResponse) {
  const { 
    spotify_artist_id, 
    artist_name, 
    artist_image_url, 
    spotify_artist_url, 
    followers_count, 
    genres 
  } = body;

  if (!spotify_artist_id || !artist_name || !spotify_artist_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log('🔐 USER-ARTIST-PROFILE-POST: Creating artist profile for:', artist_name);

  // Check if user already has a profile
  const { data: existingProfile } = await supabase
    .from('user_artist_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingProfile) {
    return res.status(409).json({ error: 'User already has an artist profile. Use PUT to update.' });
  }

  const { data, error } = await supabase
    .from('user_artist_profiles')
    .insert({
      user_id: userId,
      spotify_artist_id,
      artist_name,
      artist_image_url,
      spotify_artist_url,
      followers_count: followers_count || 0,
      genres: genres || [],
    })
    .select()
    .single();

  if (error) {
    console.error('🔐 USER-ARTIST-PROFILE-POST: Database error:', error);
    return res.status(500).json({ error: 'Failed to create artist profile' });
  }

  console.log('🔐 USER-ARTIST-PROFILE-POST: Created artist profile successfully');
  
  return res.status(201).json({ profile: data });
}

// PUT - Update existing artist profile
async function handlePut(supabase: any, userId: string, body: any, res: NextApiResponse) {
  const { 
    spotify_artist_id, 
    artist_name, 
    artist_image_url, 
    spotify_artist_url, 
    followers_count, 
    genres 
  } = body;

  if (!spotify_artist_id || !artist_name || !spotify_artist_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log('🔐 USER-ARTIST-PROFILE-PUT: Updating artist profile to:', artist_name);

  const { data, error } = await supabase
    .from('user_artist_profiles')
    .update({
      spotify_artist_id,
      artist_name,
      artist_image_url,
      spotify_artist_url,
      followers_count: followers_count || 0,
      genres: genres || [],
      apify_monthly_listeners: null,
      apify_world_rank: null,
      apify_top_cities: null,
      apify_top_tracks: null,
      apify_verified: null,
      apify_cached_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('🔐 USER-ARTIST-PROFILE-PUT: Database error:', error);
    return res.status(500).json({ error: 'Failed to update artist profile' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Artist profile not found' });
  }

  console.log('🔐 USER-ARTIST-PROFILE-PUT: Updated artist profile successfully');
  
  return res.status(200).json({ profile: data });
}

// DELETE - Remove artist profile
async function handleDelete(supabase: any, userId: string, res: NextApiResponse) {
  console.log('🔐 USER-ARTIST-PROFILE-DELETE: Deleting artist profile for user:', userId);

  const { error } = await supabase
    .from('user_artist_profiles')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('🔐 USER-ARTIST-PROFILE-DELETE: Database error:', error);
    return res.status(500).json({ error: 'Failed to delete artist profile' });
  }

  console.log('🔐 USER-ARTIST-PROFILE-DELETE: Deleted artist profile successfully');
  
  return res.status(200).json({ message: 'Artist profile deleted successfully' });
}

// Background function to refresh Apify data and cache it in the profile
async function refreshApifyData(userId: string, artistUrl: string) {
  console.log('🔐 USER-ARTIST-PROFILE: Refreshing Apify data for:', artistUrl);
  const adminSupabase = createAdminClient();

  const stats = await getArtistStats(artistUrl);
  if (!stats) {
    console.log('🔐 USER-ARTIST-PROFILE: Apify returned no data');
    return;
  }

  const topTracks: { id: string; name: string; streamCount: number; duration: number; imageUrl: string | null }[] = stats.topTracks?.map((t: any) => ({
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

  const { error } = await adminSupabase
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
    .eq('user_id', userId);

  if (error) {
    console.error('🔐 USER-ARTIST-PROFILE: Failed to cache Apify data:', error);
  } else {
    console.log(`🔐 USER-ARTIST-PROFILE: Cached Apify data — ${stats.monthlyListeners?.toLocaleString()} listeners, rank #${stats.worldRank}`);
  }
} 