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
  
  constructor() {
    // No longer need SMTP transporter - using REST API
  }

  /**
   * Map admin status values to email trigger types
   */
  private mapStatusToTrigger(status: string): string {
    const statusMapping: { [key: string]: string } = {
      'processing': 'order_status_processing',
      'marketing_campaign_running': 'order_status_marketing_campaign',
      'completed': 'order_status_completed',
      'order_issue': 'order_status_order_issue',
      'cancelled': 'order_status_cancelled'
    };

    return statusMapping[status] || `order_status_${status}`;
  }

  /**
   * Send email notification using MailJet REST API call
   */
  async sendNotification(triggerType: string, emailData: EmailData, supabaseClient: any): Promise<boolean> {
    try {
      console.log(`📧 EMAIL-SERVICE: Mapped status '${emailData.to.includes('marketing') ? 'marketing_campaign_running' : 'unknown'}' to trigger '${triggerType}'`);
      console.log(`📧 EMAIL-SERVICE: Attempting to send ${triggerType} email to ${emailData.to}`);

      // Get email template and settings
      const template = await this.getEmailTemplate(triggerType, supabaseClient);
      if (!template) {
        console.log(`📧 EMAIL-SERVICE: No template found for ${triggerType}`);
        return false;
      }

      const isActive = await this.isNotificationActive(triggerType, supabaseClient);
      if (!isActive) {
        console.log(`📧 EMAIL-SERVICE: Notification ${triggerType} is not active`);
        return false;
      }

      // Replace template variables
      const processedSubject = this.replaceTemplateVariables(template.subject, emailData);
      const processedHtmlContent = this.replaceTemplateVariables(template.html_content, emailData);

      console.log(`📧 EMAIL-SERVICE: Sending email via MailJet REST API`);
      console.log(`📧 EMAIL-SERVICE: To: ${emailData.to}`);
      console.log(`📧 EMAIL-SERVICE: Subject: ${processedSubject}`);
      console.log(`📧 EMAIL-SERVICE: Subject length: ${processedSubject.length}`);
      console.log(`📧 EMAIL-SERVICE: Subject type: ${typeof processedSubject}`);
      console.log(`📧 EMAIL-SERVICE: Original template subject: ${template.subject}`);
      console.log(`📧 EMAIL-SERVICE: Template subject length: ${template.subject.length}`);

      // Send email using direct MailJet REST API
      const result = await this.sendMailJetEmail(emailData.to, processedSubject, processedHtmlContent);

      if (!result.success) {
        console.error(`📧 EMAIL-SERVICE: ❌ Failed to send ${triggerType} email:`, result.error);
        return false;
      }

      console.log(`📧 EMAIL-SERVICE: ✅ Successfully sent ${triggerType} email to ${emailData.to}`);
      console.log(`📧 EMAIL-SERVICE: Message ID: ${result.messageId}`);
      console.log(`📧 EMAIL-SERVICE: Status: ${result.status}`);

      // Update email statistics
      await this.updateEmailStats(triggerType, supabaseClient);
      return true;
    } catch (error) {
      console.error(`📧 EMAIL-SERVICE: ❌ Error sending ${triggerType} email:`, error);
      return false;
    }
  }

  /**
   * Send email using MailJet REST API directly
   */
  private async sendMailJetEmail(to: string, subject: string, htmlContent: string): Promise<{ success: boolean; messageId?: string; status?: string; error?: any }> {
    try {
      const apiKey = process.env.MAILJET_API_KEY;
      const secretKey = process.env.MAILJET_SECRET_KEY;
      const fromEmail = process.env.MAILJET_FROM_EMAIL || 'support@fasho.pro';

      console.log('🔧 DIRECT-MAILJET: Environment check:', {
        hasApiKey: !!apiKey,
        hasSecretKey: !!secretKey,
        fromEmail,
        apiKeyLength: apiKey?.length,
        secretKeyLength: secretKey?.length
      });

      if (!apiKey || !secretKey) {
        throw new Error('MailJet API credentials not configured');
      }

      // Create the MailJet payload
      const payload = {
        Messages: [
          {
            From: {
              Email: fromEmail,
              Name: "FASHO"
            },
            To: [
              {
                Email: to,
                Name: to
              }
            ],
            Subject: subject,
            HTMLPart: htmlContent,
            CustomID: `order-notification-${Date.now()}`
          }
        ]
      };

      console.log('🔧 DIRECT-MAILJET: Payload created:', {
        to,
        subject,
        from: fromEmail,
        hasContent: !!htmlContent
      });

      console.log('🔧 DIRECT-MAILJET: Full payload:', JSON.stringify(payload, null, 2));

      // Make the API call
      console.log('🔧 DIRECT-MAILJET: Making API call to https://api.mailjet.com/v3.1/send');
      
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`
        },
        body: JSON.stringify(payload)
      });

      console.log('🔧 DIRECT-MAILJET: Response status:', response.status);
      console.log('🔧 DIRECT-MAILJET: Response headers:', Object.fromEntries(response.headers.entries()));

      const responseData = await response.json();
      console.log('🔧 DIRECT-MAILJET: Response body:', responseData);

      if (!response.ok) {
        throw new Error(`MailJet API error: ${response.status} - ${JSON.stringify(responseData)}`);
      }

      if (responseData.Messages && responseData.Messages[0]) {
        const message = responseData.Messages[0];
        
        if (message.Status === 'success') {
          console.log('✅ DIRECT-MAILJET: Email sent successfully');
          console.log('📧 DIRECT-MAILJET: Message ID:', message.To[0]?.MessageID || 'Unknown');
          console.log('📧 DIRECT-MAILJET: Status:', message.Status);
          
          return {
            success: true,
            messageId: message.To[0]?.MessageID || message.CustomID,
            status: message.Status
          };
        } else {
          throw new Error(`MailJet send failed: ${message.Status}`);
        }
      } else {
        throw new Error('Invalid MailJet response format');
      }

    } catch (error) {
      console.error('❌ DIRECT-MAILJET: Send failed:', error);
      return {
        success: false,
        error
      };
    }
  }

  /**
   * Get email template by trigger type
   */
  private async getEmailTemplate(triggerType: string, supabaseClient: any): Promise<EmailTemplate | null> {
    try {
      console.log(`📧 EMAIL-SERVICE: Fetching template for ${triggerType}`);
      
      const { data: template, error } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('trigger_type', triggerType)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error(`📧 EMAIL-SERVICE: Error fetching template for ${triggerType}:`, error);
        return null;
      }

      if (!template) {
        console.log(`📧 EMAIL-SERVICE: No active template found for ${triggerType}`);
        return null;
      }

      console.log(`📧 EMAIL-SERVICE: Found template: ${template.name}`);
      return template;
    } catch (error) {
      console.error('📧 EMAIL-SERVICE: Error fetching email template:', error);
      return null;
    }
  }

  /**
   * Check if notification is active for trigger type
   */
  private async isNotificationActive(triggerType: string, supabaseClient: any): Promise<boolean> {
    try {
      console.log(`📧 EMAIL-SERVICE: Checking if notification is active for ${triggerType}`);
      
      const { data: setting, error } = await supabaseClient
        .from('email_notification_settings')
        .select('is_active')
        .eq('trigger_type', triggerType)
        .single();

      if (error) {
        console.error(`📧 EMAIL-SERVICE: Error checking notification status for ${triggerType}:`, error);
        return false;
      }

      const isActive = setting?.is_active || false;
      console.log(`📧 EMAIL-SERVICE: Notification ${triggerType} is ${isActive ? 'active' : 'inactive'}`);
      
      return isActive;
    } catch (error) {
      console.error('📧 EMAIL-SERVICE: Error checking notification status:', error);
      return false;
    }
  }

  /**
   * Replace template variables with actual data
   */
  private replaceTemplateVariables(template: string, data: EmailData): string {
    let processedTemplate = template;

    // Replace common variables with both camelCase and underscore versions
    processedTemplate = processedTemplate.replace(/\{\{customer_name\}\}/g, data.customerName);
    processedTemplate = processedTemplate.replace(/\{\{customerName\}\}/g, data.customerName);
    processedTemplate = processedTemplate.replace(/\{\{order_number\}\}/g, data.orderNumber);
    processedTemplate = processedTemplate.replace(/\{\{orderNumber\}\}/g, data.orderNumber);
    processedTemplate = processedTemplate.replace(/\{\{order_total\}\}/g, data.orderTotal);
    processedTemplate = processedTemplate.replace(/\{\{orderTotal\}\}/g, data.orderTotal);
    processedTemplate = processedTemplate.replace(/\{\{order_date\}\}/g, data.orderDate);
    processedTemplate = processedTemplate.replace(/\{\{orderDate\}\}/g, data.orderDate);

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
  private async updateEmailStats(triggerType: string, supabaseClient: any): Promise<void> {
    try {
      console.log(`📧 EMAIL-SERVICE: Updating stats for ${triggerType}`);
      
      // First, get the current count
      const { data: currentSetting, error: fetchError } = await supabaseClient
        .from('email_notification_settings')
        .select('total_sent')
        .eq('trigger_type', triggerType)
        .single();

      if (fetchError) {
        console.error(`📧 EMAIL-SERVICE: Error fetching current stats for ${triggerType}:`, fetchError);
        return;
      }

      const currentCount = currentSetting?.total_sent || 0;
      const newCount = currentCount + 1;

      // Update the count using a regular update
      const { error: updateError } = await supabaseClient
        .from('email_notification_settings')
        .update({ 
          total_sent: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('trigger_type', triggerType);

      if (updateError) {
        console.error(`📧 EMAIL-SERVICE: Error updating stats for ${triggerType}:`, updateError);
      } else {
        console.log(`📧 EMAIL-SERVICE: Updated stats for ${triggerType}: ${currentCount} -> ${newCount}`);
      }
    } catch (error) {
      console.error('📧 EMAIL-SERVICE: Error updating email stats:', error);
    }
  }

  /**
   * Send order status notification
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
    newStatus: string,
    supabaseClient: any
  ): Promise<boolean> {
    const triggerType = this.mapStatusToTrigger(newStatus);
    
    const emailData: EmailData = {
      to: orderData.customer_email,
      customerName: orderData.customer_name,
      orderNumber: orderData.order_number,
      orderTotal: `$${(orderData.total / 100).toFixed(2)}`,
      orderDate: new Date(orderData.created_at).toLocaleDateString()
    };

    return await this.sendNotification(triggerType, emailData, supabaseClient);
  }

  /**
   * Get admin notification email from settings
   */
  private async getAdminNotificationEmail(supabaseClient: any): Promise<string | null> {
    try {
      console.log('🔧 EMAIL-SERVICE: Fetching admin notification email...');
      
      const { data, error } = await supabaseClient
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_notification_email')
        .single();

      if (error) {
        console.error('🔧 EMAIL-SERVICE: Error fetching admin email:', error);
        return null;
      }

      const adminEmail = data?.setting_value?.trim();
      if (!adminEmail) {
        console.log('🔧 EMAIL-SERVICE: No admin email configured');
        return null;
      }

      console.log('🔧 EMAIL-SERVICE: Admin email found:', adminEmail);
      return adminEmail;
    } catch (error) {
      console.error('🔧 EMAIL-SERVICE: Error getting admin email:', error);
      return null;
    }
  }

  /**
   * Send admin notification email
   */
  async sendAdminNotification(triggerType: string, emailData: EmailData, supabaseClient: any): Promise<boolean> {
    try {
      console.log(`📧 EMAIL-SERVICE-ADMIN: Attempting to send admin notification ${triggerType}`);

      // Get admin email
      const adminEmail = await this.getAdminNotificationEmail(supabaseClient);
      if (!adminEmail) {
        console.log(`📧 EMAIL-SERVICE-ADMIN: No admin email configured, skipping ${triggerType}`);
        return false;
      }

      // Override the 'to' field with admin email for admin notifications
      const adminEmailData = {
        ...emailData,
        to: adminEmail
      };

      console.log(`📧 EMAIL-SERVICE-ADMIN: Sending ${triggerType} to admin: ${adminEmail}`);

      // Get email template and settings
      const template = await this.getEmailTemplate(triggerType, supabaseClient);
      if (!template) {
        console.log(`📧 EMAIL-SERVICE-ADMIN: No template found for ${triggerType}`);
        return false;
      }

      const isActive = await this.isNotificationActive(triggerType, supabaseClient);
      if (!isActive) {
        console.log(`📧 EMAIL-SERVICE-ADMIN: Admin notification ${triggerType} is not active`);
        return false;
      }

      // Replace template variables
      const processedSubject = this.replaceTemplateVariables(template.subject, adminEmailData);
      const processedHtmlContent = this.replaceTemplateVariables(template.html_content, adminEmailData);

      console.log(`📧 EMAIL-SERVICE-ADMIN: Sending admin email via MailJet REST API`);
      console.log(`📧 EMAIL-SERVICE-ADMIN: To: ${adminEmail}`);
      console.log(`📧 EMAIL-SERVICE-ADMIN: Subject: ${processedSubject}`);

      // Send email using direct MailJet REST API
      const result = await this.sendMailJetEmail(adminEmail, processedSubject, processedHtmlContent);

      if (!result.success) {
        console.error(`📧 EMAIL-SERVICE-ADMIN: ❌ Failed to send ${triggerType} admin email:`, result.error);
        return false;
      }

      console.log(`📧 EMAIL-SERVICE-ADMIN: ✅ Successfully sent ${triggerType} admin email to ${adminEmail}`);
      console.log(`📧 EMAIL-SERVICE-ADMIN: Message ID: ${result.messageId}`);
      console.log(`📧 EMAIL-SERVICE-ADMIN: Status: ${result.status}`);

      // Update email statistics
      await this.updateEmailStats(triggerType, supabaseClient);
      return true;
    } catch (error) {
      console.error(`📧 EMAIL-SERVICE-ADMIN: ❌ Error sending ${triggerType} admin email:`, error);
      return false;
    }
  }
}

// Export the function that will be called from the API
export async function sendOrderStatusChangeEmail(
  orderData: any,
  newStatus: string,
  supabaseClient: any
): Promise<boolean> {
  const emailService = new EmailService();
  return await emailService.sendOrderStatusNotification(orderData, newStatus, supabaseClient);
}

/**
 * Send new order confirmation email
 */
export async function sendNewOrderEmail(
  orderData: {
    id: string;
    order_number: string;
    customer_email: string;
    customer_name: string;
    total: number;
    created_at: string;
  },
  supabaseClient: any
): Promise<boolean> {
  const emailService = new EmailService();
  
  const emailData: EmailData = {
    to: orderData.customer_email,
    customerName: orderData.customer_name,
    orderNumber: orderData.order_number,
    orderTotal: `$${(orderData.total / 100).toFixed(2)}`,
    orderDate: new Date(orderData.created_at).toLocaleDateString()
  };

  return await emailService.sendNotification('new_order', emailData, supabaseClient);
}

/**
 * Send order cancellation email
 */
export async function sendOrderCancellationEmail(
  orderData: {
    id: string;
    order_number: string;
    customer_email: string;
    customer_name: string;
    total: number;
    created_at: string;
    refund_status?: string;
  },
  supabaseClient: any
): Promise<boolean> {
  const emailService = new EmailService();
  
  const emailData: EmailData = {
    to: orderData.customer_email,
    customerName: orderData.customer_name,
    orderNumber: orderData.order_number,
    orderTotal: `$${(orderData.total / 100).toFixed(2)}`,
    orderDate: new Date().toLocaleDateString(), // Cancellation date is today
    refund_status: orderData.refund_status || 'Processing'
  };

  return await emailService.sendNotification('order_cancellation', emailData, supabaseClient);
}

/**
 * Send admin notification for new order
 */
export async function sendAdminNewOrderEmail(
  orderData: {
    id: string;
    order_number: string;
    customer_email: string;
    customer_name: string;
    total: number;
    created_at: string;
  },
  supabaseClient: any
): Promise<boolean> {
  try {
    console.log('📧 ADMIN-NEW-ORDER: Sending admin notification for new order:', orderData.order_number);

    const emailService = new EmailService();
    
    // Format order data for admin email
    const emailData: EmailData = {
      to: '', // Will be replaced with admin email
      customerName: orderData.customer_name,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      orderNumber: orderData.order_number,
      order_number: orderData.order_number,
      orderTotal: `$${(orderData.total / 100).toFixed(2)}`,
      order_total: `$${(orderData.total / 100).toFixed(2)}`,
      orderDate: new Date(orderData.created_at).toLocaleDateString(),
      order_date: new Date(orderData.created_at).toLocaleDateString(),
      order_items: 'Music promotion package', // Could be enhanced with actual items
      admin_order_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/order/${orderData.id}`
    };

    const result = await emailService.sendAdminNotification('admin_new_order', emailData, supabaseClient);
    
    if (result) {
      console.log('📧 ADMIN-NEW-ORDER: ✅ Admin notification sent successfully');
    } else {
      console.log('📧 ADMIN-NEW-ORDER: ❌ Admin notification failed or was not sent');
    }

    return result;
  } catch (error) {
    console.error('📧 ADMIN-NEW-ORDER: ❌ Error sending admin new order email:', error);
    return false;
  }
} 