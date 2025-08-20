-- Add dedicated completion timestamp fields to marketing_campaigns table
-- This fixes the Action Queue auto-removal bug by providing stable completion timestamps
-- that don't get overwritten by other operations

-- Add direct_streams_confirmed_at field
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS direct_streams_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add removed_from_playlists_at field  
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS removed_from_playlists_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for the new timestamp fields
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_direct_streams_confirmed_at 
ON marketing_campaigns(direct_streams_confirmed_at);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_removed_from_playlists_at 
ON marketing_campaigns(removed_from_playlists_at);

-- Backfill existing data: For campaigns that are already completed but don't have timestamps,
-- set the completion timestamps to their updated_at time (best approximation)

-- Backfill direct_streams_confirmed_at for already confirmed campaigns
UPDATE marketing_campaigns 
SET direct_streams_confirmed_at = updated_at 
WHERE direct_streams_confirmed = true 
  AND direct_streams_confirmed_at IS NULL;

-- Backfill removed_from_playlists_at for already completed removals
UPDATE marketing_campaigns 
SET removed_from_playlists_at = updated_at 
WHERE removed_from_playlists = true 
  AND removed_from_playlists_at IS NULL;

-- Add helpful comments
COMMENT ON COLUMN marketing_campaigns.direct_streams_confirmed_at IS 'Timestamp when direct streams were confirmed - used for accurate Action Queue auto-removal';
COMMENT ON COLUMN marketing_campaigns.removed_from_playlists_at IS 'Timestamp when removal from playlists was completed - used for accurate Action Queue auto-removal';
