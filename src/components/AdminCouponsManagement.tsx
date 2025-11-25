import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface CouponCode {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  current_usage: number;
  is_active: boolean;
  starts_at: string;
  expires_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function AdminCouponsManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for creating/editing coupons
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'flat',
    discount_value: '',
    min_order_amount: '0',
    max_discount_amount: '',
    usage_limit: '',
    is_active: true,
    expires_at: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🎫 ADMIN-COUPONS: Fetching coupons...');

      const response = await fetch('/api/admin/coupons', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch coupons');
      }

      const data = await response.json();
      setCoupons(data.coupons || []);

      console.log('🎫 ADMIN-COUPONS: Successfully loaded coupons:', data.coupons?.length || 0);
    } catch (err: any) {
      console.error('🎫 ADMIN-COUPONS: Error fetching coupons:', err);
      setError(err.message || err.toString() || 'Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '0',
      max_discount_amount: '',
      usage_limit: '',
      is_active: true,
      expires_at: ''
    });
  };

  const handleCreateNew = () => {
    resetForm();
    setEditingCoupon(null);
    setShowCreateModal(true);
  };

  const handleEdit = (coupon: CouponCode) => {
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order_amount: coupon.min_order_amount.toString(),
      max_discount_amount: coupon.max_discount_amount?.toString() || '',
      usage_limit: coupon.usage_limit?.toString() || '',
      is_active: coupon.is_active,
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : ''
    });
    setEditingCoupon(coupon);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!formData.code || !formData.name || !formData.discount_value) {
        throw new Error('Code, name, and discount value are required');
      }

      const discountValue = parseFloat(formData.discount_value);
      if (isNaN(discountValue) || discountValue <= 0) {
        throw new Error('Discount value must be a positive number');
      }

      if (formData.discount_type === 'percentage' && discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }

      // Prepare data
      // For expiry date, set to end of day (11:59:59 PM PST) to ensure
      // the coupon is valid for the entire selected date
      let expiresAt = null;
      if (formData.expires_at) {
        // Parse the date string (YYYY-MM-DD format from date input)
        const [year, month, day] = formData.expires_at.split('-').map(Number);
        // Create date at 11:59:59 PM PST (which is 07:59:59 UTC next day or 08:59:59 during DST)
        // Using 23:59:59 in the selected timezone by setting end of day UTC
        const expiryDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        expiresAt = expiryDate.toISOString();
      }

      const submitData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        discount_type: formData.discount_type,
        discount_value: discountValue,
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_active: formData.is_active,
        expires_at: expiresAt
      };

      // Add ID for updates
      if (editingCoupon) {
        (submitData as any).id = editingCoupon.id;
      }

      const method = editingCoupon ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/coupons', {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || `Failed to ${editingCoupon ? 'update' : 'create'} coupon`);
      }

      const data = await response.json();
      console.log('🎫 ADMIN-COUPONS: Successfully saved coupon:', data.coupon);

      // Show success message
      const successElement = document.createElement('div');
      successElement.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
      successElement.innerHTML = `
        <div class="flex items-center">
          <span class="mr-2">✅</span>
          <span>Coupon ${editingCoupon ? 'updated' : 'created'} successfully!</span>
        </div>
      `;
      document.body.appendChild(successElement);
      
      setTimeout(() => {
        if (document.body.contains(successElement)) {
          document.body.removeChild(successElement);
        }
      }, 5000);

      // Refresh coupons list
      await fetchCoupons();
      
      // Close modal
      setShowCreateModal(false);
      setEditingCoupon(null);

    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setError(err.message || 'Failed to save coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: CouponCode) => {
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: coupon.id,
          is_active: !coupon.is_active
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to update coupon');
      }

      await fetchCoupons();
    } catch (err: any) {
      console.error('Error toggling coupon status:', err);
      setError(err.message || 'Failed to update coupon status');
    }
  };

  const handleDelete = async (coupon: CouponCode) => {
    if (!confirm(`Are you sure you want to delete the coupon "${coupon.code}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: coupon.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to delete coupon');
      }

      await fetchCoupons();

      // Show success message
      const successElement = document.createElement('div');
      successElement.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
      successElement.innerHTML = `
        <div class="flex items-center">
          <span class="mr-2">✅</span>
          <span>Coupon deleted successfully!</span>
        </div>
      `;
      document.body.appendChild(successElement);
      
      setTimeout(() => {
        if (document.body.contains(successElement)) {
          document.body.removeChild(successElement);
        }
      }, 5000);

    } catch (err: any) {
      console.error('Error deleting coupon:', err);
      setError(err.message || 'Failed to delete coupon');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDiscountDisplay = (coupon: CouponCode) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% off`;
    } else {
      return `${formatCurrency(coupon.discount_value)} off`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
            <h3 className="text-sm font-medium text-red-800">Error Loading Coupons</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchCoupons}
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
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Coupon Codes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create and manage discount coupon codes for your customers.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            New Coupon
          </button>
        </div>
      </div>

      {/* Coupons List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {coupons.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No coupon codes</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new coupon code.</p>
            <div className="mt-6">
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                New Coupon
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {coupons.map((coupon) => (
              <li key={coupon.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900 mr-3">
                        {coupon.code}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        coupon.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatDiscountDisplay(coupon)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{coupon.name}</p>
                    {coupon.description && (
                      <p className="text-sm text-gray-500 mt-1">{coupon.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2 space-x-4">
                      <span>Used: {coupon.current_usage}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}</span>
                      {coupon.min_order_amount > 0 && (
                        <span>Min order: {formatCurrency(coupon.min_order_amount)}</span>
                      )}
                      {coupon.expires_at && (
                        <span>Expires: {new Date(coupon.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className={`text-sm font-medium ${
                        coupon.is_active 
                          ? 'text-red-600 hover:text-red-800' 
                          : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {coupon.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    {coupon.current_usage === 0 && (
                      <button
                        onClick={() => handleDelete(coupon)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Coupon Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="SAVE20"
                      required
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="20% Off Discount"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Optional description for internal use"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Discount Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as 'percentage' | 'flat' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="percentage">Percentage Off</option>
                      <option value="flat">Flat Dollar Amount</option>
                    </select>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.discount_type === 'percentage' ? '100' : undefined}
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={formData.discount_type === 'percentage' ? '20' : '25.00'}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Minimum Order Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Order Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Maximum Discount (for percentage) */}
                  {formData.discount_type === 'percentage' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Discount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.max_discount_amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Optional cap"
                      />
                    </div>
                  )}

                  {/* Usage Limit */}
                  {formData.discount_type === 'flat' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Usage Limit
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.usage_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Unlimited"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Usage Limit (for percentage) */}
                  {formData.discount_type === 'percentage' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Usage Limit
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.usage_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Unlimited"
                      />
                    </div>
                  )}

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active (coupon can be used immediately)
                  </label>
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingCoupon(null);
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : (editingCoupon ? 'Update Coupon' : 'Create Coupon')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 