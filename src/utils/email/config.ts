import { sendElasticEmail } from './elasticEmailService';

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
  | 'payment_failed'
  | 'admin_payment_failed';

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
  },
  {
    name: 'Payment Successful',
    subject: 'Your payment was successful!',
    trigger: 'payment_successful',
    isActive: false,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Payment Successful!</h2>
        <p>Hi {{customerName}},</p>
        <p>Your payment for order <strong>{{orderNumber}}</strong> was successful!</p>
        <p>Your track "{{trackTitle}}" is now available for download.</p>
        <p>Thank you for choosing FASHO!</p>
      </div>
    `
  },
     {
     name: 'Payment Failed (Customer)',
     subject: 'Payment Failed - {{packageNames}}',
     trigger: 'payment_failed',
     isActive: false,
     htmlContent: `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 40px; border-radius: 12px;">
         <div style="text-align: center; margin-bottom: 30px;">
           <h1 style="color: #ff6b6b; margin: 0; font-size: 28px;">Payment Failed</h1>
         </div>
         
         <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hi {{customerName}},</p>
         
         <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
           Unfortunately, your payment for <strong style="color: #59e3a5;">{{packageNames}}</strong> could not be processed.
         </p>
         
         <div style="background: rgba(255, 107, 107, 0.1); border: 1px solid #ff6b6b; border-radius: 8px; padding: 20px; margin: 20px 0;">
           <p style="margin: 0; font-size: 14px; color: #ffcccb;">
             <strong>Error:</strong> {{failureReason}}
           </p>
         </div>
         
         <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
           <strong>Order Details:</strong><br>
           Package(s): {{packageNames}}<br>
           Amount: {{orderTotal}}<br>
           Date: {{orderDate}}
         </p>
         
         <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
           Don't worry! You can try again by visiting our checkout page. Please check your payment details and try again.
         </p>
         
         <div style="text-align: center; margin: 30px 0;">
           <a href="https://www.fasho.co/packages" style="background: linear-gradient(135deg, #59e3a5 0%, #14c0ff 100%); color: black; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
             Try Again
           </a>
         </div>
         
         <p style="font-size: 14px; line-height: 1.6; color: #cccccc; margin-bottom: 20px;">
           If you continue to experience issues, please contact our support team at <a href="mailto:support@fasho.co" style="color: #59e3a5;">support@fasho.co</a> and we'll help you get your music promotion started.
         </p>
         
         <div style="text-align: center; border-top: 1px solid #444; padding-top: 20px; margin-top: 30px;">
           <p style="font-size: 12px; color: #888; margin: 0;">
             FASHO - Music Promotion That Works<br>
             <a href="https://www.fasho.co" style="color: #59e3a5;">www.fasho.co</a>
           </p>
         </div>
       </div>
     `
   },
     {
     name: 'Admin: Payment Failed',
     subject: 'ALERT: Payment Failed - {{packageNames}} - {{customerName}}',
     trigger: 'admin_payment_failed',
     isActive: false,
     htmlContent: `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 12px; border-left: 5px solid #dc3545;">
         <div style="background: #dc3545; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
           <h1 style="margin: 0; font-size: 24px;">⚠️ Payment Failed Alert</h1>
         </div>
         
         <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
           <h2 style="color: #333; margin-top: 0;">Customer Information</h2>
           <p style="margin: 5px 0;"><strong>Name:</strong> {{customerName}}</p>
           <p style="margin: 5px 0;"><strong>Email:</strong> {{customer_email}}</p>
           <p style="margin: 5px 0;"><strong>Date:</strong> {{orderDate}}</p>
         </div>
         
         <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
           <h2 style="color: #333; margin-top: 0;">Order Information</h2>
           <p style="margin: 5px 0;"><strong>Package(s):</strong> {{packageNames}}</p>
           <p style="margin: 5px 0;"><strong>Total Amount:</strong> {{orderTotal}}</p>
           <p style="margin: 5px 0;"><strong>Failure Reason:</strong> <span style="color: #dc3545; font-weight: bold;">{{failureReason}}</span></p>
         </div>
         
         <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
           <h3 style="color: #856404; margin-top: 0;">Action Required</h3>
           <p style="color: #856404; margin: 0;">
             Please investigate this payment failure and follow up with the customer if necessary. 
             Check if this is a recurring issue or if additional support is needed.
           </p>
         </div>
         
         <div style="text-align: center; margin-top: 30px;">
           <a href="https://www.fasho.co/admin" style="background: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
             View Admin Dashboard
           </a>
         </div>
         
         <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; text-align: center;">
           <p style="font-size: 12px; color: #6c757d; margin: 0;">
             FASHO Admin Notification System<br>
             This is an automated message - do not reply to this email.
           </p>
         </div>
       </div>
     `
   }
];

// Updated email sending utility - now uses REST API by default
export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
  variables?: Record<string, string>
) => {
  // Replace template variables if provided
  let processedContent = htmlContent;
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    });
  }
  return await sendElasticEmail({
    to,
    subject,
    htmlBody: processedContent
  });
}; 