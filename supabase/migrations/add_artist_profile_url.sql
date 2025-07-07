-- Add artist_profile_url column to order_items table
-- This will store the Spotify artist profile URL for future dashboard features

ALTER TABLE order_items 
ADD COLUMN artist_profile_url TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN order_items.artist_profile_url IS 'Spotify artist profile URL for the track artist';

-- Create index for artist profile lookups (optional, for future features)
CREATE INDEX idx_order_items_artist_profile_url ON order_items(artist_profile_url) WHERE artist_profile_url IS NOT NULL; 