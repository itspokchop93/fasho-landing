import { useState, useEffect } from 'react';
import { parseTextWithPlaceholders, ParsedText } from '../utils/salesBannerPlaceholders';
import { useCountdown } from '../hooks/useCountdown';

interface SalesBannerMobileProps {
  beforeCouponText: string;
  afterCouponText: string;
  couponCode: string;
}

// Animated countdown component
function CountdownDisplay({ targetString }: { targetString: string }) {
  const countdown = useCountdown(targetString);
  
  if (countdown.isExpired) {
    return <span className="font-mono font-bold">ENDED</span>;
  }
  
  return (
    <span className="font-mono font-bold tabular-nums tracking-wide">
      {countdown.formatted}
    </span>
  );
}

// Render text segments with countdown support
function TextWithPlaceholders({ segments, className }: { segments: ParsedText[], className?: string }) {
  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'countdown' && segment.countdownTarget) {
          return <CountdownDisplay key={index} targetString={segment.countdownTarget} />;
        }
        return <span key={index}>{segment.content}</span>;
      })}
    </span>
  );
}

export default function SalesBannerMobile({ 
  beforeCouponText, 
  afterCouponText, 
  couponCode 
}: SalesBannerMobileProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [beforeSegments, setBeforeSegments] = useState<ParsedText[]>([]);
  const [afterSegments, setAfterSegments] = useState<ParsedText[]>([]);

  // Parse text on mount and when text changes
  useEffect(() => {
    setBeforeSegments(parseTextWithPlaceholders(beforeCouponText));
    setAfterSegments(parseTextWithPlaceholders(afterCouponText));
  }, [beforeCouponText, afterCouponText]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="flex sm:hidden items-center justify-center gap-1 text-center relative">
      {/* Before coupon text */}
      <TextWithPlaceholders 
        segments={beforeSegments} 
        className="text-[0.75rem] text-black"
      />
      
      {/* Coupon code box */}
      <div 
        onClick={handleCopyCode}
        className="flex items-center gap-1 bg-black text-[#59e3a5] px-2 py-1 rounded-md cursor-pointer hover:bg-gray-900 transition-all duration-200 shadow-lg font-bold ml-1"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCopyCode()}
        aria-label={`Copy coupon code ${couponCode}`}
      >
        <span className="font-bold text-[0.75rem]">{couponCode}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#59e3a5]">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      </div>
      
      {/* After coupon text */}
      <TextWithPlaceholders 
        segments={afterSegments} 
        className="text-[0.75rem] font-bold text-black ml-1"
      />

      {/* Copy success message */}
      {copySuccess && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black text-[#59e3a5] px-3 py-1 rounded-md text-[0.625rem] font-medium shadow-lg z-10">
          🎉 Copied to clipboard!
        </div>
      )}
    </div>
  );
}

