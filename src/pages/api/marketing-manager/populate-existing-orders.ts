import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';
import { MUSIC_GENRES } from '../../../constants/genres';

// Get package configuration from campaign_totals table
const getPackageConfiguration = async (supabase: any, packageName: string) => {
  try {
    const { data: campaignTotal, error } = await supabase
      .from('campaign_totals')
      .select('*')
      .eq('package_name', packageName.toUpperCase())
      .single();

    if (error) {
      console.error(`Error fetching package configuration for ${packageName}:`, error);
      // Return default values if package not found
      return {
        direct_streams: getDefaultStreams(packageName, 'direct'),
        playlist_streams: getDefaultStreams(packageName, 'playlist'),
        playlist_assignments_needed: getDefaultAssignments(packageName),
        time_on_playlists: 7
      };
    }

    return campaignTotal;
  } catch (err) {
    console.error(`Exception fetching package configuration for ${packageName}:`, err);
    return {
      direct_streams: getDefaultStreams(packageName, 'direct'),
      playlist_streams: getDefaultStreams(packageName, 'playlist'),
      playlist_assignments_needed: getDefaultAssignments(packageName),
      time_on_playlists: 7
    };
  }
};

// Fallback function for default stream values
const getDefaultStreams = (packageName: string, type: 'direct' | 'playlist') => {
  const pkg = packageName.toUpperCase();
  const values = {
    'LEGENDARY': { direct: 70000, playlist: 40000 },
    'UNSTOPPABLE': { direct: 21000, playlist: 20000 },
    'DOMINATE': { direct: 10000, playlist: 9000 },
    'MOMENTUM': { direct: 3000, playlist: 4000 },
    'BREAKTHROUGH': { direct: 2000, playlist: 3000 }
  };
  return values[pkg]?.[type] || 0;
};

// Fallback function for default playlist assignments
const getDefaultAssignments = (packageName: string) => {
  const pkg = packageName.toUpperCase();
  const assignments = {
    'LEGENDARY': 4,
    'UNSTOPPABLE': 4,
    'DOMINATE': 3,
    'MOMENTUM': 2,
    'BREAKTHROUGH': 2
  };
  return assignments[pkg] || 2;
};

// Intelligent playlist assignment based on genre and availability
const assignPlaylistsForCampaign = async (supabase: any, customerGenre: string, playlistsNeeded: number) => {
  try {
    // Get all active playlists
    const { data: playlists, error } = await supabase
      .from('playlist_network')
      .select('*')
      .eq('is_active', true)
      .order('cached_song_count', { ascending: true }); // Prioritize less full playlists

    if (error || !playlists) {
      console.error('Error fetching playlists:', error);
      return [];
    }

    // Filter playlists by genre match first
    const genreMatchedPlaylists = playlists.filter(playlist => 
      playlist.genre === customerGenre
    );

    // Filter by availability (not at max capacity)
    const availablePlaylists = genreMatchedPlaylists.filter(playlist => 
      (playlist.cached_song_count || 0) < playlist.max_songs
    );

    // If not enough genre-matched playlists, include other available playlists
    let selectedPlaylists = availablePlaylists.slice(0, playlistsNeeded);
    
    if (selectedPlaylists.length < playlistsNeeded) {
      const otherAvailablePlaylists = playlists.filter(playlist => 
        playlist.genre !== customerGenre && 
        (playlist.cached_song_count || 0) < playlist.max_songs &&
        !selectedPlaylists.find(selected => selected.id === playlist.id)
      );
      
      const additionalNeeded = playlistsNeeded - selectedPlaylists.length;
      selectedPlaylists = [
        ...selectedPlaylists, 
        ...otherAvailablePlaylists.slice(0, additionalNeeded)
      ];
    }

    return selectedPlaylists.map(playlist => ({
      id: playlist.id,
      name: playlist.playlist_name,
      genre: playlist.genre
    }));
  } catch (error) {
    console.error('Error in playlist assignment:', error);
    return [];
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    console.log('🔍 Starting order import process...');

    // First, let's try a simple query to test the connection
    const { data: testOrders, error: testError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, status')
      .limit(5);

    if (testError) {
      console.error('❌ Database connection test failed:', testError);
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: testError.message 
      });
    }

    console.log(`✅ Database connection successful. Found ${testOrders?.length || 0} test orders.`);

    // Check if marketing_campaigns table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Marketing campaigns table not found or not accessible:', tableError);
      return res.status(500).json({ 
        error: 'Marketing campaigns table not found. Please run the SQL migration first.',
        details: tableError.message
      });
    }

    console.log('✅ Marketing campaigns table exists and is accessible.');

    // Fetch all existing orders that don't have marketing campaigns yet
    const { data: existingOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        status,
        created_at,
        user_id,
        order_items(
          id,
          track_title,
          track_url,
          package_name,
          package_id
        )
      `)
      .neq('status', 'cancelled');

    if (ordersError) {
      console.error('❌ Error fetching existing orders:', ordersError);
      return res.status(500).json({ 
        error: 'Failed to fetch existing orders',
        details: ordersError.message
      });
    }

    console.log(`📦 Found ${existingOrders?.length || 0} total orders to process.`);

    if (!existingOrders || existingOrders.length === 0) {
      return res.status(200).json({ 
        message: 'No orders found to import',
        imported: 0
      });
    }

    // Check which orders already have marketing campaigns
    const { data: existingCampaigns, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select('order_id');

    if (campaignsError) {
      console.error('Error fetching existing campaigns:', campaignsError);
      return res.status(500).json({ error: 'Failed to check existing campaigns' });
    }

    const existingCampaignOrderIds = new Set(existingCampaigns?.map(c => c.order_id) || []);

    // Filter out orders that already have campaigns
    const ordersToProcess = existingOrders.filter(order => !existingCampaignOrderIds.has(order.id));

    if (ordersToProcess.length === 0) {
      return res.status(200).json({ 
        message: 'No new orders to import - all existing orders already have campaigns',
        imported: 0
      });
    }

    let importedCount = 0;
    const campaignsToInsert = [];

    // Get user profiles for all orders that have user_ids
    const userIds = ordersToProcess
      .filter(order => order.user_id)
      .map(order => order.user_id);

    let userProfiles = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, music_genre')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('⚠️ Warning: Could not fetch user profiles:', profilesError);
      } else {
        userProfiles = profiles?.reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {}) || {};
      }
    }

    console.log(`👥 Found ${Object.keys(userProfiles).length} user profiles for ${userIds.length} orders with user_ids.`);

    // Process each order
    for (const order of ordersToProcess) {
      if (!order.order_items || order.order_items.length === 0) {
        console.log(`⚠️ Skipping order ${order.order_number} - no order items`);
        continue;
      }

      // Get customer genre from user profile or default to 'Pop'
      const userProfile = order.user_id ? userProfiles[order.user_id] : null;
      const customerGenre = userProfile?.music_genre || 'Pop';
      
      console.log(`📦 Processing order ${order.order_number} - Genre: ${customerGenre}, Items: ${order.order_items.length}`);

      // Process ONLY the first order item to prevent duplicates (one campaign per order)
      const orderItem = order.order_items[0];
      if (order.order_items.length > 1) {
        console.log(`⚠️ Order ${order.order_number} has ${order.order_items.length} items, using first item only: ${orderItem.track_title}`);
      }
      
      // Process the single order item
      {
        try {
          console.log(`🎵 Processing track: ${orderItem.track_title} (Package: ${orderItem.package_name})`);
          
          // Get package configuration
          const packageConfig = await getPackageConfiguration(supabase, orderItem.package_name);
          
          // Assign playlists intelligently
          const playlistAssignments = await assignPlaylistsForCampaign(
            supabase, 
            customerGenre, 
            packageConfig.playlist_assignments_needed
          );

          // Prepare campaign data
          const campaignData = {
            order_id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name,
            song_name: orderItem.track_title,
            song_link: orderItem.track_url || '',
            package_name: orderItem.package_name,
            package_id: orderItem.package_id,
            direct_streams: packageConfig.direct_streams,
            playlist_streams: packageConfig.playlist_streams,
            playlist_assignments: JSON.stringify(playlistAssignments),
            time_on_playlists: packageConfig.time_on_playlists,
            campaign_status: 'Action Needed',
            created_at: order.created_at,
            updated_at: new Date().toISOString()
          };

          campaignsToInsert.push(campaignData);
          importedCount++;
        } catch (itemError) {
          console.error(`❌ Error processing order item ${orderItem.id} (${orderItem.track_title}):`, itemError);
          console.error(`❌ Item error details:`, {
            orderId: order.id,
            orderNumber: order.order_number,
            trackTitle: orderItem.track_title,
            packageName: orderItem.package_name,
            error: itemError.message
          });
        }
      }
    }

    // Batch insert all campaigns
    if (campaignsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('marketing_campaigns')
        .insert(campaignsToInsert);

      if (insertError) {
        console.error('Error inserting marketing campaigns:', insertError);
        return res.status(500).json({ error: 'Failed to import campaigns' });
      }
    }

    console.log(`🎉 Import completed! Successfully imported ${importedCount} campaigns from ${ordersToProcess.length} orders.`);

    res.status(200).json({
      message: `Successfully imported ${importedCount} campaigns from existing orders`,
      imported: importedCount,
      ordersProcessed: ordersToProcess.length
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR in populate existing orders:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

export default requireAdminAuth(handler);