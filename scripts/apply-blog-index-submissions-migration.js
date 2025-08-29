// Script to apply the blog_index_submissions table migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hkbqfpbucbscxucsxqjn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYnFmcGJ1Y2JzY3h1Y3N4cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTI0MzAzMSwiZXhwIjoyMDUwODE5MDMxfQ.lPyAGxNP3Aqr_AcBWqFPWLuXTTVoH4tV5dOL_6xyWnY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Starting Blog Index Submissions Migration...');
  
  try {
    // Check if table already exists
    const { data: tableExists, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'blog_index_submissions');
    
    if (checkError && !checkError.message.includes('relation') && !checkError.message.includes('does not exist')) {
      console.error('❌ Error checking if table exists:', checkError);
      return;
    }
    
    if (tableExists && tableExists.length > 0) {
      console.log('✅ Table blog_index_submissions already exists');
      return;
    }
    
    console.log('📋 Creating blog_index_submissions table...');
    
    // Create the table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS blog_index_submissions (
          id SERIAL PRIMARY KEY,
          url VARCHAR(2048) NOT NULL,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          submitted_by VARCHAR(255),
          results JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (createTableError) {
      console.error('❌ Error creating table:', createTableError);
      return;
    }
    
    console.log('✅ Table created successfully');
    
    // Add indexes
    console.log('📋 Adding indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_blog_index_submissions_url ON blog_index_submissions(url);',
      'CREATE INDEX IF NOT EXISTS idx_blog_index_submissions_submitted_at ON blog_index_submissions(submitted_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_blog_index_submissions_created_at ON blog_index_submissions(created_at DESC);'
    ];
    
    for (const indexSQL of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql: indexSQL
      });
      
      if (indexError) {
        console.error('❌ Error creating index:', indexError);
      }
    }
    
    console.log('✅ Indexes created successfully');
    
    // Add updated_at trigger function
    console.log('📋 Adding trigger function...');
    
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_blog_index_submissions_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (functionError) {
      console.error('❌ Error creating trigger function:', functionError);
      return;
    }
    
    // Add trigger
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TRIGGER trigger_update_blog_index_submissions_updated_at
          BEFORE UPDATE ON blog_index_submissions
          FOR EACH ROW
          EXECUTE FUNCTION update_blog_index_submissions_updated_at();
      `
    });
    
    if (triggerError) {
      console.error('❌ Error creating trigger:', triggerError);
      return;
    }
    
    console.log('✅ Trigger created successfully');
    
    // Add comments
    console.log('📋 Adding comments...');
    
    const comments = [
      `COMMENT ON TABLE blog_index_submissions IS 'Stores history of URL submissions to Google Indexing API and Bing IndexNow API';`,
      `COMMENT ON COLUMN blog_index_submissions.results IS 'JSON object containing results from Google sitemap ping, Bing sitemap ping, Google Indexing API, and Bing IndexNow API';`
    ];
    
    for (const commentSQL of comments) {
      const { error: commentError } = await supabase.rpc('exec_sql', {
        sql: commentSQL
      });
      
      if (commentError) {
        console.error('❌ Error adding comment:', commentError);
      }
    }
    
    console.log('✅ Comments added successfully');
    
    // Verify the table was created successfully
    console.log('🔍 Verifying table creation...');
    
    const { data: verification, error: verifyError } = await supabase
      .from('blog_index_submissions')
      .select('*')
      .limit(1);
    
    if (verifyError && !verifyError.message.includes('row')) {
      console.error('❌ Error verifying table:', verifyError);
      return;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('🎉 The blog_index_submissions table is ready for use');
    
  } catch (error) {
    console.error('❌ Unexpected error during migration:', error);
  }
}

// Run the migration
applyMigration();
