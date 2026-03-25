import React, { useState, useEffect, useCallback } from 'react';
import BlacklistConfirmModal from './BlacklistConfirmModal';

interface BlacklistEntry {
  id: string;
  customer_name: string;
  customer_email: string;
  reason: string;
  blacklisted_by: string;
  source_order_id: string | null;
  associated_order_numbers: string[];
  metadata: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  identifier_count: number;
  blocked_attempts_count: number;
  last_blocked_at: string | null;
}

interface LogEntry {
  id: string;
  blacklist_id: string;
  matched_types: string[];
  matched_values: string[];
  attempted_email: string | null;
  attempted_name: string | null;
  attempted_phone: string | null;
  attempted_ip: string | null;
  attempted_fingerprint: string | null;
  attempted_billing_hash: string | null;
  attempted_spotify_artist: string | null;
  attempted_spotify_tracks: string[];
  user_agent: string | null;
  created_at: string;
  blacklisted_customer_name: string;
  blacklisted_customer_email: string;
}

export default function AdminBlacklistedManagement() {
  // Settings
  const [blacklistMessage, setBlacklistMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);

  // Entries table
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const ENTRIES_PER_PAGE = 20;

  // Expanded entry (per-entry logs)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [entryLogs, setEntryLogs] = useState<LogEntry[]>([]);
  const [loadingEntryLogs, setLoadingEntryLogs] = useState(false);
  const [entryLogPage, setEntryLogPage] = useState(1);
  const [entryLogTotal, setEntryLogTotal] = useState(0);

  // Activity feed
  const [activityLogs, setActivityLogs] = useState<LogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const ACTIVITY_PER_PAGE = 20;

  // Detail modal (view blacklist record)
  const [detailEntry, setDetailEntry] = useState<BlacklistEntry | null>(null);

  // Backfill
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState('');

  // Un-blacklist modal
  const [unblacklistEntry, setUnblacklistEntry] = useState<BlacklistEntry | null>(null);
  const [unblacklisting, setUnblacklisting] = useState(false);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/admin-settings', { credentials: 'include' });
      const data = await res.json();
      if (data.settings?.blacklist_message) {
        setBlacklistMessage(data.settings.blacklist_message);
      }
    } catch (err) {
      console.error('Failed to fetch blacklist settings:', err);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ENTRIES_PER_PAGE.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/blacklist?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setTotalEntries(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch blacklist entries:', err);
    } finally {
      setLoadingEntries(false);
    }
  }, [page, search]);

  const fetchActivityLogs = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/admin/blacklist/logs?page=${activityPage}&limit=${ACTIVITY_PER_PAGE}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setActivityLogs(data.logs || []);
        setActivityTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoadingActivity(false);
    }
  }, [activityPage]);

  const fetchEntryLogs = useCallback(async (blacklistId: string, logPage: number = 1) => {
    setLoadingEntryLogs(true);
    try {
      const res = await fetch(`/api/admin/blacklist/logs?blacklist_id=${blacklistId}&page=${logPage}&limit=10`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setEntryLogs(data.logs || []);
        setEntryLogTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch entry logs:', err);
    } finally {
      setLoadingEntryLogs(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchActivityLogs(); }, [fetchActivityLogs]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSaveMessage = async () => {
    setSavingMessage(true);
    setMessageSuccess(false);
    try {
      const res = await fetch('/api/admin/admin-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: 'blacklist_message', setting_value: blacklistMessage }),
      });
      if (res.ok) setMessageSuccess(true);
    } catch (err) {
      console.error('Failed to save blacklist message:', err);
    } finally {
      setSavingMessage(false);
      setTimeout(() => setMessageSuccess(false), 3000);
    }
  };

  const handleToggleExpand = (entry: BlacklistEntry) => {
    if (expandedEntryId === entry.id) {
      setExpandedEntryId(null);
      setEntryLogs([]);
    } else {
      setExpandedEntryId(entry.id);
      setEntryLogPage(1);
      fetchEntryLogs(entry.id, 1);
    }
  };

  const handleUnblacklist = async (reason: string) => {
    if (!unblacklistEntry) return;
    setUnblacklisting(true);
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: unblacklistEntry.id, is_active: false }),
      });
      if (res.ok) {
        setUnblacklistEntry(null);
        fetchEntries();
        fetchActivityLogs();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to un-blacklist');
      }
    } catch (err) {
      console.error('Failed to un-blacklist:', err);
    } finally {
      setUnblacklisting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEntries();
  };

  const totalPages = Math.ceil(totalEntries / ENTRIES_PER_PAGE);
  const activityTotalPages = Math.ceil(activityTotal / ACTIVITY_PER_PAGE);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Section 1: Settings Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Blacklist Message</h3>
        <p className="text-xs text-gray-500 mb-3">
          This message is shown to blocked users at checkout. Changes take effect immediately.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={blacklistMessage}
            onChange={(e) => setBlacklistMessage(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Error message shown to blacklisted users..."
          />
          <button
            onClick={handleSaveMessage}
            disabled={savingMessage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {savingMessage ? 'Saving...' : messageSuccess ? 'Saved!' : 'Save'}
          </button>
        </div>
        {/* One-time backfill for street_address identifiers */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={async () => {
              setBackfillRunning(true);
              setBackfillResult('');
              try {
                const res = await fetch('/api/admin/blacklist', { method: 'PATCH', credentials: 'include' });
                const data = await res.json();
                setBackfillResult(data.message || 'Done');
                fetchEntries();
              } catch {
                setBackfillResult('Error running backfill');
              } finally {
                setBackfillRunning(false);
              }
            }}
            disabled={backfillRunning}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {backfillRunning ? 'Running...' : 'Backfill Street Address Identifiers'}
          </button>
          {backfillResult && <span className="text-xs text-green-600">{backfillResult}</span>}
          <span className="text-xs text-gray-400">Run once to add street address matching for existing entries</span>
        </div>
      </div>

      {/* Section 2: Blacklisted Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Blacklisted Customers
              {totalEntries > 0 && <span className="text-sm font-normal text-gray-500 ml-2">({totalEntries})</span>}
            </h3>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="border border-gray-300 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
              <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm">
                Search
              </button>
            </form>
          </div>
        </div>

        {loadingEntries ? (
          <div className="p-12 text-center text-gray-500">Loading blacklist entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {search ? 'No blacklist entries match your search.' : 'No customers have been blacklisted yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Reason</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Blacklisted By</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Orders</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Blocks</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <tr
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expandedEntryId === entry.id ? 'bg-indigo-50/50' : ''}`}
                      onClick={() => setDetailEntry(entry)}
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{entry.customer_name}</p>
                        <p className="text-gray-500 text-xs">{entry.customer_email}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-700 truncate max-w-[200px]">{entry.reason}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{entry.blacklisted_by}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{entry.associated_order_numbers?.length || 0}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${entry.blocked_attempts_count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {entry.blocked_attempts_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.is_active
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {entry.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleExpand(entry)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                          >
                            {expandedEntryId === entry.id ? 'Close' : 'View Logs'}
                          </button>
                          {entry.is_active && (
                            <button
                              onClick={() => setUnblacklistEntry(entry)}
                              className="text-green-600 hover:text-green-800 text-xs font-medium"
                            >
                              Un-blacklist
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded entry logs */}
                    {expandedEntryId === entry.id && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 px-4 py-4">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700">
                              Blocked Attempt Logs ({entryLogTotal})
                            </h4>
                            {loadingEntryLogs ? (
                              <p className="text-gray-500 text-xs">Loading logs...</p>
                            ) : entryLogs.length === 0 ? (
                              <p className="text-gray-400 text-xs">No blocked attempts recorded yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {entryLogs.map((log) => (
                                  <LogItem key={log.id} log={log} />
                                ))}
                                {entryLogTotal > 10 && (
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={() => { const np = entryLogPage - 1; setEntryLogPage(np); fetchEntryLogs(entry.id, np); }}
                                      disabled={entryLogPage <= 1}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                                    >
                                      Previous
                                    </button>
                                    <span className="text-xs text-gray-500">Page {entryLogPage}</span>
                                    <button
                                      onClick={() => { const np = entryLogPage + 1; setEntryLogPage(np); fetchEntryLogs(entry.id, np); }}
                                      disabled={entryLogPage * 10 >= entryLogTotal}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                                    >
                                      Next
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * ENTRIES_PER_PAGE + 1}–{Math.min(page * ENTRIES_PER_PAGE, totalEntries)} of {totalEntries}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Activity Feed */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Blacklist Activity Feed
            {activityTotal > 0 && <span className="text-sm font-normal text-gray-500 ml-2">({activityTotal} total events)</span>}
          </h3>
          <p className="text-xs text-gray-500 mt-1">All blocked checkout attempts across all blacklist entries, newest first.</p>
        </div>

        {loadingActivity ? (
          <div className="p-12 text-center text-gray-500">Loading activity feed...</div>
        ) : activityLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No blocked attempts recorded yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <LogItem log={log} showCustomer />
              </div>
            ))}
          </div>
        )}

        {activityTotalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {activityPage} of {activityTotalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setActivityPage(p => Math.max(1, p - 1))} disabled={activityPage <= 1} className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                Previous
              </button>
              <button onClick={() => setActivityPage(p => p + 1)} disabled={activityPage >= activityTotalPages} className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Blacklist detail modal */}
      {detailEntry && (
        <BlacklistDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
        />
      )}

      {/* Un-blacklist modal */}
      {unblacklistEntry && (
        <BlacklistConfirmModal
          isOpen={true}
          onClose={() => setUnblacklistEntry(null)}
          onConfirm={handleUnblacklist}
          mode="unblacklist"
          customerData={{
            customerName: unblacklistEntry.customer_name,
            customerEmail: unblacklistEntry.customer_email,
            orderNumbers: unblacklistEntry.associated_order_numbers || [],
            phoneNumber: unblacklistEntry.metadata?.phoneNumber,
            billingAddress: unblacklistEntry.metadata?.billingAddress,
            spotifyArtistUrls: unblacklistEntry.metadata?.spotifyArtistUrls,
            spotifyTrackUrls: unblacklistEntry.metadata?.spotifyTrackUrls,
            cardInfo: unblacklistEntry.metadata?.cardInfo,
            userId: unblacklistEntry.metadata?.userId,
          }}
          isLoading={unblacklisting}
        />
      )}
    </div>
  );
}

function BlacklistDetailModal({ entry, onClose }: { entry: BlacklistEntry; onClose: () => void }) {
  const meta = entry.metadata || {};

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleBackdrop}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Blacklist Record</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {entry.is_active
                ? <span className="text-red-600 font-medium">Active</span>
                : <span className="text-gray-400">Inactive</span>
              }
              {' '}&mdash; Created {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Core info */}
          <DetailRow label="Name" value={entry.customer_name} />
          <DetailRow label="Email" value={entry.customer_email} />
          <DetailRow label="Reason" value={entry.reason} />
          <DetailRow label="Blacklisted By" value={entry.blacklisted_by} />

          {/* Phone */}
          {meta.phoneNumber && <DetailRow label="Phone" value={meta.phoneNumber} />}

          {/* User ID */}
          {meta.userId && <DetailRow label="User ID" value={meta.userId} mono />}

          {/* Billing Address */}
          {meta.billingAddress && <DetailRow label="Billing Address" value={meta.billingAddress} />}

          {/* Card Info */}
          {meta.cardInfo && <DetailRow label="Card" value={meta.cardInfo} />}

          {/* Order Numbers */}
          {entry.associated_order_numbers && entry.associated_order_numbers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Order Numbers</p>
              <div className="flex flex-wrap gap-1.5">
                {entry.associated_order_numbers.map((num) => (
                  <span key={num} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">{num}</span>
                ))}
              </div>
            </div>
          )}

          {/* Source Order */}
          {entry.source_order_id && <DetailRow label="Source Order ID" value={entry.source_order_id} mono />}

          {/* Spotify Artist URLs */}
          {meta.spotifyArtistUrls && meta.spotifyArtistUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Spotify Artist Links</p>
              <div className="space-y-1">
                {meta.spotifyArtistUrls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:text-indigo-800 text-xs truncate font-mono">{url}</a>
                ))}
              </div>
            </div>
          )}

          {/* Spotify Track URLs */}
          {meta.spotifyTrackUrls && meta.spotifyTrackUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Spotify Track URLs</p>
              <div className="space-y-1">
                {meta.spotifyTrackUrls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:text-indigo-800 text-xs truncate font-mono">{url}</a>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="border-t border-gray-200 pt-4 mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Blocked Attempts</p>
              <p className={`text-sm font-semibold ${entry.blocked_attempts_count > 0 ? 'text-red-600' : 'text-gray-400'}`}>{entry.blocked_attempts_count}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Blocked</p>
              <p className="text-sm font-medium text-gray-700">
                {entry.last_blocked_at
                  ? new Date(entry.last_blocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Identifier Count</p>
              <p className="text-sm font-medium text-gray-700">{entry.identifier_count}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Updated</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(entry.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''} break-all`}>{value}</p>
    </div>
  );
}

function LogItem({ log, showCustomer }: { log: LogEntry; showCustomer?: boolean }) {
  const date = new Date(log.created_at);
  const timeStr = date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return (
    <div className="text-xs space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            Blocked
          </span>
          {showCustomer && (
            <span className="text-gray-600 ml-1">
              &mdash; matched <span className="font-medium text-gray-800">{log.blacklisted_customer_name}</span> ({log.blacklisted_customer_email})
            </span>
          )}
        </div>
        <span className="text-gray-400 whitespace-nowrap">{timeStr}</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
        {log.attempted_email && <span>Email: <span className="text-gray-700">{log.attempted_email}</span></span>}
        {log.attempted_ip && <span>IP: <span className="text-gray-700 font-mono">{log.attempted_ip}</span></span>}
        {log.attempted_phone && <span>Phone: <span className="text-gray-700">{log.attempted_phone}</span></span>}
        {log.attempted_fingerprint && <span>FP: <span className="text-gray-700 font-mono">{log.attempted_fingerprint.slice(0, 12)}...</span></span>}
      </div>

      {log.matched_types && log.matched_types.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {log.matched_types.map((type, i) => (
            <span key={i} className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
              {type.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}

      {log.user_agent && (
        <p className="text-gray-400 truncate max-w-[500px]">UA: {log.user_agent}</p>
      )}
    </div>
  );
}
