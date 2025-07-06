import nodemailer from 'nodemailer';

// MailJet SMTP Configuration
export const createEmailTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: 'in-v3.mailjet.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.MAILJET_API_KEY,
      pass: process.env.MAILJET_SECRET_KEY,
    },
  });

  return transporter;
};

// Email template types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  isActive: boolean;
  trigger: EmailTrigger;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailTrigger = 
  | 'order_status_processing'
  | 'order_status_marketing_campaign'
  | 'order_status_completed'
  | 'order_status_order_issue'
  | 'order_status_cancelled'
  | 'order_created'
  | 'payment_successful'
  | 'payment_failed';

// Email notification settings
export interface EmailNotificationSetting {
  trigger: EmailTrigger;
  isActive: boolean;
  templateId?: string;
  lastSent?: Date;
  totalSent: number;
}

// Default email templates
export const DEFAULT_EMAIL_TEMPLATES: Partial<EmailTemplate>[] = [
  {
    name: 'Order Status: Processing',
    subject: 'Your order is now being processed',
    trigger: 'order_status_processing',
    isActive: false,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Update</h2>
        <p>Hi {{customerName}},</p>
        <p>Your order <strong>{{orderNumber}}</strong> is now being processed.</p>
        <p>We'll notify you once your marketing campaign is running.</p>
        <p>Thank you for choosing FASHO!</p>
      </div>
    `
  },
  {
    name: 'Order Status: Marketing Campaign Running',
    subject: 'Your marketing campaign is now live!',
    trigger: 'order_status_marketing_campaign',
    isActive: false,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Campaign Live!</h2>
        <p>Hi {{customerName}},</p>
        <p>Great news! Your marketing campaign for order <strong>{{orderNumber}}</strong> is now live and running.</p>
        <p>Your track "{{trackTitle}}" is being promoted across our network.</p>
        <p>You can track your progress in your dashboard.</p>
        <p>Best regards,<br>The FASHO Team</p>
      </div>
    `
  },
  {
    name: 'Order Status: Completed',
    subject: 'Your marketing campaign has completed successfully',
    trigger: 'order_status_completed',
    isActive: false,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Campaign Completed!</h2>
        <p>Hi {{customerName}},</p>
        <p>Your marketing campaign for order <strong>{{orderNumber}}</strong> has completed successfully!</p>
        <p>Your track "{{trackTitle}}" has reached its target audience.</p>
        <p>Thank you for choosing FASHO for your music promotion needs.</p>
        <p>Best regards,<br>The FASHO Team</p>
      </div>
    `
  },
  {
    name: 'Order Status: Order Issue - Check Email',
    subject: 'Action required for your order',
    trigger: 'order_status_order_issue',
    isActive: false,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Action Required</h2>
        <p>Hi {{customerName}},</p>
        <p>We need your attention regarding order <strong>{{orderNumber}}</strong>.</p>
        <p>Please check your email for important information about your order.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>The FASHO Team</p>
      </div>
    `
  },
  {
    name: 'Order Status: Cancelled',
    subject: 'Your order has been cancelled',
    trigger: 'order_status_cancelled',
    isActive: false,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Order Cancelled</h2>
        <p>Hi {{customerName}},</p>
        <p>Your order <strong>{{orderNumber}}</strong> has been cancelled.</p>
        <p>If this was unexpected, please contact our support team.</p>
        <p>Best regards,<br>The FASHO Team</p>
      </div>
    `
  }
];

// Email sending utility
export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
  variables?: Record<string, string>
) => {
  try {
    const transporter = createEmailTransporter();
    
    // Replace template variables
    let processedContent = htmlContent;
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    const mailOptions = {
      from: `"FASHO" <${process.env.MAILJET_FROM_EMAIL || 'noreply@fasho.co'}>`,
      to,
      subject,
      html: processedContent,
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('📧 EMAIL-SENT: Success', {
      to,
      subject,
      messageId: result.messageId
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('📧 EMAIL-ERROR: Failed to send email', {
      to,
      subject,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 