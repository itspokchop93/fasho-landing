-- Create blog index submissions table for tracking URL indexing submissions
-- This table stores the history of URL submissions to Google and Bing indexing services

CREATE TABLE IF NOT EXISTS blog_index_submissions (
  id SERIAL PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_by VARCHAR(255),
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_index_submissions_url ON blog_index_submissions(url);
CREATE INDEX IF NOT EXISTS idx_blog_index_submissions_submitted_at ON blog_index_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_index_submissions_created_at ON blog_index_submissions(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_index_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_index_submissions_updated_at
  BEFORE UPDATE ON blog_index_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_index_submissions_updated_at();

-- Add comment for documentation
COMMENT ON TABLE blog_index_submissions IS 'Stores history of URL submissions to Google Indexing API and Bing IndexNow API';
COMMENT ON COLUMN blog_index_submissions.results IS 'JSON object containing results from Google sitemap ping, Bing sitemap ping, Google Indexing API, and Bing IndexNow API';
