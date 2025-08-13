-- Add action_queue_excluded field to marketing_campaigns table
-- This field tracks campaigns that should be permanently excluded from the action queue
-- All changes are non-destructive and safe for production use

-- Add action_queue_excluded column to marketing_campaigns table
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS action_queue_excluded BOOLEAN DEFAULT FALSE;

-- Create index for action_queue_excluded for efficient queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_action_queue_excluded ON marketing_campaigns(action_queue_excluded);

-- Add helpful comment
COMMENT ON COLUMN marketing_campaigns.action_queue_excluded IS 'Indicates if this campaign should be permanently excluded from the action queue after being hidden or completed and timed out';
