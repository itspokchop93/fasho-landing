import { useState, useEffect, useCallback } from 'react';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
}

/**
 * Parse a countdown target string like "11-24-25 9:00pm PST" or "2025-11-24T21:00:00-08:00"
 * Formats supported:
 * - MM-DD-YY HH:MMam/pm TIMEZONE (e.g., "11-24-25 9:00pm PST")
 * - MM-DD-YYYY HH:MMam/pm TIMEZONE (e.g., "11-24-2025 9:00pm PST")
 * - ISO format (e.g., "2025-11-24T21:00:00-08:00")
 */
function parseCountdownTarget(targetStr: string): Date | null {
  try {
    // Try ISO format first
    const isoDate = new Date(targetStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try custom format: MM-DD-YY HH:MMam/pm TIMEZONE
    const customMatch = targetStr.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})(am|pm)\s+(PST|EST|CST|MST|PDT|EDT|CDT|MDT|UTC)$/i);
    
    if (customMatch) {
      const [, month, day, yearPart, hours, minutes, ampm, timezone] = customMatch;
      
      // Handle 2-digit year
      let year = parseInt(yearPart);
      if (year < 100) {
        year += 2000;
      }
      
      // Convert to 24-hour format
      let hour24 = parseInt(hours);
      if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
        hour24 = 0;
      }
      
      // Timezone offsets (in hours from UTC)
      const timezoneOffsets: Record<string, number> = {
        'PST': -8, 'PDT': -7,
        'MST': -7, 'MDT': -6,
        'CST': -6, 'CDT': -5,
        'EST': -5, 'EDT': -4,
        'UTC': 0
      };
      
      const offset = timezoneOffsets[timezone.toUpperCase()] || -8; // Default to PST
      
      // Create date in UTC by accounting for timezone offset
      const targetDate = new Date(Date.UTC(
        year,
        parseInt(month) - 1,
        parseInt(day),
        hour24 - offset,
        parseInt(minutes),
        0
      ));
      
      return targetDate;
    }
    
    return null;
  } catch (e) {
    console.error('Failed to parse countdown target:', targetStr, e);
    return null;
  }
}

/**
 * Format countdown with smart display:
 * - Shows DD:HH:MM:SS if days > 0
 * - Shows HH:MM:SS if days = 0 but hours > 0
 * - Shows MM:SS if hours = 0
 */
function formatCountdown(days: number, hours: number, minutes: number, seconds: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (days > 0) {
    return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    return `${pad(minutes)}:${pad(seconds)}`;
  }
}

export function useCountdown(targetString: string): CountdownResult {
  const [countdown, setCountdown] = useState<CountdownResult>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
    formatted: '00:00'
  });

  const calculateCountdown = useCallback(() => {
    const targetDate = parseCountdownTarget(targetString);
    
    if (!targetDate) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        formatted: '00:00'
      };
    }
    
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const diff = target - now;
    
    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        formatted: '00:00'
      };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
      formatted: formatCountdown(days, hours, minutes, seconds)
    };
  }, [targetString]);

  useEffect(() => {
    // Calculate immediately
    setCountdown(calculateCountdown());
    
    // Update every second
    const interval = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [calculateCountdown]);

  return countdown;
}

export { parseCountdownTarget, formatCountdown };

