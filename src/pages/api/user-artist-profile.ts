import { NextApiRequest, NextApiResponse } from 'next';
import { createClientSSR } from '../../utils/supabase/server';

// Helper function to get Spotify access token
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Helper function to fetch artist data from Spotify
async function fetchSpotifyArtist(artistId: string) {
  try {
    const accessToken = await getSpotifyAccessToken();
    
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const artist = await response.json();
    
    return {
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url || null,
      followersCount: artist.followers?.total || 0,
      genres: artist.genres || [],
      spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
    };
  } catch (error) {
    console.error('Error fetching Spotify artist:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClientSSR({ req, res });

  // Check authentication
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

// GET - Fetch user's artist profile
async function handleGet(supabase: any, userId: string, res: NextApiResponse) {
  console.log('🔐 USER-ARTIST-PROFILE-GET: Fetching artist profile for user:', userId);

  // First, try to get existing profile
  const { data: existingProfile, error: profileError } = await supabase
    .from('user_artist_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('🔐 USER-ARTIST-PROFILE-GET: Database error:', profileError);
    return res.status(500).json({ error: 'Failed to fetch artist profile' });
  }

  if (existingProfile) {
    console.log('🔐 USER-ARTIST-PROFILE-GET: Found existing artist profile:', existingProfile.artist_name);
    return res.status(200).json({ profile: existingProfile });
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
      return res.status(200).json({ profile: null });
    }

    console.log('🔐 USER-ARTIST-PROFILE-GET: Found artist profile URL in orders:', artistProfileUrl);

    // Extract artist ID from Spotify URL
    const artistIdMatch = artistProfileUrl.match(/artist\/([a-zA-Z0-9]+)/);
    if (!artistIdMatch) {
      console.log('🔐 USER-ARTIST-PROFILE-GET: Invalid Spotify artist URL format');
      return res.status(200).json({ profile: null });
    }

    const artistId = artistIdMatch[1];
    console.log('🔐 USER-ARTIST-PROFILE-GET: Extracted artist ID:', artistId);

    // Fetch artist details from Spotify
    try {
      const artistData = await fetchSpotifyArtist(artistId);
      
      if (!artistData) {
        console.log('🔐 USER-ARTIST-PROFILE-GET: Failed to fetch artist details from Spotify');
        return res.status(200).json({ profile: null });
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
        return res.status(200).json({ profile: null });
      }

      console.log('🔐 USER-ARTIST-PROFILE-GET: Successfully created profile from order history');
      return res.status(200).json({ profile: newProfile });

    } catch (error) {
      console.error('🔐 USER-ARTIST-PROFILE-GET: Error fetching artist from Spotify:', error);
      return res.status(200).json({ profile: null });
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