import { useState } from 'react';

interface SalesBannerProps {
  className?: string;
}

export default function SalesBanner({ className = '' }: SalesBannerProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  // Get current month name
  const getCurrentMonth = () => {
    const months = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return months[new Date().getMonth()];
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText('FASHO');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className={`fixed w-full top-0 sm:top-0 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-2 px-4 shadow-lg z-[9999] ${className}`} style={{ top: '-2px' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-center relative">
        {/* Desktop version */}
        <div className="hidden sm:flex items-center justify-center gap-1 text-center">
          <span className="text-sm text-black">
            🔥 <span className="text-[0.985rem] font-black">{getCurrentMonth().toUpperCase()} SALE!</span> Use code
          </span>
          
          {/* Coupon code box */}
          <div 
            onClick={handleCopyCode}
            className="flex items-center gap-2 bg-black text-[#59e3a5] px-3 py-1 rounded-md cursor-pointer hover:bg-gray-900 hover:scale-105 transition-all duration-200 shadow-lg font-bold ml-1"
          >
            <span className="font-bold text-sm">FASHO</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#59e3a5]">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          </div>
          
          <span className="text-sm font-bold text-black ml-1">
            for 15% off your first campaign!
          </span>
        </div>

        {/* Mobile version */}
        <div className="flex sm:hidden items-center justify-center gap-1 text-center">
          <span className="text-xs text-black">
            🔥 <span className="text-[0.835rem] font-black">{getCurrentMonth().toUpperCase()} SALE!</span> Use code
          </span>
          
          {/* Coupon code box */}
          <div 
            onClick={handleCopyCode}
            className="flex items-center gap-1 bg-black text-[#59e3a5] px-2 py-1 rounded-md cursor-pointer hover:bg-gray-900 transition-all duration-200 shadow-lg font-bold ml-1"
          >
            <span className="font-bold text-xs">FASHO</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#59e3a5]">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          </div>
          
          <span className="text-xs font-bold text-black ml-1">
            for 15% off
          </span>
        </div>

        {/* Copy success message */}
        {copySuccess && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black text-[#59e3a5] px-3 py-1 rounded-md text-xs font-medium shadow-lg z-10">
            🎉 Copied to clipboard!
          </div>
        )}
      </div>
    </div>
  );
}