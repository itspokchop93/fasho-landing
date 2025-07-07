-- Admin Settings Table for storing admin configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- Insert default admin email setting
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('admin_notification_email', '', 'Email address to receive admin notifications')
ON CONFLICT (setting_key) DO NOTHING;

-- Update trigger for admin_settings
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_updated_at();

-- Add admin notification trigger types to email_notification_settings
INSERT INTO email_notification_settings (trigger_type, is_active, total_sent) VALUES
('admin_new_order', false, 0)
ON CONFLICT (trigger_type) DO NOTHING; 