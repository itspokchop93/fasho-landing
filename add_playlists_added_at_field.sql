-- Add playlists_added_at field to track when playlists were confirmed
-- This is needed for accurate progress bar calculations

ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS playlists_added_at TIMESTAMP WITH TIME ZONE;

-- Add index for the new field
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_playlists_added_at 
ON marketing_campaigns(playlists_added_at);

-- Update existing records that have playlists_added_confirmed = true
-- Set their playlists_added_at to updated_at (best approximation)
UPDATE marketing_campaigns 
SET playlists_added_at = updated_at 
WHERE playlists_added_confirmed = true AND playlists_added_at IS NULL;
