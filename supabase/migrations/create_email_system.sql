-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Notification Settings Table
CREATE TABLE IF NOT EXISTS email_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  total_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Send Log Table (for tracking sent emails)
CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  trigger_type VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  message_id VARCHAR(255),
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger ON email_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_settings_trigger ON email_notification_settings(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_log_order ON email_send_log(order_id);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_send_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_send_log(sent_at);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, trigger_type, is_active) VALUES
(
  'Order Status: Processing',
  'Your order is now being processed',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Order Update</h2>
    <p>Hi {{customerName}},</p>
    <p>Your order <strong>{{orderNumber}}</strong> is now being processed.</p>
    <p>We''ll notify you once your marketing campaign is running.</p>
    <p>Thank you for choosing FASHO!</p>
  </div>',
  'order_status_processing',
  false
),
(
  'Order Status: Marketing Campaign Running',
  'Your marketing campaign is now live!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #10b981;">Campaign Live!</h2>
    <p>Hi {{customerName}},</p>
    <p>Great news! Your marketing campaign for order <strong>{{orderNumber}}</strong> is now live and running.</p>
    <p>Your track "{{trackTitle}}" is being promoted across our network.</p>
    <p>You can track your progress in your dashboard.</p>
    <p>Best regards,<br>The FASHO Team</p>
  </div>',
  'order_status_marketing_campaign',
  false
),
(
  'Order Status: Completed',
  'Your marketing campaign has completed successfully',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #3b82f6;">Campaign Completed!</h2>
    <p>Hi {{customerName}},</p>
    <p>Your marketing campaign for order <strong>{{orderNumber}}</strong> has completed successfully!</p>
    <p>Your track "{{trackTitle}}" has reached its target audience.</p>
    <p>Thank you for choosing FASHO for your music promotion needs.</p>
    <p>Best regards,<br>The FASHO Team</p>
  </div>',
  'order_status_completed',
  false
),
(
  'Order Status: Order Issue - Check Email',
  'Action required for your order',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #f59e0b;">Action Required</h2>
    <p>Hi {{customerName}},</p>
    <p>We need your attention regarding order <strong>{{orderNumber}}</strong>.</p>
    <p>Please check your email for important information about your order.</p>
    <p>If you have any questions, please contact our support team.</p>
    <p>Best regards,<br>The FASHO Team</p>
  </div>',
  'order_status_order_issue',
  false
),
(
  'Order Status: Cancelled',
  'Your order has been cancelled',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #ef4444;">Order Cancelled</h2>
    <p>Hi {{customerName}},</p>
    <p>Your order <strong>{{orderNumber}}</strong> has been cancelled.</p>
    <p>If this was unexpected, please contact our support team.</p>
    <p>Best regards,<br>The FASHO Team</p>
  </div>',
  'order_status_cancelled',
  false
);

-- Insert default notification settings
INSERT INTO email_notification_settings (trigger_type, is_active) VALUES
('order_status_processing', false),
('order_status_marketing_campaign', false),
('order_status_completed', false),
('order_status_order_issue', false),
('order_status_cancelled', false);

-- Update trigger for email templates
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

-- Update trigger for email notification settings
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