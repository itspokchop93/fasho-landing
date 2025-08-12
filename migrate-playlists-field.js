// Migration script to add playlists_added_at field
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkbqfpbucbscxucsxqjn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYnFmcGJ1Y2JzY3h1Y3N4cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTI0MzAzMSwiZXhwIjoyMDUwODE5MDMxfQ.lPyAGxNP3Aqr_AcBWqFPWLuXTTVoH4tV5dOL_6xyWnY'; // Service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Starting database migration...');
  
  try {
    // Since we can't run DDL through Supabase client, we'll focus on data migration
    console.log('📝 Note: Please manually add the column using SQL:');
    console.log('ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS playlists_added_at TIMESTAMP WITH TIME ZONE;');
    console.log('');
    
    // Update existing records that have playlists_added_confirmed = true
    console.log('📝 Updating existing records...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0); // Set to noon yesterday
    
    const { data: campaigns, error: updateError } = await supabase
      .from('marketing_campaigns')
      .update({
        playlists_added_at: yesterday.toISOString(),
        playlist_streams_progress: 0
      })
      .eq('playlists_added_confirmed', true)
      .is('playlists_added_at', null)
      .select('order_number');
    
    if (updateError) {
      console.error('❌ Error updating existing records:', updateError);
      return;
    }
    
    console.log(`✅ Updated ${campaigns?.length || 0} existing campaigns`);
    if (campaigns && campaigns.length > 0) {
      campaigns.forEach(camp => {
        console.log(`   - Order ${camp.order_number}: Set playlists_added_at to ${yesterday.toISOString()}`);
      });
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();
