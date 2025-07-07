-- Add new email notification triggers to the database
-- Run this in your Supabase SQL editor

-- Insert new notification settings for the new trigger types
INSERT INTO email_notification_settings (trigger_type, is_active, total_sent)
VALUES 
  ('new_order', false, 0),
  ('order_cancellation', false, 0)
ON CONFLICT (trigger_type) DO NOTHING;

-- Verify the new settings were added
SELECT trigger_type, is_active, total_sent, created_at 
FROM email_notification_settings 
WHERE trigger_type IN ('new_order', 'order_cancellation')
ORDER BY trigger_type;

-- Show all email notification settings
SELECT trigger_type, is_active, total_sent 
FROM email_notification_settings 
ORDER BY trigger_type;
