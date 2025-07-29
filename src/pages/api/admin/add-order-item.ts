import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

// Define available packages (consistent with the main application)
const AVAILABLE_PACKAGES = [
  {
    id: "test-campaign",
    name: "TEST CAMPAIGN",
    price: 0.10,
    plays: "Test Package",
    placements: "Payment Testing Only",
    description: "For testing live payment processing"
  },
  {
    id: "legendary",
    name: "LEGENDARY",
    price: 479,
    plays: "125K - 150K Streams",
    placements: "375 - 400 Playlist Pitches",
    description: ""
  },
  {
    id: "unstoppable",
    name: "UNSTOPPABLE",
    price: 259,
    plays: "45K - 50K Streams",
    placements: "150 - 170 Playlist Pitches",
    description: ""
  },
  {
    id: "dominate",
    name: "DOMINATE",
    price: 149,
    plays: "18K - 20K Streams",
    placements: "60 - 70 Playlist Pitches",
    description: ""
  },
  {
    id: "momentum",
    name: "MOMENTUM",
    price: 79,
    plays: "7.5K - 8.5K Streams",
    placements: "25 - 30 Playlist Pitches",
    description: ""
  },
  {
    id: "breakthrough",
    name: "BREAKTHROUGH",
    price: 39,
    plays: "3K - 3.5K Streams",
    placements: "10 - 12 Playlist Pitches",
    description: ""
  }
];

// Spotify API functions (reused from existing validation endpoint)
async function getSpotifyAccessToken(): Promise<string> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchSpotifyTrackDetails(trackId: string, accessToken: string): Promise<any> {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch track details from Spotify');
  }

  return await response.json();
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, spotifyUrl, packageId } = req.body;

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  if (!spotifyUrl || typeof spotifyUrl !== 'string') {
    return res.status(400).json({ error: 'Spotify URL is required' });
  }

  if (!packageId || typeof packageId !== 'string') {
    return res.status(400).json({ error: 'Package ID is required' });
  }

  const supabase = createAdminClient();

  try {
    console.log(`🎵 ADD-ORDER-ITEM: Adding new item to order ${orderId}`);
    console.log(`🎵 ADD-ORDER-ITEM: Spotify URL: ${spotifyUrl}`);
    console.log(`🎵 ADD-ORDER-ITEM: Package ID: ${packageId}`);

    // Validate Spotify URL format
    const spotifyRegex = /^https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)(\?.*)?$/;
    const match = spotifyUrl.match(spotifyRegex);
    
    if (!match) {
      return res.status(400).json({ 
        error: 'Invalid Spotify URL format. Please use: https://open.spotify.com/track/[track-id]' 
      });
    }

    // Find the selected package
    const selectedPackage = AVAILABLE_PACKAGES.find(pkg => pkg.id === packageId);
    if (!selectedPackage) {
      return res.status(400).json({ error: 'Invalid package selected' });
    }

    // Verify the order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('🎵 ADD-ORDER-ITEM: Order not found:', orderError);
      return res.status(404).json({ error: 'Order not found' });
    }

    const trackId = match[1];
    console.log(`🎵 ADD-ORDER-ITEM: Extracted track ID: ${trackId}`);

    // Get Spotify track details
    const accessToken = await getSpotifyAccessToken();
    const spotifyTrack = await fetchSpotifyTrackDetails(trackId, accessToken);

    // Extract track information
    const primaryArtist = spotifyTrack.artists[0];
    const artistProfileUrl = primaryArtist?.external_urls?.spotify || '';
    
    const trackInfo = {
      trackId: spotifyTrack.id,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists.map((artist: any) => artist.name).join(', '),
      artistProfileUrl: artistProfileUrl,
      album: spotifyTrack.album.name,
      imageUrl: spotifyTrack.album.images[0]?.url || '',
      duration: spotifyTrack.duration_ms,
      isPlayable: spotifyTrack.is_playable,
      previewUrl: spotifyTrack.preview_url,
      popularity: spotifyTrack.popularity,
      releaseDate: spotifyTrack.album.release_date,
      url: spotifyUrl
    };

    console.log(`🎵 ADD-ORDER-ITEM: Track info retrieved:`, {
      title: trackInfo.title,
      artist: trackInfo.artist,
      package: selectedPackage.name
    });

    // Create new order item
    const newOrderItem = {
      order_id: orderId,
      track_id: trackInfo.trackId,
      track_title: trackInfo.title,
      track_artist: trackInfo.artist,
      track_image_url: trackInfo.imageUrl,
      track_url: trackInfo.url,
      artist_profile_url: trackInfo.artistProfileUrl,
      package_id: selectedPackage.id,
      package_name: selectedPackage.name,
      package_price: selectedPackage.price,
      package_plays: selectedPackage.plays,
      package_placements: selectedPackage.placements,
      package_description: selectedPackage.description,
      original_price: selectedPackage.price,
      discounted_price: selectedPackage.price,
      is_discounted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert the new order item
    const { data: insertedItem, error: insertError } = await supabase
      .from('order_items')
      .insert([newOrderItem])
      .select('*')
      .single();

    if (insertError) {
      console.error('🎵 ADD-ORDER-ITEM: Error inserting order item:', insertError);
      return res.status(500).json({ error: 'Failed to add item to order' });
    }

    console.log(`🎵 ADD-ORDER-ITEM: Successfully added item ${insertedItem.id} to order ${orderId}`);

    // Update order totals (add the new item price to subtotal and total)
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        subtotal: order.subtotal + selectedPackage.price,
        total: order.total + selectedPackage.price,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateOrderError) {
      console.error('🎵 ADD-ORDER-ITEM: Error updating order totals:', updateOrderError);
      // Don't fail the request, item was added successfully
    }

    return res.status(200).json({
      success: true,
      message: 'Item added successfully',
      item: insertedItem,
      trackInfo: {
        title: trackInfo.title,
        artist: trackInfo.artist,
        package: selectedPackage.name
      }
    });

  } catch (error) {
    console.error('🎵 ADD-ORDER-ITEM: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler); 