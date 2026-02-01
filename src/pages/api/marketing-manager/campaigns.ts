import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';
import { extractTrackIdFromUrl, getAvailablePlaylistsWithProtection } from '../../../utils/playlist-assignment-protection';

// Helper function to generate playlist assignments for a campaign
async function generatePlaylistAssignments(supabase: any, campaign: any): Promise<any[]> {
  // Extract genre from billing_info JSONB field (same as order details page)
  let userGenre = 'General'; // Default fallback
  
  // Debug: Let's see what we actually have
  console.log(`🎵 CAMPAIGNS: Debug for campaign ${campaign.id}:`, {
    hasOrders: !!campaign.orders,
    hasBillingInfo: !!campaign.orders?.billing_info,
    billingInfo: campaign.orders?.billing_info,
    musicGenre: campaign.orders?.billing_info?.musicGenre
  });

  // Use the same logic as order details page - check billing_info first (the reliable source)
  if (campaign.orders?.billing_info?.musicGenre) {
    userGenre = campaign.orders.billing_info.musicGenre;
    console.log(`🎵 CAMPAIGNS: Found genre in billing_info: ${userGenre} for campaign ${campaign.id}`);
  } else {
    console.log(`🎵 CAMPAIGNS: No genre found in billing_info, using General for campaign ${campaign.id}`);
  }

  // Extract track ID from song_link or use existing track_id
  let trackId = campaign.track_id;
  if (!trackId && campaign.song_link) {
    trackId = extractTrackIdFromUrl(campaign.song_link);
    console.log(`🎵 CAMPAIGNS: Extracted track ID ${trackId} from song link for campaign ${campaign.id}`);
    
    // Update the campaign with the extracted track_id for future use
    if (trackId) {
      await supabase
        .from('marketing_campaigns')
        .update({ track_id: trackId })
        .eq('id', campaign.id);
    }
  }

  // Map old package names to new ones
  const packageNameMapping: { [key: string]: string } = {
    'ULTRA': 'LEGENDARY',
    'DIAMOND': 'UNSTOPPABLE', 
    'DOMINATE': 'DOMINATE', // Already correct
    'MOMENTUM': 'MOMENTUM', // Already correct
    'BREAKTHROUGH': 'BREAKTHROUGH', // Already correct
    'STARTER': 'BREAKTHROUGH',
    'TEST CAMPAIGN': 'BREAKTHROUGH'
  };

  const mappedPackageName = packageNameMapping[campaign.package_name.toUpperCase()] || campaign.package_name.toUpperCase();
  console.log(`🎵 CAMPAIGNS: Mapping ${campaign.package_name} -> ${mappedPackageName}`);

  // Get package configuration to determine how many playlists are needed
  const { data: packageConfig, error: packageError } = await supabase
    .from('campaign_totals')
    .select('playlist_assignments_needed')
    .eq('package_name', mappedPackageName)
    .single();

  let playlistsNeeded;
  if (packageError || !packageConfig) {
    console.error(`Error fetching package configuration for ${campaign.package_name} (mapped to ${mappedPackageName}):`, packageError);
    // Fallback: use default assignments based on package type
    const fallbackAssignments: { [key: string]: number } = {
      'LEGENDARY': 4,
      'UNSTOPPABLE': 4,
      'DOMINATE': 3,
      'MOMENTUM': 2,
      'BREAKTHROUGH': 2
    };
    playlistsNeeded = fallbackAssignments[mappedPackageName] || 2;
    console.log(`🎵 CAMPAIGNS: Using fallback - ${playlistsNeeded} playlists for ${mappedPackageName}`);
  } else {
    playlistsNeeded = packageConfig.playlist_assignments_needed;
  }
  console.log(`🎵 CAMPAIGNS: Need ${playlistsNeeded} playlists for ${campaign.package_name} package, campaign ${campaign.id}`);

  // Get playlist assignments with duplicate protection
  const selectedPlaylists = await getAvailablePlaylistsWithProtection(
    supabase,
    userGenre,
    playlistsNeeded,
    trackId || '',
    campaign.id // Exclude current campaign for re-assignments
  );

  return selectedPlaylists;
}



// Auto-import function to handle new orders
async function autoImportNewOrders(supabase: any): Promise<number> {
  try {
    console.log('🔄 AUTO-IMPORT: Checking for new orders to import...');
    
    // Get all orders that don't have campaigns yet
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
      console.error('❌ Error fetching orders for auto-import:', ordersError);
      return 0;
    }

    // Check which orders already have marketing campaigns
    const { data: existingCampaigns, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select('order_id');

    if (campaignsError) {
      console.error('❌ Error fetching existing campaigns:', campaignsError);
      return 0;
    }

    const existingCampaignOrderIds = new Set(existingCampaigns?.map((c: any) => c.order_id) || []);
    const ordersToProcess = existingOrders?.filter((order: any) => !existingCampaignOrderIds.has(order.id)) || [];

    if (ordersToProcess.length === 0) {
      console.log('✅ AUTO-IMPORT: No new orders to import');
      return 0;
    }

    console.log(`🔄 AUTO-IMPORT: Found ${ordersToProcess.length} new orders to import`);

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
      if (!order.order_items || order.order_items.length === 0) continue;

      // Add song numbering for orders with multiple tracks
      for (const [songIndex, item] of order.order_items.entries()) {
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
      }
    }

    // Batch insert campaigns
    if (campaignsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('marketing_campaigns')
        .insert(campaignsToInsert);

      if (insertError) {
        console.error('❌ Error inserting auto-imported campaigns:', insertError);
        return 0;
      }
    }

    console.log(`✅ AUTO-IMPORT: Successfully imported ${importedCount} campaigns`);
    return importedCount;

  } catch (error) {
    console.error('❌ Error in auto-import process:', error);
    return 0;
  }
}

// Helper function to get package data from database
async function getPackageData(supabase: any, packageName: string) {
  try {
    // Fetch package configuration from campaign_totals table
    const { data: packageConfig, error } = await supabase
      .from('campaign_totals')
      .select('direct_streams, playlist_streams, time_on_playlists')
      .eq('package_name', packageName.toUpperCase())
      .single();

    if (error || !packageConfig) {
      console.error(`❌ Error fetching package config for ${packageName}:`, error);
      
      // Fallback to hardcoded values if database fetch fails (matching Campaign Totals)
      const fallbackPackages: { [key: string]: { directStreams: number; playlistStreams: number; timeOnPlaylists: number } } = {
        'LEGENDARY': { directStreams: 70000, playlistStreams: 40000, timeOnPlaylists: 14 },
        'UNSTOPPABLE': { directStreams: 21000, playlistStreams: 20000, timeOnPlaylists: 10 },
        'DOMINATE': { directStreams: 10000, playlistStreams: 9000, timeOnPlaylists: 6 },
        'MOMENTUM': { directStreams: 3000, playlistStreams: 4000, timeOnPlaylists: 4 },
        'BREAKTHROUGH': { directStreams: 1500, playlistStreams: 2000, timeOnPlaylists: 2 },
        'TEST CAMPAIGN': { directStreams: 0, playlistStreams: 9000, timeOnPlaylists: 9 }
      };
      
      const fallback = fallbackPackages[packageName.toUpperCase()] || { directStreams: 1000, playlistStreams: 3000, timeOnPlaylists: 6 };
      console.log(`⚠️ Using fallback package data for ${packageName}:`, fallback);
      return fallback;
    }

    console.log(`✅ Fetched package data for ${packageName} from database:`, packageConfig);
    return {
      directStreams: packageConfig.direct_streams,
      playlistStreams: packageConfig.playlist_streams,
      timeOnPlaylists: packageConfig.time_on_playlists
    };
  } catch (err) {
    console.error(`❌ Exception fetching package config for ${packageName}:`, err);
    
    // Ultimate fallback (matching Campaign Totals)
      const fallbackPackages: { [key: string]: { directStreams: number; playlistStreams: number; timeOnPlaylists: number } } = {
    'LEGENDARY': { directStreams: 70000, playlistStreams: 40000, timeOnPlaylists: 14 },
    'UNSTOPPABLE': { directStreams: 21000, playlistStreams: 20000, timeOnPlaylists: 10 },
    'DOMINATE': { directStreams: 10000, playlistStreams: 9000, timeOnPlaylists: 6 },
    'MOMENTUM': { directStreams: 3000, playlistStreams: 4000, timeOnPlaylists: 4 },
    'BREAKTHROUGH': { directStreams: 1500, playlistStreams: 2000, timeOnPlaylists: 2 }
  };
    
    return fallbackPackages[packageName.toUpperCase()] || { directStreams: 1000, playlistStreams: 3000, timeOnPlaylists: 6 };
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // AUTOMATICALLY IMPORT NEW ORDERS FIRST
    const importedCount = await autoImportNewOrders(supabase);
    if (importedCount > 0) {
      console.log(`🚀 AUTO-IMPORT: ${importedCount} new orders imported into Active Campaigns!`);
    }

    // Fetch all campaigns with their related order data
    let { data: campaignsData, error: campaignsError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_id,
        order_number,
        customer_name,
        song_name,
        song_link,
        package_name,
        package_id,
        direct_streams,
        playlist_streams,
        playlist_assignments,
        direct_streams_progress,
        playlist_streams_progress,
        direct_streams_confirmed,
        playlists_added_confirmed,
        playlists_added_at,
        removed_from_playlists,
        removal_date,
        campaign_status,
        time_on_playlists,
        created_at,
        updated_at,
        orders!inner(created_at, status, billing_info, user_id, order_items(track_title, track_image_url))
      `)
      .neq('orders.status', 'cancelled')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }

    // First, check if any campaigns need playlist assignments and generate them
    const campaignsToUpdate: any[] = [];
    
    for (const campaign of campaignsData || []) {
      const currentAssignments = Array.isArray(campaign.playlist_assignments) 
        ? campaign.playlist_assignments 
        : [];
      
      // If campaign has no playlist assignments, generate them
      if (currentAssignments.length === 0) {
        console.log(`🎵 CAMPAIGNS: === DEBUGGING ORDER #${campaign.order_number} ===`);
        console.log(`🎵 CAMPAIGNS: Campaign ID: ${campaign.id}`);
        console.log(`🎵 CAMPAIGNS: Package: ${campaign.package_name}`);
        console.log(`🎵 CAMPAIGNS: Current assignments: ${currentAssignments.length}`);
        
        const newAssignments = await generatePlaylistAssignments(supabase, campaign);
        console.log(`🎵 CAMPAIGNS: Generated assignments for ${campaign.order_number}:`, newAssignments);
        
        if (newAssignments.length > 0) {
          // Update the campaign in the database
          const { error: updateError } = await supabase
            .from('marketing_campaigns')
            .update({
              playlist_assignments: newAssignments,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

          if (updateError) {
            console.error(`❌ Error updating campaign ${campaign.id} with assignments:`, updateError);
          } else {
            // Update the campaign object for the response
            campaign.playlist_assignments = newAssignments;
            console.log(`✅ Successfully assigned ${newAssignments.length} playlists to Order #${campaign.order_number}`);
          }
        } else {
          console.log(`❌ No assignments generated for Order #${campaign.order_number}`);
        }
      }
    }

    // Migration logic: Handle existing "Running" campaigns that don't have playlists_added_at set
    // These were marked as running yesterday, so we'll set their playlists_added_at to yesterday
    const migrateExistingCampaigns = async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(12, 0, 0, 0); // Set to noon yesterday for consistency
        
        const { data: campaignsNeedingMigration, error: migrationFetchError } = await supabase
          .from('marketing_campaigns')
          .select('id, order_number')
          .eq('playlists_added_confirmed', true)
          .is('playlists_added_at', null);

        if (migrationFetchError) {
          console.error('Error fetching campaigns for migration:', migrationFetchError);
          return;
        }

        if (campaignsNeedingMigration && campaignsNeedingMigration.length > 0) {
          console.log(`🔄 MIGRATION: Found ${campaignsNeedingMigration.length} campaigns needing playlists_added_at migration`);
          
          const { error: migrationUpdateError } = await supabase
            .from('marketing_campaigns')
            .update({
              playlists_added_at: yesterday.toISOString(),
              playlist_streams_progress: 0 // Reset progress to start fresh
            })
            .eq('playlists_added_confirmed', true)
            .is('playlists_added_at', null);

          if (migrationUpdateError) {
            console.error('Error updating campaigns in migration:', migrationUpdateError);
          } else {
            console.log(`✅ MIGRATION: Successfully updated ${campaignsNeedingMigration.length} campaigns with playlists_added_at`);
            campaignsNeedingMigration.forEach(camp => {
              console.log(`   - Order ${camp.order_number}: Set playlists_added_at to ${yesterday.toISOString()}`);
            });
          }
        }
      } catch (error) {
        console.error('Error in migration logic:', error);
      }
    };

    // Run migration for existing campaigns
    await migrateExistingCampaigns();

    // Re-fetch campaigns data after migration
    const { data: updatedCampaignsData, error: refetchError } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        order_id,
        order_number,
        customer_name,
        song_name,
        song_link,
        package_name,
        package_id,
        direct_streams,
        playlist_streams,
        playlist_assignments,
        direct_streams_progress,
        playlist_streams_progress,
        direct_streams_confirmed,
        playlists_added_confirmed,
        playlists_added_at,
        removed_from_playlists,
        removal_date,
        campaign_status,
        time_on_playlists,
        created_at,
        updated_at,
        orders!inner(created_at, status, billing_info, user_id, order_items(track_title, track_image_url))
      `)
      .neq('orders.status', 'cancelled')
      .order('created_at', { ascending: false });

    if (refetchError) {
      console.error('Error re-fetching campaigns after migration:', refetchError);
      // Fall back to original data if refetch fails
    } else {
      campaignsData = updatedCampaignsData;
    }

    // Group campaigns by order number to calculate song numbers for multi-track orders
    const campaignsByOrder: { [key: string]: any[] } = {};
    (campaignsData || []).forEach(campaign => {
      if (!campaignsByOrder[campaign.order_number]) {
        campaignsByOrder[campaign.order_number] = [];
      }
      campaignsByOrder[campaign.order_number].push(campaign);
    });

    // Process campaigns data to calculate progress and status
    const campaigns = campaignsData?.map(campaign => {
      // Calculate playlist streams progress based on time elapsed since playlists_added_at
      let calculatedPlaylistProgress = 0; // Always start at 0
      
      if (campaign.playlists_added_confirmed && campaign.playlists_added_at && campaign.playlist_assignments) {
        const playlistAssignments = Array.isArray(campaign.playlist_assignments) 
          ? campaign.playlist_assignments 
          : [];
        
        if (playlistAssignments.length > 0) {
          // Calculate streams based on 500 streams per playlist per 24 hours
          const now = new Date();
          const playlistAddedDate = new Date(campaign.playlists_added_at);
          
          const hoursElapsed = Math.max(0, (now.getTime() - playlistAddedDate.getTime()) / (1000 * 60 * 60));
          const streamsPerHour = (playlistAssignments.length * 500) / 24;
          calculatedPlaylistProgress = Math.min(
            Math.floor(hoursElapsed * streamsPerHour),
            campaign.playlist_streams
          );
          
          // Debug logging (can be removed in production)
          console.log(`📊 Progress: Order ${campaign.order_number} - ${calculatedPlaylistProgress}/${campaign.playlist_streams} (${((calculatedPlaylistProgress / campaign.playlist_streams) * 100).toFixed(1)}%)`);
        }
      }

      // Determine campaign status
      let status = campaign.campaign_status;
      
      if (!campaign.direct_streams_confirmed || !campaign.playlists_added_confirmed) {
        status = 'Action Needed';
      } else if (calculatedPlaylistProgress >= campaign.playlist_streams && !campaign.removed_from_playlists) {
        status = 'Removal Needed';
      } else if (campaign.removed_from_playlists) {
        status = 'Completed';
      } else if (campaign.direct_streams_confirmed && campaign.playlists_added_confirmed) {
        status = 'Running';
      }

      // Calculate removal date based on LIVE DATA: ALWAYS recalculate dynamically
      let removalDate = null;
      if (campaign.playlists_added_confirmed && campaign.playlists_added_at && campaign.playlist_assignments) {
        const playlistAssignments = Array.isArray(campaign.playlist_assignments) 
          ? campaign.playlist_assignments 
          : [];
        
        if (playlistAssignments.length > 0) {
          // LIVE CALCULATION: 500 streams per playlist per day
          const streamsPerDay = playlistAssignments.length * 500;
          const streamsNeeded = campaign.playlist_streams;
          const daysNeeded = Math.ceil(streamsNeeded / streamsPerDay);
          
          const playlistAddedDate = new Date(campaign.playlists_added_at);
          const calculatedRemovalDate = new Date(playlistAddedDate);
          calculatedRemovalDate.setDate(calculatedRemovalDate.getDate() + daysNeeded);
          removalDate = calculatedRemovalDate.toISOString().split('T')[0];
          
          console.log(`📅 LIVE REMOVAL DATE for Order ${campaign.order_number}:`);
          console.log(`  - Package: ${campaign.package_name} (${streamsNeeded} streams needed)`);
          console.log(`  - Playlists: ${playlistAssignments.length} (${streamsPerDay} streams/day)`);
          console.log(`  - Days needed: ${daysNeeded} days`);
          console.log(`  - Added: ${playlistAddedDate.toISOString().split('T')[0]}`);
          console.log(`  - Remove: ${removalDate}`);
        }
      }

      // Extract user genre for display
      const userGenre = (campaign.orders as any)?.billing_info?.musicGenre || 'General';

      // Calculate song number for multi-track orders
      const orderCampaigns = campaignsByOrder[campaign.order_number] || [];
      const songNumber = orderCampaigns.length > 1 
        ? orderCampaigns.findIndex(c => c.id === campaign.id) + 1 
        : null;

      // Find the corresponding track image from order_items
      const orderItems = (campaign.orders as any)?.order_items || [];
      const matchingItem = orderItems.find((item: any) => 
        item.track_title.toLowerCase() === campaign.song_name.toLowerCase()
      ) || orderItems[0]; // Fallback to first item if no exact match
      
      const songImage = matchingItem?.track_image_url || null;

      return {
        id: campaign.id,
        orderNumber: campaign.order_number,
        orderId: campaign.order_id,
        orderDate: (campaign.orders as any).created_at,
        customerName: campaign.customer_name,
        userId: (campaign.orders as any).user_id || null,
        songName: campaign.song_name,
        songLink: campaign.song_link,
        songImage: songImage,
        songNumber: songNumber,
        packageName: campaign.package_name,
        userGenre: userGenre,
        directStreams: campaign.direct_streams,
        playlistStreams: campaign.playlist_streams,
        playlistAssignments: Array.isArray(campaign.playlist_assignments) 
          ? campaign.playlist_assignments 
          : [],
        directStreamsProgress: campaign.direct_streams_confirmed ? campaign.direct_streams : 0,
        playlistStreamsProgress: calculatedPlaylistProgress,
        removalDate,
        status,
        directStreamsConfirmed: campaign.direct_streams_confirmed,
        playlistsAddedConfirmed: campaign.playlists_added_confirmed,
        removedFromPlaylists: campaign.removed_from_playlists
      };
    }) || [];

    res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error in campaigns API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
