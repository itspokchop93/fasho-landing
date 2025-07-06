-- COMPLETE EMAIL SYSTEM SETUP
-- This will completely rebuild the email system with proper schema

-- 1. Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS email_send_log CASCADE;
DROP TABLE IF EXISTS email_notification_settings CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;

-- 2. Create email_templates table with correct schema
CREATE TABLE email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  trigger_type VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create email_notification_settings table
CREATE TABLE email_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  total_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create email_send_log table for tracking
CREATE TABLE email_send_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  trigger_type VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  order_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent',
  message_id VARCHAR(255),
  error_message TEXT
);

-- 5. Create indexes for performance
CREATE INDEX idx_email_templates_trigger_type ON email_templates(trigger_type);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);
CREATE INDEX idx_email_notification_settings_trigger_type ON email_notification_settings(trigger_type);
CREATE INDEX idx_email_notification_settings_is_active ON email_notification_settings(is_active);
CREATE INDEX idx_email_send_log_order_id ON email_send_log(order_id);
CREATE INDEX idx_email_send_log_recipient ON email_send_log(recipient_email);
CREATE INDEX idx_email_send_log_sent_at ON email_send_log(sent_at);

-- 6. Create update triggers
CREATE OR REPLACE FUNCTION update_email_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_template_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_updated_at();

CREATE OR REPLACE FUNCTION update_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON email_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_settings_updated_at();

-- 7. Insert default email templates
INSERT INTO email_templates (name, subject, html_content, trigger_type, is_active) VALUES
(
  'Order Status: Processing',
  'Your order is now being processed',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Your Order is Being Processed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">Order Update - Processing</h2>
        <p>Hi {{customer_name}},</p>
        <p>Great news! Your order <strong>{{order_number}}</strong> is now being processed.</p>
        <p>We''re working hard to get your order ready. You''ll receive another update when your marketing campaign begins.</p>
        <p>Order Details:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Total: {{order_total}}</li>
            <li>Date: {{order_date}}</li>
        </ul>
        <p>Thank you for choosing FASHO!</p>
        <p>Best regards,<br>The FASHO Team</p>
    </div>
</body>
</html>',
  'order_status_processing',
  false
),
(
  'Order Status: Marketing Campaign Running',
  'Your marketing campaign is now live!',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Your Marketing Campaign is Running</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10B981;">Marketing Campaign Active</h2>
        <p>Hi {{customer_name}},</p>
        <p>Exciting news! Your marketing campaign for order <strong>{{order_number}}</strong> is now live and running!</p>
        <p>Your music is being promoted across our network. You can expect to see results in the coming days.</p>
        <p>Campaign Details:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Total: {{order_total}}</li>
            <li>Started: {{order_date}}</li>
        </ul>
        <p>We''ll keep you updated on your campaign progress!</p>
        <p>Best regards,<br>The FASHO Team</p>
    </div>
</body>
</html>',
  'order_status_marketing_campaign',
  false
),
(
  'Order Status: Completed',
  'Your marketing campaign has completed successfully',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Your Order is Complete</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3B82F6;">Order Completed Successfully</h2>
        <p>Hi {{customer_name}},</p>
        <p>Congratulations! Your order <strong>{{order_number}}</strong> has been completed successfully.</p>
        <p>Your marketing campaign has finished running and all services have been delivered.</p>
        <p>Order Summary:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Total: {{order_total}}</li>
            <li>Completed: {{order_date}}</li>
        </ul>
        <p>Thank you for choosing FASHO for your music promotion needs!</p>
        <p>Best regards,<br>The FASHO Team</p>
    </div>
</body>
</html>',
  'order_status_completed',
  false
),
(
  'Order Status: Order Issue - Check Email',
  'Action required for your order',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Order Issue - Action Required</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #F59E0B;">Order Issue - Please Check Email</h2>
        <p>Hi {{customer_name}},</p>
        <p>We''ve encountered an issue with your order <strong>{{order_number}}</strong> that requires your attention.</p>
        <p>Please check your email for detailed information about the issue and next steps.</p>
        <p>Order Details:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Total: {{order_total}}</li>
            <li>Status: Requires Attention</li>
        </ul>
        <p>Our support team will contact you shortly to resolve this matter.</p>
        <p>Best regards,<br>The FASHO Team</p>
    </div>
</body>
</html>',
  'order_status_order_issue',
  false
),
(
  'Order Status: Cancelled',
  'Your order has been cancelled',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Order Cancelled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #EF4444;">Order Cancelled</h2>
        <p>Hi {{customer_name}},</p>
        <p>Your order <strong>{{order_number}}</strong> has been cancelled.</p>
        <p>If you have any questions about this cancellation, please contact our support team.</p>
        <p>Order Details:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Total: {{order_total}}</li>
            <li>Cancelled: {{order_date}}</li>
        </ul>
        <p>Thank you for your understanding.</p>
        <p>Best regards,<br>The FASHO Team</p>
    </div>
</body>
</html>',
  'order_status_cancelled',
  false
);

-- 8. Insert default notification settings (linking to templates)
INSERT INTO email_notification_settings (trigger_type, is_active, template_id)
SELECT 
  trigger_type,
  false as is_active,
  id as template_id
FROM email_templates;

-- 9. Verify the setup
SELECT 'Email system setup complete!' as status;
SELECT COUNT(*) as template_count FROM email_templates;
SELECT COUNT(*) as settings_count FROM email_notification_settings; 