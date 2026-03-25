import React, { useState } from 'react';

interface BlacklistConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  mode: 'blacklist' | 'unblacklist';
  customerData: {
    customerName: string;
    customerEmail: string;
    billingAddress?: string;
    orderNumbers: string[];
    spotifyArtistUrls?: string[];
    spotifyTrackUrls?: string[];
    cardInfo?: string;
    userId?: string;
    phoneNumber?: string;
  };
  isLoading?: boolean;
}

export default function BlacklistConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
  customerData,
  isLoading = false,
}: BlacklistConfirmModalProps) {
  const [reason, setReason] = useState(mode === 'blacklist' ? 'Chargeback' : '');

  if (!isOpen) return null;

  const isBlacklist = mode === 'blacklist';
  const title = isBlacklist ? 'Blacklist Customer' : 'Remove from Blacklist';
  const subtitle = isBlacklist
    ? 'The following customer information will be added to the blacklist:'
    : 'The following customer information will be REMOVED from the blacklist:';
  const warning = isBlacklist
    ? 'This will immediately prevent this customer from completing any future purchases.'
    : 'This will allow this customer to make purchases again.';
  const confirmLabel = isBlacklist ? 'Confirm Blacklist' : 'Confirm Removal';
  const reasonPlaceholder = isBlacklist
    ? 'e.g., Fraud, Chargeback, Suspicious activity'
    : 'e.g., Customer resolved dispute, False positive';

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#1a1a2e] border border-white/20 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 border-b ${isBlacklist ? 'border-red-500/30' : 'border-green-500/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBlacklist ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {isBlacklist ? (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-white/50" style={{ fontSize: '0.8125rem' }}>{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Customer info grid */}
        <div className="px-6 py-4 space-y-3">
          <InfoRow label="Name" value={customerData.customerName} />
          <InfoRow label="Email" value={customerData.customerEmail} />
          {customerData.phoneNumber && <InfoRow label="Phone" value={customerData.phoneNumber} />}
          {customerData.billingAddress && <InfoRow label="Billing Address" value={customerData.billingAddress} />}
          {customerData.userId && <InfoRow label="User ID" value={customerData.userId} mono />}

          {customerData.orderNumbers.length > 0 && (
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Order Numbers</p>
              <div className="flex flex-wrap gap-1.5">
                {customerData.orderNumbers.map((num) => (
                  <span
                    key={num}
                    className="bg-white/10 text-white/80 px-2 py-0.5 rounded text-xs font-mono"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          )}

          {customerData.spotifyArtistUrls && customerData.spotifyArtistUrls.length > 0 && (
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Spotify Artist Links</p>
              <div className="space-y-1">
                {customerData.spotifyArtistUrls.map((url, i) => (
                  <p key={i} className="text-blue-400 text-xs truncate font-mono">{url}</p>
                ))}
              </div>
            </div>
          )}

          {customerData.spotifyTrackUrls && customerData.spotifyTrackUrls.length > 0 && (
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Spotify Track URLs</p>
              <div className="space-y-1">
                {customerData.spotifyTrackUrls.map((url, i) => (
                  <p key={i} className="text-blue-400 text-xs truncate font-mono">{url}</p>
                ))}
              </div>
            </div>
          )}

          {customerData.cardInfo && <InfoRow label="Card" value={customerData.cardInfo} />}
        </div>

        {/* Reason input */}
        <div className="px-6 pb-4">
          <label className="block text-white/60 text-xs uppercase tracking-wide mb-1.5">
            Reason {isBlacklist ? 'for blacklisting' : 'for removal'} *
          </label>
          {isBlacklist ? (
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-white/40 appearance-none"
              disabled={isLoading}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff80' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              <option value="Chargeback" className="bg-[#1a1a2e] text-white">Chargeback</option>
              <option value="Fraud" className="bg-[#1a1a2e] text-white">Fraud</option>
              <option value="Frequent Refunds" className="bg-[#1a1a2e] text-white">Frequent Refunds</option>
              <option value="Other" className="bg-[#1a1a2e] text-white">Other</option>
            </select>
          ) : (
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/40"
              disabled={isLoading}
              autoFocus
            />
          )}
        </div>

        {/* Warning */}
        <div className={`mx-6 mb-4 p-3 rounded-lg ${isBlacklist ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
          <p className={`text-xs ${isBlacklist ? 'text-red-300' : 'text-green-300'}`}>
            {warning}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isBlacklist
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-white/50 text-xs uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-white text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
