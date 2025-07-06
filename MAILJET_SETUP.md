# MailJet SMTP Setup Instructions

## Required Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# MailJet SMTP Configuration
MAILJET_API_KEY=your_mailjet_api_key_here
MAILJET_SECRET_KEY=your_mailjet_secret_key_here
MAILJET_FROM_EMAIL=noreply@yourdomain.com
```

## How to Get MailJet Credentials

1. **Create MailJet Account**
   - Go to https://www.mailjet.com/
   - Sign up for a free account
   - Verify your email address

2. **Get API Credentials**
   - Log into your MailJet dashboard
   - Go to "Account Settings" → "REST API" → "API Key Management"
   - Copy your API Key and Secret Key
   - Add them to your `.env.local` file

3. **Set Up Sender Email**
   - In MailJet dashboard, go to "Account Settings" → "Sender addresses & domains"
   - Add and verify your sender email address
   - Use this verified email as `MAILJET_FROM_EMAIL`

## Database Setup

Run the following SQL migration to create the email system tables:

```sql
-- Run this in your Supabase SQL editor or via migration
-- File: supabase/migrations/create_email_system.sql

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger_type ON email_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_notification_settings_trigger_type ON email_notification_settings(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_notification_settings_is_active ON email_notification_settings(is_active);

-- Insert default notification settings
INSERT INTO email_notification_settings (trigger_type, is_active, total_sent)
VALUES 
  ('order_status_processing', false, 0),
  ('order_status_marketing_campaign', false, 0),
  ('order_status_completed', false, 0),
  ('order_status_order_issue', false, 0),
  ('order_status_cancelled', false, 0)
ON CONFLICT (trigger_type) DO NOTHING;
```

## Testing the Setup

1. **Check Environment Variables**
   ```bash
   # Verify your environment variables are loaded
   npm run dev
   # Check console for any MailJet connection errors
   ```

2. **Test Email Sending**
   - Go to `/admin#emails` in your admin dashboard
   - Create an email template for "Order Status: Processing"
   - Activate the notification
   - Change an order status to "Processing" to trigger the email

## Email Template Variables

The following variables are available in email templates:

- `{{customer_name}}` - Customer's full name
- `{{order_number}}` - Order number
- `{{order_total}}` - Order total amount
- `{{order_date}}` - Order creation date
- `{{order_id}}` - Order ID
- `{{new_status}}` - New order status

## Troubleshooting

### Common Issues:

1. **Authentication Error**
   - Verify your API Key and Secret Key are correct
   - Make sure there are no extra spaces in your environment variables

2. **Sender Email Rejected**
   - Verify your sender email address in MailJet dashboard
   - Use the exact email address that was verified

3. **Emails Not Sending**
   - Check that the email notification is activated in admin dashboard
   - Verify the email template exists and is active
   - Check server logs for detailed error messages

### Debug Logs:

Look for these log messages in your server console:
- `📧 EMAIL-SERVICE: Attempting to send...`
- `📧 EMAIL-SERVICE: Successfully sent...`
- `📧 EMAIL-TEMPLATE: Created template...`
- `📧 EMAIL-SETTING: Updated...`

## Production Considerations

1. **Rate Limits**
   - Free MailJet accounts have sending limits
   - Monitor your usage in the MailJet dashboard

2. **Email Deliverability**
   - Set up SPF, DKIM, and DMARC records for your domain
   - Monitor bounce rates and spam complaints

3. **Template Management**
   - Regularly backup your email templates
   - Test templates thoroughly before activating
   - Use A/B testing for important notifications 