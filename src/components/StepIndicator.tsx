import React from 'react';
import { useRouter } from 'next/router';

interface StepIndicatorProps {
  currentStep: number; // 1, 2, 3, or 4
  className?: string;
}

export default function StepIndicator({ currentStep, className = '' }: StepIndicatorProps) {
  const router = useRouter();
  const steps = [
    { number: 1, title: "TRACKS", subtitle: "Step 1 of 4", route: "/add" },
    { number: 2, title: "VIBE", subtitle: "Step 2 of 4", route: "/vibe" },
    { number: 3, title: "CAMPAIGN", subtitle: "Step 3 of 4", route: "/packages" },
    { number: 4, title: "LAUNCH", subtitle: "Step 4 of 4", route: "/checkout" }
  ];

  const handleStepClick = (step: typeof steps[0]) => {
    if (step.number <= currentStep) {
      if (step.number === 1) {
        const tracks = router.query.tracks || sessionStorage.getItem('selectedTracks');
        
        if (tracks) {
          router.push({
            pathname: '/add',
            query: { tracks }
          });
        } else {
          if (currentStep >= 4) {
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
          
          router.push('/add');
        }
        return;
      }

      if (step.number === 2) {
        const tracks = router.query.tracks || sessionStorage.getItem('selectedTracks');
        if (tracks) {
          router.push({
            pathname: '/vibe',
            query: { tracks }
          });
        } else {
          router.push('/add');
        }
        return;
      }
      
      if (step.number === 3 && currentStep >= 3) {
        const tracks = router.query.tracks || sessionStorage.getItem('selectedTracks');
        const sessionId = router.query.sessionId;
        
        if (tracks) {
          const query: any = { tracks };
          if (sessionId && currentStep === 4) {
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
      
      if (step.number === 4 && currentStep >= 4) {
        router.reload();
      }
    }
  };

  return (
    <div className={`w-[90%] sm:w-full max-w-xl mx-auto pt-16 sm:pt-12 pb-16 sm:pb-20 ${className}`} suppressHydrationWarning={true}>
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
                  w-6 h-6 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-semibold text-[11px] sm:text-xs mb-1 sm:mb-1.5 border
                  ${isActive ? 'bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black border-transparent' :
                    isCompleted ? 'bg-[#59e3a5] text-white border-[#59e3a5]' :
                    'bg-transparent text-gray-500 border-gray-600'}
                `}>
                  {isCompleted ? '✓' : step.number}
                </div>
                
                {/* Text */}
                <div className={`text-[11px] sm:text-xs font-semibold mb-0.5 ${
                  isActive ? 'text-white' : isCompleted ? 'text-[#59e3a5]' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className={`text-[9px] sm:text-[10px] ${
                  isActive ? 'text-[#14c0ff]' : 'text-gray-600'
                }`}>
                  {step.subtitle}
                </div>
              </div>
              
              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-2 sm:mx-3 relative top-[-10px] sm:top-[-12px]">
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
