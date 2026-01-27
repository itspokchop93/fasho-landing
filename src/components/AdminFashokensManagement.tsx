import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// ===== TYPES =====
interface LedgerEntry {
  id: string;
  user_id: string;
  type: 'credit' | 'debit' | 'adjustment_add' | 'adjustment_subtract';
  amount: number;
  reason: string;
  order_id: string | null;
  order_total: number | null;
  balance_before: number;
  balance_after: number;
  created_by: string | null;
  created_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
  order_number?: string;
  admin_email?: string;
}

interface CustomerAccount {
  user_id: string;
  email: string;
  full_name: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  created_at: string;
}

interface LoyaltySettings {
  id: number;
  tokens_per_dollar: number;
  redemption_tokens_per_dollar: number;
  is_program_active: boolean;
  minimum_order_total: number;
  updated_at: string;
  updated_by_email?: string;
}

// ===== SUB-COMPONENTS =====

// Ledger Subtab
function LedgerTab() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.search && { search: filters.search }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });

      const res = await fetch(`/api/admin/fashokens/ledger?${params}`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        setEntries(data.entries);
        setTotalPages(data.totalPages || 1);
      } else {
        setError(data.message || 'Failed to fetch ledger');
      }
    } catch (err) {
      setError('Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [page, filters]);

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'credit':
      case 'adjustment_add':
        return { label: 'IN', color: 'text-green-600 bg-green-100', arrow: '↑' };
      case 'debit':
      case 'adjustment_subtract':
        return { label: 'OUT', color: 'text-red-600 bg-red-100', arrow: '↓' };
      default:
        return { label: type, color: 'text-gray-600 bg-gray-100', arrow: '' };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/admin/fashokens/ledger/export', {
        credentials: 'include'
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fashokens-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Types</option>
              <option value="credit">Credits (Earned)</option>
              <option value="debit">Debits (Spent)</option>
              <option value="adjustment_add">Adjustments (Add)</option>
              <option value="adjustment_subtract">Adjustments (Remove)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Customer name, email, or order #"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No ledger entries found</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => {
                  const typeDisplay = getTypeDisplay(entry.type);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeDisplay.color}`}>
                          {typeDisplay.arrow} {typeDisplay.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          <a 
                            href={`/admin/customer/${encodeURIComponent(entry.user_email || '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            {entry.user_name || 'Unknown'}
                          </a>
                        </div>
                        <div className="text-xs text-gray-500">{entry.user_email}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {entry.order_number ? (
                          <a 
                            href={`/admin/order/${entry.order_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            #{entry.order_number}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {entry.order_total ? `$${entry.order_total.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={entry.reason}>
                        {entry.reason}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.balance_after.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {entry.admin_email || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Balancer Subtab
function BalancerTab() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ amount: '', isAddition: true, reason: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAdjust, setPendingAdjust] = useState<{ customer: CustomerAccount; amount: number; isAddition: boolean; reason: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Bulk credit state
  const [showBulkCredit, setShowBulkCredit] = useState(false);
  const [bulkCreditForm, setBulkCreditForm] = useState({ amount: '', reason: '' });
  const [bulkCreditLoading, setBulkCreditLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search.trim() && { search: search.trim() })
      });

      const res = await fetch(`/api/admin/fashokens/customers?${params}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error('Fetch customers failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCredit = async () => {
    const amount = parseInt(bulkCreditForm.amount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }
    setShowBulkConfirm(true);
  };

  const confirmBulkCredit = async () => {
    const amount = parseInt(bulkCreditForm.amount);
    setBulkCreditLoading(true);
    setShowBulkConfirm(false);

    try {
      const res = await fetch('/api/admin/fashokens/bulk-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          reason: bulkCreditForm.reason
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `${data.message}${data.stats?.failCount > 0 ? ` (${data.stats.failCount} failed)` : ''}`
        });
        setBulkCreditForm({ amount: '', reason: '' });
        setShowBulkCredit(false);
        // Refresh customer list to show updated balances
        fetchCustomers();
      } else {
        setMessage({ type: 'error', text: data.message || 'Bulk credit failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to process bulk credit' });
    } finally {
      setBulkCreditLoading(false);
    }
  };

  // Fetch on initial load
  useEffect(() => {
    fetchCustomers();
  }, [page]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1); // Reset to page 1 on search change
      fetchCustomers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleAdjustSubmit = (customer: CustomerAccount) => {
    const amount = parseInt(adjustForm.amount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }
    // Reason is now optional

    setPendingAdjust({
      customer,
      amount,
      isAddition: adjustForm.isAddition,
      reason: adjustForm.reason // Can be empty
    });
    setShowConfirm(true);
  };

  const confirmAdjustment = async () => {
    if (!pendingAdjust) return;

    try {
      const res = await fetch('/api/admin/fashokens/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: pendingAdjust.customer.user_id,
          amount: pendingAdjust.amount,
          isAddition: pendingAdjust.isAddition,
          reason: pendingAdjust.reason
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Successfully ${pendingAdjust.isAddition ? 'added' : 'removed'} ${pendingAdjust.amount.toLocaleString()} FASHOKENS` });
        // Update local state
        setCustomers(customers.map(c => 
          c.user_id === pendingAdjust.customer.user_id 
            ? { ...c, balance: data.newBalance }
            : c
        ));
        setAdjusting(null);
        setAdjustForm({ amount: '', isAddition: true, reason: '' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Adjustment failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to process adjustment' });
    } finally {
      setShowConfirm(false);
      setPendingAdjust(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Credit Section */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg shadow-sm border border-amber-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/fashoken.png" alt="FASHOKEN" className="w-8 h-8" />
            <div>
              <h3 className="font-semibold text-amber-800">Credit All Customers</h3>
              <p className="text-sm text-amber-600">Add FASHOKENS to all {totalCount > 0 ? totalCount.toLocaleString() : ''} customer accounts at once</p>
            </div>
          </div>
          <button
            onClick={() => setShowBulkCredit(!showBulkCredit)}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center space-x-2"
          >
            <span>{showBulkCredit ? 'Cancel' : 'Bulk Credit'}</span>
            <svg className={`w-4 h-4 transition-transform ${showBulkCredit ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showBulkCredit && (
          <div className="mt-4 pt-4 border-t border-amber-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Amount per Customer</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={bulkCreditForm.amount}
                  onChange={(e) => setBulkCreditForm({ ...bulkCreditForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Holiday Bonus"
                  value={bulkCreditForm.reason}
                  onChange={(e) => setBulkCreditForm({ ...bulkCreditForm, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleBulkCredit}
                  disabled={bulkCreditLoading || !bulkCreditForm.amount}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {bulkCreditLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Credit All Customers</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {bulkCreditForm.amount && parseInt(bulkCreditForm.amount) > 0 && totalCount > 0 && (
              <p className="mt-3 text-sm text-amber-700">
                This will credit <strong>{parseInt(bulkCreditForm.amount).toLocaleString()} FASHOKENS</strong> to each of <strong>{totalCount.toLocaleString()} customers</strong> (Total: {(parseInt(bulkCreditForm.amount) * totalCount).toLocaleString()} tokens)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Search Customers</label>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right text-gray-500 hover:text-gray-700">×</button>
        </div>
      )}

      {/* Results - Scrolling Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ maxHeight: '70vh' }}>
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(70vh - 60px)' }}>
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading customers...</div>
          ) : customers.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {search ? 'No customers found matching your search' : 'No customers found'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((customer) => (
                <div key={customer.user_id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <a 
                    href={`/admin/customer/${encodeURIComponent(customer.email)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {customer.full_name || 'Unknown'}
                  </a>
                  <p className="text-sm text-gray-500">{customer.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <img src="/fashoken.png" alt="FASHOKEN" className="w-7 h-7" />
                <span className="text-2xl font-bold text-amber-600">{customer.balance.toLocaleString()}</span>
                <span className="text-gray-500">FASHOKENS</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-4">
                <div>
                  <span className="block text-xs text-gray-400">Lifetime Earned</span>
                  <span className="font-medium text-green-600">{customer.lifetime_earned.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400">Lifetime Spent</span>
                  <span className="font-medium text-red-600">{customer.lifetime_spent.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                {customer.user_id && adjusting === customer.user_id ? (
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={adjustForm.amount}
                        onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                      />
                      <select
                        value={adjustForm.isAddition ? 'add' : 'remove'}
                        onChange={(e) => setAdjustForm({ ...adjustForm, isAddition: e.target.value === 'add' })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="add">Add</option>
                        <option value="remove">Remove</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAdjustSubmit(customer)}
                        className="flex-1 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setAdjusting(null);
                          setAdjustForm({ amount: '', isAddition: true, reason: '' });
                        }}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    {customer.user_id ? (
                      <>
                        <button
                          onClick={() => setAdjusting(customer.user_id)}
                          className="flex-1 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                        >
                          Adjust Balance
                        </button>
                        <a
                          href={`/admin?p=fashokens-ledger&user=${customer.user_id}`}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                        >
                          History
                        </a>
                      </>
                    ) : (
                      <div className="flex-1 px-3 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm text-center" title="Guest customer - no account to adjust">
                        Guest (No Account)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && pendingAdjust && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Adjustment</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to <span className={pendingAdjust.isAddition ? 'text-green-600' : 'text-red-600'}>
                {pendingAdjust.isAddition ? 'add' : 'remove'} {pendingAdjust.amount.toLocaleString()} FASHOKENS
              </span> {pendingAdjust.isAddition ? 'to' : 'from'} <strong>{pendingAdjust.customer.full_name || pendingAdjust.customer.email}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">Reason: {pendingAdjust.reason || 'Admin'}</p>
            <div className="flex space-x-3">
              <button
                onClick={confirmAdjustment}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPendingAdjust(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Credit Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <img src="/fashoken.png" alt="FASHOKEN" className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold">Confirm Bulk Credit</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 font-medium">
                You are about to credit <span className="text-green-600">{parseInt(bulkCreditForm.amount).toLocaleString()} FASHOKENS</span> to <strong>ALL {totalCount.toLocaleString()} customers</strong>
              </p>
              <p className="text-amber-600 text-sm mt-1">
                Total tokens to be distributed: <strong>{(parseInt(bulkCreditForm.amount) * totalCount).toLocaleString()}</strong>
              </p>
            </div>
            {bulkCreditForm.reason && (
              <p className="text-sm text-gray-500 mb-4">Reason: Admin - {bulkCreditForm.reason}</p>
            )}
            <p className="text-sm text-red-600 mb-6">
              ⚠️ This action cannot be undone. Please verify the amount before proceeding.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmBulkCredit}
                disabled={bulkCreditLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {bulkCreditLoading ? 'Processing...' : 'Yes, Credit All'}
              </button>
              <button
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkCreditLoading}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Subtab
function SettingsTab() {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/fashokens/settings', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const res = await fetch('/api/admin/fashokens/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setSettings(data.settings);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="text-center py-8 text-red-500">Failed to load settings</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ touchAction: 'pan-y' }}>
        <h3 className="text-lg font-semibold mb-6">FASHOKENS Program Settings</h3>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right text-gray-500 hover:text-gray-700">×</button>
          </div>
        )}

        <div className="space-y-6">
          {/* Earning Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Earning Rate</label>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span className="text-gray-600">Customers earn</span>
              <input
                type="number"
                value={settings.tokens_per_dollar}
                onChange={(e) => setSettings({ ...settings, tokens_per_dollar: parseInt(e.target.value) || 0 })}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-center"
              />
              <span className="text-gray-600">FASHOKENS per $1.00 spent</span>
            </div>
          </div>

          {/* Redemption Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Redemption Rate (Token Value)</label>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <input
                type="number"
                value={settings.redemption_tokens_per_dollar}
                onChange={(e) => setSettings({ ...settings, redemption_tokens_per_dollar: parseInt(e.target.value) || 0 })}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-center"
              />
              <span className="text-gray-600">FASHOKENS = $1.00 discount</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              With this rate: <span className="font-medium text-amber-600">100 FASHOKENS = ${(100 / settings.redemption_tokens_per_dollar).toFixed(2)} discount</span>
            </p>
          </div>

          {/* Minimum Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order Total</label>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span className="text-gray-600">Orders cannot go below $</span>
              <input
                type="number"
                step="0.01"
                value={settings.minimum_order_total}
                onChange={(e) => setSettings({ ...settings, minimum_order_total: parseFloat(e.target.value) || 0 })}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-center"
              />
              <span className="text-gray-600">after discounts</span>
            </div>
          </div>

          {/* Program Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Program Status</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={settings.is_program_active}
                  onChange={() => setSettings({ ...settings, is_program_active: true })}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-green-600 font-medium">Active</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!settings.is_program_active}
                  onChange={() => setSettings({ ...settings, is_program_active: false })}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-red-600 font-medium">Inactive</span>
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              When inactive, the loyalty program is completely disabled — no earning, no redemption.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={saving}
            className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {settings.updated_at && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              Last updated: {new Date(settings.updated_at).toLocaleString()}
              {settings.updated_by_email && ` by ${settings.updated_by_email}`}
            </p>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Changes</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to save these loyalty program settings? Changes will take effect immediately.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function AdminFashokensManagement() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'balancer' | 'settings'>('ledger');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('p');
    
    if (page === 'fashokens-balancer') {
      setActiveSubTab('balancer');
    } else if (page === 'fashokens-settings') {
      setActiveSubTab('settings');
    } else {
      setActiveSubTab('ledger');
    }
  }, [router.query]);

  const handleSubTabChange = (tab: 'ledger' | 'balancer' | 'settings') => {
    setActiveSubTab(tab);
    const pageName = tab === 'ledger' ? 'fashokens' : `fashokens-${tab}`;
    router.replace(`/admin?p=${pageName}`, undefined, { shallow: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3">
          <img src="/fashoken.png" alt="FASHOKEN" className="w-12 h-12" />
          <div>
            <h1 className="text-2xl font-bold">FASHOKENS Loyalty Program</h1>
            <p className="text-white/80">Manage customer loyalty tokens, view activity, and configure settings</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => handleSubTabChange('ledger')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'ledger'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📜 Loyalty Ledger
            </button>
            <button
              onClick={() => handleSubTabChange('balancer')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'balancer'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚖️ Fashoken Balancer
            </button>
            <button
              onClick={() => handleSubTabChange('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === 'settings'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Sub-tab Content */}
      <div className="min-h-[500px]">
        {activeSubTab === 'ledger' && <LedgerTab />}
        {activeSubTab === 'balancer' && <BalancerTab />}
        {activeSubTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
