// Script to apply the track_id migration to marketing_campaigns table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hkbqfpbucbscxucsxqjn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYnFmcGJ1Y2JzY3h1Y3N4cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTI0MzAzMSwiZXhwIjoyMDUwODE5MDMxfQ.lPyAGxNP3Aqr_AcBWqFPWLuXTTVoH4tV5dOL_6xyWnY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Starting Track ID Migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250115120000_add_track_id_to_marketing_campaigns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Migration SQL to apply:');
    console.log(migrationSQL);
    
    // Apply the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('🔍 Verifying column was added...');
    
    // Verify the column was added
    const { data: tableInfo, error: infoError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'marketing_campaigns' 
          AND column_name = 'track_id';
        `
      });
    
    if (infoError) {
      console.error('❌ Error verifying migration:', infoError);
      return;
    }
    
    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Track ID column successfully added to marketing_campaigns table');
      console.log('📊 Column details:', tableInfo[0]);
    } else {
      console.log('⚠️ Could not verify column addition');
    }
    
    console.log('🎯 Next steps:');
    console.log('1. Existing campaigns will have their track_id populated when playlists are next generated');
    console.log('2. New campaigns will automatically get track_id during creation'); 
    console.log('3. Duplicate protection is now active for all playlist assignments');
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
  }
}

// Run the migration
applyMigration().then(() => {
  console.log('🏁 Migration process complete');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
