/**
 * Sales Banner Placeholder Utility
 * 
 * Available placeholders:
 * - {month} - Current month name (e.g., "NOVEMBER")
 * - {day} - Current day of the month (e.g., "25")
 * - {countdown MM-DD-YY HH:MMam/pm TZ} - Animated countdown to a specific date/time
 *   Example: {countdown 11-24-25 9:00pm PST}
 */

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

export interface ParsedText {
  type: 'text' | 'countdown';
  content: string;
  countdownTarget?: string;
}

/**
 * Parse text with placeholders into segments
 * Returns an array of segments that can be rendered
 */
export function parseTextWithPlaceholders(text: string): ParsedText[] {
  if (!text) return [{ type: 'text', content: '' }];
  
  const segments: ParsedText[] = [];
  let currentText = text;
  
  // Replace {month} with current month
  const currentMonth = MONTHS[new Date().getMonth()];
  currentText = currentText.replace(/\{month\}/gi, currentMonth);
  
  // Replace {day} with current day
  const currentDay = new Date().getDate().toString();
  currentText = currentText.replace(/\{day\}/gi, currentDay);
  
  // Find and process countdown placeholders
  // Format: {countdown MM-DD-YY HH:MMam/pm TZ} or {countdown ISO_DATE}
  const countdownRegex = /\{countdown\s+([^}]+)\}/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = countdownRegex.exec(currentText)) !== null) {
    // Add text before the countdown
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: currentText.slice(lastIndex, match.index)
      });
    }
    
    // Add the countdown segment
    segments.push({
      type: 'countdown',
      content: match[0],
      countdownTarget: match[1].trim()
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < currentText.length) {
    segments.push({
      type: 'text',
      content: currentText.slice(lastIndex)
    });
  }
  
  // If no segments were created, return the entire text
  if (segments.length === 0) {
    segments.push({ type: 'text', content: currentText });
  }
  
  return segments;
}

/**
 * Get a simple text preview (for admin panel)
 * Replaces all placeholders with example values
 */
export function getPlaceholderPreview(text: string): string {
  if (!text) return '';
  
  let preview = text;
  
  // Replace {month} with current month
  const currentMonth = MONTHS[new Date().getMonth()];
  preview = preview.replace(/\{month\}/gi, currentMonth);
  
  // Replace {day} with current day
  const currentDay = new Date().getDate().toString();
  preview = preview.replace(/\{day\}/gi, currentDay);
  
  // Replace countdown with preview text
  preview = preview.replace(/\{countdown\s+[^}]+\}/gi, '[COUNTDOWN]');
  
  return preview;
}

/**
 * Get the current month name
 */
export function getCurrentMonth(): string {
  return MONTHS[new Date().getMonth()];
}

/**
 * Get the current day
 */
export function getCurrentDay(): number {
  return new Date().getDate();
}

