-- Add cached_saves column to playlist_network table
-- This stores the number of saves (followers) for each playlist from Spotify API

-- Add new column for cached saves count
ALTER TABLE playlist_network 
ADD COLUMN IF NOT EXISTS cached_saves INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN playlist_network.cached_saves IS 'Cached number of saves (followers) from last Spotify API fetch';


