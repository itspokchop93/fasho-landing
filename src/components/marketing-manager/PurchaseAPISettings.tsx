import React, { useState, useEffect } from 'react';

interface OrderSet {
  id: string;
  package_name: string;
  service_id: string;
  quantity: number;
  drip_runs: number | null;
  interval_minutes: number | null;
  display_order: number;
  is_active: boolean;
  price_per_1k: number | null;
  set_cost: number | null;
  created_at: string;
  updated_at: string;
}

interface OrderSetFormData {
  service_id: string;
  quantity: string;
  drip_runs: string;  // empty string = not using drip feed
  interval_minutes: string;  // empty string = not using drip feed
}

// Package configurations
const PACKAGES = [
  { id: 'BREAKTHROUGH', name: 'Breakthrough', icon: '🚀', color: 'emerald', price: '$39' },
  { id: 'MOMENTUM', name: 'Momentum', icon: '⚡', color: 'sky', price: '$79' },
  { id: 'DOMINATE', name: 'Dominate', icon: '🏆', color: 'indigo', price: '$149' },
  { id: 'UNSTOPPABLE', name: 'Unstoppable', icon: '💎', color: 'rose', price: '$259' },
  { id: 'LEGENDARY', name: 'Legendary', icon: '👑', color: 'amber', price: '$479' },
];

// Color mapping for Tailwind classes
const colorClasses: { [key: string]: { bg: string; border: string; text: string; light: string; button: string } } = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', light: 'bg-emerald-100', button: 'bg-emerald-600 hover:bg-emerald-700' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', light: 'bg-sky-100', button: 'bg-sky-600 hover:bg-sky-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', light: 'bg-indigo-100', button: 'bg-indigo-600 hover:bg-indigo-700' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', light: 'bg-rose-100', button: 'bg-rose-600 hover:bg-rose-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', light: 'bg-amber-100', button: 'bg-amber-600 hover:bg-amber-700' },
};

// Delete Confirmation Modal Component
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  orderSetId: string;
  onConfirm: () => void;
  onCancel: () => void;
  position: { top: number; left: number } | null;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  position
}) => {
  if (!isOpen || !position) return null;

  return (
    <>
      <div 
        className="fixed inset-0"
        style={{ zIndex: 9999 }}
        onClick={onCancel}
      />
      <div
        className="absolute bg-white rounded-lg shadow-xl border-2 border-gray-800"
        style={{
          zIndex: 10000,
          top: position.top - 110,
          left: position.left - 100,
          width: '250px'
        }}
      >
        <div 
          className="absolute top-full left-1/2 transform -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '10px solid #1f2937'
          }}
        ></div>
        <div className="p-4">
          <p className="text-gray-800 text-sm mb-4 leading-tight font-medium">
            Delete this order set?
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded font-medium flex-1"
            >
              ✓ Delete
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium flex-1"
            >
              ✗ Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const PurchaseAPISettings: React.FC = () => {
  const [orderSets, setOrderSets] = useState<OrderSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceCurrency, setBalanceCurrency] = useState('USD');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [editingOrderSet, setEditingOrderSet] = useState<OrderSet | null>(null);
  const [formData, setFormData] = useState<OrderSetFormData>({
    service_id: '',
    quantity: '',
    drip_runs: '1',
    interval_minutes: '1440',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    orderSetId: string;
    position: { top: number; left: number } | null;
  }>({
    isOpen: false,
    orderSetId: '',
    position: null,
  });

  // Playlist order set modal states (service ID only)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistModalMode, setPlaylistModalMode] = useState<'add' | 'edit'>('add');
  const [selectedPlaylistType, setSelectedPlaylistType] = useState<string | null>(null);
  const [editingPlaylistOrderSet, setEditingPlaylistOrderSet] = useState<OrderSet | null>(null);
  const [playlistServiceIdInput, setPlaylistServiceIdInput] = useState('');
  const [isPlaylistSubmitting, setIsPlaylistSubmitting] = useState(false);
  
  // Playlist delete confirmation
  const [playlistDeleteConfirmation, setPlaylistDeleteConfirmation] = useState<{
    isOpen: boolean;
    orderSetId: string;
    position: { top: number; left: number } | null;
  }>({
    isOpen: false,
    orderSetId: '',
    position: null,
  });

  useEffect(() => {
    fetchOrderSets();
    fetchBalance();
  }, []);

  const fetchOrderSets = async () => {
    try {
      const response = await fetch('/api/marketing-manager/smm-panel/order-sets');
      if (response.ok) {
        const data = await response.json();
        setOrderSets(data);
      } else {
        console.error('Failed to fetch order sets');
      }
    } catch (error) {
      console.error('Error fetching order sets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const response = await fetch('/api/marketing-manager/smm-panel/balance');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBalance(data.balance);
          setBalanceCurrency(data.currency || 'USD');
        }
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const getOrderSetsForPackage = (packageName: string) => {
    return orderSets.filter(os => os.package_name === packageName);
  };

  const openAddModal = (packageName: string) => {
    setModalMode('add');
    setSelectedPackage(packageName);
    setEditingOrderSet(null);
    setFormData({
      service_id: '',
      quantity: '',
      drip_runs: '',  // Empty = no drip feed
      interval_minutes: '',  // Empty = no drip feed
    });
    setShowModal(true);
  };

  const openEditModal = (orderSet: OrderSet) => {
    setModalMode('edit');
    setSelectedPackage(orderSet.package_name);
    setEditingOrderSet(orderSet);
    setFormData({
      service_id: orderSet.service_id,
      quantity: orderSet.quantity.toString(),
      drip_runs: orderSet.drip_runs ? orderSet.drip_runs.toString() : '',
      interval_minutes: orderSet.interval_minutes ? orderSet.interval_minutes.toString() : '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPackage(null);
    setEditingOrderSet(null);
  };

  const handleFormChange = (field: keyof OrderSetFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Parse drip feed values - empty means null (no drip feed)
    const dripRuns = formData.drip_runs.trim() ? parseInt(formData.drip_runs) : null;
    const intervalMinutes = formData.interval_minutes.trim() ? parseInt(formData.interval_minutes) : null;

    try {
      if (modalMode === 'add') {
        const response = await fetch('/api/marketing-manager/smm-panel/order-sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package_name: selectedPackage,
            service_id: formData.service_id,
            quantity: parseInt(formData.quantity),
            drip_runs: dripRuns,
            interval_minutes: intervalMinutes,
          }),
        });

        if (response.ok) {
          await fetchOrderSets();
          closeModal();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } else {
        const response = await fetch('/api/marketing-manager/smm-panel/order-sets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingOrderSet?.id,
            service_id: formData.service_id,
            quantity: parseInt(formData.quantity),
            drip_runs: dripRuns,
            interval_minutes: intervalMinutes,
          }),
        });

        if (response.ok) {
          await fetchOrderSets();
          closeModal();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving order set:', error);
      alert('Error saving order set');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (orderSetId: string, event: React.MouseEvent) => {
    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    
    setDeleteConfirmation({
      isOpen: true,
      orderSetId,
      position: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + (rect.width / 2),
      },
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch('/api/marketing-manager/smm-panel/order-sets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteConfirmation.orderSetId }),
      });

      if (response.ok) {
        await fetchOrderSets();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting order set:', error);
    } finally {
      setDeleteConfirmation({ isOpen: false, orderSetId: '', position: null });
    }
  };

  const getPackageInfo = (packageId: string) => {
    return PACKAGES.find(p => p.id === packageId);
  };

  // Playlist Order Set handlers
  const PLAYLIST_TYPES = [
    { id: 'PLAYLIST_FOLLOWERS', name: 'Playlist Followers', icon: '👥', color: 'purple' },
    { id: 'PLAYLIST_STREAMS', name: 'Playlist Streams', icon: '▶️', color: 'purple' },
  ];

  const getPlaylistOrderSets = (playlistType: string) => {
    return orderSets.filter(os => os.package_name === playlistType);
  };

  const openPlaylistAddModal = (playlistType: string) => {
    setPlaylistModalMode('add');
    setSelectedPlaylistType(playlistType);
    setEditingPlaylistOrderSet(null);
    setPlaylistServiceIdInput('');
    setShowPlaylistModal(true);
  };

  const openPlaylistEditModal = (orderSet: OrderSet) => {
    setPlaylistModalMode('edit');
    setSelectedPlaylistType(orderSet.package_name);
    setEditingPlaylistOrderSet(orderSet);
    setPlaylistServiceIdInput(orderSet.service_id);
    setShowPlaylistModal(true);
  };

  const closePlaylistModal = () => {
    setShowPlaylistModal(false);
    setSelectedPlaylistType(null);
    setEditingPlaylistOrderSet(null);
  };

  const handlePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPlaylistSubmitting(true);

    try {
      if (playlistModalMode === 'add') {
        // Playlist order sets only store service_id — quantity/drip set to placeholder 0
        const response = await fetch('/api/marketing-manager/smm-panel/order-sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package_name: selectedPlaylistType,
            service_id: playlistServiceIdInput,
            quantity: 0,
            drip_runs: null,
            interval_minutes: null,
          }),
        });

        if (response.ok) {
          await fetchOrderSets();
          closePlaylistModal();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      } else {
        const response = await fetch('/api/marketing-manager/smm-panel/order-sets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPlaylistOrderSet?.id,
            service_id: playlistServiceIdInput,
            quantity: 0,
            drip_runs: null,
            interval_minutes: null,
          }),
        });

        if (response.ok) {
          await fetchOrderSets();
          closePlaylistModal();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving playlist order set:', error);
      alert('Error saving playlist order set');
    } finally {
      setIsPlaylistSubmitting(false);
    }
  };

  const handlePlaylistDeleteClick = (orderSetId: string, event: React.MouseEvent) => {
    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    
    setPlaylistDeleteConfirmation({
      isOpen: true,
      orderSetId,
      position: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + (rect.width / 2),
      },
    });
  };

  const handlePlaylistDeleteConfirm = async () => {
    try {
      const response = await fetch('/api/marketing-manager/smm-panel/order-sets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playlistDeleteConfirmation.orderSetId }),
      });

      if (response.ok) {
        await fetchOrderSets();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting playlist order set:', error);
    } finally {
      setPlaylistDeleteConfirmation({ isOpen: false, orderSetId: '', position: null });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">Purchase API Settings</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      {/* Header with Balance */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-800">Purchase API Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure SMM Panel order sets for each package
          </p>
        </div>
        
        {/* Panel Balance Box */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[0.65rem] font-bold text-green-600 uppercase tracking-wider">Panel Balance</div>
              <div className="text-[1.4rem] font-black text-green-700">
                {balanceLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : balance ? (
                  `$${parseFloat(balance).toFixed(2)}`
                ) : (
                  <span className="text-gray-400">--</span>
                )}
              </div>
            </div>
            <button
              onClick={fetchBalance}
              disabled={balanceLoading}
              className="p-2 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              title="Refresh balance"
            >
              <svg 
                className={`w-5 h-5 text-green-600 ${balanceLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {PACKAGES.map((pkg) => {
          const colors = colorClasses[pkg.color];
          const packageOrderSets = getOrderSetsForPackage(pkg.id);
          
          return (
            <div
              key={pkg.id}
              className={`${colors.bg} ${colors.border} border-2 rounded-xl overflow-hidden flex flex-col`}
            >
              {/* Package Header */}
              <div className={`${colors.light} px-4 py-3 border-b ${colors.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{pkg.icon}</span>
                    <div>
                      <h3 className={`font-bold ${colors.text} text-[1rem]`}>{pkg.name}</h3>
                      <span className="text-[0.7rem] text-gray-500 font-medium">{pkg.price}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Total Streams Badge */}
                    {packageOrderSets.length > 0 && (
                      <div className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[0.7rem] font-bold">
                        {packageOrderSets.reduce((sum, os) => {
                          const totalQty = os.drip_runs && os.drip_runs > 0 
                            ? os.quantity * os.drip_runs 
                            : os.quantity;
                          return sum + totalQty;
                        }, 0).toLocaleString()} streams
                      </div>
                    )}
                    {/* Purchase Cost Badge */}
                    {packageOrderSets.length > 0 && (
                      <div className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[0.7rem] font-bold">
                        ${packageOrderSets.reduce((sum, os) => sum + (os.set_cost || 0), 0).toFixed(2)}
                      </div>
                    )}
                    {/* Order Sets Count Badge */}
                    <div className={`px-2 py-1 rounded-full ${colors.bg} ${colors.text} text-[0.7rem] font-bold`}>
                      {packageOrderSets.length} Order Set{packageOrderSets.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Sets List - flex-grow to push button to bottom */}
              <div className="p-4 space-y-3 min-h-[120px] flex-grow">
                {packageOrderSets.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm italic">
                    No order sets configured
                  </div>
                ) : (
                  packageOrderSets.map((orderSet) => (
                    <div
                      key={orderSet.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm group relative hover:shadow-md transition-shadow"
                    >
                      {/* Delete and Edit buttons on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(orderSet)}
                          className="text-[0.65rem] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(orderSet.id, e)}
                          className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700"
                          title="Delete order set"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Main Info Grid - Always 4 columns for consistency */}
                      <div className="grid grid-cols-4 gap-x-3 gap-y-2">
                        {/* Row 1 */}
                        <div>
                          <div className="text-[0.6rem] font-bold text-gray-400 uppercase">Service ID</div>
                          <div className="text-[0.85rem] font-bold text-gray-900">{orderSet.service_id}</div>
                        </div>
                        <div>
                          <div className="text-[0.6rem] font-bold text-gray-400 uppercase">Quantity</div>
                          <div className="text-[0.85rem] font-bold text-gray-900">{orderSet.quantity.toLocaleString()}</div>
                        </div>
                        {orderSet.price_per_1k !== null ? (
                          <>
                            <div>
                              <div className="text-[0.6rem] font-bold text-gray-400 uppercase">Price/1K</div>
                              <div className="text-[0.85rem] font-bold text-green-600">${orderSet.price_per_1k?.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-[0.6rem] font-bold text-gray-400 uppercase">Set Cost</div>
                              <div className="text-[0.85rem] font-bold text-green-600">${orderSet.set_cost?.toFixed(2)}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div></div>
                            <div></div>
                          </>
                        )}
                      </div>

                      {/* Drip Feed Banner (if applicable) */}
                      {(orderSet.drip_runs && orderSet.drip_runs > 0) && (
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="text-[0.7rem] font-bold text-blue-700">Drip Feed</span>
                              </div>
                              <span className="text-[0.7rem] text-blue-600">
                                <span className="font-bold">{orderSet.drip_runs}</span> runs
                              </span>
                              <span className="text-[0.7rem] text-blue-600">
                                every <span className="font-bold">{orderSet.interval_minutes === 1440 ? '1 day' : `${orderSet.interval_minutes || 1440}min`}</span>
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[0.65rem] text-blue-500 uppercase font-bold">Total: </span>
                              <span className="text-[0.85rem] font-bold text-blue-700">
                                {(orderSet.quantity * orderSet.drip_runs).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Order Set Button - Always at bottom */}
              <div className="px-4 pb-4 mt-auto">
                <button
                  onClick={() => openAddModal(pkg.id)}
                  className={`w-full ${colors.button} text-white py-2.5 rounded-lg font-bold text-[0.8rem] flex items-center justify-center gap-2 transition-colors shadow-sm`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Order Set
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Playlist Purchases Section - Order Sets */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-purple-800">Playlist Purchases</h3>
            <p className="text-[0.75rem] text-purple-600">Configure order sets for playlist followers and streams</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLAYLIST_TYPES.map((pType) => {
            const playlistOrderSets = getPlaylistOrderSets(pType.id);
            
            return (
              <div
                key={pType.id}
                className="bg-white rounded-xl border-2 border-purple-100 overflow-hidden flex flex-col shadow-sm"
              >
                {/* Header */}
                <div className="bg-purple-100 px-4 py-3 border-b border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{pType.icon}</span>
                      <h4 className="font-bold text-purple-800 text-[1rem]">{pType.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Service IDs Count Badge */}
                      <div className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-[0.7rem] font-bold">
                        {playlistOrderSets.length} Service{playlistOrderSets.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Sets List */}
                <div className="p-4 space-y-3 min-h-[120px] flex-grow">
                  {playlistOrderSets.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm italic">
                      No order sets configured
                    </div>
                  ) : (
                    playlistOrderSets.map((orderSet) => (
                      <div
                        key={orderSet.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm group relative hover:shadow-md transition-shadow"
                      >
                        {/* Delete and Edit buttons on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() => openPlaylistEditModal(orderSet)}
                            className="text-[0.65rem] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => handlePlaylistDeleteClick(orderSet.id, e)}
                            className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700"
                            title="Delete order set"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Simple Service ID display */}
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-[0.6rem] font-bold text-gray-400 uppercase">Service ID</div>
                            <div className="text-[0.85rem] font-bold text-gray-900">{orderSet.service_id}</div>
                          </div>
                          {orderSet.price_per_1k !== null && (
                            <div>
                              <div className="text-[0.6rem] font-bold text-gray-400 uppercase">Price/1K</div>
                              <div className="text-[0.85rem] font-bold text-green-600">${orderSet.price_per_1k?.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Service ID Button */}
                <div className="px-4 pb-4 mt-auto">
                  <button
                    onClick={() => openPlaylistAddModal(pType.id)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-bold text-[0.8rem] flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Service ID
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h3 className="text-white font-bold text-lg">
                {modalMode === 'add' 
                  ? `Add New Order Set to ${getPackageInfo(selectedPackage)?.name} Package`
                  : `Edit Order Set`
                }
              </h3>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Service ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_id}
                  onChange={(e) => handleFormChange('service_id', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                  placeholder="e.g. 1933"
                />
                <p className="text-[0.7rem] text-gray-400 mt-1">The service ID from Followiz panel</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleFormChange('quantity', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                  placeholder="e.g. 5000"
                />
                <p className="text-[0.7rem] text-gray-400 mt-1">Number of streams to purchase</p>
              </div>

              {/* Optional Drip Feed Section */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-600">Drip Feed Settings</span>
                  <span className="text-[0.65rem] text-gray-400 font-medium">(Optional)</span>
                </div>
                <p className="text-[0.7rem] text-gray-400 mb-3">Leave blank for a one-time purchase</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Drip Runs
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.drip_runs}
                      onChange={(e) => handleFormChange('drip_runs', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition-colors bg-white"
                      placeholder="e.g. 7"
                    />
                    <p className="text-[0.65rem] text-gray-400 mt-1">Number of drip deliveries</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Interval (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.interval_minutes}
                      onChange={(e) => handleFormChange('interval_minutes', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition-colors bg-white"
                      placeholder="1440"
                    />
                    <p className="text-[0.65rem] text-gray-400 mt-1">1440 = 1 day</p>
                  </div>
                </div>
              </div>

              {/* Live Total Preview */}
              {formData.quantity && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-sm font-bold text-blue-700">Total Streams</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-blue-600 transition-all duration-200">
                        {(() => {
                          const qty = parseInt(formData.quantity) || 0;
                          const runs = formData.drip_runs.trim() ? parseInt(formData.drip_runs) : 0;
                          const total = runs > 0 ? qty * runs : qty;
                          return total.toLocaleString();
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Add Order Set' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        orderSetId={deleteConfirmation.orderSetId}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmation({ isOpen: false, orderSetId: '', position: null })}
        position={deleteConfirmation.position}
      />

      {/* Playlist Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={playlistDeleteConfirmation.isOpen}
        orderSetId={playlistDeleteConfirmation.orderSetId}
        onConfirm={handlePlaylistDeleteConfirm}
        onCancel={() => setPlaylistDeleteConfirmation({ isOpen: false, orderSetId: '', position: null })}
        position={playlistDeleteConfirmation.position}
      />

      {/* Playlist Add/Edit Modal */}
      {showPlaylistModal && selectedPlaylistType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={closePlaylistModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
              <h3 className="text-white font-bold text-lg">
                {playlistModalMode === 'add' 
                  ? `Add Order Set to ${PLAYLIST_TYPES.find(p => p.id === selectedPlaylistType)?.name}`
                  : `Edit Order Set`
                }
              </h3>
            </div>

            {/* Modal Form — Service ID only for playlists */}
            <form onSubmit={handlePlaylistSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Service ID *
                </label>
                <input
                  type="text"
                  required
                  value={playlistServiceIdInput}
                  onChange={(e) => setPlaylistServiceIdInput(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 outline-none transition-colors"
                  placeholder="e.g. 1410"
                />
                <p className="text-[0.7rem] text-gray-400 mt-1">The service ID from Followiz panel</p>
              </div>

              <p className="text-[0.75rem] text-gray-500 bg-purple-50 border border-purple-200 rounded-lg p-3">
                Quantity and drip feed settings are entered per-playlist when submitting in the &quot;Playlist Purchases Needed&quot; section.
              </p>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closePlaylistModal}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPlaylistSubmitting}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isPlaylistSubmitting ? 'Saving...' : playlistModalMode === 'add' ? 'Add Service' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseAPISettings;

