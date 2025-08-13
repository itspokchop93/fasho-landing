import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

// Helper function to get package data from database
async function getPackageDataFromDB(supabase: any, packageName: string) {
  try {
    // Fetch package configuration from campaign_totals table
    const { data: packageConfig, error } = await supabase
      .from('campaign_totals')
      .select('direct_streams, playlist_streams, time_on_playlists')
      .eq('package_name', packageName.toUpperCase())
      .single();

    if (error || !packageConfig) {
      console.error(`❌ Error fetching package config for ${packageName}:`, error);
      
      // Fallback to correct values (matching Campaign Totals screenshot)
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

    return {
      directStreams: packageConfig.direct_streams,
      playlistStreams: packageConfig.playlist_streams,
      timeOnPlaylists: packageConfig.time_on_playlists
    };
  } catch (err) {
    console.error(`❌ Exception fetching package config for ${packageName}:`, err);
    
    // Ultimate fallback (matching Campaign Totals screenshot)
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    console.log('🔧 STREAM-FIX: Starting campaign stream values correction...');

    // Get all campaigns that might have incorrect stream values
    const { data: campaigns, error: fetchError } = await supabase
      .from('marketing_campaigns')
      .select('id, package_name, direct_streams, playlist_streams, time_on_playlists, order_number')
      .order('order_number', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching campaigns:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }

    if (!campaigns || campaigns.length === 0) {
      return res.status(200).json({ message: 'No campaigns found', updated: 0 });
    }

    console.log(`🔧 STREAM-FIX: Found ${campaigns.length} campaigns to check`);

    let updatedCount = 0;
    const updateResults = [];

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        // Get correct package data from database
        const correctPackageData = await getPackageDataFromDB(supabase, campaign.package_name);
        
        // Check if current values are incorrect
        const needsUpdate = 
          campaign.direct_streams !== correctPackageData.directStreams ||
          campaign.playlist_streams !== correctPackageData.playlistStreams ||
          campaign.time_on_playlists !== correctPackageData.timeOnPlaylists;

        if (needsUpdate) {
          console.log(`🔧 STREAM-FIX: Updating Order #${campaign.order_number} (${campaign.package_name})`);
          console.log(`  - Direct: ${campaign.direct_streams} → ${correctPackageData.directStreams}`);
          console.log(`  - Playlist: ${campaign.playlist_streams} → ${correctPackageData.playlistStreams}`);
          console.log(`  - Time: ${campaign.time_on_playlists} → ${correctPackageData.timeOnPlaylists}`);

          // Update the campaign with correct values
          const { error: updateError } = await supabase
            .from('marketing_campaigns')
            .update({
              direct_streams: correctPackageData.directStreams,
              playlist_streams: correctPackageData.playlistStreams,
              time_on_playlists: correctPackageData.timeOnPlaylists,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

          if (updateError) {
            console.error(`❌ Error updating campaign ${campaign.id}:`, updateError);
            updateResults.push({
              campaignId: campaign.id,
              orderNumber: campaign.order_number,
              package: campaign.package_name,
              success: false,
              error: updateError.message
            });
          } else {
            updatedCount++;
            updateResults.push({
              campaignId: campaign.id,
              orderNumber: campaign.order_number,
              package: campaign.package_name,
              success: true,
              oldValues: {
                directStreams: campaign.direct_streams,
                playlistStreams: campaign.playlist_streams,
                timeOnPlaylists: campaign.time_on_playlists
              },
              newValues: correctPackageData
            });
            console.log(`✅ Updated campaign ${campaign.id} successfully`);
          }
        } else {
          console.log(`✅ Order #${campaign.order_number} (${campaign.package_name}) already has correct values`);
        }
      } catch (err) {
        console.error(`❌ Error processing campaign ${campaign.id}:`, err);
        updateResults.push({
          campaignId: campaign.id,
          orderNumber: campaign.order_number,
          package: campaign.package_name,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ STREAM-FIX: Successfully updated ${updatedCount} campaigns out of ${campaigns.length} total`);

    res.status(200).json({
      success: true,
      message: `Updated ${updatedCount} campaign(s) with correct stream values`,
      totalCampaigns: campaigns.length,
      updatedCount,
      updateResults
    });

  } catch (error) {
    console.error('❌ Error in fix-campaign-stream-values API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
