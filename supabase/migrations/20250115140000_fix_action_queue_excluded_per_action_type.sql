-- Fix action queue exclusion to work per action type instead of per campaign
-- This allows campaigns to have initial actions excluded but still show removal actions later
-- All changes are non-destructive and safe for production use

-- Remove the single action_queue_excluded column
ALTER TABLE marketing_campaigns DROP COLUMN IF EXISTS action_queue_excluded;

-- Add separate columns for tracking exclusion per action type
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS initial_actions_excluded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS removal_actions_excluded BOOLEAN DEFAULT FALSE;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_initial_excluded ON marketing_campaigns(initial_actions_excluded);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_removal_excluded ON marketing_campaigns(removal_actions_excluded);

-- Add helpful comments
COMMENT ON COLUMN marketing_campaigns.initial_actions_excluded IS 'Indicates if initial actions (direct streams + add to playlists) should be permanently excluded from action queue';
COMMENT ON COLUMN marketing_campaigns.removal_actions_excluded IS 'Indicates if removal actions (remove from playlists) should be permanently excluded from action queue';
