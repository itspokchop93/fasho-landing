import React, { useState, useEffect, useCallback } from 'react';

interface MailerLiteGroup {
  id: string;
  name: string;
  active_count: number;
  sent_count: number;
  opens_count: number;
  open_rate: { float: number; string: string };
  clicks_count: number;
  click_rate: { float: number; string: string };
  unsubscribed_count: number;
  unconfirmed_count: number;
  bounced_count: number;
  junk_count: number;
  created_at: string;
  is_selected: boolean;
}

interface SyncHistoryEntry {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  zip: string | null;
  source: string;
  group_ids: string[] | null;
  group_names: string[] | null;
  status: string;
  status_code: number | null;
  error_message: string | null;
  mailerlite_subscriber_id: string | null;
  created_at: string;
}

export default function AdminMailerLiteManagement() {
  const [groups, setGroups] = useState<MailerLiteGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [togglingGroups, setTogglingGroups] = useState<Set<string>>(new Set());

  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [testZip, setTestZip] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<{ success: boolean; message: string } | null>(null);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const res = await fetch('/api/admin/mailerlite-groups', {
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (err: any) {
      setGroupsError(err.message || 'Failed to fetch groups');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/mailerlite-history?page=${page}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        console.error('fetchHistory: HTTP', res.status);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.error('fetchHistory: non-JSON response');
        return;
      }
      const data = await res.json();
      setHistory(data.history || []);
      setHistoryTotalPages(data.totalPages || 1);
      setHistoryTotal(data.total || 0);
      setHistoryPage(page);
    } catch (err: any) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchHistory(1);
  }, [fetchGroups, fetchHistory]);

  const toggleGroup = async (group: MailerLiteGroup) => {
    const newSelected = !group.is_selected;
    setTogglingGroups(prev => new Set(prev).add(group.id));

    try {
      const res = await fetch('/api/admin/mailerlite-config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: group.id,
          group_name: group.name,
          is_active: newSelected,
        }),
      });

      if (!res.ok) throw new Error('Failed to update group config');

      setGroups(prev =>
        prev.map(g => (g.id === group.id ? { ...g, is_selected: newSelected } : g))
      );
    } catch (err: any) {
      console.error('Error toggling group:', err);
    } finally {
      setTogglingGroups(prev => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });
    }
  };

  const handleTestPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    setTestLoading(true);
    setTestResponse(null);

    try {
      console.log('📬 TEST-PUSH: Sending test push...', { email: testEmail, name: testName, zip: testZip });

      const res = await fetch('/api/admin/mailerlite-test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          name: testName,
          zip: testZip,
        }),
      });

      console.log('📬 TEST-PUSH: Response status:', res.status, res.statusText);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textBody = await res.text();
        console.error('📬 TEST-PUSH: Non-JSON response:', textBody.substring(0, 500));
        setTestResponse({
          success: false,
          message: `Server returned non-JSON response (HTTP ${res.status}). Check terminal for details.`,
        });
        fetchHistory(1);
        return;
      }

      const data = await res.json();
      console.log('📬 TEST-PUSH: Response data:', data);

      if (data.success) {
        setTestResponse({
          success: true,
          message: `Subscriber pushed successfully (ID: ${data.subscriberId || 'N/A'}, HTTP ${data.statusCode})`,
        });
      } else {
        setTestResponse({
          success: false,
          message: data.errorMessage || data.error || 'Push failed',
        });
      }

      fetchHistory(1);
    } catch (err: any) {
      console.error('📬 TEST-PUSH: Exception:', err);
      setTestResponse({
        success: false,
        message: err.message || 'Network error',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: MailerLite Groups */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">MailerLite Groups</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select which groups new subscribers should be added to.
            </p>
          </div>
          <button
            onClick={fetchGroups}
            disabled={groupsLoading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refresh groups"
          >
            <svg
              className={`h-5 w-5 ${groupsLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
          {groupsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-sm text-gray-500">Fetching groups from MailerLite...</span>
            </div>
          ) : groupsError ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 mb-2">{groupsError}</p>
              <button
                onClick={fetchGroups}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Retry
              </button>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No groups found in your MailerLite account.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map(group => (
                <label
                  key={group.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={group.is_selected}
                      onChange={() => toggleGroup(group)}
                      disabled={togglingGroups.has(group.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">{group.name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {group.active_count} active subscriber{group.active_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {togglingGroups.has(group.id) && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: MailerLite Push History */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">MailerLite Push History</h3>
            <p className="mt-1 text-sm text-gray-500">
              Ledger of all subscriber pushes to MailerLite ({historyTotal} total).
            </p>
          </div>
          <button
            onClick={() => fetchHistory(historyPage)}
            disabled={historyLoading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refresh history"
          >
            <svg
              className={`h-5 w-5 ${historyLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="border-t border-gray-200">
          {historyLoading && history.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-sm text-gray-500">Loading history...</span>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No push history yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto" style={{ maxHeight: '540px', overflowY: 'auto' }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group(s)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(entry.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {entry.full_name || `${entry.first_name || ''} ${entry.last_name || ''}`.trim() || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {entry.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {(entry.group_names || []).map((gn, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                              >
                                {gn}
                              </span>
                            ))}
                            {(!entry.group_names || entry.group_names.length === 0) && '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {entry.status === 'success' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Success
                            </span>
                          ) : (
                            <span className="relative group inline-flex items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-help">
                                Failed
                              </span>
                              {entry.error_message && (
                                <span className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                  {entry.error_message}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination - outside the scroll container */}
              {historyTotalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage <= 1 || historyLoading}
                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: historyTotalPages }, (_, i) => i + 1)
                    .filter(p => {
                      if (historyTotalPages <= 7) return true;
                      if (p === 1 || p === historyTotalPages) return true;
                      return Math.abs(p - historyPage) <= 1;
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push('ellipsis');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400">
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => fetchHistory(item as number)}
                          disabled={historyLoading}
                          className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                            historyPage === item
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage >= historyTotalPages || historyLoading}
                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Section 3: MailerLite API Test Entry */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">MailerLite API Test Entry</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manually push a subscriber to the selected MailerLite group(s).
          </p>
        </div>

        <div className="border-t border-gray-200 px-4 py-4 sm:px-6 space-y-4">
          {/* Response Box */}
          {testResponse && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                testResponse.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-2">{testResponse.success ? '✅' : '❌'}</span>
                <span className="font-medium">{testResponse.success ? 'Success' : 'Failed'}:</span>
                <span className="ml-1">{testResponse.message}</span>
              </div>
            </div>
          )}

          {/* Test Form */}
          <form onSubmit={handleTestPush} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ml-test-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="ml-test-email"
                  type="email"
                  required
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="ml-test-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="ml-test-name"
                  type="text"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="ml-test-zip" className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  id="ml-test-zip"
                  type="text"
                  value={testZip}
                  onChange={e => setTestZip(e.target.value)}
                  placeholder="90210"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Pushes to:{' '}
                {groups.filter(g => g.is_selected).length > 0
                  ? groups
                      .filter(g => g.is_selected)
                      .map(g => g.name)
                      .join(', ')
                  : 'No groups selected'}
              </p>
              <button
                type="submit"
                disabled={testLoading || !testEmail}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Pushing...
                  </>
                ) : (
                  'PUSH'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
