import React from 'react';

interface StepIndicatorProps {
  currentStep: number; // 1, 2, or 3
  className?: string;
}

export default function StepIndicator({ currentStep, className = '' }: StepIndicatorProps) {
  const steps = [
    { number: 1, title: "TRACKS", subtitle: "Step 1 of 3" },
    { number: 2, title: "CAMPAIGN", subtitle: "Step 2 of 3" },
    { number: 3, title: "LAUNCH", subtitle: "Step 3 of 3" }
  ];

  return (
    <div className={`w-4/5 sm:w-full max-w-lg mx-auto pt-8 sm:pt-12 pb-16 sm:pb-20 ${className}`}>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isLast = index === steps.length - 1;
          
          return (
            <React.Fragment key={step.number}>
              {/* Step */}
              <div className="flex flex-col items-center text-center">
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