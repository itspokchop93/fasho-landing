import React from 'react';
import { getCampaignProgress, shouldShowProgressBar } from '../utils/campaignProgress';

interface CampaignProgressBarProps {
  orderCreatedAt: string;
  orderStatus: string;
  showMessage?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function CampaignProgressBar({ 
  orderCreatedAt, 
  orderStatus, 
  showMessage = true, 
  size = 'medium',
  className = '' 
}: CampaignProgressBarProps) {
  // Don't show progress bar for cancelled orders
  if (!shouldShowProgressBar(orderStatus)) {
    return null;
  }

  const progress = getCampaignProgress(orderCreatedAt);
  
  // Size configurations
  const sizeConfig = {
    small: {
      height: 'h-2',
      textSize: 'text-xs',
      messageSize: 'text-xs',
      spacing: 'space-y-1.5'
    },
    medium: {
      height: 'h-2',
      textSize: 'text-sm',
      messageSize: 'text-sm',
      spacing: 'space-y-2'
    },
    large: {
      height: 'h-3',
      textSize: 'text-base',
      messageSize: 'text-base',
      spacing: 'space-y-3'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`w-full ${config.spacing} ${className}`}>
      {/* Progress Bar */}
      <div className="w-full bg-gray-800/50 rounded-full overflow-hidden">
        <div 
          className={`${config.height} bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-1000 ease-out relative`}
          style={{ width: `${progress.percentage}%` }}
        >
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        </div>
      </div>
      
      {/* Progress Percentage */}
      <div className="flex justify-between items-center">
        <span className={`${config.textSize} text-gray-400 hidden md:block`}>
          Campaign Progress
        </span>
        <span className={`${config.textSize} font-semibold text-green-400 ${size === 'small' ? 'md:ml-auto' : ''}`}>
          {progress.percentage}% Complete
        </span>
      </div>
      
      {/* Status Message */}
      {showMessage && (
        <div className={`${size === 'small' ? 'text-xs' : config.messageSize} text-gray-300 leading-tight ${size === 'small' ? 'font-normal' : ''}`}>
          {progress.message}
        </div>
      )}
    </div>
  );
} 