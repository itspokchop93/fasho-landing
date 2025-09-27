-- Add playlist health status tracking to playlist_network table
-- This migration adds fields to track the actual health and availability of Spotify playlists

-- Add new columns for playlist health tracking
ALTER TABLE playlist_network 
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('active', 'private', 'removed', 'error', 'unknown')),
ADD COLUMN IF NOT EXISTS health_last_checked TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS health_error_message TEXT,
ADD COLUMN IF NOT EXISTS last_known_public BOOLEAN DEFAULT true;

-- Create index for performance on health status queries
CREATE INDEX IF NOT EXISTS idx_playlist_network_health_status ON playlist_network(health_status);
CREATE INDEX IF NOT EXISTS idx_playlist_network_health_last_checked ON playlist_network(health_last_checked);

-- Add comments for documentation
COMMENT ON COLUMN playlist_network.health_status IS 'Current health status of the playlist: active, private, removed, error, unknown';
COMMENT ON COLUMN playlist_network.health_last_checked IS 'Timestamp of last health check via Spotify API';
COMMENT ON COLUMN playlist_network.health_error_message IS 'Error message from last failed health check';
COMMENT ON COLUMN playlist_network.last_known_public IS 'Last known public status of the playlist';
