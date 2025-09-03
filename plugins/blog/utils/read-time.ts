// Read Time Calculation Utility
// Calculates estimated reading time based on word count

/**
 * Calculate estimated reading time for blog content
 * @param content - The blog post content (HTML or plain text)
 * @param wordsPerMinute - Average reading speed (default: 200 words per minute)
 * @returns Estimated reading time in minutes
 */
export function calculateReadTime(content: string, wordsPerMinute: number = 200): number {
  if (!content || typeof content !== 'string') {
    return 1; // Default minimum read time
  }

  // Strip HTML tags if present
  const plainText = content.replace(/<[^>]*>/g, '');
  
  // Count words by splitting on whitespace and filtering empty strings
  const wordCount = plainText
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
  
  // Calculate read time (minimum 1 minute)
  const readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  
  console.log(`📖 READ-TIME: Content has ${wordCount} words, estimated ${readTime} min read`);
  
  return readTime;
}

/**
 * Calculate read time and return formatted string
 * @param content - The blog post content
 * @param wordsPerMinute - Average reading speed
 * @returns Formatted read time string (e.g., "5 min read")
 */
export function getFormattedReadTime(content: string, wordsPerMinute: number = 200): string {
  const minutes = calculateReadTime(content, wordsPerMinute);
  return `${minutes} min read`;
}

/**
 * Update read time for blog post data
 * @param postData - Blog post data object
 * @returns Updated post data with calculated read_time
 */
export function addReadTimeToPost<T extends { content?: string; read_time?: number }>(postData: T): T {
  if (postData.content) {
    const readTime = calculateReadTime(postData.content);
    return {
      ...postData,
      read_time: readTime
    };
  }
  
  return postData;
}
