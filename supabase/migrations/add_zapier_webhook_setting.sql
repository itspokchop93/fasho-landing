-- Add Zapier webhook URL setting to admin_settings table
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('zapier_webhook_url', 'https://hooks.zapier.com/hooks/catch/23839455/u2wp0la/', 'Zapier webhook URL for sending event data')
ON CONFLICT (setting_key) DO NOTHING; 