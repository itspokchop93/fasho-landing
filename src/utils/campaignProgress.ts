/**
 * Campaign Progress Utility Functions
 * Calculates simulated campaign progress based on order date (Day 1 = 1%, Day 30 = 100%)
 */

export interface CampaignProgress {
  percentage: number;
  message: string;
  daysSinceStart: number;
}

/**
 * Calculate campaign progress percentage based on order creation date
 * @param orderCreatedAt - ISO date string when the order was created
 * @returns Progress percentage (1-100)
 */
export const calculateCampaignProgress = (orderCreatedAt: string): number => {
  const orderDate = new Date(orderCreatedAt);
  const currentDate = new Date();
  
  // Calculate days since order was created
  const timeDifference = currentDate.getTime() - orderDate.getTime();
  const daysSinceStart = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  
  // Campaign progresses from 1% on day 1 to 100% on day 30
  if (daysSinceStart <= 0) {
    return 1; // Minimum 1% on day 0/1
  } else if (daysSinceStart >= 30) {
    return 100; // Maximum 100% after day 30
  } else {
    // Linear progression from 1% to 100% over 30 days
    // Formula: 1 + (daysSinceStart / 29) * 99
    return Math.round(1 + (daysSinceStart / 29) * 99);
  }
};

/**
 * Get status message based on campaign progress percentage
 * @param percentage - Progress percentage (1-100)
 * @returns Status message string
 */
export const getCampaignStatusMessage = (percentage: number): string => {
  if (percentage >= 1 && percentage <= 9) {
    return "Our team is identifying the perfect playlists for your track!";
  } else if (percentage >= 10 && percentage <= 25) {
    return "Your campaign is LIVE! Curators are listening and placing your music.";
  } else if (percentage >= 26 && percentage <= 40) {
    return "It's heating up! You've been placed on multiple playlists already.";
  } else if (percentage >= 41 && percentage <= 60) {
    return "You're on fire! There's been serious movement in your numbers so far.";
  } else if (percentage >= 61 && percentage <= 80) {
    return "Major playlists are pushing your music to thousands of listeners daily!";
  } else if (percentage >= 81 && percentage <= 100) {
    return "Home stretch! Launch your next campaign now for compounding growth.";
  } else {
    return "Campaign progress loading...";
  }
};

/**
 * Get complete campaign progress information
 * @param orderCreatedAt - ISO date string when the order was created
 * @returns CampaignProgress object with percentage, message, and days since start
 */
export const getCampaignProgress = (orderCreatedAt: string): CampaignProgress => {
  const orderDate = new Date(orderCreatedAt);
  const currentDate = new Date();
  
  // Calculate days since order was created
  const timeDifference = currentDate.getTime() - orderDate.getTime();
  const daysSinceStart = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  
  const percentage = calculateCampaignProgress(orderCreatedAt);
  const message = getCampaignStatusMessage(percentage);
  
  return {
    percentage,
    message,
    daysSinceStart: Math.max(0, daysSinceStart)
  };
};

/**
 * Check if progress bar should be shown based on order status
 * @param orderStatus - Order status string
 * @returns Boolean indicating if progress bar should be displayed
 */
export const shouldShowProgressBar = (orderStatus: string): boolean => {
  // Hide progress bar only for cancelled orders
  return orderStatus !== 'cancelled';
}; 