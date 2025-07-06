import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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

export default function AdminEmailManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailNotificationSetting[]>([]);

  // Email notification types
  const emailNotificationTypes = [
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

      // Fetch templates and settings in parallel
      const [templatesResponse, settingsResponse] = await Promise.all([
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
        })
      ]);

      console.log('📧 ADMIN-EMAIL: API responses:', {
        templatesStatus: templatesResponse.status,
        settingsStatus: settingsResponse.status
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

      const templatesData = await templatesResponse.json();
      const settingsData = await settingsResponse.json();

      console.log('📧 ADMIN-EMAIL: Parsed data:', {
        templatesCount: templatesData.templates?.length || 0,
        settingsCount: settingsData.settings?.length || 0,
        templatesData: templatesData.templates?.map((t: any) => ({ id: t.id, trigger_type: t.trigger_type, is_active: t.is_active })),
        settingsData: settingsData.settings?.map((s: any) => ({ trigger_type: s.trigger_type, is_active: s.is_active }))
      });

      setEmailTemplates(templatesData.templates || []);
      setEmailSettings(settingsData.settings || []);

      console.log('📧 ADMIN-EMAIL: Successfully loaded email data');
    } catch (err: any) {
      console.error('📧 ADMIN-EMAIL: Error fetching email data:', err);
      setError(err.message || 'Failed to load email data');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading email data...</span>
      </div>
    );
  }

  if (error) {
    return (
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
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Email Notifications</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure email notifications for different order status changes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={fetchEmailData}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Email Notification Settings
          </h3>
          
          <div className="space-y-4">
            {emailNotificationTypes.map((notificationType) => {
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
          </div>
        </details>
      </div>
    </div>
  );
} 