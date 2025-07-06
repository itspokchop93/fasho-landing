import { createEmailTransporter } from './config';
import { createClient } from '../supabase/server';

interface EmailData {
  to: string;
  customerName: string;
  orderNumber: string;
  orderTotal: string;
  orderDate: string;
  [key: string]: string; // Allow additional variables
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  trigger_type: string;
  is_active: boolean;
}

export class EmailService {
  private transporter: any;
  
  constructor() {
    this.transporter = createEmailTransporter();
  }

  /**
   * Send email notification based on trigger type
   */
  async sendNotification(triggerType: string, emailData: EmailData): Promise<boolean> {
    try {
      console.log(`📧 EMAIL-SERVICE: Attempting to send ${triggerType} email to ${emailData.to}`);

      // Get email template and settings
      const template = await this.getEmailTemplate(triggerType);
      if (!template) {
        console.log(`📧 EMAIL-SERVICE: No template found for ${triggerType}`);
        return false;
      }

      const isActive = await this.isNotificationActive(triggerType);
      if (!isActive) {
        console.log(`📧 EMAIL-SERVICE: Notification ${triggerType} is not active`);
        return false;
      }

      // Replace template variables
      const processedSubject = this.replaceTemplateVariables(template.subject, emailData);
      const processedHtmlContent = this.replaceTemplateVariables(template.html_content, emailData);

      // Send email
      const mailOptions = {
        from: process.env.MAILJET_FROM_EMAIL || 'noreply@fasho.co',
        to: emailData.to,
        subject: processedSubject,
        html: processedHtmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Update email statistics
      await this.updateEmailStats(triggerType);
      
      console.log(`📧 EMAIL-SERVICE: Successfully sent ${triggerType} email to ${emailData.to}`);
      console.log(`📧 EMAIL-SERVICE: Message ID: ${result.messageId}`);
      
      return true;
    } catch (error) {
      console.error(`📧 EMAIL-SERVICE: Error sending ${triggerType} email:`, error);
      return false;
    }
  }

  /**
   * Get email template by trigger type
   */
  private async getEmailTemplate(triggerType: string): Promise<EmailTemplate | null> {
    try {
      // This would normally use the Supabase client, but since we're in a utility,
      // we'll make a direct database call. In a real implementation, you'd pass
      // the supabase client or make an API call.
      
      // For now, we'll return a basic template structure
      // In production, this should fetch from the database
      return null;
    } catch (error) {
      console.error('Error fetching email template:', error);
      return null;
    }
  }

  /**
   * Check if notification is active for trigger type
   */
  private async isNotificationActive(triggerType: string): Promise<boolean> {
    try {
      // This would check the email_notification_settings table
      // For now, we'll return true to allow testing
      return true;
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  /**
   * Replace template variables with actual data
   */
  private replaceTemplateVariables(template: string, data: EmailData): string {
    let processedTemplate = template;

    // Replace common variables
    processedTemplate = processedTemplate.replace(/\{\{customer_name\}\}/g, data.customerName);
    processedTemplate = processedTemplate.replace(/\{\{order_number\}\}/g, data.orderNumber);
    processedTemplate = processedTemplate.replace(/\{\{order_total\}\}/g, data.orderTotal);
    processedTemplate = processedTemplate.replace(/\{\{order_date\}\}/g, data.orderDate);

    // Replace any additional variables
    Object.keys(data).forEach(key => {
      if (!['to', 'customerName', 'orderNumber', 'orderTotal', 'orderDate'].includes(key)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedTemplate = processedTemplate.replace(regex, data[key]);
      }
    });

    // Replace any remaining unreplaced variables with empty strings
    processedTemplate = processedTemplate.replace(/\{\{[^}]+\}\}/g, '');

    return processedTemplate;
  }

  /**
   * Update email statistics
   */
  private async updateEmailStats(triggerType: string): Promise<void> {
    try {
      // This would update the email_notification_settings table
      // to increment total_sent and update last_sent_at
      console.log(`📧 EMAIL-SERVICE: Updated stats for ${triggerType}`);
    } catch (error) {
      console.error('Error updating email stats:', error);
    }
  }

  /**
   * Send order status change notification
   */
  async sendOrderStatusNotification(
    orderData: {
      id: string;
      order_number: string;
      customer_email: string;
      customer_name: string;
      total: number;
      created_at: string;
      status: string;
    },
    newStatus: string
  ): Promise<boolean> {
    const triggerType = `order_status_${newStatus}`;
    
    const emailData: EmailData = {
      to: orderData.customer_email,
      customerName: orderData.customer_name,
      orderNumber: orderData.order_number,
      orderTotal: `$${orderData.total.toFixed(2)}`,
      orderDate: new Date(orderData.created_at).toLocaleDateString(),
      orderId: orderData.id,
      newStatus: newStatus
    };

    return await this.sendNotification(triggerType, emailData);
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Helper function to send order status change emails
export async function sendOrderStatusChangeEmail(
  orderData: any,
  newStatus: string
): Promise<boolean> {
  return await emailService.sendOrderStatusNotification(orderData, newStatus);
} 