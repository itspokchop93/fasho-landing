-- Add cached data columns to playlist_network table
-- This allows us to store scraped Apify data in the database to avoid API calls on initial load

-- Add new columns for cached Spotify data
ALTER TABLE playlist_network 
ADD COLUMN IF NOT EXISTS cached_song_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cached_image_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_playlist_network_last_scraped ON playlist_network(last_scraped_at);

-- Add comments for documentation
COMMENT ON COLUMN playlist_network.cached_song_count IS 'Cached song count from last Apify scrape';
COMMENT ON COLUMN playlist_network.cached_image_url IS 'Cached playlist image URL from last Apify scrape';
COMMENT ON COLUMN playlist_network.last_scraped_at IS 'Timestamp of last successful Apify scrape';
