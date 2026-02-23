import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminMailerLiteManagement from './AdminMailerLiteManagement';

interface EmailTemplate {
  id: string;
  name: string;
  trigger_type: string;
  subject: string;
  html_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailNotificationSetting {
  id: string;
  trigger_type: string;
  is_active: boolean;
  template_id: string | null;
  total_sent: number;
  created_at: string;
  updated_at: string;
}

interface AdminSettings {
  admin_notification_email: string;
}

export default function AdminEmailManagement() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<'transactional' | 'mailerlite'>('transactional');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailNotificationSetting[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({ admin_notification_email: '' });
  const [adminEmailSaving, setAdminEmailSaving] = useState(false);
  const [testingEmails, setTestingEmails] = useState<{ [key: string]: boolean }>({});

  // Customer email notification types
  const customerEmailNotificationTypes = [
    {
      trigger: 'new_order',
      name: 'New Order',
      description: 'Sent when a new order is created'
    },
    {
      trigger: 'order_status_processing',
      name: 'Order Status: Processing',
      description: 'Sent when an order status changes to Processing'
    },
    {
      trigger: 'order_status_marketing_campaign',
      name: 'Order Status: Marketing Campaign Running',
      description: 'Sent when an order status changes to Marketing Campaign Running'
    },
    {
      trigger: 'order_status_completed',
      name: 'Order Status: Completed',
      description: 'Sent when an order status changes to Completed'
    },
    {
      trigger: 'order_status_order_issue',
      name: 'Order Status: Order Issue - Check Email',
      description: 'Sent when an order status changes to Order Issue'
    },
    {
      trigger: 'order_status_cancelled',
      name: 'Order Status: Cancelled',
      description: 'Sent when an order status changes to Cancelled'
    },
    {
      trigger: 'order_cancellation',
      name: 'Order Cancellation',
      description: 'Sent when an order is cancelled by customer or admin'
    }
  ];

  // Admin email notification types
  const adminEmailNotificationTypes = [
    {
      trigger: 'admin_new_order',
      name: 'Admin: New Order',
      description: 'Notify admin when a new order is created'
    }
  ];

  useEffect(() => {
    fetchEmailData();
  }, []);

  const fetchEmailData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📧 ADMIN-EMAIL: Fetching email data...');

      // Fetch templates, settings, and admin settings in parallel
      const [templatesResponse, settingsResponse, adminSettingsResponse] = await Promise.all([
        fetch('/api/admin/email-templates', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/admin/email-settings', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/admin/admin-settings', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ]);

      console.log('📧 ADMIN-EMAIL: API responses:', {
        templatesStatus: templatesResponse.status,
        settingsStatus: settingsResponse.status,
        adminSettingsStatus: adminSettingsResponse.status
      });

      // Handle templates response
      if (!templatesResponse.ok) {
        const templatesError = await templatesResponse.text();
        console.error('📧 ADMIN-EMAIL: Templates API error:', templatesError);
        throw new Error(`Templates API Error (${templatesResponse.status}): ${templatesError}`);
      }

      // Handle settings response
      if (!settingsResponse.ok) {
        const settingsError = await settingsResponse.text();
        console.error('📧 ADMIN-EMAIL: Settings API error:', settingsError);
        throw new Error(`Settings API Error (${settingsResponse.status}): ${settingsError}`);
      }

      // Handle admin settings response
      if (!adminSettingsResponse.ok) {
        const adminSettingsError = await adminSettingsResponse.text();
        console.error('📧 ADMIN-EMAIL: Admin Settings API error:', adminSettingsError);
        throw new Error(`Admin Settings API Error (${adminSettingsResponse.status}): ${adminSettingsError}`);
      }

      const templatesData = await templatesResponse.json();
      const settingsData = await settingsResponse.json();
      const adminSettingsData = await adminSettingsResponse.json();

      console.log('📧 ADMIN-EMAIL: Parsed data:', {
        templatesCount: templatesData.templates?.length || 0,
        settingsCount: settingsData.settings?.length || 0,
        adminSettings: adminSettingsData.settings
      });

      setEmailTemplates(templatesData.templates || []);
      setEmailSettings(settingsData.settings || []);
      setAdminSettings(adminSettingsData.settings || { admin_notification_email: '' });

      console.log('📧 ADMIN-EMAIL: Successfully loaded email data');
    } catch (err: any) {
      console.error('📧 ADMIN-EMAIL: Error fetching email data:', err);
      setError(err.message || err.toString() || 'Failed to load email data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNotificationActive = async (triggerType: string, isActive: boolean) => {
    try {
      console.log('📧 ADMIN-EMAIL: Toggling notification:', { triggerType, isActive });

      const response = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trigger_type: triggerType,
          is_active: isActive
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📧 ADMIN-EMAIL: Toggle error:', errorText);
        throw new Error(`Failed to update notification setting: ${errorText}`);
      }

      const result = await response.json();
      console.log('📧 ADMIN-EMAIL: Toggle successful:', result);

      // Update local state
      setEmailSettings(prev => {
        const updated = prev.map(setting => 
          setting.trigger_type === triggerType 
            ? { ...setting, is_active: isActive }
            : setting
        );
        
        // If setting doesn't exist, add it
        if (!prev.find(s => s.trigger_type === triggerType)) {
          updated.push({
            id: result.setting.id,
            trigger_type: triggerType,
            is_active: isActive,
            template_id: null,
            total_sent: 0,
            created_at: result.setting.created_at,
            updated_at: result.setting.updated_at
          });
        }
        
        return updated;
      });

      // Also update template active status if it exists
      setEmailTemplates(prev => 
        prev.map(template => 
          template.trigger_type === triggerType 
            ? { ...template, is_active: isActive }
            : template
        )
      );

    } catch (err: any) {
      console.error('📧 ADMIN-EMAIL: Error toggling notification:', err);
      setError(err.message || 'Failed to update notification setting');
    }
  };

  const saveAdminEmail = async () => {
    try {
      setAdminEmailSaving(true);
      console.log('📧 ADMIN-EMAIL: Saving admin email:', adminSettings.admin_notification_email);

      const response = await fetch('/api/admin/admin-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_key: 'admin_notification_email',
          setting_value: adminSettings.admin_notification_email
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📧 ADMIN-EMAIL: Save admin email error:', errorText);
        throw new Error(`Failed to save admin email: ${errorText}`);
      }

      const result = await response.json();
      console.log('📧 ADMIN-EMAIL: Admin email saved successfully:', result);

      // Show success message briefly
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
      successMessage.textContent = 'Admin email saved successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);

    } catch (err: any) {
      console.error('📧 ADMIN-EMAIL: Error saving admin email:', err);
      setError(err.message || 'Failed to save admin email');
    } finally {
      setAdminEmailSaving(false);
    }
  };

  const handleTestEmail = async (triggerType: string) => {
    try {
      setTestingEmails(prev => ({ ...prev, [triggerType]: true }));
      setError(null);

      const response = await fetch('/api/admin/tezting-email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          trigger_type: triggerType
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to send test email');
      }

      // Show success message
      const successElement = document.createElement('div');
      successElement.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
      successElement.innerHTML = `
        <div class="flex items-center">
          <span class="mr-2">✅</span>
          <span>${data.message}</span>
        </div>
      `;
      document.body.appendChild(successElement);
      
      // Remove success message after 5 seconds
      setTimeout(() => {
        if (document.body.contains(successElement)) {
          document.body.removeChild(successElement);
        }
      }, 5000);

      console.log('📧 TEST-EMAIL: Successfully sent test email for:', triggerType);
    } catch (err) {
      console.error('Error sending test email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTestingEmails(prev => ({ ...prev, [triggerType]: false }));
    }
  };

  const checkDatabaseTables = async () => {
    try {
      setError(null);
      console.log('🔍 ADMIN-EMAIL: Checking database tables...');

      const response = await fetch('/api/admin/check-email-tables', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to check database tables');
      }

      // Show diagnostic results
      const resultsElement = document.createElement('div');
      resultsElement.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50 max-w-md';
      
      const missingTables = data.summary.missing_tables;
      const allTablesExist = data.summary.all_tables_exist;
      
      resultsElement.innerHTML = `
        <div>
          <h4 class="font-medium mb-2">Database Check Results</h4>
          <div class="text-sm space-y-1">
            <div>email_templates: ${data.tables.email_templates.exists ? '✅' : '❌'} (${data.tables.email_templates.count} records)</div>
            <div>email_notification_settings: ${data.tables.email_notification_settings.exists ? '✅' : '❌'} (${data.tables.email_notification_settings.count} records)</div>
            <div>admin_settings: ${data.tables.admin_settings.exists ? '✅' : '❌'} (${data.tables.admin_settings.count} records)</div>
            ${!allTablesExist ? `<div class="mt-2 text-red-700 font-medium">Missing tables: ${missingTables.join(', ')}</div>` : ''}
          </div>
        </div>
      `;
      document.body.appendChild(resultsElement);
      
      // Remove results after 10 seconds
      setTimeout(() => {
        if (document.body.contains(resultsElement)) {
          document.body.removeChild(resultsElement);
        }
      }, 10000);

      console.log('🔍 ADMIN-EMAIL: Database check completed:', data);

      if (!allTablesExist) {
        setError(`Missing database tables: ${missingTables.join(', ')}. Please run the email system migration.`);
      }

    } catch (err) {
      console.error('Error checking database tables:', err);
      setError(err instanceof Error ? err.message : 'Failed to check database tables');
    }
  };

  const renderTransactionalLoading = () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Loading email data...</span>
    </div>
  );

  const renderTransactionalError = () => (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error Loading Email Data</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={fetchEmailData}
              className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSubTab('transactional')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'transactional'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transactional Emails
          </button>
          <button
            onClick={() => setActiveSubTab('mailerlite')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'mailerlite'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            MailerLite API
          </button>
        </nav>
      </div>

      {activeSubTab === 'mailerlite' ? (
        <AdminMailerLiteManagement />
      ) : isLoading ? (
        renderTransactionalLoading()
      ) : error ? (
        renderTransactionalError()
      ) : (
      <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Email Notifications</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure email notifications for customers and admin alerts.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={checkDatabaseTables}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            Check Database
          </button>
          <button
            onClick={fetchEmailData}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Admin Notifications Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Admin Notifications
          </h3>
          
          {/* Admin Email Configuration */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Admin Notification Email
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              Enter the email address where admin notifications should be sent.
            </p>
            <div className="flex items-center space-x-3">
              <input
                type="email"
                value={adminSettings.admin_notification_email}
                onChange={(e) => setAdminSettings(prev => ({ ...prev, admin_notification_email: e.target.value }))}
                placeholder="admin@example.com"
                className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <button
                onClick={saveAdminEmail}
                disabled={adminEmailSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adminEmailSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Admin Notification Types */}
          <div className="space-y-4">
            {adminEmailNotificationTypes.map((notificationType) => {
              // Find template and setting for this notification type
              const template = emailTemplates.find(t => t.trigger_type === notificationType.trigger);
              const setting = emailSettings.find(s => s.trigger_type === notificationType.trigger);
              
              // Determine if this notification is active
              const isActive = template?.is_active || setting?.is_active || false;
              
              return (
                <div key={notificationType.trigger} className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {notificationType.name}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {notificationType.description}
                    </p>
                    {template && (
                      <p className="text-xs text-gray-400 mt-1">
                        Template: {template.subject}
                      </p>
                    )}
                    {!adminSettings.admin_notification_email && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Admin email not configured
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => toggleNotificationActive(notificationType.trigger, e.target.checked)}
                        disabled={!adminSettings.admin_notification_email}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleTestEmail(notificationType.trigger)}
                      disabled={!template || !adminSettings.admin_notification_email || testingEmails[notificationType.trigger]}
                      className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingEmails[notificationType.trigger] ? 'Sending...' : 'Send Test Email'}
                    </button>
                    
                    <button
                      onClick={() => router.push(`/admin/emails/edit/${notificationType.trigger}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {template ? 'Edit' : 'Create'} Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customer Notifications Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Customer Notifications
          </h3>
          
          <div className="space-y-4">
            {customerEmailNotificationTypes.map((notificationType) => {
              // Find template and setting for this notification type
              const template = emailTemplates.find(t => t.trigger_type === notificationType.trigger);
              const setting = emailSettings.find(s => s.trigger_type === notificationType.trigger);
              
              // Determine if this notification is active
              const isActive = template?.is_active || setting?.is_active || false;
              
              return (
                <div key={notificationType.trigger} className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {notificationType.name}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {notificationType.description}
                    </p>
                    {template && (
                      <p className="text-xs text-gray-400 mt-1">
                        Template: {template.subject}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => toggleNotificationActive(notificationType.trigger, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleTestEmail(notificationType.trigger)}
                      disabled={!template || !adminSettings.admin_notification_email || testingEmails[notificationType.trigger]}
                      className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingEmails[notificationType.trigger] ? 'Sending...' : 'Send Test Email'}
                    </button>
                    
                    <button
                      onClick={() => router.push(`/admin/emails/edit/${notificationType.trigger}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {template ? 'Edit' : 'Create'} Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Debug Information */}
      <div className="bg-gray-50 p-4 rounded-md text-xs text-gray-600">
        <details>
          <summary className="cursor-pointer font-medium">Debug Information</summary>
          <div className="mt-2 space-y-2">
            <div>
              <strong>Templates ({emailTemplates.length}):</strong>
              <pre className="mt-1 text-xs">{JSON.stringify(emailTemplates.map(t => ({ id: t.id, trigger_type: t.trigger_type, is_active: t.is_active })), null, 2)}</pre>
            </div>
            <div>
              <strong>Settings ({emailSettings.length}):</strong>
              <pre className="mt-1 text-xs">{JSON.stringify(emailSettings.map(s => ({ trigger_type: s.trigger_type, is_active: s.is_active, template_id: s.template_id })), null, 2)}</pre>
            </div>
            <div>
              <strong>Admin Settings:</strong>
              <pre className="mt-1 text-xs">{JSON.stringify(adminSettings, null, 2)}</pre>
            </div>
          </div>
        </details>
      </div>
      </>
      )}
    </div>
  );
} 