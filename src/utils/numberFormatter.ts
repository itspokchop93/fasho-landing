// Utility functions for number formatting

/**
 * Formats a number with K/M abbreviations for display
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string (e.g., "3K", "1.5M")
 */
export const formatNumberWithAbbreviation = (num: number, decimals: number = 0): string => {
  if (num === 0) return '0';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 1000000) {
    const millions = absNum / 1000000;
    return `${sign}${millions.toFixed(decimals)}M`;
  } else if (absNum >= 1000) {
    const thousands = absNum / 1000;
    return `${sign}${thousands.toFixed(decimals)}K`;
  }
  
  return num.toString();
};

/**
 * Formats progress display (e.g., "0 / 3K (0%)")
 * @param current - Current progress number
 * @param total - Total target number  
 * @param percentage - Percentage completed
 * @returns Formatted string
 */
export const formatProgressDisplay = (current: number, total: number, percentage: number): string => {
  const currentFormatted = formatNumberWithAbbreviation(current);
  const totalFormatted = formatNumberWithAbbreviation(total);
  return `${currentFormatted} / ${totalFormatted} (${percentage.toFixed(1)}%)`;
};
