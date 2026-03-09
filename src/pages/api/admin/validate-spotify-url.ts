import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../../utils/supabase/server';
import { getTrackById } from '../../../utils/spotify-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, itemId } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  // Use regular client for auth check
  const supabase = createClient(req, res);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Use service role client for database operations to bypass RLS
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`🎵 SPOTIFY-VALIDATION: Validating URL: ${url}`);

    // Basic URL format validation
    const spotifyRegex = /^https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)(\?.*)?$/;
    const match = url.match(spotifyRegex);
    
    if (!match) {
      return res.status(400).json({ 
        error: 'Invalid Spotify URL format. Please use: https://open.spotify.com/track/[track-id]' 
      });
    }

    const trackId = match[1];
    console.log(`🎵 SPOTIFY-VALIDATION: Extracted track ID: ${trackId}`);

    console.log(`🎵 SPOTIFY-API: Fetching track details for ID: ${trackId}`);
    const spotifyTrack = await getTrackById(trackId);
    
    if (!spotifyTrack) {
      throw new Error('Track not found on Spotify');
    }
    console.log(`🎵 SPOTIFY-API: Track details fetched successfully`);

    const trackInfo = {
      trackId: spotifyTrack.id,
      title: spotifyTrack.title,
      artist: spotifyTrack.artist,
      artistProfileUrl: spotifyTrack.artistProfileUrl,
      album: spotifyTrack.album,
      imageUrl: spotifyTrack.imageUrl,
      duration: spotifyTrack.duration,
      isPlayable: spotifyTrack.isPlayable,
      previewUrl: spotifyTrack.previewUrl,
      popularity: 0,
      releaseDate: spotifyTrack.releaseDate,
      url: url
    };

    console.log(`🎵 SPOTIFY-API: Parsed track info:`, {
      title: trackInfo.title,
      artist: trackInfo.artist,
      artistProfileUrl: trackInfo.artistProfileUrl,
      album: trackInfo.album,
      hasImage: !!trackInfo.imageUrl
    });

    // Update database with new track information
    console.log(`🎵 DATABASE-UPDATE: Updating order item ${itemId} with new track info`);
    
    // First, verify the item exists using service client
    const { data: existingItem, error: fetchError } = await supabaseService
      .from('order_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError || !existingItem) {
      console.error('🎵 DATABASE-UPDATE: Item not found:', { itemId, error: fetchError });
      return res.status(404).json({ error: 'Order item not found' });
    }

    console.log(`🎵 DATABASE-UPDATE: Found existing item:`, {
      id: existingItem.id,
      currentTitle: existingItem.track_title,
      currentArtist: existingItem.track_artist,
      currentTrackId: existingItem.track_id
    });

    console.log(`🎵 DATABASE-UPDATE: About to update with new data:`, {
      newTrackId: trackInfo.trackId,
      newTitle: trackInfo.title,
      newArtist: trackInfo.artist,
      newUrl: trackInfo.url
    });
    
    // Use service client for the update to bypass RLS policies
    const { data: updatedItems, error: updateError } = await supabaseService
      .from('order_items')
      .update({
        track_id: trackInfo.trackId,
        track_title: trackInfo.title,
        track_artist: trackInfo.artist,
        track_image_url: trackInfo.imageUrl,
        track_url: trackInfo.url,
        artist_profile_url: trackInfo.artistProfileUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select('*');

    if (updateError) {
      console.error('🎵 DATABASE-UPDATE: Error updating order item:', updateError);
      return res.status(500).json({ error: 'Failed to update track information in database' });
    }

    if (!updatedItems || updatedItems.length === 0) {
      console.error('🎵 DATABASE-UPDATE: No rows updated - item may not exist:', { itemId });
      return res.status(404).json({ error: 'Order item not found or could not be updated' });
    }

    const updatedItem = updatedItems[0];
    console.log(`🎵 DATABASE-UPDATE: Successfully updated order item ${itemId}:`, {
      newTitle: updatedItem.track_title,
      newArtist: updatedItem.track_artist,
      newTrackId: updatedItem.track_id,
      updatedAt: updatedItem.updated_at
    });
    console.log(`🎵 INTEGRATION-COMPLETE: Track info updated across all systems`);

    return res.status(200).json({
      success: true,
      message: 'Track information updated successfully',
      trackInfo: {
        trackId: trackInfo.trackId,
        title: trackInfo.title,
        artist: trackInfo.artist,
        artistProfileUrl: trackInfo.artistProfileUrl,
        album: trackInfo.album,
        imageUrl: trackInfo.imageUrl,
        duration: trackInfo.duration,
        isPlayable: trackInfo.isPlayable,
        previewUrl: trackInfo.previewUrl,
        popularity: trackInfo.popularity,
        releaseDate: trackInfo.releaseDate,
        url: trackInfo.url
      },
      spotifyApiIntegration: {
        status: 'completed',
        message: 'Successfully fetched track details from Spotify Web API',
        actions: [
          'Validated Spotify URL format',
          'Fetched track details from Spotify Web API',
          'Extracted artist profile URL',
          'Updated database with new track information',
          'Ready for dashboard refresh'
        ]
      }
    });

  } catch (error) {
    console.error('🎵 SPOTIFY-VALIDATION: Error:', error);
    
    // Provide specific error messages for different failure types
    let errorMessage = 'Failed to validate Spotify URL';
    if (error instanceof Error) {
      if (error.message.includes('Missing Spotify credentials')) {
        errorMessage = 'Spotify API is not configured. Please contact support.';
      } else if (error.message.includes('Track not found')) {
        errorMessage = 'This track was not found on Spotify. Please check the URL and try again.';
      } else if (error.message.includes('access token')) {
        errorMessage = 'Unable to connect to Spotify. Please try again later.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 