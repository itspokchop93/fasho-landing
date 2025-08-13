-- Add track_id field to marketing_campaigns table for duplicate protection
-- This migration adds the track_id field to enable duplicate track detection
-- All changes are non-destructive and safe for production use

-- Add track_id column to marketing_campaigns table
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS track_id VARCHAR(50);

-- Create index for track_id for efficient duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_track_id ON marketing_campaigns(track_id);

-- Create composite index for track_id and campaign_status for duplicate protection queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_track_status ON marketing_campaigns(track_id, campaign_status);

-- Add helpful comment
COMMENT ON COLUMN marketing_campaigns.track_id IS 'Spotify track ID extracted from song_link for duplicate detection and playlist assignment protection';
