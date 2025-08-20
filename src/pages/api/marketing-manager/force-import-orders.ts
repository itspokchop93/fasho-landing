import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

// Function to extract track ID from various URL formats
function extractTrackIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  // Spotify track URL patterns
  const spotifyPatterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/
  ];
  
  for (const pattern of spotifyPatterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Helper function to get package data from database
async function getPackageData(supabase: any, packageName: string) {
  try {
    const { data: packageConfig, error } = await supabase
      .from('package_configurations')
      .select('direct_streams, playlist_streams, time_on_playlists')
      .eq('package_name', packageName)
      .single();

    if (error) {
      console.warn(`⚠️ Package config not found for ${packageName}, using defaults`);
      return { directStreams: 1000, playlistStreams: 3000, timeOnPlaylists: 6 };
    }

    return {
      directStreams: packageConfig.direct_streams,
      playlistStreams: packageConfig.playlist_streams,
      timeOnPlaylists: packageConfig.time_on_playlists
    };
  } catch (error) {
    console.error('Error getting package data:', error);
    return { directStreams: 1000, playlistStreams: 3000, timeOnPlaylists: 6 };
  }
}

// Auto-import function to handle new orders
async function forceImportAllOrders(supabase: any): Promise<{ imported: number, errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log('🔄 FORCE-IMPORT: Checking ALL orders for import...');
    
    // Get all non-cancelled orders
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
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (ordersError) {
      errors.push(`Error fetching orders: ${ordersError.message}`);
      return { imported: 0, errors };
    }

    console.log(`🔄 FORCE-IMPORT: Found ${existingOrders?.length || 0} total orders`);

    // Check which orders already have marketing campaigns
    const { data: existingCampaigns, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select('order_id');

    if (campaignsError) {
      errors.push(`Error fetching existing campaigns: ${campaignsError.message}`);
      return { imported: 0, errors };
    }

    const existingCampaignOrderIds = new Set(existingCampaigns?.map((c: any) => c.order_id) || []);
    const ordersToProcess = existingOrders?.filter((order: any) => !existingCampaignOrderIds.has(order.id)) || [];

    console.log(`🔄 FORCE-IMPORT: Found ${ordersToProcess.length} new orders to import`);
    console.log(`🔄 FORCE-IMPORT: Existing campaigns: ${existingCampaignOrderIds.size}`);

    if (ordersToProcess.length === 0) {
      console.log('✅ FORCE-IMPORT: No new orders to import');
      return { imported: 0, errors };
    }

    // Get user profiles for orders with user_ids
    const userIds = ordersToProcess
      .filter((order: any) => order.user_id)
      .map((order: any) => order.user_id);

    let userProfiles: { [key: string]: any } = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, music_genre')
        .in('user_id', userIds);

      if (!profilesError && profiles) {
        userProfiles = profiles.reduce((acc: any, profile: any) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {});
      }
    }

    // Process orders and create campaigns
    const campaignsToInsert = [];
    let importedCount = 0;

    for (const order of ordersToProcess) {
      if (!order.order_items || order.order_items.length === 0) {
        errors.push(`Order ${order.order_number} has no items`);
        continue;
      }

      console.log(`🔄 FORCE-IMPORT: Processing order ${order.order_number} with ${order.order_items.length} items`);

      // Add song numbering for orders with multiple tracks
      for (const [songIndex, item] of order.order_items.entries()) {
        try {
          const userProfile = userProfiles[order.user_id];
          const packageData = await getPackageData(supabase, item.package_name);
          const songNumber = order.order_items.length > 1 ? songIndex + 1 : null;
          
          // Extract track ID from the song URL for duplicate protection
          const trackId = extractTrackIdFromUrl(item.track_url);
          
          campaignsToInsert.push({
            order_id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name,
            song_name: item.track_title,
            song_link: item.track_url,
            track_id: trackId,
            package_name: item.package_name,
            package_id: item.package_id,
            direct_streams: packageData.directStreams,
            playlist_streams: packageData.playlistStreams,
            direct_streams_progress: 0,
            playlist_streams_progress: 0,
            direct_streams_confirmed: false,
            playlists_added_confirmed: false,
            removed_from_playlists: false,
            campaign_status: 'Action Needed',
            time_on_playlists: packageData.timeOnPlaylists,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          importedCount++;
          
          console.log(`✅ FORCE-IMPORT: Prepared campaign for ${order.order_number} - ${item.track_title}`);
        } catch (itemError: any) {
          errors.push(`Error processing item ${item.track_title} in order ${order.order_number}: ${itemError.message}`);
        }
      }
    }

    // Batch insert campaigns
    if (campaignsToInsert.length > 0) {
      console.log(`🔄 FORCE-IMPORT: Inserting ${campaignsToInsert.length} campaigns...`);
      
      const { error: insertError } = await supabase
        .from('marketing_campaigns')
        .insert(campaignsToInsert);

      if (insertError) {
        errors.push(`Error inserting campaigns: ${insertError.message}`);
        return { imported: 0, errors };
      }
    }

    console.log(`✅ FORCE-IMPORT: Successfully imported ${importedCount} campaigns`);
    return { imported: importedCount, errors };

  } catch (error: any) {
    errors.push(`General error in force-import process: ${error.message}`);
    return { imported: 0, errors };
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    console.log('🚀 FORCE-IMPORT: Starting forced import of all orders...');
    const result = await forceImportAllOrders(supabase);

    return res.status(200).json({
      success: true,
      message: `Force import completed`,
      imported: result.imported,
      errors: result.errors
    });

  } catch (error: any) {
    console.error('Error in force-import API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

export default requireAdminAuth(handler);
