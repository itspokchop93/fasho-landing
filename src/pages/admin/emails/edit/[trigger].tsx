import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../../utils/admin/auth';
import AdminAccessDenied from '../../../../components/AdminAccessDenied';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailEditorProps {
  adminSession: {
    email: string;
    role: 'admin' | 'sub_admin';
  } | null;
  accessDenied?: boolean;
}

export default function EmailEditor({ adminSession, accessDenied }: EmailEditorProps) {
  const router = useRouter();
  const { trigger } = router.query;
  
  // Admin access control - only full admins can access email management
  if (accessDenied || !adminSession || adminSession.role !== 'admin') {
    return <AdminAccessDenied />;
  }
  
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    is_active: false
  });

  // Email notification type mapping
  const emailNotificationTypes: { [key: string]: { name: string; description: string } } = {
    'new_order': {
      name: 'New Order',
      description: 'Sent when a new order is created'
    },
    'order_status_processing': {
      name: 'Order Status: Processing',
      description: 'Sent when an order status changes to Processing'
    },
    'order_status_marketing_campaign': {
      name: 'Order Status: Marketing Campaign Running',
      description: 'Sent when an order status changes to Marketing Campaign Running'
    },
    'order_status_completed': {
      name: 'Order Status: Completed',
      description: 'Sent when an order status changes to Completed'
    },
    'order_status_order_issue': {
      name: 'Order Status: Order Issue - Check Email',
      description: 'Sent when an order status changes to Order Issue'
    },
    'order_status_cancelled': {
      name: 'Order Status: Cancelled',
      description: 'Sent when an order status changes to Cancelled'
    },
    'order_cancellation': {
      name: 'Order Cancellation',
      description: 'Sent when an order is cancelled by customer or admin'
    },
    'admin_new_order': {
      name: 'Admin: New Order',
      description: 'Notify admin when a new order is created'
    }
  };

  useEffect(() => {
    if (trigger) {
      fetchTemplate();
      fetchAdminEmail();
    }
  }, [trigger]);

  const fetchAdminEmail = async () => {
    try {
      const response = await fetch('/api/admin/admin-settings');
      if (response.ok) {
        const data = await response.json();
        setAdminEmail(data.settings?.admin_notification_email || '');
      }
    } catch (err) {
      console.error('Error fetching admin email:', err);
    }
  };

  const fetchTemplate = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/email-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch email templates');
      }

      const data = await response.json();
      const existingTemplate = data.templates.find((t: EmailTemplate) => t.trigger_type === trigger);

      if (existingTemplate) {
        setTemplate(existingTemplate);
        setFormData({
          name: existingTemplate.name,
          subject: existingTemplate.subject,
          html_content: existingTemplate.html_content,
          is_active: existingTemplate.is_active
        });
      } else {
        // Initialize with default values for new template
        const triggerInfo = emailNotificationTypes[trigger as string];
        setFormData({
          name: triggerInfo?.name || 'New Email Template',
          subject: `${triggerInfo?.name || 'Notification'} - {{order_number}}`,
          html_content: getDefaultEmailTemplate(trigger as string),
          is_active: false
        });
      }
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Failed to load email template');
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultEmailTemplate = (triggerType: string): string => {
    const templates: { [key: string]: string } = {
      'new_order': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Order Confirmation - Thank You!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10B981;">Thank You for Your Order!</h2>
        <p>Hi {{customer_name}},</p>
        <p>Thank you for choosing FASHO! We've received your order <strong>{{order_number}}</strong> and we're excited to help promote your music.</p>
        <p>Your order is now being processed and you'll receive updates as it progresses through our system.</p>
        <p>Order Details:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Total: {{order_total}}</li>
            <li>Order Date: {{order_date}}</li>
        </ul>
        <p>What happens next:</p>
        <ol>
            <li>We'll review your order details</li>
            <li>Your marketing campaign will be set up</li>
            <li>You'll receive an update when your campaign goes live</li>
        </ol>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The FASHO Team</p>
    </div>
</body>
</html>`,
      'order_status_processing': `
<!DOCTYPE html>
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
        <p>We're working hard to get your order ready. You'll receive another update when your marketing campaign begins.</p>
        <p>Order Details:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Total: {{order_total}}</li>
            <li>Date: {{order_date}}</li>
        </ul>
        <p>Thank you for choosing Fasho!</p>
        <p>Best regards,<br>The Fasho Team</p>
    </div>
</body>
</html>`,
      'order_status_marketing_campaign': `
<!DOCTYPE html>
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
            <li>Campaign Duration: {{campaign_duration}}</li>
            <li>Started: {{campaign_start_date}}</li>
        </ul>
        <p>We'll keep you updated on your campaign progress!</p>
        <p>Best regards,<br>The Fasho Team</p>
    </div>
</body>
</html>`,
      'order_status_completed': `
<!DOCTYPE html>
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
            <li>Completed: {{completion_date}}</li>
        </ul>
        <p>Thank you for choosing Fasho for your music promotion needs!</p>
        <p>Best regards,<br>The Fasho Team</p>
    </div>
</body>
</html>`,
      'order_status_order_issue': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Order Issue - Action Required</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #F59E0B;">Order Issue - Please Check Email</h2>
        <p>Hi {{customer_name}},</p>
        <p>We've encountered an issue with your order <strong>{{order_number}}</strong> that requires your attention.</p>
        <p>Please check your email for detailed information about the issue and next steps.</p>
        <p>Order Details:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Issue Date: {{issue_date}}</li>
            <li>Status: Requires Attention</li>
        </ul>
        <p>Our support team will contact you shortly to resolve this matter.</p>
        <p>Best regards,<br>The Fasho Team</p>
    </div>
</body>
</html>`,
      'order_status_cancelled': `
<!DOCTYPE html>
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
            <li>Cancelled Date: {{cancellation_date}}</li>
            <li>Refund Status: {{refund_status}}</li>
        </ul>
        <p>Thank you for your understanding.</p>
        <p>Best regards,<br>The Fasho Team</p>
    </div>
</body>
</html>`,
      'order_cancellation': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Order Cancellation Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #F59E0B;">Order Cancellation Confirmed</h2>
        <p>Hi {{customer_name}},</p>
        <p>We've processed your cancellation request for order <strong>{{order_number}}</strong>.</p>
        <p>Your order has been successfully cancelled and any applicable refunds will be processed according to our refund policy.</p>
        <p>Cancellation Details:</p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Original Total: {{order_total}}</li>
            <li>Cancellation Date: {{order_date}}</li>
            <li>Refund Status: {{refund_status}}</li>
        </ul>
        <p>If you have any questions about this cancellation or need assistance with a new order, please don't hesitate to contact our support team.</p>
        <p>We hope to serve you again in the future!</p>
        <p>Best regards,<br>The FASHO Team</p>
    </div>
</body>
</html>`,
      'admin_new_order': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>New Order Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #DC2626;">🚨 New Order Alert</h2>
        <p>A new order has been received!</p>
        <p><strong>Order Details:</strong></p>
        <ul>
            <li>Order Number: {{order_number}}</li>
            <li>Customer: {{customer_name}}</li>
            <li>Email: {{customer_email}}</li>
            <li>Total: {{order_total}}</li>
            <li>Order Date: {{order_date}}</li>
        </ul>
        <p><strong>Order Items:</strong></p>
        <p>{{order_items}}</p>
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Review order details in admin dashboard</li>
            <li>Process the order and update status</li>
            <li>Customer will receive status updates automatically</li>
        </ol>
        <p>
            <a href="{{admin_order_url}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Order in Admin</a>
        </p>
        <p>Best regards,<br>FASHO Admin System</p>
    </div>
</body>
</html>`
    };

    return templates[triggerType] || templates['order_status_processing'];
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Always use PUT method and let the API determine create vs update
      const body = {
        ...formData,
        trigger_type: trigger,
        ...(template?.id && { id: template.id })
      };

      console.log('📧 EMAIL-EDITOR: Saving template with data:', {
        hasTemplateId: !!template?.id,
        triggerType: trigger,
        bodyKeys: Object.keys(body)
      });

      const response = await fetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to save email template');
      }

      const data = await response.json();
      setTemplate(data.template);
      setSuccessMessage('Email template saved successfully!');
      
      // Also update the email notification setting
      try {
        await fetch('/api/admin/email-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            trigger_type: trigger,
            is_active: formData.is_active,
            template_id: data.template.id
          }),
        });
      } catch (settingsError) {
        console.error('Error updating email settings:', settingsError);
        // Don't fail the whole operation if settings update fails
      }

      console.log(`📧 EMAIL-EDITOR: Successfully saved template for ${trigger}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save email template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToEmails = () => {
    router.push('/admin#emails');
  };

  const handleTestEmail = async () => {
    try {
      setIsTestingEmail(true);
      setError(null);

      const response = await fetch('/api/admin/test-email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          trigger_type: trigger
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to send test email');
      }

      setSuccessMessage(`Test email sent successfully to ${adminEmail}`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

      console.log('📧 TEST-EMAIL: Successfully sent test email for:', trigger);
    } catch (err) {
      console.error('Error sending test email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading email template...</p>
        </div>
      </div>
    );
  }

  if (!trigger || !emailNotificationTypes[trigger as string]) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Email Template</h2>
          <p className="text-gray-600 mb-4">The requested email template was not found.</p>
          <button
            onClick={handleBackToEmails}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Email Management
          </button>
        </div>
      </div>
    );
  }

  const triggerInfo = emailNotificationTypes[trigger as string];

  return (
    <>
      <Head>
        <title>Email Editor - {triggerInfo.name} - Fasho Admin</title>
        <meta name="description" content="Edit email template" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToEmails}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Email Template Editor</h1>
                  <p className="text-sm text-gray-500">{triggerInfo.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {adminSession?.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Email Template Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Template Configuration</h2>
                  
                  {/* Active/Inactive Toggle */}
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-700">Inactive</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-sm text-gray-700">Active</span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600">{successMessage}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Template Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter template name"
                    />
                  </div>

                  {/* Email Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter email subject"
                    />
                  </div>

                  {/* HTML Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HTML Content
                    </label>
                    <textarea
                      value={formData.html_content}
                      onChange={(e) => handleInputChange('html_content', e.target.value)}
                      rows={20}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                      placeholder="Enter HTML content for the email"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={handleTestEmail}
                      disabled={isTestingEmail || !adminEmail || !template}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTestingEmail ? 'Sending...' : 'Send Test Email'}
                    </button>
                    
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Template'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Template Info */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Trigger Type</p>
                    <p className="text-sm text-gray-600">{triggerInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-sm text-gray-600">{triggerInfo.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      formData.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {formData.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Available Variables */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Variables</h3>
                <div className="space-y-2">
                  <div className="text-sm">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{'{{customer_name}}'}</code>
                    <p className="text-gray-600 mt-1">Customer's full name</p>
                  </div>
                  <div className="text-sm">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{'{{order_number}}'}</code>
                    <p className="text-gray-600 mt-1">Order number</p>
                  </div>
                  <div className="text-sm">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{'{{order_total}}'}</code>
                    <p className="text-gray-600 mt-1">Order total amount</p>
                  </div>
                  <div className="text-sm">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{'{{order_date}}'}</code>
                    <p className="text-gray-600 mt-1">Order creation date</p>
                  </div>
                </div>
              </div>

              {/* Test Email Information */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Email</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Test Email Destination</p>
                    <p className="text-sm text-gray-600">
                      {adminEmail || 'Admin email not configured'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">What Happens</p>
                    <p className="text-sm text-gray-600">
                      The template will be sent with sample data to test how it looks and functions.
                    </p>
                  </div>
                  {!adminEmail && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700">
                        ⚠️ Configure admin email in settings to enable test emails.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    console.log('🔐 EMAIL-EDITOR: Checking admin authentication...')
    
    // Get admin session token from request
    const token = getAdminTokenFromRequest(context.req as any)
    
    if (!token) {
      console.log('🔐 EMAIL-EDITOR: No admin session token found')
      return {
        redirect: {
          destination: '/a-login',
          permanent: false,
        },
      }
    }

    // Verify admin token
    const adminUser = verifyAdminToken(token)
    
    if (!adminUser) {
      console.log('🔐 EMAIL-EDITOR: Invalid admin session token')
      return {
        redirect: {
          destination: '/a-login',
          permanent: false,
        },
      }
    }

    if (!adminUser.is_active) {
      console.log('🔐 EMAIL-EDITOR: Admin account is inactive:', adminUser.email)
      return {
        props: {
          adminSession: null,
          accessDenied: true
        },
      }
    }

    // Only full admins can access email management
    if (adminUser.role !== 'admin') {
      console.log('🔐 EMAIL-EDITOR: Sub-admin trying to access email management:', adminUser.email)
      return {
        props: {
          adminSession: null,
          accessDenied: true
        },
      }
    }

    console.log('🔐 EMAIL-EDITOR: Admin authenticated successfully:', adminUser.email, 'role:', adminUser.role)

    return {
      props: {
        adminSession: {
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    }
  } catch (error) {
    console.error('🔐 EMAIL-EDITOR: Authentication error:', error)
    return {
      redirect: {
        destination: '/a-login',
        permanent: false,
      },
    }
  }
}; 