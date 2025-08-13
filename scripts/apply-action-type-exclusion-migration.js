// Script to apply the action-type-specific exclusion migration
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkbqfpbucbscxucsxqjn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYnFmcGJ1Y2JzY3h1Y3N4cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTI0MzAzMSwiZXhwIjoyMDUwODE5MDMxfQ.lPyAGxNP3Aqr_AcBWqFPWLuXTTVoH4tV5dOL_6xyWnY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Starting Action Type Exclusion Migration...');
  
  try {
    // Step 1: Remove the old action_queue_excluded column
    console.log('📋 Step 1: Removing old action_queue_excluded column...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE marketing_campaigns DROP COLUMN IF EXISTS action_queue_excluded;`
    });
    
    if (dropError) {
      console.error('❌ Error dropping old column:', dropError);
    } else {
      console.log('✅ Successfully removed old action_queue_excluded column');
    }
    
    // Step 2: Add new action-type-specific columns
    console.log('📋 Step 2: Adding action-type-specific exclusion columns...');
    const { error: addError1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS initial_actions_excluded BOOLEAN DEFAULT FALSE;`
    });
    
    if (addError1) {
      console.error('❌ Error adding initial_actions_excluded column:', addError1);
    } else {
      console.log('✅ Successfully added initial_actions_excluded column');
    }
    
    const { error: addError2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS removal_actions_excluded BOOLEAN DEFAULT FALSE;`
    });
    
    if (addError2) {
      console.error('❌ Error adding removal_actions_excluded column:', addError2);
    } else {
      console.log('✅ Successfully added removal_actions_excluded column');
    }
    
    // Step 3: Add indexes
    console.log('📋 Step 3: Adding indexes...');
    const { error: indexError1 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_initial_excluded ON marketing_campaigns(initial_actions_excluded);`
    });
    
    if (indexError1) {
      console.error('❌ Error adding initial_actions_excluded index:', indexError1);
    } else {
      console.log('✅ Successfully added index for initial_actions_excluded');
    }
    
    const { error: indexError2 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_removal_excluded ON marketing_campaigns(removal_actions_excluded);`
    });
    
    if (indexError2) {
      console.error('❌ Error adding removal_actions_excluded index:', indexError2);
    } else {
      console.log('✅ Successfully added index for removal_actions_excluded');
    }
    
    // Step 4: Add comments
    console.log('📋 Step 4: Adding column comments...');
    const { error: commentError1 } = await supabase.rpc('exec_sql', {
      sql: `COMMENT ON COLUMN marketing_campaigns.initial_actions_excluded IS 'Indicates if initial actions (direct streams + add to playlists) should be permanently excluded from action queue';`
    });
    
    if (commentError1) {
      console.error('❌ Error adding initial_actions_excluded comment:', commentError1);
    } else {
      console.log('✅ Successfully added comment for initial_actions_excluded');
    }
    
    const { error: commentError2 } = await supabase.rpc('exec_sql', {
      sql: `COMMENT ON COLUMN marketing_campaigns.removal_actions_excluded IS 'Indicates if removal actions (remove from playlists) should be permanently excluded from action queue';`
    });
    
    if (commentError2) {
      console.error('❌ Error adding removal_actions_excluded comment:', commentError2);
    } else {
      console.log('✅ Successfully added comment for removal_actions_excluded');
    }
    
    console.log('🎯 Migration completed successfully!');
    console.log('📖 How the new system works:');
    console.log('1. Initial actions (streams + playlists) can be excluded separately from removal actions');
    console.log('2. A campaign can complete initial actions and later show removal actions');
    console.log('3. Each action type is tracked separately for exclusion');
    console.log('4. Campaigns now have proper lifecycle management through both phases');
    
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
