import React from 'react';
import { useRouter } from 'next/router';

interface StepIndicatorProps {
  currentStep: number; // 1, 2, or 3
  className?: string;
}

export default function StepIndicator({ currentStep, className = '' }: StepIndicatorProps) {
  const router = useRouter();
  const steps = [
    { number: 1, title: "TRACKS", subtitle: "Step 1 of 3", route: "/add" },
    { number: 2, title: "CAMPAIGN", subtitle: "Step 2 of 3", route: "/packages" },
    { number: 3, title: "LAUNCH", subtitle: "Step 3 of 3", route: "/checkout" }
  ];

  const handleStepClick = (step: typeof steps[0]) => {
    // Only allow navigation to completed steps or current step
    if (step.number <= currentStep) {
      // For step 1 (add page), preserve current tracks
      if (step.number === 1) {
        // Get tracks from multiple sources: router query, sessionStorage, or current session
        const tracks = router.query.tracks || sessionStorage.getItem('selectedTracks');
        
        if (tracks) {
          // If we have tracks, redirect to add page with them preserved
          router.push({
            pathname: '/add',
            query: { tracks }
          });
        } else {
          // For checkout page (step 3), we need to extract tracks from current session data
          if (currentStep === 3) {
            // If we're on checkout and have no tracks in query/storage, try to maintain current state
            // This will be handled by sessionStorage fallback in add page
            const checkoutCart = typeof window !== 'undefined' ? localStorage.getItem('checkoutCart') : null;
            if (checkoutCart) {
              try {
                const cartData = JSON.parse(checkoutCart);
                router.push({
                  pathname: '/add',
                  query: { tracks: cartData.tracks }
                });
                return;
              } catch (error) {
                console.error('Failed to parse checkout cart data:', error);
              }
            }
          }
          
          // No tracks available, just go to add page
          router.push('/add');
        }
        return;
      }
      
      // For other steps, we need to preserve the current flow data
      if (step.number === 2 && currentStep >= 2) {
        // We're on packages or checkout, can go back to packages
        const tracks = router.query.tracks || sessionStorage.getItem('selectedTracks');
        const sessionId = router.query.sessionId; // Get current session ID for renewal
        
        if (tracks) {
          const query: any = { tracks };
          // If we have a session ID and we're coming from checkout, pass it for renewal
          if (sessionId && currentStep === 3) {
            query.sessionId = sessionId;
          }
          
          router.push({
            pathname: '/packages',
            query
          });
        } else {
          router.push('/add');
        }
      }
      
      if (step.number === 3 && currentStep >= 3) {
        // We're on checkout, can stay or refresh
        router.reload();
      }
    }
  };

  return (
    <div className={`w-4/5 sm:w-full max-w-lg mx-auto pt-16 sm:pt-12 pb-16 sm:pb-20 ${className}`} suppressHydrationWarning={true}>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isLast = index === steps.length - 1;
          
          return (
            <React.Fragment key={step.number}>
              {/* Step */}
              <div 
                className={`flex flex-col items-center text-center ${
                  step.number <= currentStep ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'
                }`}
                onClick={() => handleStepClick(step)}
              >
                {/* Circle */}
                <div className={`
                  w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-semibold text-[10px] sm:text-xs mb-1 sm:mb-1.5 border
                  ${isActive ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black border-transparent' :
                    isCompleted ? 'bg-[#59e3a5] text-white border-[#59e3a5]' :
                    'bg-transparent text-gray-500 border-gray-600'}
                `}>
                  {isCompleted ? '✓' : step.number}
                </div>
                
                {/* Text */}
                <div className={`text-[10px] sm:text-xs font-medium mb-0.5 ${
                  isActive ? 'text-white' : isCompleted ? 'text-[#59e3a5]' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className={`text-[8px] sm:text-[10px] ${
                  isActive ? 'text-[#14c0ff]' : 'text-gray-600'
                }`}>
                  {step.subtitle}
                </div>
              </div>
              
              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-2 sm:mx-3 relative top-[-8px] sm:top-[-12px]">
                  <div className={`h-px w-full ${
                    step.number < currentStep ? 'bg-[#59e3a5]' : 'bg-gray-600'
                  }`}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Subtle divider */}
      <div className="w-full max-w-md mx-auto">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
      </div>
    </div>
  );
}