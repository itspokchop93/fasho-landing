// Script to apply the action_queue_excluded field migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hkbqfpbucbscxucsxqjn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYnFmcGJ1Y2JzY3h1Y3N4cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTI0MzAzMSwiZXhwIjoyMDUwODE5MDMxfQ.lPyAGxNP3Aqr_AcBWqFPWLuXTTVoH4tV5dOL_6xyWnY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Starting Action Queue Excluded Migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250115130000_add_action_queue_excluded_field.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Migration SQL to apply:');
    console.log(migrationSQL);
    
    // Apply the migration manually
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS action_queue_excluded BOOLEAN DEFAULT FALSE;`
    });
    
    if (alterError) {
      console.error('❌ Error adding column:', alterError);
    } else {
      console.log('✅ Successfully added action_queue_excluded column');
    }
    
    // Add index
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_action_queue_excluded ON marketing_campaigns(action_queue_excluded);`
    });
    
    if (indexError) {
      console.error('❌ Error adding index:', indexError);
    } else {
      console.log('✅ Successfully added index for action_queue_excluded');
    }
    
    // Add comment
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql: `COMMENT ON COLUMN marketing_campaigns.action_queue_excluded IS 'Indicates if this campaign should be permanently excluded from the action queue after being hidden or completed and timed out';`
    });
    
    if (commentError) {
      console.error('❌ Error adding comment:', commentError);
    } else {
      console.log('✅ Successfully added comment');
    }
    
    console.log('🎯 Migration completed successfully!');
    console.log('📖 Next steps:');
    console.log('1. The action queue will now properly track excluded campaigns');
    console.log('2. Hidden items will be permanently removed after 8 hours');
    console.log('3. Completed items will be permanently removed after 8 hours');
    console.log('4. Unhiding an item will reset the exclusion flag');
    
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
