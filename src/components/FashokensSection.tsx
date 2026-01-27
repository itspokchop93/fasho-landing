import { useState, useEffect, useCallback } from 'react';

interface FashokensSectionProps {
  userId: string | null;
  cartTotal: number; // Total after any coupon discount but before fashokens
  onApplyTokens: (tokens: number, discount: number) => void;
  onRemoveTokens: () => void;
  appliedTokens: number;
  appliedDiscount: number;
}

interface LoyaltySettings {
  tokens_per_dollar: number;
  redemption_tokens_per_dollar: number;
  is_program_active: boolean;
  minimum_order_total: number;
}

export default function FashokensSection({
  userId,
  cartTotal,
  onApplyTokens,
  onRemoveTokens,
  appliedTokens,
  appliedDiscount
}: FashokensSectionProps) {
  const [balance, setBalance] = useState(0);
  const [maxTokens, setMaxTokens] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState(0);
  const [redemptionRate, setRedemptionRate] = useState(100);
  const [inputTokens, setInputTokens] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch loyalty settings and balance
  const fetchLoyaltyData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch settings
      const settingsRes = await fetch('/api/loyalty/settings');
      const settingsData = await settingsRes.json();
      
      if (!settingsData.success || !settingsData.settings?.is_program_active) {
        setIsLoading(false);
        return;
      }
      
      setSettings(settingsData.settings);
      setRedemptionRate(settingsData.settings.redemption_tokens_per_dollar);

      // Fetch balance and max tokens
      const maxRes = await fetch('/api/loyalty/calculate-max', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartTotal })
      });
      const maxData = await maxRes.json();
      
      if (maxData.success) {
        setBalance(maxData.balance);
        setMaxTokens(maxData.maxTokens);
        setMaxDiscount(maxData.maxDiscount);
        setRedemptionRate(maxData.redemptionRate || 100);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching loyalty data:', err);
      setIsLoading(false);
    }
  }, [userId, cartTotal]);

  useEffect(() => {
    fetchLoyaltyData();
  }, [fetchLoyaltyData]);

  // Recalculate max tokens when cartTotal changes (e.g., when coupon is applied)
  useEffect(() => {
    if (settings && balance > 0) {
      // Recalculate what the new max should be
      const minimumOrder = settings.minimum_order_total || 1;
      const maxDiscountAllowed = Math.max(0, cartTotal - minimumOrder);
      const newMaxTokens = Math.min(balance, Math.floor(maxDiscountAllowed * redemptionRate));
      const newMaxDiscount = newMaxTokens / redemptionRate;
      
      // Update max display values
      setMaxTokens(newMaxTokens);
      setMaxDiscount(newMaxDiscount);
      
      // If applied tokens exceed new max, adjust them
      if (appliedTokens > 0 && appliedTokens > newMaxTokens) {
        onApplyTokens(newMaxTokens, newMaxDiscount);
      }
    }
  }, [cartTotal, appliedTokens, balance, redemptionRate, settings, onApplyTokens]);

  // Don't show if not logged in, no balance, or program inactive
  if (!userId || isLoading) {
    return null;
  }

  if (!settings?.is_program_active || balance === 0 || cartTotal <= (settings?.minimum_order_total || 1)) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setInputTokens(value);
    setError('');
  };

  const calculateDiscount = (tokens: number): number => {
    return tokens / redemptionRate;
  };

  const handleApply = async () => {
    const tokens = parseInt(inputTokens) || 0;
    
    if (tokens <= 0) {
      setError('Please enter a valid number of tokens');
      return;
    }

    // Clamp to maximum allowed
    const clampedTokens = Math.min(tokens, maxTokens);
    const discount = calculateDiscount(clampedTokens);

    if (clampedTokens !== tokens) {
      setError(`Applied maximum of ${clampedTokens.toLocaleString()} tokens instead`);
    }

    setIsApplying(true);
    
    // Apply tokens
    onApplyTokens(clampedTokens, discount);
    setInputTokens('');
    setIsApplying(false);
  };

  const handleApplyAll = async () => {
    if (maxTokens <= 0) {
      setError('No tokens available to apply');
      return;
    }

    setIsApplying(true);
    const discount = calculateDiscount(maxTokens);
    onApplyTokens(maxTokens, discount);
    setInputTokens('');
    setIsApplying(false);
  };

  const handleUnapply = () => {
    onRemoveTokens();
    setError('');
  };

  const formatTokens = (tokens: number): string => {
    return tokens.toLocaleString();
  };

  // APPLIED STATE
  if (appliedTokens > 0) {
    const remainingBalance = balance - appliedTokens;
    
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#59e3a5]/40 bg-gradient-to-br from-[#59e3a5]/10 via-[#10b981]/5 to-transparent backdrop-blur-sm">
        {/* Decorative glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#59e3a5]/20 rounded-full blur-3xl"></div>
        
        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img src="/fashoken.png" alt="FASHOKEN" className="w-10 h-10" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#59e3a5] rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#59e3a5]">FASHOkens Applied!</h3>
                <p className="text-white/60 text-sm">Discount activated</p>
              </div>
            </div>
            <button
              onClick={handleUnapply}
              className="text-white/50 hover:text-white text-sm underline transition-colors"
            >
              Remove
            </button>
          </div>
          
          {/* Applied tokens display */}
          <div className="bg-black/20 rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src="/fashoken.png" alt="" className="w-5 h-5" />
                <span className="text-white font-semibold">{formatTokens(appliedTokens)} applied</span>
              </div>
              <span className="text-[#59e3a5] font-bold text-lg">-${appliedDiscount.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Remaining balance */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Remaining Balance:</span>
            <span className="flex items-center space-x-1 text-white/80">
              <img src="/fashoken.png" alt="" className="w-4 h-4" />
              <span>{formatTokens(remainingBalance)}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // INPUT STATE
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#59e3a5]/30 bg-gradient-to-br from-[#59e3a5]/10 via-[#10b981]/5 to-transparent backdrop-blur-sm">
      {/* Decorative glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#59e3a5]/15 rounded-full blur-3xl"></div>
      
      <div className="relative p-5">
        {/* Header with balance */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <img src="/fashoken.png" alt="FASHOKEN" className="w-10 h-10" />
            <div>
              <h3 className="text-lg font-bold text-[#59e3a5]">Apply FASHOkens</h3>
              <p className="text-white/60 text-sm">Use your loyalty tokens</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 justify-end">
              <img src="/fashoken.png" alt="" className="w-5 h-5" />
              <span className="text-xl font-bold text-white">{formatTokens(balance)}</span>
            </div>
            <p className="text-white/50 text-xs">Your Balance</p>
          </div>
        </div>
        
        {/* Max applicable info */}
        <div className="bg-black/20 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Max you can apply:</span>
            <div className="flex items-center space-x-2">
              <span className="text-[#59e3a5] font-semibold">{formatTokens(maxTokens)}</span>
              <span className="text-white/50">=</span>
              <span className="text-[#59e3a5] font-semibold">${maxDiscount.toFixed(2)} off</span>
            </div>
          </div>
        </div>
        
        {/* Input and buttons */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={inputTokens}
            onChange={handleInputChange}
            placeholder="Enter amount"
            className="flex-1 px-4 py-3 bg-black/30 border border-[#59e3a5]/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#59e3a5]/50 focus:border-[#59e3a5]/50 transition-all"
            disabled={isApplying}
          />
          <button
            onClick={handleApply}
            disabled={isApplying || !inputTokens}
            className="px-5 py-3 bg-[#59e3a5] text-black font-semibold rounded-xl hover:bg-[#4ade80] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
          <button
            onClick={handleApplyAll}
            disabled={isApplying || maxTokens === 0}
            className="px-5 py-3 bg-[#59e3a5]/20 text-[#59e3a5] font-semibold rounded-xl hover:bg-[#59e3a5]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#59e3a5]/40"
          >
            Apply Max
          </button>
        </div>
        
        {error && (
          <p className="mb-3 text-[#59e3a5] text-sm">{error}</p>
        )}
        
        {/* Info disclaimer */}
        <div className="flex items-start space-x-2 text-white/50 text-xs">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>FASHOkens are loyalty tokens earned for every dollar you spend. Use them towards any campaign you launch!</span>
        </div>
      </div>
    </div>
  );
}
