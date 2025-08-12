// Script to apply the stream_purchases table migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hkbqfpbucbscxucsxqjn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYnFmcGJ1Y2JzY3h1Y3N4cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTI0MzAzMSwiZXhwIjoyMDUwODE5MDMxfQ.lPyAGxNP3Aqr_AcBWqFPWLuXTTVoH4tV5dOL_6xyWnY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Starting Stream Purchases Migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250115000000_create_stream_purchases_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Migration SQL loaded successfully');
    console.log('⚠️  Note: We need to apply this migration manually in Supabase SQL Editor');
    console.log('');
    console.log('📝 Please copy and paste the following SQL into your Supabase SQL Editor:');
    console.log('=' + '='.repeat(80));
    console.log(migrationSQL);
    console.log('=' + '='.repeat(80));
    console.log('');
    
    // Check if table already exists
    const { data: tableExists, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'stream_purchases');
    
    if (checkError) {
      console.log('❓ Could not check if table exists (this is expected if table doesn\'t exist yet)');
    } else if (tableExists && tableExists.length > 0) {
      console.log('✅ stream_purchases table already exists!');
      
      // Test the table by fetching any existing records
      const { data: testData, error: testError } = await supabase
        .from('stream_purchases')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log('❌ Error testing table:', testError.message);
      } else {
        console.log(`📊 Table is working! Found ${testData ? testData.length : 0} existing stream purchases`);
      }
    } else {
      console.log('❌ stream_purchases table does not exist yet');
      console.log('📋 Please apply the migration SQL above in Supabase SQL Editor');
    }
    
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Copy the SQL migration above');
    console.log('2. Go to your Supabase project SQL Editor');
    console.log('3. Paste and run the SQL');
    console.log('4. Return to the admin dashboard to test the new stream purchase features');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

applyMigration();
