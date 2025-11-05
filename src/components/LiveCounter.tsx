import { useState, useEffect } from 'react';

interface LiveCounterProps {
  className?: string;
}

export default function LiveCounter({ className = '' }: LiveCounterProps) {
  const [count, setCount] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);

  // Initialize counter on client side
  useEffect(() => {
    setIsClient(true);
    
    // Get stored count or generate new random number
    const storedCount = localStorage.getItem('artistCounterValue');
    const storedTimestamp = localStorage.getItem('artistCounterTimestamp');
    const currentTime = Date.now();
    
    if (storedCount && storedTimestamp) {
      // Check if stored value is less than 24 hours old
      const timeDiff = currentTime - parseInt(storedTimestamp);
      const hours24 = 24 * 60 * 60 * 1000;
      
      if (timeDiff < hours24) {
        // Use stored count if less than 24 hours old
        setCount(parseInt(storedCount));
      } else {
        // Generate new random number if data is old
        const newCount = Math.floor(Math.random() * (124 - 84 + 1)) + 84;
        setCount(newCount);
        localStorage.setItem('artistCounterValue', newCount.toString());
        localStorage.setItem('artistCounterTimestamp', currentTime.toString());
      }
    } else {
      // First time visit - generate random number
      const newCount = Math.floor(Math.random() * (124 - 84 + 1)) + 84;
      setCount(newCount);
      localStorage.setItem('artistCounterValue', newCount.toString());
      localStorage.setItem('artistCounterTimestamp', currentTime.toString());
    }
  }, []);

  // Auto-increment counter
  useEffect(() => {
    if (!isClient) return;

    const getRandomInterval = () => Math.floor(Math.random() * (20000 - 7000 + 1)) + 7000; // 7-20 seconds

    const scheduleNextIncrement = () => {
      const interval = getRandomInterval();
      
      setTimeout(() => {
        setCount(prevCount => {
          const newCount = prevCount + 1;
          // Update localStorage with new count
          localStorage.setItem('artistCounterValue', newCount.toString());
          return newCount;
        });
        
        // Schedule next increment
        scheduleNextIncrement();
      }, interval);
    };

    // Start the increment cycle
    scheduleNextIncrement();
  }, [isClient]);

  // Don't render on server to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center mt-4 mb-5 w-full ${className}`}>
      <div className="bg-gradient-to-r from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-sm border border-gray-600/30 rounded-2xl px-4 sm:px-10 pt-1 pb-3 shadow-lg w-full sm:w-auto">
        {/* Small header text */}
        <div className="text-center mb-0 mt-0.5">
          <span className="text-gray-400/70 text-[0.55rem] sm:text-[0.65rem] font-medium tracking-wide uppercase">
            LIVE ADD-ON TRACKER
          </span>
        </div>
        
        <div className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-4">
          {/* Live monitoring dot with glow animation */}
          <div className="flex-shrink-0 relative">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#59e3a5] rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 bg-[#59e3a5] rounded-full animate-ping opacity-75"></div>
            <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 bg-[#59e3a5] rounded-full glow-effect"></div>
          </div>
          
          {/* Counter text with baseline alignment */}
          <div className="flex items-baseline space-x-1 sm:space-x-1">
            <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent font-bold text-[0.85rem] sm:text-[1.07rem]">
              {count}
            </span>
            <span className="text-gray-300 text-[0.735rem] sm:text-[0.9rem] whitespace-nowrap">
              <span className="block sm:hidden">artists got add-ons in the last 48hrs</span>
              <span className="hidden sm:block">artists got add-on campaigns in the last 48hrs</span>
            </span>
          </div>

          {/* Stack of user images */}
          <div className="flex -space-x-1 sm:-space-x-2 flex-shrink-0">
            <img
              src="/signup-pics/brett.jpg"
              alt="User"
              className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-gray-700 sm:border-2 object-cover flex-shrink-0"
            />
            <img
              src="/signup-pics/ficky.jpg"
              alt="User"
              className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-gray-700 sm:border-2 object-cover flex-shrink-0"
            />
            <img
              src="/signup-pics/kleber.jpg"
              alt="User"
              className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-gray-700 sm:border-2 object-cover flex-shrink-0"
            />
            <img
              src="/signup-pics/lebele.jpg"
              alt="User"
              className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-gray-700 sm:border-2 object-cover flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}