import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';
import { v4 as uuidv4 } from 'uuid';

interface TestOrderRequest {
  customerInfo: {
    customerEmail: string;
    firstName: string;
    lastName: string;
    billingAddress: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  songs: {
    id: string;
    spotifyUrl: string;
    packageName: string;
  }[];
}

// Spotify API functions - EXACT COPY from other API files
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify access token: ${response.status}`);
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

// Function to get real track information from Spotify API
async function getTrackInfo(spotifyUrl: string): Promise<{ title: string; artist: string; artistProfileUrl: string; imageUrl: string }> {
  try {
    // Extract track ID from URL
    const trackIdMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
    if (!trackIdMatch) {
      throw new Error('Could not extract track ID from Spotify URL');
    }
    
    const trackId = trackIdMatch[1];
    console.log(`🎵 TEST-ORDER: Fetching track details for ID: ${trackId}`);
    
    // Get Spotify access token and track details
    const accessToken = await getSpotifyAccessToken();
    const spotifyTrack = await fetchSpotifyTrackDetails(trackId, accessToken);
    
    // Extract track information exactly like the normal order process
    const primaryArtist = spotifyTrack.artists[0];
    const artistProfileUrl = primaryArtist?.external_urls?.spotify || '';
    
    return {
      title: spotifyTrack.name,
      artist: spotifyTrack.artists.map((artist: any) => artist.name).join(', '),
      artistProfileUrl: artistProfileUrl,
      imageUrl: spotifyTrack.album.images[0]?.url || ''
    };
  } catch (error) {
    console.error('🎵 TEST-ORDER: Error getting track info from Spotify:', error);
    // Fallback to basic info if Spotify API fails
    return {
      title: 'Unknown Track',
      artist: 'Unknown Artist', 
      artistProfileUrl: '',
      imageUrl: ''
    };
  }
}

// Function to get package price and info
function getPackageInfo(packageName: string) {
  const packages: { [key: string]: { id: string; price: number } } = {
    'TEST PACKAGE': { id: 'test', price: 0.10 },
    'LEGENDARY': { id: 'legendary', price: 479 },
    'UNSTOPPABLE': { id: 'unstoppable', price: 259 },
    'DOMINATE': { id: 'dominate', price: 149 },
    'MOMENTUM': { id: 'momentum', price: 79 },
    'BREAKTHROUGH': { id: 'breakthrough', price: 39 }
  };
  
  return packages[packageName] || { id: 'test', price: 0.10 };
}

// Helper functions to get package details - EXACT COPY from normal order system
function getPackagePlays(packageName: string): string {
  const plays: { [key: string]: string } = {
    'TEST PACKAGE': '1 - 5 Streams',
    'LEGENDARY': '125K - 150K Streams',
    'UNSTOPPABLE': '45K - 50K Streams', 
    'DOMINATE': '18K - 20K Streams',
    'MOMENTUM': '7.5K - 8.5K Streams',
    'BREAKTHROUGH': '3K - 3.5K Streams'
  };
  return plays[packageName] || '3K - 3.5K Streams';
}

function getPackagePlacements(packageName: string): string {
  const placements: { [key: string]: string } = {
    'TEST PACKAGE': '1 - 2 Playlist Pitches',
    'LEGENDARY': '375 - 400 Playlist Pitches',
    'UNSTOPPABLE': '150 - 170 Playlist Pitches',
    'DOMINATE': '60 - 70 Playlist Pitches', 
    'MOMENTUM': '25 - 30 Playlist Pitches',
    'BREAKTHROUGH': '10 - 12 Playlist Pitches'
  };
  return placements[packageName] || '10 - 12 Playlist Pitches';
}

function getPackageDescription(packageName: string): string {
  const descriptions: { [key: string]: string } = {
    'TEST PACKAGE': 'Test package for development and checkout testing purposes',
    'LEGENDARY': 'Designed for serious artists who accept nothing but total victory',
    'UNSTOPPABLE': 'The go-to campaign for creators who want massive industry impact',
    'DOMINATE': 'Perfect for dominating the industry and making serious waves',
    'MOMENTUM': 'Made for artists ready to accelerate their growth and level up fast',
    'BREAKTHROUGH': 'The perfect gateway campaign to rapidly skyrocket your music career'
  };
  return descriptions[packageName] || 'Perfect for getting started';
}

// Function to generate order number - EXACT COPY from create-order.ts
async function generateOrderNumber(supabase: any): Promise<string> {
  const maxRetries = 5;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 ORDER-NUMBER: Attempt ${attempt} to generate unique order number`);
      
      // Get all order numbers to find the highest one
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select('order_number');

      if (error) {
        console.error('🔍 ORDER-NUMBER: Error fetching orders:', error);
        // If we can't fetch, use timestamp-based fallback
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        const fallbackNumber = `8${timestamp}${random}`;
        console.log('🔍 ORDER-NUMBER: Using fallback number:', fallbackNumber);
        return fallbackNumber;
      }

      let nextNumber = 3001; // Starting number

      if (allOrders && allOrders.length > 0) {
        console.log(`🔍 ORDER-NUMBER: Found ${allOrders.length} existing orders`);
        
        // Find the highest order number
        let highestNumber = 3000; // Base number
        
        for (const order of allOrders) {
          const orderNumber = order.order_number;
          // Handle both old format (FASHO-3005) and new format (3005)
          const numberPart = orderNumber.startsWith('FASHO-') 
            ? orderNumber.replace('FASHO-', '') 
            : orderNumber;
          const orderNum = parseInt(numberPart, 10);
          
          if (!isNaN(orderNum) && orderNum > highestNumber) {
            highestNumber = orderNum;
          }
        }
        
        nextNumber = highestNumber + 1;
        console.log('🔍 ORDER-NUMBER: Highest existing number:', highestNumber, 'Next number:', nextNumber);
      }

      // Add randomization to prevent conflicts in concurrent requests
      const randomOffset = Math.floor(Math.random() * 10); // 0-9
      nextNumber += randomOffset;

      // Format as 4-digit number with leading zeros if needed
      const proposedOrderNumber = nextNumber.toString();
      
      console.log('🔍 ORDER-NUMBER: Proposed order number:', proposedOrderNumber);
      
      // Check if this order number already exists (race condition protection)
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('order_number', proposedOrderNumber)
        .limit(1);
        
      if (checkError) {
        console.error('🔍 ORDER-NUMBER: Error checking for existing order:', checkError);
        // Continue to next attempt
        continue;
      }
      
      if (existingOrder && existingOrder.length > 0) {
        console.log('🔍 ORDER-NUMBER: Order number already exists, retrying...');
        // Add a small delay before retry to avoid rapid-fire attempts
        await new Promise(resolve => setTimeout(resolve, 100 + (attempt * 50)));
        continue;
      }
      
      console.log('🔍 ORDER-NUMBER: Order number is unique, using:', proposedOrderNumber);
      return proposedOrderNumber;

    } catch (error) {
      console.error(`🔍 ORDER-NUMBER: Error on attempt ${attempt}:`, error);
      if (attempt === maxRetries) {
        // Final fallback - use timestamp with random component
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const fallbackNumber = `9${timestamp}${random}`;
        console.log('🔍 ORDER-NUMBER: Using final fallback number:', fallbackNumber);
        return fallbackNumber;
      }
      // Wait before retry with increasing delay
      await new Promise(resolve => setTimeout(resolve, 200 + (attempt * 100)));
    }
  }
  
  // This should never be reached, but just in case
  const emergencyNumber = Date.now().toString().slice(-6);
  console.log('🔍 ORDER-NUMBER: Using emergency fallback:', emergencyNumber);
  return emergencyNumber;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();
    const { customerInfo, songs }: TestOrderRequest = req.body;

    console.log('🧪 TEST-ORDER: Creating test order for admin:', adminUser.email);
    console.log('🧪 TEST-ORDER: Customer info:', customerInfo);
    console.log('🧪 TEST-ORDER: Songs:', songs.length);

    // Validate input
    if (!customerInfo.customerEmail || !customerInfo.firstName || !customerInfo.lastName) {
      return res.status(400).json({ error: 'Missing required customer information' });
    }

    if (!songs || songs.length === 0) {
      return res.status(400).json({ error: 'At least one song is required' });
    }

    // Validate Spotify URLs
    for (const song of songs) {
      if (!song.spotifyUrl.includes('spotify.com/track/')) {
        return res.status(400).json({ error: 'Invalid Spotify URL format' });
      }
    }

    // Generate order details
    const orderId = uuidv4();
    const orderNumber = await generateOrderNumber(supabase);
    const customerName = `${customerInfo.firstName} ${customerInfo.lastName}`;
    
    // Calculate total price
    const totalPrice = songs.reduce((total, song) => {
      const packageInfo = getPackageInfo(song.packageName);
      return total + packageInfo.price;
    }, 0);

    console.log('🧪 TEST-ORDER: Generated order ID:', orderId);
    console.log('🧪 TEST-ORDER: Generated order number:', orderNumber);
    console.log('🧪 TEST-ORDER: Total price:', totalPrice);

    // Create billing info JSONB
    const billingInfo = {
      email: customerInfo.customerEmail,
      firstName: customerInfo.firstName,
      lastName: customerInfo.lastName,
      billingAddress: customerInfo.billingAddress,
      musicGenre: 'General' // Default genre for test orders
    };

    // Create payment data JSONB
    const paymentData = {
      type: 'test',
      test_payment_id: `test_${orderNumber}`,
      status: 'paid',
      created_at: new Date().toISOString()
    };

    // Create the main order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: customerInfo.customerEmail,
        subtotal: totalPrice,
        discount: 0,
        total: totalPrice,
        status: 'processing', // Test orders start as processing
        payment_status: 'paid', // But payment is already complete
        billing_info: billingInfo,
        payment_data: paymentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('🧪 TEST-ORDER: Error creating order:', orderError);
      return res.status(500).json({ error: 'Failed to create test order' });
    }

    console.log('🧪 TEST-ORDER: Order created successfully:', order.id);

    // Create order items for each song
    const orderItems = [];
    for (const [index, song] of songs.entries()) {
      const packageInfo = getPackageInfo(song.packageName);
      
      // Get real track information from Spotify API - EXACTLY like normal orders
      const trackInfo = await getTrackInfo(song.spotifyUrl);
      
      // Extract track ID for the track_id field
      const trackIdMatch = song.spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
      const trackId = trackIdMatch ? trackIdMatch[1] : 'unknown_track_id';
      
      // Package details are handled by the helper functions
      
      const orderItem = {
        id: uuidv4(),
        order_id: orderId,
        track_id: trackId,
        track_title: trackInfo.title,
        track_artist: trackInfo.artist,
        track_image_url: trackInfo.imageUrl,
        track_url: song.spotifyUrl,
        artist_profile_url: trackInfo.artistProfileUrl,
        package_id: packageInfo.id,
        package_name: song.packageName,
        package_price: packageInfo.price,
        package_plays: getPackagePlays(song.packageName),
        package_placements: getPackagePlacements(song.packageName),
        package_description: getPackageDescription(song.packageName),
        original_price: packageInfo.price,
        discounted_price: packageInfo.price,
        is_discounted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      orderItems.push(orderItem);
    }

    // Insert all order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error('🧪 TEST-ORDER: Error creating order items:', itemsError);
      // Clean up the order if items failed
      await supabase.from('orders').delete().eq('id', orderId);
      return res.status(500).json({ error: 'Failed to create order items' });
    }

    console.log('🧪 TEST-ORDER: Order items created:', items?.length);

    // The marketing campaign will be automatically created by the database trigger
    console.log('🧪 TEST-ORDER: Test order created successfully');

    res.status(200).json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      totalPrice: totalPrice,
      itemsCount: orderItems.length,
      message: 'Test order created successfully'
    });

  } catch (error: any) {
    console.error('🧪 TEST-ORDER: Error creating test order:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

export default requireAdminAuth(handler);