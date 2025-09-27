// Slug Generation Utility
// Generates URL-friendly slugs from titles with collision handling

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')      // Remove special characters
    .replace(/\s+/g, '-')              // Replace spaces with hyphens
    .replace(/-+/g, '-')               // Replace multiple hyphens with single
    .trim()                            // Remove leading/trailing whitespace
    .replace(/^-|-$/g, '')             // Remove leading/trailing hyphens
    .substring(0, 100);                // Limit length to 100 characters
}

// Validates if a slug is valid
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length <= 100 && slug.length >= 1;
}

// Cleans up a user-provided slug
export function cleanSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}






